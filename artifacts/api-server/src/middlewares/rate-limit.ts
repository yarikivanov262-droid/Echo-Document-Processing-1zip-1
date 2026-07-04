import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: { error: string };
  keyFn?: (req: Request) => string;
}

function createLimiter(opts: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = opts.keyFn ? opts.keyFn(req) : (req.ip ?? "unknown");
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    entry.count++;
    if (entry.count > opts.max) {
      res.status(429).json(opts.message ?? { error: "Too many requests" });
      return;
    }

    next();
  };
}

export const messageRateLimit = createLimiter({
  windowMs: 60_000,
  max: 60,
  message: { error: "Слишком много сообщений. Подождите." },
  keyFn: (req) => String((req as Request & { userId?: number }).userId ?? req.ip),
});

export const authRateLimit = createLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  message: { error: "Слишком много попыток входа. Подождите 15 минут." },
  keyFn: (req) => req.ip ?? "unknown",
});

export const anonInboxRateLimit = createLimiter({
  windowMs: 60_000,
  max: 3,
  message: { error: "Слишком много анонимных сообщений. Подождите." },
  keyFn: (req) => req.ip ?? "unknown",
});

export const fileUploadRateLimit = createLimiter({
  windowMs: 60_000,
  max: 20,
  message: { error: "Слишком много загрузок. Подождите." },
  keyFn: (req) => String((req as Request & { userId?: number }).userId ?? req.ip),
});
