---
name: Artifact-managed workflow conflicts
description: Why "artifacts/<pkg>: <name>" workflows appear and how to resolve port conflicts with custom workflows of the same name/port.
---

In monorepos where packages live under `artifacts/<pkg>/`, the platform can auto-register workflows named `artifacts/<pkg>: <label>` (e.g. `artifacts/api-server: API Server`, `artifacts/echo-messenger: web`). These are "managed by an artifact" — `removeWorkflow`/`configureWorkflow` on them raise `PROHIBITED_ACTION`.

If a custom hand-configured workflow (e.g. "ECHO API") targets the same port as one of these auto-registered ones, the custom workflow can fail to start with `DIDNT_OPEN_A_PORT` even when the process is actually listening and no OS-level port conflict exists (verified via manual `curl`/`ps`/`/proc/net/tcp`) — the platform's own port reservation for the artifact-managed workflow blocks it.

**Why:** the platform tracks port ownership per registered workflow independently of what's actually bound at the OS level; two workflows registered for the same port fight even if only one process is really running.

**How to apply:** don't keep re-trying to start a custom workflow that collides on port with an artifact-managed one. Remove the custom duplicate and use the artifact-managed workflow directly instead — it works normally once the conflicting duplicate is gone. Ignore stale/wrong `waitForPort` values shown by `getWorkflowStatus` for other artifact-managed workflows if they aren't the one you're actually using.
