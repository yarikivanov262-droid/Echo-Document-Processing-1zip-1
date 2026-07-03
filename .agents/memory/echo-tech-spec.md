---
name: ECHO tech spec document
description: Where the full feature roadmap for Echo Messenger lives and how it's organized
---

The file `ТЕХ ПРОЕКТ ECHO.txt` in the project root is the authoritative, exhaustive technical spec for Echo Messenger (in Russian). It is organized into 40 sequential `STAGE N — <name>` sections (grep `STAGE [0-9]+ —` to list them), covering DB schema additions, API endpoints, and per-page UI implementation instructions in order.

**Why:** The user builds against this doc incrementally and refers to progress by stage number (e.g. "I stopped at stage 6"), not by feature name. Stage 1 is "critical chat bugs to fix first" — before trusting a stage is done, verify against the doc's specific problem/fix descriptions rather than assuming.

**How to apply:** When the user references a stage number, grep the doc for that `STAGE N` header to get the exact scope before making changes. When verifying "is X done", check the doc's literal acceptance criteria (specific hook names, field names, file/line behavior) rather than a general feature check — the doc is written as literal patch instructions.
