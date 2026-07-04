import { db, stickerPacksTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

const OFFICIAL_PACKS = [
  {
    title: "Классика",
    stickers: [
      { emoji: "😀" }, { emoji: "😃" }, { emoji: "😄" }, { emoji: "😁" },
      { emoji: "😆" }, { emoji: "😅" }, { emoji: "😂" }, { emoji: "🤣" },
      { emoji: "😊" }, { emoji: "😇" }, { emoji: "🙂" }, { emoji: "🙃" },
      { emoji: "😉" }, { emoji: "😌" }, { emoji: "😍" }, { emoji: "🥰" },
      { emoji: "😘" }, { emoji: "😗" }, { emoji: "😙" }, { emoji: "😚" },
      { emoji: "😋" }, { emoji: "😛" }, { emoji: "😝" }, { emoji: "😜" },
      { emoji: "🤪" }, { emoji: "🤨" }, { emoji: "🧐" }, { emoji: "🤓" },
      { emoji: "😎" }, { emoji: "🥸" }, { emoji: "🤩" }, { emoji: "🥳" },
    ],
  },
  {
    title: "Животные",
    stickers: [
      { emoji: "🐶" }, { emoji: "🐱" }, { emoji: "🐭" }, { emoji: "🐹" },
      { emoji: "🐰" }, { emoji: "🦊" }, { emoji: "🐻" }, { emoji: "🐼" },
      { emoji: "🐨" }, { emoji: "🐯" }, { emoji: "🦁" }, { emoji: "🐮" },
      { emoji: "🐷" }, { emoji: "🐸" }, { emoji: "🐵" }, { emoji: "🙈" },
      { emoji: "🙉" }, { emoji: "🙊" }, { emoji: "🐔" }, { emoji: "🐧" },
    ],
  },
  {
    title: "Природа",
    stickers: [
      { emoji: "🌱" }, { emoji: "🌿" }, { emoji: "🍀" }, { emoji: "🍁" },
      { emoji: "🍂" }, { emoji: "🍃" }, { emoji: "🌺" }, { emoji: "🌸" },
      { emoji: "🌹" }, { emoji: "🌷" }, { emoji: "🌻" }, { emoji: "🌼" },
      { emoji: "🌞" }, { emoji: "🌝" }, { emoji: "🌛" }, { emoji: "🌜" },
      { emoji: "⭐" }, { emoji: "🌟" }, { emoji: "💫" }, { emoji: "✨" },
    ],
  },
  {
    title: "Жесты",
    stickers: [
      { emoji: "👋" }, { emoji: "🤚" }, { emoji: "✋" }, { emoji: "🖖" },
      { emoji: "🤙" }, { emoji: "💪" }, { emoji: "🦾" }, { emoji: "🖐️" },
      { emoji: "☝️" }, { emoji: "👆" }, { emoji: "👇" }, { emoji: "👈" },
      { emoji: "👉" }, { emoji: "👍" }, { emoji: "👎" }, { emoji: "✊" },
      { emoji: "👊" }, { emoji: "🤛" }, { emoji: "🤜" }, { emoji: "🤞" },
      { emoji: "🤟" }, { emoji: "🤘" }, { emoji: "👌" }, { emoji: "🤌" },
      { emoji: "🤏" }, { emoji: "👏" }, { emoji: "🙌" }, { emoji: "🤲" },
    ],
  },
];

export async function seedDatabase() {
  try {
    const [existing] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stickerPacksTable)
      .where(sql`${stickerPacksTable.isOfficial} = true`);

    if (Number(existing?.count) > 0) return;

    for (const pack of OFFICIAL_PACKS) {
      await db.insert(stickerPacksTable).values({
        title: pack.title,
        stickers: pack.stickers,
        isOfficial: true,
        isAnimated: false,
      });
    }

    logger.info({ count: OFFICIAL_PACKS.length }, "Seeded official sticker packs");
  } catch (err) {
    logger.error({ err }, "DB seed failed");
  }
}
