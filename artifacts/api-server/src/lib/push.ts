import webpush from "web-push";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { getUserClients } from "./ws-hub";

export type NotifiableChatType = "messages" | "groups" | "channels";

export async function isPushEnabledForUser(userId: number, kind: NotifiableChatType): Promise<boolean> {
  const [user] = await db.select({ settings: usersTable.settings }).from(usersTable).where(eq(usersTable.id, userId));
  const notif = (user?.settings as Record<string, unknown> | undefined)?.notifications as
    | Record<string, boolean>
    | undefined;
  if (!notif || typeof notif[kind] !== "boolean") return true;
  return notif[kind];
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

let configured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:echo@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
} else {
  logger.warn("VAPID keys not configured — Web Push notifications disabled");
}

export function isPushConfigured() {
  return configured;
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY ?? null;
}

export type PushPayload = {
  title: string;
  body: string;
  chatUrl?: string;
};

export async function sendPushToUser(userId: number, payload: PushPayload, onlyIfOffline = true): Promise<void> {
  if (!configured) return;

  if (onlyIfOffline && getUserClients(userId).size > 0) {
    return;
  }

  const subs = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
        } else {
          logger.error({ userId, err }, "Failed to send push notification");
        }
      }
    })
  );
}
