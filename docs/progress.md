# Implementation overview

**Next action:** Run one bounded `storyteller.v16` warehouse-path confirmation from a fresh Seyda opening, then continue a 10–15-turn acceptance campaign only if no settled reward/state effect is replayed into unrelated fresh plans. Keep the established 16,000-input/4,096-output and USD 0.11 operation limits, release and reconcile one call at a time, and require durable identity or relationship change plus later recall. The first sustained v15 campaign stopped honestly at turn four: its warehouse activity paid six septims once after 14 deterministic intervals, but every newly generated next plan incorrectly repeated the `+6 septims` effect. The two new calls cost USD 0.076090; all attempts matched with zero reservations or uncertainty, and the active development funding window stands at USD 0.653820 settled. v16 adds a narrow no-replay instruction and rejects a settled effect repeated across every fresh plan. Gameplay quality remains judged against the exact story and Storyteller configuration; UI polish is lower priority.

The connected acceptance target is the [generative POC proof](engineering/connected-poc-proof.md): an owner-enjoyable 10–15-turn Seyda campaign with choice, mechanics, elapsed time, durable reward, canonical change and later recall. The [gold session](technical/playthroughs/harbor-session.md) remains the deterministic mechanics/time oracle; Seyda Neen is the first generated experience proof.

**Lifecycle:** Pre-POC, solo development on `main`. Deliberate bounded local use of verified OpenRouter free models is authorized for gameplay; paid calls need separate authorization. Checks are optional per [verification policy](../.agents/rules/verification.md).

## Reorientation checkpoint — 2026-09-24

The POC already has a genuine generated Storyteller path, deterministic mechanics/time/effects, pinned content, canonical documents, bounded retrieval infrastructure, accounting and recovery. Ordinary gameplay still defaults to a one-shot task with tools disabled; the richer multi-round exploration machinery exists but has not yet earned default use through gameplay evidence. The current proof gap is not “build an agent framework.” It is sustained, configuration-faithful play: a current-contract 10–15-turn Seyda campaign with durable identity/relationship change and later recall.

The priority order is: (1) a 5–10-turn diagnostic path followed by the 10–15-turn acceptance run; (2) durable information/relationship state and return recall; (3) activate the dormant canon-invention dossier before a 30–50-turn private-world evaluation; (4) compare one-shot generation with bounded exploration only when a turn genuinely benefits from research. Typed-state outcome coherence and its first live probe are complete. General calendar expansion, broader world simulation and UI polish remain deferred. The engine stays creatively unopinionated: pace, flavor, initiative and invention freedom come from world/story/Storyteller configuration, and evaluations must score against those captured settings rather than a universal idea of fun.

A context-window review against current provider guidance confirmed the intended request model: rebuild each round from authoritative state and a bounded retained working set, reserve reasoning/output headroom before dispatch, stop optional exploration at a soft threshold, and never rely on crossing the route's hard context boundary. The runtime already owns cumulative operation limits, final-round reservation and deterministic evidence repacking. Remaining refinement is better round-boundary budget telemetry and, where an adapter supports it without a hidden model call, exact rendered-token preflight; neither blocks the next sustained-play proof. Provider-native compaction is only a possible operation-local optimization, never canonical story memory.

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
| Storyteller tasks | Opening, continuation, consequence and report-only contracts; bounded context, multi-round retrieval, execution, publication and recovery; v16 settled-effect replay protection, v15 complete frozen finite/process outcomes and new-passage note provenance, v13 compact note rewriting, v12 branch-specific fact transitions, v11 nonzero effects, state-indexed plan prerequisites and compact compiled mechanical openings | Model compliance with the v16 instruction, fresh nonempty model-authored transitions, sustained play and later-recall publication remain unproved; full mechanical plans can still consume substantial input/output budget |
| Context | Recent passages plus mandatory source-backed notes; bounded exact world/rule sections and campaign documents | No archived-memory query, automatic returning-identity selection or semantic retrieval |
| Provider/accounting | Explicit opt-in adapter, durable reservations, usage windows, dispatch authority recheck, safe blocker projection; captured one-shot/repairable recipes; explicit same-operation repair and fake-provider publication evidence; reviewed local Story input/output/cost caps; stable context-exhaustion admission reason | Commercial authority selection and the broader failure/hold QA matrix remain |
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
