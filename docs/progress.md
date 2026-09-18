# Implementation overview

This is the current project snapshot. Product documents define the experience, technical documents define its contracts, and tests establish the implemented boundary. Keep proposed behavior distinct from verified behavior.

**Current phase:** implement and exercise the solo storyteller POC with local/scripted substitutes. The owner authorized Codex to implement the storyteller features on 2026-09-18. Live inference remains disabled. The OpenRouter adapter and persistent budget controls exist, but no live route, allowance or provider quality has been verified. The original $10 deposit is not a verified balance.

## Coverage

| Area | Current implementation | Boundary |
| --- | --- | --- |
| Workspace and infrastructure | TypeScript monorepo; PostgreSQL, Temporal, web/API/worker; sequential build and selected integration tooling. | Local Windows development. Hosted delivery remains separate work. |
| Identity | Stored sessions, private pages, OAuth initiation, revocation and local developer launcher. | Real GitHub sign-in requires credentials/manual verification; no invitations or membership. |
| Creation | Owned versioned drafts, profile selector, persistent reviewed opening, explicit idempotent Start. Candidate captures profile/configuration; story freezes the selected candidate. | Two JSON profile examples. Offline scenes are authored, not arbitrary-premise generation. |
| Game rules | `@offscreen/game` owns framework-free state, d20 resolution, effects, offers, activities and tick arithmetic. Contracts and application code consume that single authority. | Current duration-driven activity model remains a prototype pending process/contribution design. |
| Storyteller runtime | Separate opening/continuation preparation, immutable context artifacts, execution, validation, accounting, publication and recovery. | No tool loop or graph framework. Additional task types can share the boundaries without expanding one agent prompt. |
| Choices and progression | Offered intentions resolve through durable generation and fenced atomic publication. Profiled offers require 2–5 distinct labels; no free-text gameplay or automatic life ending. | Narrative consequences only; no generated combat/economy/location effects. Legacy fixtures retain their own contracts. |
| Context and continuity | Bounded recent context plus mandatory source-backed notes; note creation/update/retirement; current and arrival notes publish with their respective passage. | Maximum 20 notes; no embeddings, general world census or semantic truth validator. Overflow holds rather than silently losing required evidence. |
| Time and autonomy | Prepared intervals, real waits, persisted pause/resume, reload/restart and arrival choices use existing story machinery. | Profiled quick-play waits are 20 seconds. Campaign pacing, general autonomy/defaults and mid-journey interruption policies remain separate. |
| Player entry and return | Owned live-story list, profile/source labels, saved history, pending/failure states and explicit retry or read-only refresh. | Local launcher supplies a normal authenticated session. Hosted visitor onboarding is absent. |
| Accounting/provider | Persistent account/run/attempt reservations, caps, exact integer settlement, dispatch uncertainty stop, no automatic retry/fallback, injected HTTP adapter. | Offline simulated evidence only. No operator provisioning/reconciliation UI or approved live execution policy. No real balance or pricing verification. |
| Chamber | Existing scenario catalogue and read-only inspection; profiled inspection adds private captured context and notes behind the local developer boundary. | Interactive fake outcomes, time-warp and fault controls remain later laboratory work. |
| QA journeys | Developer-only versioned case catalogue, durable owner-scoped runs, ordered immutable stage evidence, anchored human ratings, reload resume and sanitized JSON export. | Mechanical and fault-injection cases remain visibly planned; live-billable cases are server-blocked pending separate authorization and preflights. |
| World/shared play | Existing one checked item transfer, chronology and ownership. | No NPC/location census, multiplayer, spatial engine or general world effects. |
| Notifications/showcase | Design and local foundations. | Delivery, sponsored visitor admission, deployments and a public playable portfolio remain unimplemented. |

## Connected solo rehearsal

Launch `pnpm chamber`, navigate to `/stories`, choose a storyteller and create the pineapple/Gary premise. Review the opening and Start. Ask Gary, spend a quiet moment, walk to work, pause/resume, arrive, observe or return home. Reopen through the saved-story list and read previous passages. Fictional weapons and other scene details are prose, not implemented inventory/combat mechanics.

Both example profiles use the same runtime. Profile definitions are data; only the intentionally authored offline source contains scenario branches. Unrecognized premises are stored but receive a clear unadapted-rehearsal message. This demonstrates the application loop and architecture, not an open-ended generative game.

## Evidence and its limits

Production web/API dependency builds passed. AI tests passed 21, shared contract tests 7, and worker tests 4. The final sequential storyteller, Start and generated-resolution integration run passed all 21 checks, including the browser playthrough, retained old evidence, saved-output publication recovery and deferred arrival notes. Documentation links and Git whitespace checks passed. Test processes shut down normally.

The owner asked to stop spending effort chasing minor green checks. No further polish or broad audits were added. The last quality lint found one inline type-import issue, which was corrected; a final lint rerun was not performed.

The selected regression scope includes the profiled suite plus Start and generated-resolution integrations. It exercises the real PostgreSQL/Temporal/browser boundary without inference. The full auth suite is not rerun by default on this laptop. Automated structural checks cannot certify profile fidelity, meaningful live agency, enjoyable prose or sustained model continuity.

## Mechanical POC and customization — authored slice with tick clock

The mechanical checkpoint and subsequent architecture corrections are committed on `main`. The current activity implementation remains a prototype because its duration-driven progress model is under redesign.

New mechanical actions use integer ticks across captured content, durations/cadences, admission, workers, receipts, narration context and UI. Real pacing is ticks per real duration, with exact rational fractional progress retained across pause/resume and speed changes. Catch-up commits bounded batches before accepting controls. An interruption stops subsequent checks and completion effects. No human calendar, currency, profession or location is mandatory. Start recovery now compares the creation profile even after a storyteller switch.

The pineapple and microbe remain authored examples. Terminal outcomes use the existing consequence narrator, execution/accounting, publication and recovery path. The current code is **not a tool-using DM agent**: it can select among server-authored actions but cannot propose and admit new mechanical opportunities. The required tag contract is also incomplete: global `surprises`/`emphasis` and id/description-only tags remain. Context preparation still occurs inside mechanical settlement and can roll back valid outcomes if assembly fails.

The migration history is squashed to one current baseline. The intermediate schema steps and their millisecond/hour compatibility code were deleted. This pre-POC project resets discarded local data rather than carrying it into the architecture. Narrative prepared waits remain a separate current feature. No migration was applied.

Six pure clock tests passed through `node --test packages/game/test/tick-clock.test.mjs`. The game, contracts and AI packages compile. Server typechecking reaches the same two pre-existing exact-optional provenance errors in `story-command-policy.ts`; no integration/browser playthrough was run. A Node source-module detection warning remains. Earlier broader test evidence above applies to earlier code, not this patch.

The immediate mechanical loop now lets the storyteller select and present a contextual subset of server-admitted actions after each committed consequence. Publication persists the fresh offer, while later selection resolves the captured authoritative action definition. The focused storyteller test passes 6/6; server typechecking still reports two existing exact-optional provenance errors in `story-command-policy.ts`. This does not yet add the bounded evidence/rule-inspection tool runner or authorize generated long-running processes.

Next proposed slice: review the [playable DM adjudication loop](features/2026-09-18--17-21--playable-dm-adjudication-loop/FEATURE.md). It replaces authored action lookup with offer-local private plans, adds deterministic proposal validation and a bounded durable planning agent, then connects three immediate rounds through visible d20 consequences. Optional calendar presentation, full combat, long-running processes and resuming interrupted plans remain outside that slice.

## Current focus and next gate

The repository structure has now been reviewed against its actual dependency graph. Phase 1 of the [monorepo architecture rework](features/2026-09-18--17-58--monorepo-architecture-rework/FEATURE.md) establishes `@offscreen/game` as the framework-free owner of game rules before the DM loop adds private action plans. The remaining phases give the Storyteller and application layers honest names, group the flat application modules by capability, separate Chamber orchestration from the API build graph and thin the Next.js route tree. This remains a bounded reorganization toward the playable POC.

The proposed [playable DM loop plan](features/2026-09-18--17-21--playable-dm-adjudication-loop/PLAN.md) is the next continuation point. The earlier storyteller runtime, continuity, provider adapter, simulated accounting and local UI are foundations; generated mechanical planning and agent tools are not yet implemented. Any live evaluation remains a separate gate. Retained feature documents provide implementation/review contracts; they are not permission to spend.

The [QA journey system](engineering/qa-journeys.md) now defines the player-flow checks and records durable offline evidence. The next evaluation slice is the [trace explorer](features/2026-09-18--17-27--storyteller-trace-explorer/FEATURE.md), followed by [conservative live evaluation](features/2026-09-18--17-27--conservative-live-model-evaluation/FEATURE.md) for a tiny explicitly authorized OpenRouter probe only after dry-run, trace and accounting preflights pass.

Before the first paid run, define a concrete small evaluation, verify current route/pricing and actual remaining allowance, provision explicit account/run limits, and establish operator reconciliation/stop procedures. The owner must deliberately reopen live evaluation under [spending](../.agents/rules/spending.md). No automatic repairs, fallback routes, autonomous calls or model judges should be added to make an unsuccessful evaluation look better.

The later real playthrough must score profile adherence, intention fidelity, option diversity, continuity and readability against specific passages. A valid JSON response is not POC acceptance. If quality fails, retain the evidence and make the smallest targeted change.

## Deferred depth

The full Chamber laboratory, multiplayer, notifications, calendar presentation, richer interruptions and entity state and hosted onboarding remain separate product work. A coherent small solo game does not require detailed population simulation, interactive 3D maps or an agent per NPC. New complexity should earn its place through observed failures in the playable loop.

No live model calls occurred during this implementation. Provider spend is $0; cumulative OpenRouter account usage has not been verified. Local scripted testing remains the default.
