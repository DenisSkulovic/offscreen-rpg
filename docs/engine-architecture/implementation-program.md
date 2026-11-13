# The engine evolution program | implement reality, not a framework diagram

**Status:** final design-selected execution order as of 2026-11-13. **ENG01 Done. ENG02 Done** (pure actor envelope; no DB migration). **ENG04 Done. ENG07 Cancelled.** ENG03/ENG05–ENG06 remain unauthorized. Program derived from [dream/requirements](product-derived-requirements.md), [source audit](evidence/source-audit.md), [mechanics first slice](decisions/first-gameplay-slice.md), [causal trace](evidence/causal-transition-review.md), [migration policy](decisions/canon-compatibility-and-migration.md), and [independent challenge](evidence/independent-challenge.md). Only a **bounded, explicitly owner-approved Change** gives Cursor code permission.

## Postwave code review and updated sequence (2026-11-13)

A source review of Cursor's ENG01/ENG02/ENG04/ENG07 work identified two items to close before broadening generated world effects: a **new model-authored transfer may pass existence checks without an actor/holder permission grant**, and an interrupted mid-flight holder change may leave **no valid next offer**. These are source-level concerns, not reproduced live-provider exploits. See [review](evidence/postwave-implementation-review.md).

**Corrective packets:** [ENG08 provider world-effect gate](../changes/2026-11-13--eng-provider-world-effect-gate/CHANGE.md) is **Done** (generated `worldEffects` rejected unless exact authorized reference). [ENG09 item interruption/reentry](../changes/2026-11-13--eng-item-interruption-reentry/CHANGE.md) remains **NOT Ready** until the end-to-end recovery trace and source event contract are settled. ENG01 remains Done for its completed limited mechanics proof, with ENG09 still tracked.

**Infrastructure order chosen:** after correctness, **ENG05** private S3-compatible shared CAS is **design-ready** under [selected storage contract](decisions/eng05-shared-cas-contract.md) with disposable local service/no cloud cutover. **ENG06** is **design-ready for first local history-replay test**, not a complete hosted Worker Deployment system ([policy](decisions/eng06-temporal-compatibility-policy.md)). **ENG03** remains **NOT Ready** for a full refactor until [lock I/O measurement and captured-task contract](decisions/eng03-instrument-before-refactor.md); only its narrow diagnostic can be separately authorized. [Next Cursor handoff](handoff/postwave-cursor-handoff.md) gives the exact first prompt.

**Do not automatically mark any ENG Change Ready or alter code:** the owner selects scope and safe tests, then Cursor rechecks latest source. ENG02's 'Done' is a pure envelope/optional health cut; a full nonhuman campaign/form-change proof remains outstanding. ENG07 cancellation proves final serialized source inclusion, **not** model creative fidelity.

## What we selected

**Architecture:** modular monolith; PostgreSQL owns transactional mechanics and accepted authority; pure game modules own rule evaluation; immutable versioned documents own source narration/descriptive history; Temporal coordinates sparse eligible boundaries; the Storyteller is an evidence-grounded proposal system with bounded spend. This is a **target for deliberate evolution**, not a declaration the current engine is complete.

**Gameplay architecture:** supported, statically registered optional capability semantics, **introduced gradually** from concrete rules. Reject an indefinite sea of untyped fact mutations; also reject building a generic plugin/ECS framework before two real capability families exist.

**Scale foundations:** old stories must remain readable, old tasks must survive worker releases, API/workers must share canonical objects in deployment, and current story reads must not get proportional to all historical work. No microservice or Kubernetes requirement is implied.

**Time:** one authorized story clock stays correct for the solo baseline. Future standing routine/delegated decisions and small-group lockstep require distinct consent/actor authorities. No implicit world ticking or multi-actor race shortcuts.

## Ordered bounded code Changes (design queue)

| Priority | Change | One outcome | Design/implementation readiness | Why here |
| --- | --- | --- | --- | --- |
| **1** | [**ENG01 mechanical unique-object transfer**](../changes/2026-11-13--eng-authoritative-item-transfer/CHANGE.md) | One real timed/check-based action transfers an existing scarce object exactly once and records the source | **Done** (pure + application + disposable SQL) | First demonstrable *new kind of consequential play*, reuses current registry |
| **2 (conditional)** | [ENG07 actual final-request memory evidence](../changes/2026-11-13--eng-memory-final-request/CHANGE.md) | A significant prior promise survives selection **and appears in the final model request**, with observable omission | **Cancelled / superseded.** Greywake + `inspectMemoryExplorationProviderRequest` already prove final serialized inclusion | Protects the game's most important emotional distinction |
| **3 (small independent)** | [ENG04 bounded current campaign read](../changes/2026-11-13--eng-bounded-current-reads/CHANGE.md) | Now reads active/nonterminal work, not every archived activity | **Done.** Active id + nonterminal states only; disposable SQL with 1k completed rows; no index | Long lives must stay cheap to reopen; safe bounded improvement |
| **4 (major product)** | [ENG02 optional actor capabilities](../changes/2026-11-13--eng-optional-actor-capabilities/CHANGE.md) | An HP-less nonhuman has lawful checks/actions while old campaigns still run | **Done** for pure envelope + optional health bridge; no DB migration. Later: form-change / in-flight pin | Real world-neutral game semantics, not prose-only universality |
| **5 (architecture)** | [ENG03 short-lock context capture](../changes/2026-11-13--eng-short-lock-context/CHANGE.md) | Remote source read/materialization off write lock with exact versioned capture | **Proposed; capture DTO and migration not finalized** | Reduces future contention without sacrificing canon |
| **6 (deployment)** | [ENG05 shared immutable CAS](../changes/2026-11-13--eng-shared-cas-store/CHANGE.md) | API and worker replicas read same committed root under verified hash | **Proposed; storage/deployment choice required** | Necessary for credible independent replicas |
| **7 (release)** | [ENG06 workflow version resilience](../changes/2026-11-13--eng-workflow-versioning/CHANGE.md) | Old accepted activity completes through a worker version change exactly once | **Proposed; Temporal deployment policy required** | Long-lived campaign operations must survive releases |

**No mandatory calendar or time estimates.** The first two to three changes should be reviewed before deciding if the rest still represent the right priorities. ENG02/03/05/06 may move earlier if actual source/hosting evidence exposes a severe correctness gap. Never schedule all seven blindly.

## Do not duplicate the existing UX/game-mechanics Change program

The [UX experience program](../experience/implementation-program.md) already defines planned GM01–GM07 for custom intentions, standing routines, distinct offers, return source events and delegated decisions. The engine ENG series **does not replace them** and must not create a parallel implementation of the same domain:
- **GM01→GM02** custom-intention interpretation/admission: follow ENG01's proof that typed effects extend coherently, with separate player consent and model cost.
- **GM03/GM07** bounded standing life and delegated safe response: later actor/clock authority; not a new feature flag in ENG01.
- **GM04** distinct failed-offer behavior: independent Storyteller/content rule quality slice.
- **GM05/GM06** event projection and seen cursor: reuse existing receipts and narrative sources; no second authoritative event log.
- **ENG07** is a *diagnostic/proof for final model request inclusion*, not the GM05/GM06 public Journal chronology.

When a candidate's outcome overlaps a GM Change, merge or supersede **one** before implementation. One behavior, one authoritative Change owner.

## What we explicitly rejected

- Copying the entire monorepo into a new “domain/engine” package.
- Adding Kafka, microservices, orchestration frameworks or an ECS to look senior.
- A universal `Entity` table for all named fictional nouns.
- Dropping D&D rules to make arbitrary worlds easier.
- Converting every world capability into anonymous fact/quantity keys.
- Treating `campaign.character` as the perpetual universal actor schema.
- Letting a model directly mutate item ownership, clock, finances or another player's character.
- Replacing stable SQL receipts with a second event-sourced universe.
- Inventing an inventory subsystem independent of `story_item`.
- Sending provider calls on each ordinary activity tick.
- Upgrading captured action rules silently during software release.

## Three true architectural milestones

### M1 | Mechanics can express one new lawful action

An authored, timed, checked item transfer works with existing SQL registry, old compatibility and once-only receipts. A human story and abstract token story share it.

**If the current code cannot support M1 without a sprawling rewrite, do not assume the proposed capability kernel is correct.** Return to architecture and reconsider contract boundaries.

### M2 | The same engine supports qualitatively different forms

A microbe/abstract actor can have no HP, can choose a meaningful appropriate check and timed commitment, and cannot accidentally acquire human possessions or abilities. An old human campaign still functions, including in-flight work.

### M3 | A life persists under real service evolution

Stories with hundreds of source passages remain responsive; a decisive old promise can be recalled into final model context; a long task survives deployment; multiple replicas can read the same canonical root; an interruption preserves earned work and publication cannot lie.

**Only after M1–M3** should the project claim a reasonably general, durable and scalable engine foundation in the public portfolio, and even then only supported load/failure evidence should be claimed.

## Exact acceptance philosophy

Every engine Change must return:
- source revision, selected product behavior, old/new versions and actual file owners;
- one normal and one adversarial scenario that would fail under a plausible bug;
- unit/integration/test-environment boundary actually executed;
- exact receipts, snapshots, timing and source proofs, not just green mocks;
- known cost/provider side effects and what is *not* proven;
- whether legacy campaigns and pending work remained compatible;
- an explicit next scope, rather than silently continuing into adjacent Changes.

For the first Change, **do not let Cursor autonomously implement ENG02–ENG07 because it finished ENG01 early**. Return its result for architecture review.

## First implementation entrypoint

Read [**first Cursor wave handoff**](handoff/first-engine-wave.md) and [ENG01](../changes/2026-11-13--eng-authoritative-item-transfer/CHANGE.md). The designer has selected the scope; the owner still controls source changes, test DB use, commits/pushes and next Change selection. This program cannot authorize deployment or provider spend by existing mere text.
