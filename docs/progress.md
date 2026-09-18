# Implementation overview

**Current focus:** implementation of the shortest playable DM loop and review of its long-story context boundary. Direct immediate-action receipts are implemented. The next runtime slice is bounded emergent story facts and quantity prerequisites. The [memory proposal](features/2026-09-18--20-09--storyteller-memory-and-recall/FEATURE.md) identifies concrete limitations in the current note window and defines a later phased extension for review.

**Lifecycle:** pre-POC, solo development on `main`. Live inference remains disabled. Provider adapters and accounting exist, but no live route, balance or model quality is verified. A stored key and the original $10 deposit are not authorization to spend.

## Implemented boundary

| Area | Exists now | Important limit |
| --- | --- | --- |
| Workspace | Next.js web, NestJS API, Temporal worker/workflows, PostgreSQL; shared game, contracts, application and Storyteller packages | See the code map for actual wiring; architecture specifications also describe unbuilt capabilities |
| Identity and creation | Stored sessions, GitHub OAuth integration, owned versioned drafts, profile selection, persistent opening review and idempotent Start | Real OAuth needs credentials/manual verification; local Chamber supplies a development session |
| Narrative rehearsal | Authored opening, choices, continuity notes, saved waits, pause/resume, story list and history | Exercises persistence and UI, not arbitrary-premise generation |
| Mechanical actions | Public offers backed by immutable private immediate-action plans; direct exactly-once automatic/check receipts; saved effects and recoverable consequence narration | Plans are authored; generated DM turns are not connected |
| Mechanical policy | Pure validation of shape, evidence, declared facts/quantities, abilities and skills; modifiers derived from character state | No scoped new fact declaration or generated plan publication; ungrounded situational modifiers rejected |
| Character capabilities | Selected D&D scores plus currently applicable abilities and declared skills/proficiencies | No generated character setup or admitted capability-changing transformation |
| Content | Validated JSON mechanical seeds, narrative rehearsal and creative profiles; server-supplied mechanical catalogue summaries | No species/world-specific engine branches; fixtures do not establish general world understanding |
| Time and settings | Narrative prepared intervals; separate mechanical tick/cadence machinery and rational pacing; editable/lockable creative and speed settings | Duration-based activity completion is under redesign; full tag definition/application contract is incomplete |
| Storyteller tasks | Opening, continuation and consequence tasks; bounded context, immutable requests, result validation, execution, publication and recovery | No bounded tool runner or DM-generated mechanical options yet |
| Context | Recent passages plus mandatory source-backed notes; consistency and overflow rejection | Every note source is mandatory raw input; no archived-memory lookup or scene/entity retrieval. The 20-note/48-KiB limits do not establish long-story recall |
| Provider/accounting | Explicit opt-in adapter, persistent reservations/settlement, uncertainty stop, injected fake transport | Offline only; no verified real spending or operator provisioning/reconciliation UI |
| Exploration | Local Chamber inspection, manual QA catalogue, durable run/evidence records and sanitized export | Rich trace explorer and planned fault/mechanical scenarios remain unfinished |
| World/showcase | Small authored transfer and chronology examples | General inventory/combat/travel, shared worlds, notifications and public visitor onboarding remain unimplemented |

## Where to resume feature work

The [playable DM adjudication loop plan](features/2026-09-18--17-21--playable-dm-adjudication-loop/PLAN.md) owns the immediate implementation checkpoint. Offer-local private plans and pure proposal diagnostics exist. Remaining work includes direct exactly-once mechanical resolution, scoped fact admission, one bounded generated DM turn and connecting generated opening/consequence plans to the player flow. A direct-context first slice does not replace the owner-requested pre-narrative exploration design; that follow-up has its own phased memory plan.

Immediate selection now resolves directly without an activity row or tick advance. Its receipt, optional roll, effects, consumed offer and follow-up commit before a separate worker operation prepares narration, so preparation failure cannot roll back or reroll the action. The next DM-loop boundary is bounded emergent story facts and quantity prerequisites, followed by one generated DM turn.

For continuing-life play, the [memory implementation proposal](features/2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md) is the follow-up: first separate durable provenance from loaded source text, then add bounded scene/identity retrieval and scoped pre-narrative exploration. Compact orientation supplies registry slices, useful historical leads and tool guidance; the DM may investigate before composing. Optional semantic retrieval has an explicit investigation gate. The technical phases are a draft, not implementation authorization. A generic agent framework remains deferred; targeted retrieval must be demonstrated before claiming multi-day continuity.

The [offline acceptance contract](engineering/offline-poc-acceptance.md) defines the manual flow and responsibility-specific probes. The [trace explorer](features/2026-09-18--17-27--storyteller-trace-explorer/FEATURE.md) remains planned. Contribution-based activities, spatial movement and richer rule domains are separate designs; do not turn an example's duration, anatomy or currency into a universal mechanic.

Navigation follow-up should examine story timing/recovery and database record relationships next. Normal HTTP story composition currently passes through the Chamber wrapper; document its actual authorization and delegation before any later separation. No restructuring is implemented by this note.

## What can be tried

Launch `pnpm chamber` and use `/stories` to select a storyteller, save a draft, review an authored opening and Start. Narrative rehearsal can exercise saved choices, continuity, waits and return visits. Select mechanical content in opening review to inspect authored actions and dice consequences. `/demo` is a separate browser-only presentation prototype with manual time and reset-on-refresh state.

Use [development](development.md) for setup and [QA journeys](engineering/qa-journeys.md) for manual evidence recording. An authored rehearsal is not proof of a functioning generative DM.

## Verification evidence and limits

The latest runtime/content change (`815d92c`) reported successful contracts, Storyteller, application, API and web builds, plus 24 offline Storyteller tests. Prior pure game verification reported 11 passing tests. Earlier narrative integrations exercised PostgreSQL/Temporal/browser flows, but were not repeated after the latest mechanical/content changes. No complete generated mechanical playthrough or agent-tool rehearsal has been demonstrated. This navigation pass runs no builds or tests.

Checks remain optional under [verification policy](../.agents/rules/verification.md). Historical build failures that were subsequently fixed are not current blockers. Passing compilation or scripted tests does not certify meaningful agency, live continuity, prose quality or general mechanics.

Live evaluation requires the owner to reopen it explicitly under [spending rules](../.agents/rules/spending.md), after offline flow/trace work and a concrete bounded evaluation design. No provider calls occurred in this pass: $0 provider spend; cumulative account usage unverified.
