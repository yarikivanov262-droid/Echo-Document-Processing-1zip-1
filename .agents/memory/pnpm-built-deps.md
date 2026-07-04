---
name: pnpm onlyBuiltDependencies location
description: Where to approve native package build scripts in pnpm workspace
---

## Problem

In pnpm 10+, build scripts for native packages (e.g., argon2, node-gyp packages) are blocked by default. Running `pnpm install` shows "Ignored build scripts: argon2@X.Y.Z". The `pnpm approve-builds` command is interactive and can't be automated easily.

## Fix

Add the package name to `onlyBuiltDependencies` in `pnpm-workspace.yaml`:

```yaml
onlyBuiltDependencies:
  - '@swc/core'
  - argon2        # ← add here
  - esbuild
  - msw
  - unrs-resolver
```

Then run `pnpm rebuild <package-name>` to build it without reinstalling everything.

**Why:** `pnpm-workspace.yaml` is the authoritative place for workspace-level pnpm config. Adding to root `package.json` under `pnpm.onlyBuiltDependencies` also works but the project uses workspace.yaml.

**How to apply:** Any new native/compiled package needs to be added here before it will execute its build scripts.
