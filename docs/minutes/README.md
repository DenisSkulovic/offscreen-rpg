# Repository session minutes

**Purpose:** a dated, chronological record of **human intent, technical conversations, decisions, trade-offs, constraints and handoffs** that might otherwise disappear when an AI chat reaches its context limit. This is *not* a task backlog, technical source of truth, change authorization, raw transcript or replacement for `TODO.md`.

**Maintaining this log:** [Daily minutes rule](../../.agents/rules/session-minutes.md). Use one file per active **Europe/Vilnius calendar day**, `YYYY-MM-DD.md`. Append meaningful updates throughout a working day and before any chat/agent switch. Capture the substance of long user prompts, including `do not` and `not yet` constraints, contrasting options and motivations.

**Current handoff, 2026-11-12:** [Chamber developer-lab program](../engineering/chamber-program.md) and [technical scenario protocol](../technical/chamber-lab-protocol.md) now join the frontend initiative; start with CH01/CH02 if owner later authorizes Chamber implementation.  The React/Next W01–W22 and newly selected **Chamber laboratory CH01–CH16** designs are specified; **no implementation Change is active**. ChatGPT does architectural investigation/review, cheap Cursor implements a selected Change using its **first-screen brief → nearest source README → exact symbols**. [Source map entry](../../apps/web/README.md), [verification stages](../engineering/frontend-execution-playbook.md#4-verification-ladder-stop-checking-every-keystroke). Read the **latest numbered minute near the end** only if the owner’s rationale is needed; do not load the entire day's historical stream into Cursor.

## Days

| Date | Main topics | Outcome / status |
| --- | --- | --- |
| [2026-11-12](2026-11-12.md) | React W01–W22, selected Chamber C01–C16/CH01–CH16, Cursor source maps and safe tooling | **38 dossiers** (W12 superseded; 16 CH proposed), none active; no running Chamber proof yet |
| [2026-11-11](2026-11-11.md) | Harness/knowledge, Feature→Change redesign, portfolio direction, target-first React/Next planning | Historical reconstruction from discussions and commits; no active coding Change |

## Fresh-chat handoff (read selectively)

1. For "where did we leave off?", start with the **most recent minutes file** and its closing checkpoint; follow yesterday's note if it references an unresolved decision. Do not load all past days or treat an old suggestion as approved.
2. [`TODO.md`](../../TODO.md) owns the **current strategic direction**, [`docs/changes/README.md`](../changes/README.md) owns active/parked/proposed implementation work, and [engineering targets/audits](../engineering/targets/README.md) own agreed or proposed design and source-gaps. These are the durable **working owners**.
3. Minutes explain **why** decisions were made and retain incomplete owner thoughts or deferred ideas that were deliberately not promoted into execution. Check current owner directions when entries conflict.

A future agent should be able to answer: *what matters now, why, what was decided, what was declined, what was actually committed/tested, and which decision still needs the owner?* If any of those are missing, append a concise dated correction.
