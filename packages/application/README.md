# Application operations

This package owns use cases, transactions and coordination. API controllers and Temporal Activities call its public [exports](package.json). Pure mechanics belong in `@offscreen/game`; task/schema/provider work in `@offscreen/storyteller`; immutable files in `@offscreen/documents`. Read the relevant route below, then its source, rather than the entire package.

## Directory index

| Need | First source | Follow only as needed |
| --- | --- | --- |
| Ordinary story API facade | [stories/index.ts](src/stories/index.ts) | Lifecycle operations under `stories/` |
| Mechanical selection | [campaign/actions.ts](src/campaign/actions.ts) | Private plans, prerequisites, finite action vs process |
| Settlement and time | [action-execution-transition.ts](src/campaign/action-execution-transition.ts) | [action-executions.ts](src/campaign/action-executions.ts), [activities.ts](src/campaign/activities.ts) |
| Generation → publication | [storyteller/runtime.ts](src/storyteller/runtime.ts) | Execution, publication and recovery are separate operations |
| Exact task inputs | [storyteller/context.ts](src/storyteller/context.ts) | Captured root, source passages and selected canonical bodies |
| Provider authority/cost | [task-admission.ts](src/storyteller/task-admission.ts) | Budget, window accounting, dispatch authority |
| Public snapshot | [stories/reads.ts](src/stories/reads.ts) | [campaign/reads.ts](src/campaign/reads.ts); public contracts |
| Local inspection/fixtures | [developer-tools/chamber.ts](src/developer-tools/chamber.ts) | QA catalogue/inspectors only for tooling tasks |

## Opening and Start

Draft → [scripted-openings facade](src/generations/scripted-openings.ts) → [profiled opening admission](src/storyteller/openings.ts) → saved task/outbox → runtime → reviewable candidate → [Start](src/storyteller/start.ts). The facade's historical name does not mean profiled openings are always scripted.

Admission captures the draft revision, profile, execution policy and context. For mechanical starts it also captures authorized plans: the model can select a compact reference, and validation substitutes the immutable plan; fresh proposals are admitted separately. Review exposes public labels. Start persists the reviewed plans and bootstraps canonical documents; it does not recompose the catalogue or execute an offered action. [Story lifecycle](../../docs/technical/story-lifecycle.md) owns the contract.

## Mechanical selection and consequence

1. [Actions](src/campaign/actions.ts) locks the owned story, deduplicates the command, checks revision/current offer and revalidates the private plan.
2. A finite action captures a positive fictional duration and an execution identity. An extended process creates an activity with its rule and progress. Both consume current permission and schedule durable work.
3. The owning settlement operation commits time, receipt/effects and required follow-up/hold atomically. A timer only wakes that operation; a duplicate wake cannot grant a second result.
4. [Narration admission](src/campaign/narration.ts) captures authoritative evidence. [Publication](src/storyteller/publication.ts) rechecks source state and candidate plans before committing a passage, public choices and private plans.

[Overlap policy](src/campaign/action-overlap.ts) may prepare a consequence from an immutable projected outcome before its timer finishes. That candidate stays private until matching receipt-gated settlement. It is not evidence of an already-earned effect.

Extended activities have three distinct follow-ups: quiet factual completion, a historical report, or a controlling scene. Report publication changes the view without replacing current decisions. An accepted itinerary stores exact authored terms; continuation rechecks them and the horizon. A controlling scene blocks the itinerary until a matching fresh offer is explicitly selected. See [rules/activities](../../docs/technical/rules-and-activities.md), [committed time](../../docs/technical/committed-time.md) and [solo integration](../../docs/technical/solo-gameplay-contract.md).

**Current continuity gap:** narrative choices can carry canonical document dependencies, including same-result changes. Mechanical plans still lack that sidecar. Follow [S3's selected route](../../docs/features/README.md#coding-route); do not assume existing narrative handoff covers `campaign/actions.ts`.

## Campaign transition boundary

Campaign operations own transactions; pure policy describes decisions/effects. [Follow-up intents](src/campaign/follow-up-intents.ts) maps typed decisions to durable work, not a general event bus. [World obligations](src/campaign/world-obligations.ts) settle against the same campaign clock; controls and stale wakes re-read authority.

The campaign owns the exact real-time anchor, fractional remainder and monotonic fictional-second frontier. Activity progress is not another clock. No accepted execution means no idle-time catch-up. Holds transfer from the action/activity operation to its exact generation and then to the player decision. [Activity follow-up policy](src/campaign/activity-follow-up-policy.ts) selects quiet/report/scene behavior.

Durable lifecycle events belong in the game transaction. [Runtime logging](src/runtime-logging/index.ts) carries curated operational diagnostics; never use it as game history or dump arbitrary SQL, errors or player prose.

## Active-scene context

[Context](src/storyteller/context.ts) combines committed source passages, source-backed notes, the private active-scene anchor and root-fenced canonical knowledge. A published restart moves the anchor; an in-flight model chat never owns story memory.

Exact world/rule sections, narrative-choice document dependencies and recall cues already feed bounded selection. Complete bodies are loaded with explicit omission traces; catalogue visibility does not mean a body was supplied. No general automatic identity materialization follows merely from prose mentions. [Canonical search](src/storyteller/canonical-search.ts) and the [memory exploration controller](src/storyteller/memory-exploration-controller.ts) provide deeper retrieval under a captured recipe; ordinary turns remain one-shot by default.

Read [the Storyteller guide](../storyteller/README.md) for provider projection versus internal context and [memory/retrieval](../../docs/engineering/long-story-memory-and-retrieval.md) for design and limits.

## Persistence and read caching

[Story documents](src/stories/documents.ts) stages immutable objects before a short root-fenced transaction. PostgreSQL selects the committed manifest root. [Passage documents](src/stories/passage-documents.ts) stages bootstrap/publication objects and resolves passage content. Reads use `contentDocumentHash` where present and retain an SQL-content fallback; do not claim all passage authority is still SQL-owned or that every path has completed the transfer.

[Story reads](src/stories/reads.ts) projects snapshots under repeatable-read isolation. Optional caching stores only authorized validated projections through [the cache port](src/cache/read-cache.ts); Redis lifecycle lives in `@offscreen/cache`. Commands, locks, private plans and accounting never take authority from Redis. See [canonical files](../../docs/technical/canonical-files.md) and [persistence/cache](../../docs/technical/persistence-and-caching.md).

## Execution, failure and retry

[Execution](src/storyteller/execution.ts) dispatches and saves output; [publication](src/storyteller/publication.ts) separately admits it into the story. A saved successful generation can remain unpublished. Publication retry must not reroll mechanics or repeat a successful provider call.

[Task admission](src/storyteller/task-admission.ts) intersects effective usage authority with the route and captures recipe/envelope limits. [Budget](src/storyteller/budget.ts) owns operation/attempt reservations and settlement; [window accounting](src/storyteller/window-accounting.ts) reserves/debits usage windows. [Dispatch authority](src/storyteller/dispatch-authority.ts) rechecks captured authority immediately before transport. Commercial product/route selection remains separate work; synthetic profiles are not subscriptions.

[Recovery](src/storyteller/recovery.ts) distinguishes an unsent retry, bounded explicit repair after settled invalid output, publication retry, and uncertain delivery. Uncertainty retains liability and blocks provider work; a quota reset does not clear it. Accounting telemetry belongs to the existing attempt/operation records, not a parallel ledger. Follow [usage policy](../../docs/technical/usage-policy.md) and [provider dispatch](../../docs/technical/provider-dispatch-review.md).

[Outbox dispatch](../../apps/worker/src/outbox/dispatch.ts) and [Activity bindings](../../apps/worker/src/activities/index.ts) connect saved work to these operations. Workflow payloads identify work; they do not carry alternate game authority.

## Other entrances

Narrative choices enter [stories/resolution.ts](src/stories/resolution.ts); mechanical choices enter campaign actions. Narrative [prepared waits](src/stories/timing.ts) publish an already prepared arrival, unlike rule-owned mechanical completion. Trace the endpoint before assuming a shared resolver.

Chamber layers explicit development controls over ordinary operations. Its [Storyteller control](src/developer-tools/storyteller-control.ts) can hold/fail scripted work without providers; retain its process-local control object across a local worker restart. [QA journeys](src/developer-tools/qa-journeys.ts) stores run evidence, not an automatic agent fleet.

## Contracts and continuation point

[Progress](../../docs/progress.md) owns coverage and [the feature route](../../docs/features/README.md) selects unfinished work. This guide owns source navigation. Detailed invariants live in the linked contracts; update this map when an entry point or surprising cross-file boundary changes.
