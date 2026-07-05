---
name: mockup-sandbox build requires PORT env
description: Root `pnpm run build` fails on the mockup-sandbox package with a PORT env error unrelated to app changes.
---

Running the workspace-wide `pnpm run build` fails at the `artifacts/mockup-sandbox` step with
`Error: PORT environment variable is required but was not provided` inside its `vite.config.ts`.

**Why:** mockup-sandbox's vite config reads `PORT` unconditionally (designed for the dev workflow, which always sets it), but a plain `vite build` invocation via the root build script doesn't set it.

**How to apply:** When validating a build after unrelated app changes (e.g. schema/design work in echo-messenger), treat this specific failure as pre-existing/out-of-scope — confirm `artifacts/echo-messenger` and `artifacts/api-server` typecheck/build cleanly, and don't waste time trying to "fix" mockup-sandbox's build unless the user is actually working on it.
