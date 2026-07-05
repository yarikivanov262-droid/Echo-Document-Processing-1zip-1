---
name: Liquid Glass design system
description: How the iOS 26 "Liquid Glass" translucent design language is implemented across the app.
---

The app uses a frosted-glass visual language (translucency + backdrop blur + specular top highlight + layered
depth) instead of solid `bg-card`/`bg-background` surfaces, applied globally.

Utility classes live in `artifacts/echo-messenger/src/index.css`:
- `.glass` — standard translucent panel (cards, message bubbles, popovers)
- `.glass-strong` — heavier blur/opacity for modals, dialogs, sheets, drawers, context menus
- `.glass-nav` — floating nav bar / sidebar treatment
- `.glass-header` — sticky header bars
- `.glass-pill` — small pill-shaped controls (nav icons, chips, outline/secondary buttons)

**Why:** the user asked for the design applied "everywhere," so `Card`, `Button` (outline/secondary), `Dialog`,
`Sheet`, `Drawer` primitives were changed at the component level, and every raw `bg-card` div across
`pages/**` was swapped to `.glass` so new pages inherit the look by using these primitives/classes rather than
solid backgrounds.

**How to apply:** when adding any new panel, header, modal, or floating surface, reach for one of these classes
instead of `bg-card`/`bg-background`/`border-border` solid combos to stay consistent with the rest of the app.
