---
name: ECHO tech spec document
description: Where the full feature roadmap for Echo Messenger lives and how it's organized
---

The file `ТЕХ ПРОЕКТ ECHO.txt` in the project root is the authoritative, exhaustive technical spec for Echo Messenger (in Russian). It is organized into 40 sequential `STAGE N — <name>` sections (grep `STAGE [0-9]+ —` to list them), covering DB schema additions, API endpoints, and per-page UI implementation instructions in order.

**Why:** The user builds against this doc incrementally and refers to progress by stage number (e.g. "I stopped at stage 6"), not by feature name. Stage 1 is "critical chat bugs to fix first" — before trusting a stage is done, verify against the doc's specific problem/fix descriptions rather than assuming.

**How to apply:** When the user references a stage number, grep the doc for that `STAGE N` header to get the exact scope before making changes. When verifying "is X done", check the doc's literal acceptance criteria (specific hook names, field names, file/line behavior) rather than a general feature check — the doc is written as literal patch instructions.

**Large/dense stages:** Some stages (e.g. chat window redesign) describe far more UI surface (polls, stickers, video notes, paid reactions, geolocation) than the current OpenAPI schema supports. When a stage requires new backend fields/endpoints not yet in `openapi.yaml`, implement the subset that works with existing schema/hooks now, and treat schema-dependent items as belonging to a later stage rather than blocking the whole stage.

**Duplicate workflow note:** Replit auto-registered `artifacts/api-server`/`artifacts/echo-messenger` workflows alongside the original `ECHO API`/`ECHO Messenger` ones; both bind the same ports, so the older `ECHO API` workflow shows `EADDRINUSE` and stays failed — this is expected since the artifact-based workflow serves traffic fine. Don't restart `ECHO API` to "fix" it.
