---
name: db package types rebuild
description: How to regenerate TypeScript types after changing lib/db/src/schema/*.ts
---

## Problem

`lib/db` exports compiled types from `dist/index.d.ts`. After editing schema files, the dist is stale → downstream TS errors like `Property 'newColumn' does not exist on type 'PgTableWithColumns<...>'`.

## Fix

```bash
cd lib/db && pnpm exec tsc --project tsconfig.json
```

Or from workspace root:
```bash
pnpm run typecheck:libs  # runs tsc --build which rebuilds all composite projects
```

**Why:** The db package uses `emitDeclarationOnly: true` in tsconfig and generates `dist/index.d.ts`. The `pnpm run typecheck` for individual packages doesn't trigger the composite build. Must run `tsc --build` at root or `tsc --project tsconfig.json` inside lib/db.

**How to apply:** Any time you add/remove/rename columns in `lib/db/src/schema/`, rebuild immediately before running downstream typechecks.
