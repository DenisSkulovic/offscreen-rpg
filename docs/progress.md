# Implementation overview

## Orientation

**Status:** Local pre-POC. Real generated Storyteller play is connected; the sustained 10–15-turn experience is not yet proved. Gameplay evidence below is from September 24, 2026; the October 23 rediscovery inspected saved evidence and source without rerunning gameplay.

**What worked:** Six successful Sol generations in the latest recorded run, an exact 1,800-fictional-second warehouse shift, six septims paid once, and coherent short-term conversation. Deterministic mechanics, saved generation/publication, canonical storage and bounded provider accounting are connected.

**What failed:** The recurring clerk and mystery did not become durable documents or notes. Leaving the scene lost their recall context. Short-term coherence is not long-term memory.

**Next action:** Continue S3: carry explicit canonical-document dependencies from a mechanical offer into its consequence, then prove a maintained Socucius interaction survives unrelated play, departure and return. The [feature route](features/README.md#coding-route) selects the exact plan; no further paid play is needed for the dependency implementation.

## Evidence and limits

The [connected proof](engineering/connected-poc-proof.md#latest-evidence--2026-09-24) owns the dated run identity, measured outcomes and acceptance gaps. Its 10–15-turn target includes mechanics, elapsed time, durable change and later recall, judged against the captured Storyteller profile and campaign direction. The [gold session](technical/playthroughs/harbor-session.md) is a deterministic mechanics/time oracle, not live-model quality evidence.

The saved v16 trajectory ends at fictional second 2,015 with local story-scoped usage of USD 0.198915 and zero reservation. The prior checkpoint recorded USD 0.852735 settled for that development day; neither number is today's provider balance or a new authorization. This rediscovery made no provider calls and did not reverify the external account.

**Lifecycle:** Pre-POC, solo development on `main`, disposable local data. Checks are optional under [verification policy](../.agents/rules/verification.md). All inference follows the existing [spending authority and reconciliation rules](../.agents/rules/spending.md).

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
| Storyteller tasks | Opening, continuation, consequence and report-only contracts; bounded context, multi-round retrieval, execution, publication and recovery; state-constrained proposals, compiled opening references and settled-effect replay protection | Mechanical plans lack canonical-document dependencies; progressive materialization and later recall remain unproved; full plans can consume substantial request/output budget |
| Context | Recent passages plus mandatory source-backed notes; bounded exact world/rule sections and campaign documents | No archived-memory query, automatic returning-identity selection or semantic retrieval |
| Provider/accounting | Explicit opt-in adapter, durable reservations, usage windows, dispatch authority recheck, safe blocker projection; captured one-shot/repairable recipes; explicit same-operation repair and fake-provider publication evidence; reviewed local Story input/output/cost caps; stable context-exhaustion admission reason | Commercial authority selection and the broader failure/hold QA matrix remain |
| Exploration | Local Chamber inspection, manual QA catalogue, durable run/evidence records | Rich trace explorer and planned fault/mechanical scenarios remain unfinished |
| World/showcase | Small authored transfer and chronology examples | General inventory/combat/travel, shared worlds and public visitor onboarding remain unimplemented |

## Where to go next

Use the [documentation map](README.md) to select a product/technical topic, the [code map](engineering/code-navigation.md) for implemented owners, and the [feature index](features/README.md) for execution work. Ordinary gameplay defaults to one-shot tasks with tools disabled. Richer bounded exploration exists, but its default use still needs gameplay evidence; building another agent framework is not the immediate gap.

After S3, resume the connected 10–15-turn proof. The owner-retained canon-invention dossier must be activated before a 30–50-turn private-world evaluation. General calendar expansion, broader simulation and UI polish remain deferred.

## What can be tried

Use [development](development.md) for setup. `pnpm chamber` provides offline authored rehearsal; `pnpm story:local` provides the ordinary local Story surface, with live generation separately configured and authorized. Headless backend inspection and explicit play are available through `story:server`, `story:play` and `story:inspect`; inspect their documented side effects before use. `/demo` is a separate browser-only presentation prototype.

Compilation, fixtures and isolated live responses do not establish meaningful agency, sustained continuity, general mechanics or the owner's enjoyment. [QA journeys](engineering/qa-journeys.md) owns repeatable manual evidence.
