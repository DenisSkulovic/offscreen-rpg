# Implementation overview

**Current focus:** implement the [earned-time playable loop](features/2026-09-19--00-26--earned-time-playable-loop/FEATURE.md). Its runtime separates elapsed clock progress from contribution, resolves and records a D&D check at each productive boundary, and derives a conditional completion estimate from expected contribution. The beacon benchmark can now enter that runtime from a normal private playable plan; interruption/resumption and end-to-end completion evidence remain next. The [Storyteller agency and taste](features/2026-09-19--00-26--storyteller-agency-and-taste/FEATURE.md) structural gates are implemented and verified, with only owner taste judgment outstanding. [Bounded autonomy](features/2026-09-19--00-26--bounded-autonomy-and-reentry/FEATURE.md), [inhabitable return](features/2026-09-19--00-26--inhabitable-play-and-return/FEATURE.md), and [premise-driven setup](features/2026-09-19--00-26--premise-to-playable-campaign/FEATURE.md) remain approved roadmap work, not implemented behavior.

**Lifecycle:** pre-POC, solo development on `main`. Live inference remains disabled. Provider adapters and accounting exist, but no live route, balance or model quality is verified. A stored key and the original $10 deposit are not authorization to spend.

## Implemented boundary

| Area | Exists now | Important limit |
| --- | --- | --- |
| Workspace | Next.js web, NestJS API, Temporal worker/workflows, PostgreSQL; shared game, contracts, application and Storyteller packages | See the code map for actual wiring; architecture specifications also describe unbuilt capabilities |
| Identity and creation | Stored sessions, GitHub OAuth integration, owned versioned drafts, profile selection, persistent opening review and idempotent Start | Real OAuth needs credentials/manual verification; local Chamber supplies a development session |
| Narrative rehearsal | Authored opening, choices, continuity notes, saved waits, pause/resume, story list and history | Exercises persistence and UI, not arbitrary-premise generation |
| Mechanical actions | Generated public offers backed by immutable private immediate-action plans; direct exactly-once automatic/check receipts; saved effects and recoverable consequence narration; offline pineapple plans change with committed cover and discovered-delivery facts | The behavior is fixture evidence, not general Storyteller intelligence; the persisted three-round integration passes, while human taste remains unverified |
| Mechanical policy | Pure validation of shape, evidence, character/story facts, quantity minimums, abilities and skills; explicit story-fact declaration with receipt provenance; modifiers derived from character state | No generated plan publication or story-fact update/retirement; ungrounded situational modifiers rejected |
| Character capabilities | Selected D&D scores plus currently applicable abilities and declared skills/proficiencies | Mechanical creation still begins from developer-authored character seeds; no admitted capability-changing transformation |
| Content | Validated JSON mechanical seeds, narrative rehearsal and creative profiles; server-supplied mechanical catalogue summaries | No species/world-specific engine branches; fixtures do not establish general world understanding |
| Time and settings | Narrative prepared intervals; exact mechanical clock/cadence state; playable contribution admission with rule-owned progress/completion; editable/lockable creative and speed settings | Only the authored beacon benchmark starts a process; interruption resumption, named-capacity concurrency and other process families are unimplemented |
| Storyteller tasks | Opening, continuation and consequence tasks; mechanical opening and consequence return freshly validated private plans; bounded context, immutable requests, execution, publication and recovery | Offline source contains explicit benchmark branches and holds unknown mechanical seeds; no pre-narrative retrieval rounds or live-model quality evidence yet |
| Context | Recent passages plus mandatory source-backed notes; consistency and overflow rejection | Every note source is mandatory raw input; no archived-memory lookup or scene/entity retrieval. The 20-note/48-KiB limits do not establish long-story recall |
| Provider/accounting | Explicit opt-in adapter, persistent reservations/settlement, uncertainty stop, injected fake transport | Offline only; no verified real spending or operator provisioning/reconciliation UI |
| Exploration | Local Chamber inspection, manual QA catalogue, durable run/evidence records and sanitized export | Rich trace explorer and planned fault/mechanical scenarios remain unfinished |
| World/showcase | Small authored transfer and chronology examples | General inventory/combat/travel, shared worlds, notifications and public visitor onboarding remain unimplemented |

## Where to resume feature work

The [playable DM adjudication loop plan](features/2026-09-18--17-21--playable-dm-adjudication-loop/PLAN.md) remains paused as a standalone infrastructure track. Its authority work is now consumed by the active [agency/taste plan](features/2026-09-19--00-26--storyteller-agency-and-taste/PLAN.md): offer-local private plans, direct resolution, scoped fact admission and bounded opening/consequence planning support state-shaped offline turns. Continue through the experience roadmap rather than completing mechanical subsystems in isolation.

Immediate selection resolves directly without an activity row or tick advance. Its receipt, optional roll, effects, story-fact declarations, consumed offer and follow-up commit before a separate worker operation prepares a DM turn. Mechanical opening review now projects freshly proposed plans and Start stores those exact private plans. Consequence publication independently revalidates its plans and stores their public projection atomically with the new passage. This is an execution kernel, not yet evidence of an enjoyable or time-dependent game.

The same opaque public attempt can now reference a private contribution-process plan. Selection atomically consumes the offer, records a zero-progress running commitment with captured settings/pace, and schedules its first boundary; it does not create an immediate receipt or grant the completion reward. The current campaign record still permits only one active commitment even though content names a capacity. Interruption-to-DM handoff and explicit resumption remain the next playable boundary.

For continuing-life play, the [memory implementation proposal](features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md) is the follow-up: first separate durable provenance from loaded source text, then add bounded scene/identity retrieval and scoped pre-narrative exploration. Compact orientation supplies registry slices, useful historical leads and tool guidance; the DM may investigate before composing. Optional semantic retrieval has an explicit investigation gate. The technical phases are a draft, not implementation authorization. A generic agent framework remains deferred; targeted retrieval must be demonstrated before claiming multi-day continuity.

The [offline acceptance contract](engineering/offline-poc-acceptance.md) defines the manual flow and responsibility-specific probes. The [trace explorer](features/2026-09-18--17-27--storyteller-trace-explorer/FEATURE.md) remains planned. Contribution-based activities, spatial movement and richer rule domains are separate designs; do not turn an example's duration, anatomy or currency into a universal mechanic.

Navigation follow-up should examine story timing/recovery and database record relationships next. Normal HTTP story composition currently passes through the Chamber wrapper; document its actual authorization and delegation before any later separation. No restructuring is implemented by this note.

## What can be tried

Launch `pnpm chamber` and use `/stories` to select a storyteller, save a draft, review an opening and Start. Narrative rehearsal can exercise saved choices, continuity, waits and return visits. Select mechanical content in opening review to inspect generated offline plans and dice consequences. `/demo` is a separate browser-only presentation prototype with manual time and reset-on-refresh state.

Use [development](development.md) for setup and [QA journeys](engineering/qa-journeys.md) for manual evidence recording. An authored rehearsal is not proof of a functioning generative DM.

## Verification evidence and limits

For the current earned-time work, 28 Storyteller tests and 18 game tests pass. Storyteller, game, application, web and API-integration builds pass. The focused PostgreSQL/Temporal Storyteller integration passes 10/10, including atomic beacon-process admission with zero initial contribution and no premature reward. Earlier `pnpm chamber:review` evidence covers the immediate mechanical flow, not this beacon process. This proves wiring and persistence, not the interruption/resumption experience or writing quality; no owner taste review or wall-clock return rehearsal has been demonstrated.

Checks remain optional under [verification policy](../.agents/rules/verification.md). Historical build failures that were subsequently fixed are not current blockers. Passing compilation or scripted tests does not certify meaningful agency, live continuity, prose quality or general mechanics.

Live evaluation requires the owner to reopen it explicitly under [spending rules](../.agents/rules/spending.md), after offline flow/trace work and a concrete bounded evaluation design. No provider calls occurred in this pass: $0 provider spend; cumulative account usage unverified.
