# Implementation overview

**Current focus:** implement the experience-first POC roadmap, beginning with [Storyteller agency and taste](features/2026-09-19--00-26--storyteller-agency-and-taste/FEATURE.md). The offline mechanical source now replaces generic assess loops with authored state-responsive pineapple and microbe plans, while unknown seeds hold honestly. The next slice is player-facing commitment/risk presentation and a persisted browser review. The later [earned-time loop](features/2026-09-19--00-26--earned-time-playable-loop/FEATURE.md), [bounded autonomy](features/2026-09-19--00-26--bounded-autonomy-and-reentry/FEATURE.md), [inhabitable return](features/2026-09-19--00-26--inhabitable-play-and-return/FEATURE.md), and [premise-driven setup](features/2026-09-19--00-26--premise-to-playable-campaign/FEATURE.md) remain approved roadmap work, not implemented behavior.

**Lifecycle:** pre-POC, solo development on `main`. Live inference remains disabled. Provider adapters and accounting exist, but no live route, balance or model quality is verified. A stored key and the original $10 deposit are not authorization to spend.

## Implemented boundary

| Area | Exists now | Important limit |
| --- | --- | --- |
| Workspace | Next.js web, NestJS API, Temporal worker/workflows, PostgreSQL; shared game, contracts, application and Storyteller packages | See the code map for actual wiring; architecture specifications also describe unbuilt capabilities |
| Identity and creation | Stored sessions, GitHub OAuth integration, owned versioned drafts, profile selection, persistent opening review and idempotent Start | Real OAuth needs credentials/manual verification; local Chamber supplies a development session |
| Narrative rehearsal | Authored opening, choices, continuity notes, saved waits, pause/resume, story list and history | Exercises persistence and UI, not arbitrary-premise generation |
| Mechanical actions | Generated public offers backed by immutable private immediate-action plans; direct exactly-once automatic/check receipts; saved effects and recoverable consequence narration; offline pineapple plans change with committed cover and discovered-delivery facts | The behavior is fixture evidence, not general Storyteller intelligence; consecutive persisted browser rounds and human taste remain unverified |
| Mechanical policy | Pure validation of shape, evidence, character/story facts, quantity minimums, abilities and skills; explicit story-fact declaration with receipt provenance; modifiers derived from character state | No generated plan publication or story-fact update/retirement; ungrounded situational modifiers rejected |
| Character capabilities | Selected D&D scores plus currently applicable abilities and declared skills/proficiencies | Mechanical creation still begins from developer-authored character seeds; no admitted capability-changing transformation |
| Content | Validated JSON mechanical seeds, narrative rehearsal and creative profiles; server-supplied mechanical catalogue summaries | No species/world-specific engine branches; fixtures do not establish general world understanding |
| Time and settings | Narrative prepared intervals; separate mechanical tick/cadence machinery and rational pacing; editable/lockable creative and speed settings | Duration-based activity completion is under redesign; full tag definition/application contract is incomplete |
| Storyteller tasks | Opening, continuation and consequence tasks; mechanical opening and consequence return freshly validated private plans; bounded context, immutable requests, execution, publication and recovery | Offline source contains explicit benchmark branches and holds unknown mechanical seeds; no pre-narrative retrieval rounds or live-model quality evidence yet |
| Context | Recent passages plus mandatory source-backed notes; consistency and overflow rejection | Every note source is mandatory raw input; no archived-memory lookup or scene/entity retrieval. The 20-note/48-KiB limits do not establish long-story recall |
| Provider/accounting | Explicit opt-in adapter, persistent reservations/settlement, uncertainty stop, injected fake transport | Offline only; no verified real spending or operator provisioning/reconciliation UI |
| Exploration | Local Chamber inspection, manual QA catalogue, durable run/evidence records and sanitized export | Rich trace explorer and planned fault/mechanical scenarios remain unfinished |
| World/showcase | Small authored transfer and chronology examples | General inventory/combat/travel, shared worlds, notifications and public visitor onboarding remain unimplemented |

## Where to resume feature work

The [playable DM adjudication loop plan](features/2026-09-18--17-21--playable-dm-adjudication-loop/PLAN.md) remains paused as a standalone infrastructure track. Its authority work is now consumed by the active [agency/taste plan](features/2026-09-19--00-26--storyteller-agency-and-taste/PLAN.md): offer-local private plans, direct resolution, scoped fact admission and bounded opening/consequence planning support state-shaped offline turns. Continue through the experience roadmap rather than completing mechanical subsystems in isolation.

Immediate selection resolves directly without an activity row or tick advance. Its receipt, optional roll, effects, story-fact declarations, consumed offer and follow-up commit before a separate worker operation prepares a DM turn. Mechanical opening review now projects freshly proposed plans and Start stores those exact private plans. Consequence publication independently revalidates its plans and stores their public projection atomically with the new passage. This is an execution kernel, not yet evidence of an enjoyable or time-dependent game.

For continuing-life play, the [memory implementation proposal](features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md) is the follow-up: first separate durable provenance from loaded source text, then add bounded scene/identity retrieval and scoped pre-narrative exploration. Compact orientation supplies registry slices, useful historical leads and tool guidance; the DM may investigate before composing. Optional semantic retrieval has an explicit investigation gate. The technical phases are a draft, not implementation authorization. A generic agent framework remains deferred; targeted retrieval must be demonstrated before claiming multi-day continuity.

The [offline acceptance contract](engineering/offline-poc-acceptance.md) defines the manual flow and responsibility-specific probes. The [trace explorer](features/2026-09-18--17-27--storyteller-trace-explorer/FEATURE.md) remains planned. Contribution-based activities, spatial movement and richer rule domains are separate designs; do not turn an example's duration, anatomy or currency into a universal mechanic.

Navigation follow-up should examine story timing/recovery and database record relationships next. Normal HTTP story composition currently passes through the Chamber wrapper; document its actual authorization and delegation before any later separation. No restructuring is implemented by this note.

## What can be tried

Launch `pnpm chamber` and use `/stories` to select a storyteller, save a draft, review an opening and Start. Narrative rehearsal can exercise saved choices, continuity, waits and return visits. Select mechanical content in opening review to inspect generated offline plans and dice consequences. `/demo` is a separate browser-only presentation prototype with manual time and reset-on-refresh state.

Use [development](development.md) for setup and [QA journeys](engineering/qa-journeys.md) for manual evidence recording. An authored rehearsal is not proof of a functioning generative DM.

## Verification evidence and limits

For the current agency/taste slice, the Storyteller build passes, 27 Storyteller tests pass, and the API integration TypeScript build passes. The updated three-round integration now asserts that taking cover produces a different investigative offer, but the PostgreSQL/Temporal/browser scenario was not executed in this slice. No complete generated mechanical browser playthrough or agent-tool rehearsal has been demonstrated.

Checks remain optional under [verification policy](../.agents/rules/verification.md). Historical build failures that were subsequently fixed are not current blockers. Passing compilation or scripted tests does not certify meaningful agency, live continuity, prose quality or general mechanics.

Live evaluation requires the owner to reopen it explicitly under [spending rules](../.agents/rules/spending.md), after offline flow/trace work and a concrete bounded evaluation design. No provider calls occurred in this pass: $0 provider spend; cumulative account usage unverified.
