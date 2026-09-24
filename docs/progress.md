# Implementation overview

**Next action:** Move from opening-only structural work into a bounded 5-turn Seyda diagnostic, one call and reconciliation at a time, specifically observing whether selected intentions actually resolve, newly established information becomes durable, and later choices respect it. `storyteller.v12` is implemented and live-valid: generation `7415d287-7c03-475f-ab8f-887c37c25799` passed native strict transport and semantic admission with five plans. Fresh plans supplied the required transition lists; the exact authorized directions plan carried its success-only route-known transition and matching effect. The sample did not generate a fresh nonempty transition, so model-authored movement coherence remains unproved. It also exposed the more immediate gameplay findings that “Ask the clerk” promises to judge an explanation but its automatic outcome only says the exchange *may* reveal one, while inspecting the real cargo discrepancy establishes no durable story fact. Diagnose those in connected play before adding another schema or prompt warning. The call settled at 23,294 microusd with matched local accounting and zero persistent reservations; OpenRouter's account-total endpoint still showed the pre-call USD 0.675055 immediately afterward, so account-level reporting is lagging and no further provider call ran. Gameplay quality remains judged against the exact story and Storyteller configuration. UI polish is lower priority.

The connected acceptance target is the [generative POC proof](engineering/connected-poc-proof.md): an owner-enjoyable 10–15-turn Seyda campaign with choice, mechanics, elapsed time, durable reward, canonical change and later recall. The [gold session](technical/playthroughs/harbor-session.md) remains the deterministic mechanics/time oracle; Seyda Neen is the first generated experience proof.

**Lifecycle:** Pre-POC, solo development on `main`. Deliberate bounded local use of verified OpenRouter free models is authorized for gameplay; paid calls need separate authorization. Checks are optional per [verification policy](../.agents/rules/verification.md).

## Reorientation checkpoint — 2026-09-24

The POC already has a genuine generated Storyteller path, deterministic mechanics/time/effects, pinned content, canonical documents, bounded retrieval infrastructure, accounting and recovery. Ordinary gameplay still defaults to a one-shot task with tools disabled; the richer multi-round exploration machinery exists but has not yet earned default use through gameplay evidence. The current proof gap is not “build an agent framework.” It is sustained, configuration-faithful play: a current-contract 10–15-turn Seyda campaign with durable identity/relationship change and later recall.

The priority order is: (1) a 5–10-turn diagnostic path followed by the 10–15-turn acceptance run; (2) durable information/relationship state and return recall; (3) activate the dormant canon-invention dossier before a 30–50-turn private-world evaluation; (4) compare one-shot generation with bounded exploration only when a turn genuinely benefits from research. Typed-state outcome coherence and its first live probe are complete. General calendar expansion, broader world simulation and UI polish remain deferred. The engine stays creatively unopinionated: pace, flavor, initiative and invention freedom come from world/story/Storyteller configuration, and evaluations must score against those captured settings rather than a universal idea of fun.

## Implemented boundary

| Area | Exists now | Important limit |
| --- | --- | --- |
| Workspace | Next.js web, NestJS API, Temporal worker/workflows, PostgreSQL; shared game, contracts, application and Storyteller packages | See the [code map](engineering/code-navigation.md) for actual wiring; architecture specs also describe unbuilt capabilities |
| Identity and creation | Stored sessions, GitHub OAuth integration, owned versioned drafts, profile selection, persistent opening review and idempotent Start | Real OAuth needs credentials/manual verification; local Chamber supplies a development session |
| Narrative rehearsal | Authored opening, choices, continuity notes, saved waits, pause/resume, story list and history | Exercises persistence and UI, not arbitrary-premise generation |
| Mechanical actions | Generated public offers backed by immutable private plans; automatic/check choices expose authored durations and become durable finite executions | Browser experience, actor/site occurrence scope and irrecoverable target invalidation remain separate work; human taste is unverified |
| Mechanical policy | Pure validation of shape, evidence, character/story facts, quantity minimums, abilities and skills; explicit story-fact declaration with receipt provenance | No general rule/target invention or story-fact update/retirement |
| Character capabilities | Selected D&D scores plus currently applicable abilities and declared skills/proficiencies | Mechanical creation still begins from developer-authored character seeds |
| Content | Validated JSON mechanical seeds, narrative rehearsal and creative profiles; server-supplied mechanical catalogue summaries | No species/world-specific engine branches; fixtures do not establish general world understanding; per-domain canon-invention ceilings and story choices are specified but not implemented |
| Time and settings | Campaign-owned mechanical clock, calendar projection, finite world obligations, activity/finite-action execution gate, pause/resume/pace controls | Explicit abandonment, named-capacity concurrency and broader process families are unimplemented |
| Storyteller tasks | Opening, continuation, consequence and report-only contracts; bounded context, multi-round retrieval, execution, publication and recovery; v12 branch-specific fact transitions, v11 nonzero effects, state-indexed plan prerequisites and compact compiled mechanical openings | One v12 opening is live-valid; fresh nonempty model-authored transitions, intention resolution, sustained play and later-recall publication remain unproved |
| Context | Recent passages plus mandatory source-backed notes; bounded exact world/rule sections and campaign documents | No archived-memory query, automatic returning-identity selection or semantic retrieval |
| Provider/accounting | Explicit opt-in adapter, durable reservations, usage windows, dispatch authority recheck, safe blocker projection; captured one-shot/repairable recipes; explicit same-operation repair and fake-provider publication evidence | Story-mode repair policy enablement, commercial authority selection and the broader failure/hold QA matrix remain |
| Exploration | Local Chamber inspection, manual QA catalogue, durable run/evidence records | Rich trace explorer and planned fault/mechanical scenarios remain unfinished |
| World/showcase | Small authored transfer and chronology examples | General inventory/combat/travel, shared worlds and public visitor onboarding remain unimplemented |

## Where to read more

| Topic | Owner |
| --- | --- |
| Coding route and active feature folders | [features/README.md](features/README.md) |
| Package entry points and flow maps | [code navigation](engineering/code-navigation.md), [application README](../packages/application/README.md) |
| Committed time and calendars | [committed-time](technical/committed-time.md), [calendars and world-time](technical/calendars-and-world-time.md) |
| Canonical files and memory | [canonical-files](technical/canonical-files.md), [long-story memory](engineering/long-story-memory-and-retrieval.md) |
| Storyteller runtime and cost | [storyteller-runtime](technical/storyteller-runtime.md), [context and cost](technical/context-and-cost.md) |
| Activities and autonomy | [rules and activities](technical/rules-and-activities.md), [bounded autonomy plan](features/2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md) |
| Open product choices | [questions](questions.md) |

## What can be tried

Launch `pnpm chamber` and use `/stories` to select a storyteller, save a draft, review an opening and Start. `/demo` is a separate browser-only presentation prototype. Use [development](development.md) for setup and [QA journeys](engineering/qa-journeys.md) for manual evidence recording. An authored rehearsal is not proof of a functioning generative DM.

## Verification evidence

Checks remain optional. Passing compilation or scripted tests does not certify meaningful agency, live continuity, prose quality or general mechanics. One live Gate-1 call verified the real OpenRouter transport and durable settlement path; further paid calls require separate authorization.
