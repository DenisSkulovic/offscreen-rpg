# Repository session minutes

**Purpose:** a dated, chronological record of **human intent, technical conversations, decisions, trade-offs, constraints and handoffs** that might otherwise disappear when an AI chat reaches its context limit. This is *not* a task backlog, technical source of truth, change authorization, raw transcript or replacement for `TODO.md`.

**Maintaining this log:** [Daily minutes rule](../../.agents/rules/session-minutes.md). Use one file per active **Europe/Vilnius calendar day**, `YYYY-MM-DD.md`. Append meaningful updates throughout a working day and before any chat/agent switch. Capture the substance of long user prompts, including `do not` and `not yet` constraints, contrasting options and motivations.

**Current handoff, 2026-11-14:** ENG09 + ENG03-M + GM05 + PW01 Done; `Current change: none`. A separate [Admin product design branch](https://github.com/DenisSkulovic/offscreen-rpg/tree/design/admin-product-2026-11-14/docs/admin) captures the proposed long-term internal console; product review is next, technical/Changes not authorized. [Change queue](../changes/README.md).

## Days

| Date | Main topics | Outcome / status |
| --- | --- | --- |
| [2026-11-14](2026-11-14.md) | Merge handoff; ENG09–PW01 implementation; Admin product vision (design branch) | Four packets Done, queue clear; Admin product proposed, no code or provider spend |
| [2026-11-13](2026-11-13.md) | Chamber CH08–CH16 Done; local-infra unblock rule | CH01–CH16 Done; agent must start local disposable infra itself; no provider spend |
| [2026-11-12](2026-11-12.md) | React W01–W22 through Storybook W18; Chamber CH01–CH16 Proposed | W01–W11/W13/W15–W21 **Done**; next W22 or W14; no provider spend |
| [2026-11-11](2026-11-11.md) | Harness/knowledge, Feature→Change redesign, portfolio direction, target-first React/Next planning | Historical reconstruction from discussions and commits; no active coding Change |

## Fresh-chat handoff (read selectively)

1. For "where did we leave off?", start with the **most recent minutes file** and its closing checkpoint; follow yesterday's note if it references an unresolved decision. Do not load all past days or treat an old suggestion as approved.
2. [`TODO.md`](../../TODO.md) owns the **current strategic direction**, [`docs/changes/README.md`](../changes/README.md) owns active/parked/proposed implementation work, and [engineering targets/audits](../engineering/targets/README.md) own agreed or proposed design and source-gaps. These are the durable **working owners**.
3. Minutes explain **why** decisions were made and retain incomplete owner thoughts or deferred ideas that were deliberately not promoted into execution. Check current owner directions when entries conflict.

A future agent should be able to answer: *what matters now, why, what was decided, what was declined, what was actually committed/tested, and which decision still needs the owner?* If any of those are missing, append a concise dated correction.
