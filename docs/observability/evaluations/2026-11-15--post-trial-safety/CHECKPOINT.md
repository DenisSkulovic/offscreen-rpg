# Cursor resumption checkpoint | Local live safety

**OBS00-L DONE (2026-11-15).** Next phase is OBS00-C as the owner's one authorized Change. Previous S0–S6 budget permission does **not** carry over.

- Source baseline: OBS00-L built on `main@52a3c6d8a50c365e731ca0dc7507d5baeb65e9e4` (OBS00-L commit SHA recorded in Git log / return message)
- Active Change: none (cleared after OBS00-L)
- Latest finished: [OBS00-L](../../../changes/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md), receipt [obs00-l](../../evidence/obs00-l-local-story-trial-guards-2026-11-15.md)
- Next recommended Change: [OBS00-C](../../../changes/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md) (**not started**)
- After OBS00-C: [QA-SF01](../../../changes/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md)
- Paid local Story trial: **NOT AUTHORIZED** until owner approves a new explicit cap and OBS00-C is Done
- Total actual provider attempts this wave: 0 real (mock only)
- Spend: $0; external HTTP: 0
- Last result: chamber suite 20/20 pass; OBS00-L restart-denial and SQL trial cap (4 attempts / 250,000 µusd) proven on disposable PostgreSQL
- Known limit: real `story:server` launch not exercised (needs live OpenRouter reads); `main.ts` wiring covered by build/typecheck only. Owner `offscreen_story_local` untouched; if its account is already stopped, `--story-mode` now refuses live start.
- Next exact action: `git status --short; git rev-parse HEAD; pnpm repo:brief`, set Current change to OBS00-C, read OBS00-C CHANGE.md plus `openrouter.ts::{inspectOpenRouterRequest,buildOpenRouterRequest,createOpenRouterProvider}`, `dispatch-review.ts`, memory-provider-runtime; use injected fake `transport`, no live network.
- Next evidence commit: OBS00-C receipt

### End each Cursor session with

~~~text
Current UTC:
Selected Change / status:
Git source SHA and current branch:
Command actually executed, exit, elapsed:
Normal source/SQL proof (ID, hash/amount):
Negative source/SQL proof:
External requests / settled / uncertain and remaining cap:
New files and committed Git SHA:
Next one selected Change or safe evaluation:
NEXT EXACT COMMAND:
~~~

**Do not confuse "future intended tests" with actual results.** If owner declines paid provider, stop at provider-free proof and report that honestly.
