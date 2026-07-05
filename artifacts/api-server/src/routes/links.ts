import { Router, type IRouter } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// Allowed URL schemes — only fetch http/https, never local/internal addresses
const SAFE_URL = /^https?:\/\/(?!localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i;

// Basic OG/meta extractor — no heavy cheerio dependency, pure regex on the <head>
function extractMeta(html: string): { title?: string; description?: string; image?: string; siteName?: string } {
  const head = (html.match(/<head[\s\S]*?<\/head>/i) ?? [html.slice(0, 8000)])[0];

  const og = (prop: string) =>
    head.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ??
    head.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"))?.[1];

  const meta = (name: string) =>
    head.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ??
    head.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"))?.[1];

  const title =
    og("title") ??
    meta("title") ??
    head.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim();

  return {
    title: title?.slice(0, 200),
    description: (og("description") ?? meta("description"))?.slice(0, 400),
    image: og("image"),
    siteName: og("site_name"),
  };
}

router.get("/links/preview", requireAuth, async (_req: AuthenticatedRequest, res): Promise<void> => {
  const url = typeof _req.query["url"] === "string" ? _req.query["url"] : null;

  if (!url) { res.status(400).json({ error: "Missing url" }); return; }
  if (!SAFE_URL.test(url)) { res.status(422).json({ error: "Invalid or disallowed URL" }); return; }

  let targetUrl: URL;
  try { targetUrl = new URL(url); } catch { res.status(422).json({ error: "Malformed URL" }); return; }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "ECHO-LinkBot/1.0 (compatible; +https://echo.repl.co)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en,ru;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      res.json({ url, title: targetUrl.hostname });
      return;
    }

    // Read only the first 100 KB (enough for <head>)
    const reader = resp.body?.getReader();
    if (!reader) { res.json({ url }); return; }

    let html = "";
    let bytes = 0;
    const MAX = 100_000;
    let done = false;

    while (!done && bytes < MAX) {
      const { value, done: doneFlag } = await reader.read();
      done = doneFlag;
      if (value) {
        html += new TextDecoder().decode(value);
        bytes += value.byteLength;
        // Stop once </head> is seen
        if (html.includes("</head>")) break;
      }
    }
    reader.cancel().catch(() => {});

    const meta = extractMeta(html);
    res.json({ url, ...meta });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "AbortError") {
      res.status(408).json({ error: "Fetch timeout" });
    } else {
      res.status(502).json({ error: "Failed to fetch URL" });
    }
  }
});

export default router;
