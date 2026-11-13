# Source-grounded audit | what the pre-POC engine is and isn't

**Evidence basis:** GitHub `main` at `a313d0aad9ba6bee5a06d83d534abba5037a4c29`, inspected 2026-11-13. **Method:** original vision and architecture target defined first; then source maps, schemas and representative implementation paths inspected. **Not performed:** live DB/API run, paid provider call, load test, production deployment, full transitive import graph or exhaustive code review. Source changes under Cursor can make line positions stale; precise files and revision are stable evidence.

**Severity definitions:** P0 = product promise structurally unsupported or trust invariant; P1 = major evolution/scale/release architecture exposure; P2 = important but measured/conditional improvement. A **risk** is not a proven runtime bug. Never substitute the phrase “vibecoded” for an actual finding.

## Executive verdict

**Current architecture is substantially more disciplined than a generic vibecode POC.** It intentionally isolates pure mechanics, persists command identity, uses SQL locks/transactions for game authority, keeps Temporal workflow inputs small, splits generated candidate from publication, and has nontrivial provider-spend/uncertainty handling. These are worth saving.

**It is not yet a general game engine for the product dream.** It is a *narrow, mostly solo, story-authoritative action/process executor plus Storyteller framework*. Its breadth is dramatically smaller than arbitrary world/gameplay and personality-guided offscreen life; its operational topology is not validated for horizontally deployed long-lived campaigns. This is an **architectural maturity mismatch**, not an indictment of every file.

## Findings, with direct source anchors

| ID | Source-backed observation | Product/engineering implication | Judgment |
| --- | --- | --- | --- |
| **A01** | [`packages/game/src/state.ts`](../../../packages/game/src/state.ts) `characterSchema` requires `scores` across six abilities and `hp/maxHp`, with `applicableAbilities` to restrict use | A nonhuman world's absence of HP/body is represented by mandatory irrelevant structure; future transformation and form-dependent rules risk leaking fantasy defaults | **P0** generality gap, not a proven POC bug |
| **A02** | [`packages/game/src/effects.ts`](../../../packages/game/src/effects.ts) implements `quantity.change.v1` and `fact.set.v1`, while [`stories/persistence.ts`](../../../packages/application/src/stories/persistence.ts) has separate `item.create/transfer` effects | Different game outcomes cannot yet share one clearly admitted capability/effect pathway; locations, containment, relationships and form changes are not general first-class effects | **P0** expressive mechanics ceiling |
| **A03** | [`packages/game/src/immediate-actions.ts`](../../../packages/game/src/immediate-actions.ts) validates bounded generated plans and existing declarations; [`offers.ts`](../../../packages/game/src/offers.ts) describes a bounded menu tree | Strong controlled POC authority, but no generic validated alternative-intent or arbitrary-actor policy | **P0** future agency gap, preserve existing safe plan design |
| **A04** | [`campaign/clock.ts`](../../../packages/application/src/campaign/clock.ts) allows exactly one active accepted activity/action to own clock; [`holds.ts`](../../../packages/application/src/campaign/holds.ts) permits at most one decision hold | Correct for solo; cannot simply switch on several independent player actors or scenes under one story clock | **P0/P1** collaboration/time-domain design |
| **A05** | [`campaign/activities.ts`](../../../packages/application/src/campaign/activities.ts) settles boundaries transactionally under `lockStoryById`; [`campaign/action-execution-transition.ts`](../../../packages/application/src/campaign/action-execution-transition.ts) isolates a pure decision | Strong deterministic separation, but all ordinary mutations serialize through story row; per-story contention likely matters in busy shared worlds | **P1**, benchmark before splitting |
| **A06** | [`db/schema/campaign.ts`](../../../packages/db/src/schema/campaign.ts) has wide campaign JSONB (`character`, `storyFacts`, `offer`, `holds`, `acceptedActivityPlan`, `content`) plus separate receipts/events | Good for flexible solo state; one hot row and broad JSON replacements may be expensive and hard to safely evolve across many actors | **P1**, not proof that JSONB is inherently bad |
| **A07** | [`packages/workflows/src/index.ts`](../../../packages/workflows/src/index.ts) has `while(true)` around activity/action/deadline workflows, sleeps and retried Activity calls; no Continue-As-New/versioning policy present in inspected file | Long-lived/repeated workflows must manage history growth, replay compatibility and deployment versions; short bounded tasks may be fine already | **P1** long-life/release gap |
| **A08** | [`apps/worker/src/runtime/index.ts`](../../../apps/worker/src/runtime/index.ts) uses one Temporal task queue and `maxConcurrentActivityTaskExecutions: 4` with outbox relay in the same process | Fine POC resource bound; model calls, time transitions and other work are not independently scheduled by class/tenant in the inspected bootstrap | **P1** throughput/noisy-neighbor risk; measure |
| **A09** | [`application/outbox/index.ts`](../../../packages/application/src/outbox/index.ts) leases single rows via `FOR UPDATE SKIP LOCKED`; [`worker/outbox/relay.ts`](../../../apps/worker/src/outbox/relay.ts) drains sequentially, sleeping 1s when idle | Correct at-least-once delivery foundation; priority/fairness/dead-letter/operational backlog strategy needs design for bursts | **P1** operational evolution |
| **A10** | [`packages/documents/src/local-store.ts`](../../../packages/documents/src/local-store.ts) is content-addressed local filesystem; API/worker bootstrap can create separate `LocalDocumentStore` instances | Excellent local proof, **not** a production shared object adapter. Separate replicas without a shared persistent volume or common object store cannot assume identical immutable object visibility | **P1** deployment blocker, not object-format defect |
| **A11** | [`stories/passage-documents.ts`](../../../packages/application/src/stories/passage-documents.ts) stages immutable objects and [`stories/continuation.ts`](../../../packages/application/src/stories/continuation.ts) updates root in SQL | Sensible staged-object+SQL root design, but crash/orphan/reachability/integrity/backups and remote object-store consistency need explicit end-to-end proof | **P1** durability/portability |
| **A12** | [`storyteller/runtime.ts`](../../../packages/application/src/storyteller/runtime.ts), [`task-admission.ts`](../../../packages/application/src/storyteller/task-admission.ts) and [`publication.ts`](../../../packages/application/src/storyteller/publication.ts) divide generation, budgets and publication | Good authority boundaries. The general AI DM still depends on whether generated world/rule proposals remain feasible, creative and canon-consistent across long play, which code shape cannot prove | **P0** product quality evidence gap |
| **A13** | [`canonical-knowledge.ts`](../../../packages/application/src/storyteller/canonical-knowledge.ts) limits documents/bytes, selects pinned sections; [`evidence-packing.ts`](../../../packages/application/src/storyteller/evidence-packing.ts) tracks required/optional evidence | Healthy bounded-context design, yet source selection vs actual final request retention and months-long meaningful callback are separate facts | **P0** long-memory proof gap, **not** “there is no memory system” |
| **A14** | [`storyteller/execution.ts`](../../../packages/application/src/storyteller/execution.ts) and [`budget.ts`](../../../packages/application/src/storyteller/budget.ts) distinguish reserved, dispatched and uncertain model work; provider dispatch review is captured | Strong cost/uncertainty direction. Operation-wide fairness, global multi-tenant throttling and live affordability must still be measured/finished | **P1**, don't retry paid effects blindly |
| **A15** | [`stories/reads.ts`](../../../packages/application/src/stories/reads.ts) builds a public snapshot with numerous joins/subqueries; cache identity includes an accounting sum over related storyteller attempts | Version-keyed cache is conceptually good. At long chronology/high GET load, the “cheap identity” SQL still needs `EXPLAIN ANALYZE` and workload measurement to avoid cache check becoming the bottleneck | **P1/P2** performance hypothesis |
| **A16** | [`apps/api/src/modules/stories/story-update-hub.ts`](../../../apps/api/src/modules/stories/story-update-hub.ts) uses PostgreSQL LISTEN → in-process SSE, caps streams per story/owner, and `publish` iterates all stream groups | Correct owner-scoped hint direction; per-hint O(number of connected streams) iteration and per-API-instance database notifications may matter under large fan-out | **P1/P2** measurable scaling risk |
| **A17** | [`stories/persistence.ts`](../../../packages/application/src/stories/persistence.ts) `lockOwnedStory` and `lockStoryById` serialize mutations, and `notifyCommittedStoryView` emits a compact `pg_notify` | Strong command authority and canonical invalidation; for very busy shared worlds, the serialized unit will need an explicit conflict/causal model before changing the lock | **P1** only at contention thresholds |
| **A18** | [`packages/application/src/stories/index.ts`](../../../packages/application/src/stories/index.ts) composes campaign/stories use cases; application has many domain-focused modules, `campaign/activities.ts` ~24KB and memory-controller ~29KB | Source already has a reasonable facade and separated files, but large orchestration modules deserve cohesive review and negative-trace analysis before adding yet more capabilities | **P1/P2** maintainability, not automatic “split at 300 lines” |
| **A19** | [`docs/technical/solo-gameplay-contract.md`](../../technical/solo-gameplay-contract.md) and source show one actor/current offer as the demonstrated model | Whole-group controls, independent characters, identity-scoped knowledge and shared time are not delivered simply by adding members UI | **P0** original first-playable gap |
| **A20** | [`apps/worker/src/outbox/dispatch.ts`](../../../apps/worker/src/outbox/dispatch.ts) dispatch table supports known topics; [`stories/continuation.ts`](../../../packages/application/src/stories/continuation.ts) enqueues `knowledge.index.v1` but dispatch table doesn't contain it | **Potential unconsumed future topic**, not necessarily a runtime error: intentionally unhandled topics remain in outbox; verify alternate indexing consumer/feature status before making an alarm | **P2** audit/future indexing work |

## What is genuinely strong and should be protected

1. **Pure deterministic game policy**, an excellent basis for tests, ruleset evolution and fair outcomes.
2. **One transaction owns mechanic settlement**, with story-row serialization, source checks and stable operation receipts.
3. **Staged immutable publication** with root revision; the cross-store commitment is explicit rather than pretending the model output is authoritative.
4. **Outbox as a delivery bridge**, not HTTP synchronous workflow starts.
5. **Temporal workflows as coordinators**, small operation IDs in histories and bounded Activity operations, not a second game engine.
6. **Model candidate / player offer / server admission** are distinct, so an invented effect isn't automatically true.
7. **Time fractions, holds and due boundaries** are explicit, with real vs fictional time differentiated.
8. **Budget/reservation/uncertainty** are unusually well considered for a solo POC.
9. **Retrieval is treated as a pipeline** of search, source selection and final evidence packing, not merely “call a vector database”.
10. **Developer Chamber exists** as a future mechanism for exact game-state/fault proof; do not mistake a LabRun catalogue flag for connected evidence.

This is why a blind rewrite would probably *reduce* correctness for months before it gains anything.

## Patterns that need architectural correction, not cosmetic cleanup

### Mechanical extensibility: the biggest product limitation

The core action vocabulary is appropriate for the first set of demo fixtures but cannot yet represent robust item ownership, spatial relation, transformation, relationship state and actor permissions in a single coherent rules execution pipeline. Different semantics currently live in separate paths. The corrective direction is **typed capability modules with explicit versions**, not a generic world JSON map or permission for AI to author arbitrary SQL.

### Long-lived causal memory: persistence is necessary but not sufficient

Real continuity requires that a Storyteller can reliably resolve an identity and retrieve the exact relevant prior passage **at the correct canonical revision**, then reuse it within the *actual final request* and publish a consistent result. Today's layered storage/retrieval is directionally promising but the hard playthrough remains to prove. Improve the end-to-end **recall quality loop** before deciding to install a vector database/graph service.

### Time and multiplayer: a generalization trap

A single story-wide row lock and single clock are deliberately correct for solo. Many actors in one shared story need an actor/situation authority model, deadlines and a coherent clock/causal ordering. Merely making `campaign.character` an array creates paradoxes, not multiplayer.

### Horizontal deployment: local file store is a real seam to replace

Local CAS is a high-quality **developer adapter**. To deploy multiple API and worker replicas, all must resolve immutable objects by the same verified hash through a shared storage contract (e.g., S3-compatible adapter with content-addressed keys). Atomic pointer promotion stays in SQL; write-before-pointer, deterministic hash verification, orphan cleanup and backup/restore need proof. Don't migrate story objects into a new mutable shared filesystem workaround.

### Scale: design control limits before infrastructure multiplication

The data path is mostly per-story work, ideal for horizontal distribution. But the actual pressure points include a hot story row, snapshot-accounting subqueries, SSE fan-out, single outbox relay loop, one Temporal task queue and provider concurrency. Choose metrics/benchmarks and business priorities first. Kubernetes replicas and Redis don't remove these queues or shared-actor contention.

## How much should we reshuffle the monorepo?

**Preliminary answer: only when a product capability or test seam demands it.** Today's packages already correspond roughly to useful responsibilities. Significant refactoring should focus on **application module ownership, typed capability registry, Storyteller task/knowledge contracts, storage ports, scheduling classes and migration compatibility**, not directory rename theater.

Potential future source owners:
- `packages/game` pure capability/versioned mechanics;
- `packages/application/src/campaign` for transactional admission/settlement, later organized by cohesive actor/activity/event boundaries;
- `packages/application/src/storyteller` for task admission, evidence, dispatch and canonical publication, with explicit stage interfaces;
- `packages/documents` storage-neutral CAS contract + local/S3 adapters;
- `packages/workflows` bounded workflow sequencing/versioning, not state ownership;
- `packages/db` transactionally authoritative state, occurrence/event/permission indexes;
- `apps/api` viewer/actor auth and read/command facade;
- `apps/worker` differentiated processing and fair scheduling.

Do not implement these as a single “move everything” Change. A refactor without a product-level acceptance flow risks reproducing the current design in nicer folders.

## What would disprove the top findings?

- A source-backed, connected nonhuman+transformation playthrough uses supported typed mechanics without fake character state: weakens A01/A02 urgency.
- Existing sustained memory tests show a source-selected clue survives final request and appears accurately after dozens of events: weakens A13 urgency.
- Load tests show no significant snapshot or SSE bottleneck under a chosen target: postpone A15/A16 optimizations.
- A deployed adapter already shares durable CAS objects across independent API/worker replicas: weakens A10 concern, not the need for proof.
- A stable multi-actor synchronization policy exists outside the currently inspected core: revise A04/A19.
- All long-running workflow histories remain tiny by proven bounded lifetime: reduces urgency of Continue-As-New, but not mixed-version rollout policy.

## Audit limitations and next steps

No full transaction/isolation model check, DB migration history walk, exact package import-cycle graph, source-level live benchmarks, provider trace comparison or actual hosted deployment check was performed. Those are **separate explicit investigations**, not things to assume. Next pass should inspect the highest-risk paths in detail with adversarial concurrency traces and identify which existing correctness pieces can be preserved as-is.

**Current decision:** keep the useful core, refuse to treat the POC mechanics vocabulary as the permanent engine, and invest in product-level evidence before large-scale refactors.
