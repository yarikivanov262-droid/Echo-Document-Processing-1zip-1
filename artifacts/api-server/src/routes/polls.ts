import { Router, type IRouter } from "express";
import { db, pollsTable, pollVotesTable, chatMembersTable, chatsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { broadcastToChat } from "../lib/ws-hub";

const router: IRouter = Router();

const CreatePollBody = z.object({
  chatId: z.number(),
  question: z.string().min(1).max(255),
  options: z.array(z.string().min(1)).min(2).max(10),
  isAnonymous: z.boolean().optional().default(true),
  isMultipleChoice: z.boolean().optional().default(false),
  isQuiz: z.boolean().optional().default(false),
  correctOptionIndex: z.number().optional().nullable(),
  explanation: z.string().optional().nullable(),
  closesAt: z.string().optional().nullable(),
});

async function getChatMemberIds(chatId: number): Promise<number[]> {
  const members = await db
    .select({ userId: chatMembersTable.userId })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.chatId, chatId));
  return members.map(m => m.userId);
}

async function getPollWithResults(pollId: number, userId: number) {
  const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, pollId));
  if (!poll) return null;

  const votes = await db.select().from(pollVotesTable).where(eq(pollVotesTable.pollId, pollId));

  // Count votes per option
  const voteCounts: number[] = poll.options.map(() => 0);
  let totalVotes = 0;
  for (const vote of votes) {
    for (const idx of vote.optionIndexes) {
      if (idx >= 0 && idx < voteCounts.length) {
        voteCounts[idx]++;
        totalVotes++;
      }
    }
  }

  // Current user's votes
  const myVote = votes.find(v => v.userId === userId);
  const myOptionIndexes = myVote?.optionIndexes ?? [];

  return {
    id: poll.id,
    chatId: poll.chatId,
    creatorId: poll.creatorId,
    question: poll.question,
    options: poll.options,
    isAnonymous: poll.isAnonymous,
    isMultipleChoice: poll.isMultipleChoice,
    isQuiz: poll.isQuiz,
    correctOptionIndex: poll.correctOptionIndex ?? null,
    explanation: poll.explanation ?? null,
    closesAt: poll.closesAt?.toISOString() ?? null,
    isClosed: poll.isClosed,
    createdAt: poll.createdAt.toISOString(),
    voteCounts,
    totalVotes,
    myOptionIndexes,
    totalVoters: new Set(votes.map(v => v.userId)).size,
  };
}

// POST /polls - create a poll
router.post("/polls", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreatePollBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;

  // Verify user is member of the chat
  const [membership] = await db.select()
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.chatId, d.chatId), eq(chatMembersTable.userId, req.userId!)));
  if (!membership) {
    res.status(403).json({ error: "Not a chat member" });
    return;
  }

  const [poll] = await db.insert(pollsTable).values({
    chatId: d.chatId,
    creatorId: req.userId!,
    question: d.question,
    options: d.options,
    isAnonymous: d.isAnonymous,
    isMultipleChoice: d.isMultipleChoice,
    isQuiz: d.isQuiz,
    correctOptionIndex: d.correctOptionIndex ?? null,
    explanation: d.explanation ?? null,
    closesAt: d.closesAt ? new Date(d.closesAt) : null,
  }).returning();

  const result = await getPollWithResults(poll.id, req.userId!);
  const memberIds = await getChatMemberIds(d.chatId);
  broadcastToChat(memberIds, { type: "new_poll", chatId: d.chatId, poll: result as Record<string, unknown> }, req.userId!);

  res.status(201).json(result);
});

// GET /polls/:id - get poll with vote counts
router.get("/polls/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const pollId = parseInt(req.params.id as string, 10);
  if (isNaN(pollId)) { res.status(400).json({ error: "Invalid poll id" }); return; }

  const [poll] = await db.select({ chatId: pollsTable.chatId }).from(pollsTable).where(eq(pollsTable.id, pollId));
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  const [membership] = await db.select({ userId: chatMembersTable.userId })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.chatId, poll.chatId), eq(chatMembersTable.userId, req.userId!)));
  if (!membership) { res.status(403).json({ error: "Not a chat member" }); return; }

  const result = await getPollWithResults(pollId, req.userId!);
  if (!result) { res.status(404).json({ error: "Poll not found" }); return; }
  res.json(result);
});

// POST /polls/:id/vote - cast or retract a vote
router.post("/polls/:id/vote", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const pollId = parseInt(req.params.id as string, 10);
  if (isNaN(pollId)) { res.status(400).json({ error: "Invalid poll id" }); return; }

  const body = z.object({ optionIndexes: z.array(z.number().int().min(0)).min(1) }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, pollId));
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  const [voteMembership] = await db.select({ userId: chatMembersTable.userId })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.chatId, poll.chatId), eq(chatMembersTable.userId, req.userId!)));
  if (!voteMembership) { res.status(403).json({ error: "Not a chat member" }); return; }

  if (poll.isClosed) { res.status(400).json({ error: "Poll is closed" }); return; }
  if (poll.closesAt && new Date() > poll.closesAt) { res.status(400).json({ error: "Poll has expired" }); return; }

  const { optionIndexes } = body.data;
  if (!poll.isMultipleChoice && optionIndexes.length > 1) {
    res.status(400).json({ error: "Single-choice poll" });
    return;
  }

  // Validate indexes
  for (const idx of optionIndexes) {
    if (idx >= poll.options.length) {
      res.status(400).json({ error: "Invalid option index" });
      return;
    }
  }

  // Remove existing vote or upsert
  const existing = await db.select()
    .from(pollVotesTable)
    .where(and(eq(pollVotesTable.pollId, pollId), eq(pollVotesTable.userId, req.userId!)));

  if (existing.length > 0 && JSON.stringify(existing[0].optionIndexes) === JSON.stringify(optionIndexes)) {
    // Retract vote (toggle)
    await db.delete(pollVotesTable)
      .where(and(eq(pollVotesTable.pollId, pollId), eq(pollVotesTable.userId, req.userId!)));
  } else {
    if (existing.length > 0) {
      await db.update(pollVotesTable)
        .set({ optionIndexes, votedAt: new Date() })
        .where(and(eq(pollVotesTable.pollId, pollId), eq(pollVotesTable.userId, req.userId!)));
    } else {
      await db.insert(pollVotesTable).values({ pollId, userId: req.userId!, optionIndexes });
    }
  }

  const result = await getPollWithResults(pollId, req.userId!);
  const memberIds = await getChatMemberIds(poll.chatId);
  broadcastToChat(memberIds, { type: "poll_update", chatId: poll.chatId, poll: result as Record<string, unknown> });

  res.json(result);
});

// POST /polls/:id/close - close a poll (creator only)
router.post("/polls/:id/close", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const pollId = parseInt(req.params.id as string, 10);
  if (isNaN(pollId)) { res.status(400).json({ error: "Invalid poll id" }); return; }

  const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, pollId));
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  const [closeMembership] = await db.select({ role: chatMembersTable.role })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.chatId, poll.chatId), eq(chatMembersTable.userId, req.userId!)));
  if (!closeMembership) { res.status(403).json({ error: "Not a chat member" }); return; }
  if (poll.creatorId !== req.userId && !["admin", "owner"].includes(closeMembership.role ?? "")) {
    res.status(403).json({ error: "Only the creator or an admin can close the poll" });
    return;
  }

  await db.update(pollsTable).set({ isClosed: true }).where(eq(pollsTable.id, pollId));
  const result = await getPollWithResults(pollId, req.userId!);
  const memberIds = await getChatMemberIds(poll.chatId);
  broadcastToChat(memberIds, { type: "poll_update", chatId: poll.chatId, poll: result as Record<string, unknown> });

  res.json(result);
});

export default router;
