import { useState } from "react";
import { BarChart2, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PollData {
  id: number;
  chatId: number;
  creatorId: number;
  question: string;
  options: string[];
  isAnonymous: boolean;
  isMultipleChoice: boolean;
  isQuiz: boolean;
  correctOptionIndex: number | null;
  explanation: string | null;
  closesAt: string | null;
  isClosed: boolean;
  createdAt: string;
  voteCounts: number[];
  totalVotes: number;
  totalVoters: number;
  myOptionIndexes: number[];
}

interface PollMessageProps {
  poll: PollData;
  isSelf: boolean;
  onVote: (optionIndexes: number[]) => void;
  disabled?: boolean;
}

export function PollMessage({ poll, isSelf, onVote, disabled }: PollMessageProps) {
  const [pendingIndexes, setPendingIndexes] = useState<number[]>([]);
  const hasVoted = poll.myOptionIndexes.length > 0;
  const showResults = hasVoted || poll.isClosed;
  const maxVotes = Math.max(...poll.voteCounts, 1);

  const handleOptionClick = (idx: number) => {
    if (disabled || poll.isClosed) return;

    if (poll.isMultipleChoice) {
      setPendingIndexes(prev =>
        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
      );
    } else {
      // Single choice — vote immediately
      onVote([idx]);
    }
  };

  const handleSubmitMultiple = () => {
    if (pendingIndexes.length === 0) return;
    onVote(pendingIndexes);
    setPendingIndexes([]);
  };

  const primary = isSelf ? "rgba(255,255,255,0.9)" : "var(--color-primary, #38bdf8)";
  const primaryBg = isSelf ? "rgba(255,255,255,0.15)" : "rgba(56,189,248,0.12)";
  const primaryFill = isSelf ? "rgba(255,255,255,0.3)" : "rgba(56,189,248,0.25)";

  return (
    <div className="min-w-[220px] max-w-[280px]">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart2 className="h-4 w-4 shrink-0" style={{ color: primary, opacity: 0.7 }} />
        <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: primary, opacity: 0.6 }}>
          {poll.isQuiz ? "Викторина" : "Опрос"}
          {poll.isAnonymous ? " · Анонимный" : ""}
          {poll.isClosed ? " · Закрыт" : ""}
        </span>
      </div>

      {/* Question */}
      <div className="text-[15px] font-semibold mb-3 leading-snug" style={{ color: isSelf ? "#fff" : "inherit" }}>
        {poll.question}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {poll.options.map((option, idx) => {
          const voteCount = poll.voteCounts[idx] ?? 0;
          const pct = poll.totalVotes > 0 ? Math.round((voteCount / poll.totalVotes) * 100) : 0;
          const isMyVote = poll.myOptionIndexes.includes(idx);
          const isPending = pendingIndexes.includes(idx);
          const isCorrect = poll.isQuiz && poll.correctOptionIndex === idx && showResults;
          const isWrong = poll.isQuiz && isMyVote && poll.correctOptionIndex !== idx && showResults;

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(idx)}
              disabled={disabled || poll.isClosed || (hasVoted && !poll.isMultipleChoice)}
              className={cn(
                "relative w-full text-left rounded-[8px] px-3 py-2 overflow-hidden transition-all",
                "disabled:cursor-default"
              )}
              style={{
                background: isPending || (isMyVote && !showResults)
                  ? primaryBg
                  : "transparent",
                border: `1px solid ${isCorrect ? "#22c55e" : isWrong ? "#ef4444" : isSelf ? "rgba(255,255,255,0.2)" : "rgba(148,163,184,0.25)"}`,
              }}
            >
              {/* Progress fill */}
              {showResults && (
                <div
                  className="absolute inset-0 left-0 transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isCorrect ? "rgba(34,197,94,0.15)" : primaryFill,
                    borderRadius: "inherit",
                  }}
                />
              )}

              <div className="relative flex items-center gap-2">
                {/* Checkbox for multiple choice */}
                {poll.isMultipleChoice && !showResults && (
                  <div
                    className="h-4 w-4 rounded border shrink-0 flex items-center justify-center"
                    style={{
                      borderColor: isPending ? primary : (isSelf ? "rgba(255,255,255,0.4)" : "rgba(148,163,184,0.5)"),
                      background: isPending ? primary : "transparent",
                    }}
                  >
                    {isPending && <CheckCircle2 className="h-3 w-3 text-white fill-white" />}
                  </div>
                )}

                <span className="flex-1 text-[14px] font-medium" style={{ color: isSelf ? "#fff" : "inherit" }}>
                  {option}
                </span>

                {showResults && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isMyVote && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: isCorrect ? "#22c55e" : primary }} />}
                    {isCorrect && !isMyVote && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    <span className="text-[12px] font-semibold" style={{ color: primary }}>
                      {pct}%
                    </span>
                  </div>
                )}

                {!showResults && isMyVote && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Submit button for multiple choice */}
      {poll.isMultipleChoice && !hasVoted && !poll.isClosed && pendingIndexes.length > 0 && (
        <button
          onClick={handleSubmitMultiple}
          className="mt-2 w-full py-1.5 rounded-[8px] text-[13px] font-semibold transition-all"
          style={{ background: primary, color: isSelf ? "var(--background)" : "#fff" }}
        >
          Проголосовать ({pendingIndexes.length})
        </button>
      )}

      {/* Quiz explanation */}
      {poll.isQuiz && showResults && poll.explanation && (
        <div className="mt-2 p-2 rounded-[6px] text-[12px]" style={{ background: primaryBg, color: isSelf ? "rgba(255,255,255,0.75)" : "var(--muted-foreground)" }}>
          💡 {poll.explanation}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 flex items-center gap-1.5" style={{ color: isSelf ? "rgba(255,255,255,0.5)" : "var(--muted-foreground)" }}>
        {poll.isAnonymous && <Lock className="h-3 w-3" />}
        <span className="text-[11px]">
          {poll.totalVoters} {poll.totalVoters === 1 ? "голос" : poll.totalVoters < 5 ? "голоса" : "голосов"}
        </span>
        {poll.closesAt && !poll.isClosed && (
          <span className="text-[11px]">
            · до {new Date(poll.closesAt).toLocaleDateString("ru-RU")}
          </span>
        )}
      </div>
    </div>
  );
}
