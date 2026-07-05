# ECHO Messenger

A fully anonymous PWA messenger — «Говори. Никто не узнает.» No phone number, no email. Just a username and a cryptographic seed phrase.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/echo-messenger run dev` — run the PWA frontend (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (runtime-managed by Replit, no manual setup needed)
- Required env: `SESSION_SECRET` — stored as Replit Secret (already configured)
- Required env: `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — stored as shared env vars (already configured)

## Setup Checklist (completed on import)

- [x] `pnpm install` — all 498 packages installed, `argon2` and `esbuild` native binaries built
- [x] `pnpm --filter @workspace/db run push` — Drizzle schema pushed to Replit PostgreSQL (all tables created)
- [x] `pnpm run typecheck` — zero TypeScript errors across all workspaces
- [x] API Server workflow running on port 8080 — `[INFO] Server listening port: 8080`
- [x] Echo Messenger workflow running on port 5000 (Vite dev server)
- [x] VAPID keys for Web Push configured as shared env vars
- [x] `SESSION_SECRET` configured as Replit Secret
- [x] `.replit` modules updated to include `postgresql-16` for native Drizzle connectivity

## Configured Workflows (Replit)

| Workflow | Command | Port |
|----------|---------|------|
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/echo-messenger: web` | `pnpm --filter @workspace/echo-messenger run dev` | 5000 |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | auto |

## Feature Analysis

See `ECHO_vs_TELEGRAM_ANALYSIS.md` for a full feature-by-feature comparison against Telegram 2026, including a 12-stage implementation roadmap.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite, Tailwind CSS, Framer Motion, Wouter, next-themes (dark mode first)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (users, sessions, messages, chats, files, backups)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `artifacts/api-server/src/routes/` — Express route handlers (auth, users, messages, chats, files)
- `artifacts/api-server/src/middlewares/auth.ts` — Bearer token auth middleware
- `artifacts/echo-messenger/src/` — React PWA frontend

## Architecture decisions

- **No phone/email** — registration requires only username + seed phrase (hashed with Argon2id concept; currently SHA-equivalent stored as string for demo). Real deployment would use Argon2id.
- **E2EE design** — server only stores `encryptedContent` (opaque bytes). Encryption/decryption happens client-side. The backend never sees plaintext.
- **Seed phrase auth** — BIP39 12-word phrase is the user's master key. `seedHash` is stored on server, not the seed itself.
- **Bearer token sessions** — each login creates a `sessions` row with a random 32-byte hex token. Token attached as `Authorization: Bearer` on every API call via `setAuthTokenGetter`.
- **No Tor/WebSocket in v1** — Tor WASM and WebSocket real-time delivery are planned. Messages currently delivered via polling. WebSocket layer can be added without schema changes.

## Product

- Anonymous registration (username + seed phrase display, copy-to-clipboard)
- Login / restore account via seed hash
- Chat list with all conversations
- Message threads with E2EE content
- Contacts search by username
- Secret chats (PIN-protected section)
- Groups and channels creation
- Settings: security (burn account, sessions), backup, profiles, activity log
- File upload (base64-encoded, encrypted client-side)
- Session management (list active, terminate)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Always run `pnpm run typecheck:libs` after changing anything in `lib/db/src/schema/`
- The `custom-fetch` module's `setAuthTokenGetter` must be imported from `@workspace/api-client-react` (main export), not from the deep path `/src/custom-fetch`
- WebSocket path must be listed in `artifact.toml` paths array to be proxied correctly

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
