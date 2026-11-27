# Selected engine architecture

**Storyteller evolution target:** Game Authority is the single admission boundary between creative proposals and authoritative story history. A published scene binds a rooted Library, a semantic fictional-state frontier, clock/commitments, source/profile/rule pins, passage/choices and causal lineage. The engine is world-neutral: narrative-only worlds and optional typed mechanics share the same authority model.

**Owns:** the selected engine shape: the kind of runtime that keeps a life coherent for months without handing mechanical truth to a chat model.
**Status:** a **dated selected working target** (November 2026 engine architecture pass, recorded as [D-0001](../../decisions/D-0001--modular-engine.md)): a modular monolith with durable workflows and immutable evidence. It is not a code authorization, the items under [What stays open](#what-stays-open) are not ratified, and its revisit criteria stay in D-0001. This page does not revoke or newly ratify that decision.
**Not proof of implementation.** The page's existence shows nothing running. Landed prototype contracts are in [authority and transitions](authority-and-transitions.md), [mechanics](mechanics-and-capabilities.md), [chronology](chronology-and-activities.md) and [lifecycle](lifecycle-and-compatibility.md); narrow concurrency proof is in [concurrency and recovery](concurrency-and-recovery.md). Everything under the MA05/MA06A/MA08/MA12 headings is dated source history or a conditional extraction criterion, not a standing commission.
**Product:** [rules](../../product/gameplay/rules.md), [actions](../../product/gameplay/actions-and-commitments.md), [time](../../product/gameplay/time-and-autonomy.md).

## Five contracts

These five contracts are the selected target. The generalized capability kernel named later on this page stays conceptual. It is not live.

1. **State ownership.** PostgreSQL owns authoritative mutable state. See [Non-negotiables](#non-negotiables). The product rule is [Possessions and exchanges](../../product/gameplay/continuity.md#possessions-and-exchanges): a recorded object keeps its holder.
2. **Permission and admission.** Player intent never directly writes an outcome. See [Causal spine](#causal-spine). The product rule is [Stable meanings](../../product/gameplay/actions-and-commitments.md#stable-meanings): an offer is permission to choose.
3. **Deterministic mechanics.** Rules stay pure. See [World-neutral capability kernel](#world-neutral-capability-kernel). The product rule is [World-independent foundation](../../product/gameplay/rules.md#world-independent-foundation): an unavailable ability does not grant unlimited capability.
4. **Durable effects.** One committed result stands at its canonical time. See [Causal spine](#causal-spine). A later sentence does not grant that effect again, as [Stable meanings](../../product/gameplay/actions-and-commitments.md#stable-meanings) requires.
5. **Recovery.** A failed narration leaves the saved mechanical truth. See [Causal spine](#causal-spine). [Pace](../../product/gameplay/time-and-autonomy.md#pace) still requires an accepted execution before fictional time moves.

Negative: a model suggestion does not grant a mechanical effect. A nonhumanoid body does not inherit humanoid equipment or ability semantics. See [Sparse identities](#sparse-identities).

## Failure model

The engine serves a fiction whose character can live for months and whose decisions can be both creative and mechanically earned. The selected shape is a **modular monolith with a durable, versioned story authority core**, separate pure capability and rule policies, a bounded Storyteller proposal engine, and an event and boundary-driven execution layer. Authoritative mutable state lives in PostgreSQL. Immutable narrative objects hold prose and source-linked description. Workers may scale behind one deployment contract. The browser receives a projection. The server keeps command idempotence. Player intent never directly writes an outcome.

This is close to some current choices because of the product failure model, not because Nest or Temporal already exist in the repository.

## Alternatives that lose for now

| Candidate | Why it loses now | Revisit trigger |
| --- | --- | --- |
| LLM-led chat plus state | Undermines earned time, provenance, authority and repeatable consequences | Never as the sole source of mechanical truth |
| Turn-based CRPG rules engine | Too narrow for hours-long offscreen life, abstract forms and social stories | Optional rules package for a tactical world |
| Persistent world simulation / ECS | Requires a universal world model and high simulation cost for mostly narrative worlds | A specific shared-world simulation truly requires it |
| Event-sourced microservices | Many operational contracts before domain seams are stable | Measured hot domains and stable event semantics |
| Modular monolith + durable workflows + immutable evidence | Must still defend internal boundaries | **Selected working target** |

Full event sourcing is not selected. A transactionally committed causal business ledger plus current projections is enough at first. Event replay as authority is a separate, expensive choice.

The 2026-11-19 educational laboratory does not select the event-sourced microservices row. Its contract is [Distributed learning target](../platform/topology.md#distributed-learning-target). Campaign state stays a PostgreSQL projection.

## Transitional package extraction selected for MA06A (2026-11-21)

**Selected then, realized, and bounded now.** One **cohesive engine** workspace, `@offscreen/story-engine`, owns the subtrees `stories/`, `campaign/`, `storyteller/` and `generations/`, rather than premature separate Story Authority and Storyteller-runtime npm packages. The pre-existing `@offscreen/storyteller` workspace keeps the pure task, context and provider abstractions. The earlier short-lived `@offscreen/application` compatibility layer no longer exists (see the next section).

**Physical co-location is not authority sharing.** SQL story/campaign admissions, historical truth and transaction ownership stay authoritative; Storyteller creative/runtime operations stay proposals or controlled executions. The broad package is never permission for creative code to mutate canonical state. MA06A was a package-structure migration, not a gameplay change: owner-scoped locks, source/root evidence, replay, capture/materialization transaction boundaries, provider spend and uncertain-delivery controls were preserved. The permanent **logical** six-subsystem architecture below is unchanged by the package layout.

## Post-MA08 internal ownership target and enforcement

**Selected boundary (a dependency rule, not a package plan).** Story Authority (`stories/`, `campaign/`) owns canonical SQL state, story locks, fictional clock, permissions, effects, receipts, forks and publication admission. The Writer runtime (`storyteller/`) captures and prepares privately, spends only under a pinned bounded operation and proposes changes for Authority to admit. Generation orchestration lives in `generations/`. The boundary is **behavioral and enforced by typed callers and source import rules**, not by proliferating npm packages. No provider, Lab or Worker may bypass the authoritative command/receipt path. Outer composition roots may inject typed Writer collaborators; calls already inside an Authority transaction stay in that transaction instead of becoming best-effort post-commit tasks. A direct Authority-to-Writer implementation edge is transitional debt to be enumerated and retired under MA09, never expanded for convenience. A package graph with no cycle alone does not prove these logical boundaries.

**Reverse-edge debt, current source.** Relative imports from `packages/story-engine/src/stories/` and `src/campaign/` into `../storyteller` still exist at this base (a relative-specifier scan finds 8 outside tests). They are the retained MA09 debt, not a finished inversion.

**Landed since MA10 (source-observed).** `@offscreen/application` was removed; its legacy tests live under API Integration (`tools/api-integration/legacy-engine-tests/`), and compatibility-forwarder checks became direct-owner assertions. The workspace must not reappear as a generic domain dumping ground. `@offscreen/lab-support` is outermost and may depend on Story Engine for bounded test access; Story Engine must never depend on developer labs. Module-level AST checks distinguish runtime cycles from type-only relations and classify actual `packages/story-engine/src` code (MA11). After the seam is corrected, tighten the import ratchet, retire exact temporary exceptions and review public exports.

## Source-reality checkpoint: what the selected architecture has not proved (2026-11-22)

**Dated checkpoint at undertaking HEAD `d3ba291763de`; a status annotation, not a selected behavior or execution authorization.** WR09A and WR09B gave **provider-free** private response/attempt custody and durable model-round/tool replay, but **not the normal player activity composition**. At that checkpoint `apps/game-authority/src/launch-put.ts` captured `scripted-offline` for Launch, and `apps/worker/src/activities/index.ts` mounted scripted Launch, scene and research child activities. Re-reading source on this base: `createLaunchPutService` in `launch-put.ts` still records `model: 'scripted-offline'` and `createWorkerActivities` still mounts the scripted launch writer, writer scene and research child activities, so the observation still holds.

What remains unproved: a live Writer needs deliberate host-only credential/mode/pricing authorization, Game Authority publication composition and a proven zero-funded-calls fake-transport full user path before any paid call; MA09 reverse runtime imports remain; the available Kubernetes application manifests and individual infrastructure lab probes are not a full cold-kind browser-to-fork/Pod-kill/restore/scale demonstration, and TURN03/K8S10 and associated operability work remain gates (TURN03 is cancelled and NOT RUN, and nothing here claims otherwise). A native or Kubernetes deployment, or Temporal use, does not prove the game; see [STATUS](../../../STATUS.md) for demonstrated reality and the [2026-11-22 undertaking overview](../../../work/undertakings/storyteller-workshop/OVERVIEW.md) for the source/focused, local connected, Kubernetes and live-provider tiers.

## Package-boundary evolution criterion after MA08 (proposed, not a new package commission)

**Conditional, not mandatory.** This section states a criterion for when a single further extraction would earn its overhead. It selects no package and commissions nothing; the historical extraction path below is **not** a required future architecture.

Evidence at the time of writing: the Story Engine had ~161 TypeScript implementation modules and a rough relative-specifier scan found substantial Stories-Campaign collaboration (~30 stories to campaign, ~34 campaign to stories) and Writer-to-Authority dependencies (~60 storyteller to stories, ~26 storyteller to campaign). These are approximate string counts, not an AST runtime-edge or cycle proof (the MA11 AST ratchet provides the correct classification). They argue **against** independently packaging Stories and Campaign: both co-own one SQL authority and many transactional transitions.

Criterion: a plausible single extraction is an outer Writer runtime separated from the Authority package **after** MA09 removes direct Authority-to-Writer implementation imports and host/API/worker/type-only consumers are mapped. The allowed direction would be host composition to Writer runtime to narrow Authority read/publication ports to DB/Documents/Contracts/Game, with Authority having **no reverse runtime import** of Writer; `@offscreen/storyteller` stays the model/task/provider contract owner. Do not create a generic utilities/platform catch-all, a second state authority, or a split to shorten a folder listing. Decide only after measuring the improved build/task invalidation surface.

Provenance joined on the evidence branch: [OPS12 lifecycle](../../../work/changes/archive/2026-11/other/2026-11-21--ops12-distributed-worker-lifecycle/CHANGE.md), [WR09B replay](../../../work/changes/archive/2026-11/other/2026-11-21--wr09b-durable-writer-round-replay/CHANGE.md), [DX12 affected builds](../../../work/changes/archive/2026-11/other/2026-11-21--dx12-correct-affected-build-checks/CHANGE.md). None alone closes the inversion, all internal SCCs, or live provider/product acceptance.

## Six logical subsystems

```text
Player intention (typed choice, or a future reviewed custom intent)
        |
        v
STORY AUTHORITY / ADMISSION
  actor, permissions, current offer, versions, risks,
  resource preconditions, immutable operation identity
        |
        +------------------+------------------+
        v                                     v
RULE CAPABILITIES                      EXECUTION ENGINE
  body, skills, items, location,         earned time, activities,
  relations, checks, effects             boundaries, deadlines, pauses
        +------------------+------------------+
                           v
              COMMITTED CANON / RECEIPTS
                           |
              +------------+------------+
              v                         v
     STORYTELLER PROPOSAL          READ / REENTRY
       retrieval, scene,             Now, Journal, World/You
       descriptive patches,          notifications, audit
       bounded model/cost            viewer-authorized only
              |
              +-- proposed, validated, published --> new situation
```

One owner per fact. Distinct owners per purpose. Storyteller output is not truth until admitted. A generated scene may be published later than mechanical settlement. The read model may lag or be unavailable. It must never silently recalculate the underlying game.

## Causal spine

The same skeleton covers studying for a week, a five-second sentence, giving away an item, sensing a chemical gradient, or crossing a road. New capabilities implement new policies. They do not duplicate the engine.

1. **Situate.** Retrieve an authorized view of the current scene, actor and relevant known world state.
2. **Intend.** The player selects an authored valid attempt, or, in a future design, proposes a custom intention for interpretation and review.
3. **Admit.** Check actor, membership, version, current offer, rule compatibility, resources, time, cost and accepted autonomy. Store immutable intent and receipt identity in one transaction.
4. **Execute or wait.** Deterministic time and mechanic effects advance at valid boundaries. Temporal coordinates wake and recovery. It is not game authority.
5. **Commit.** Exactly one durable rule result, check, progress, event and effect at the correct canonical time. Multiple deliveries observe the same receipt.
6. **Narrate and publish.** A bounded Storyteller turn proposes a source-grounded passage and next options. The application verifies canonical source, version and effects and publishes once. Failure leaves saved truth.
7. **Remember.** Significant original evidence stays addressable. Summaries, indexes and recaps are derived and refreshable. They are not new canon.
8. **Return.** A per-viewer projection tells what changed, what is still running, and which decisions need a human.

**Negative:** no Storyteller call is required at every second, every chance roll, every menu inspection or every minor activity completion. A rules event may request a wake at an admitted meaningful boundary. **No event is a valid result.** A situation is not one enum: a passage can be published while work is interrupted, a report can be delayed, and a network command can be uncertain after mechanics settle. Model those as orthogonal axes.

## Non-negotiables

- Rules are pure, explicit and testable. No database client, HTTP framework or provider SDK inside a game policy. The exact selected ruleset, version and content evidence are part of admission.
- PostgreSQL owns authoritative mutable state and serialized business transitions. Prefer durable receipts and event facts over raw JSON blobs as the sole history.
- Immutable documents own prose and source-linked descriptive canon, with versioned manifests and a clear distinction between observed, attributed, derived and private.
- Temporal owns durable coordination, timers and retryable idempotent activities. SQL and the outbox own the fact that a command happened. A workflow start signal is not a reward.
- LLM inference is a bounded proposal. It never executes instructions, money, inventory movement or cross-actor authority directly.
- Read models are viewer-scoped projections. Server-sent events are invalidation hints, not the truth. A query cache is optional acceleration, not business authority.
- Every expensive or irreversible effect is budgeted and recoverable under an explicit authority boundary. Transport uncertainty is a state.
- Evolution is a protocol, not a schema rename. Old campaigns, admitted plans, long-running workflows and prior evidence must remain coherent through releases.

## Ownership lines

| Boundary | Changes when | Must not own |
| --- | --- | --- |
| Story authority | Actor, offer, consent or revision rules change | Narrative tone or provider transport |
| Mechanics / capabilities | A rule family or applicable actor changes | SQL or scene narration |
| Time / execution | Activity, interruption or deadline policy changes | An infinite model-planned agenda |
| Storyteller | Prompt, tools or model-cost recipe changes | Committed resource transfers |
| Canon / memory | Source identity or visibility changes | Roll or clock authority |
| Read surfaces | Journal or notification needs change | Private hidden state or new mechanics |
| Platform | Load, deployment, retention or isolation changes | Game semantics |

These are logical ownership lines. They are not an order to create seven top-level packages. Existing `packages/game`, `story-engine`, `storyteller`, `documents`, `db` and `workflows` may already be the right deployable seams. A file, import or transaction that crosses the seam is the defect, not the absence of a new package.

## Selected near-term module ownership cuts (MA05A / MA05B)

**Historical record, dated 2026-11-21.** These cuts moved identities and types so that Story Authority and the Writer runtime stop sharing implementation-only modules. They changed no behavior. Current homes below were checked against source on this base.

- **MA05A (landed).** Persisted generation-kind identities (`storyteller.profiled.v1`, `storyteller.context-capture.v1`) are neutral contracts, distinct from durable outbox workflow *topics* and runtime/provider selection. They are published from `packages/story-engine/src/generations/storyteller-kinds.ts` with their historical literal values; `stories/start` and `stories/reads` import that module. Notice topics live in `packages/story-engine/src/generations/storyteller-notices.ts` (MA05D).
- **MA05B (landed).** SQL transaction typing and the outbox `enqueue(tx, notice)` identity/conflict semantics were cut out of Application. They are now owned by the outbox workspace (`packages/outbox/src/enqueue.ts`, imported as `@offscreen/outbox/enqueue`). No SQL schema, timing, authorization, publication or model-spend behavior changed.

These are prerequisite boundary cuts, **not** the complete Story Authority / Storyteller-runtime inversion. Transaction-scoped start, admission, narrative capture, follow-up, scripted generation and publication remain coupled inside `@offscreen/story-engine`. An outer composition layer may assemble both dependencies, but neither domain should import an implementation-only service from the other to determine its own authority. An acyclic package graph is not SQL correctness.

## Selected next ownership boundaries (MA05C, MA05D, MA05E)

**Historical record, dated 2026-11-21.** Each item below is a landed source move; paths are current `packages/story-engine/src` locations (the earlier `packages/application/src` paths no longer exist because `@offscreen/application` was removed under MA10).

- **MA05C.** Application-domain files stopped importing `Transaction`, `Notice` and `enqueue` through the Application outbox index; the edit was an import-specifier change with no SQL, identity, migration, timing, delivery or publication change. Remaining Authority-to-Storyteller reverse edges were outside this cut.
- **MA05D.** The two durable notice-topic strings are stable **wire contracts**, separate from generation-kind identities and admission-time environment selection. Their values live in `generations/storyteller-notices.ts`; `campaign/storyteller-wake.ts` owns the SQL readers that recover the frozen notice topic from persisted outbox history and classify provisional capture generations inside the caller's transaction. Wake code must never select a topic from the *current* environment flag, and mixed or missing durable topic history keeps rejecting. Evidence recorded then: disposable sandbox notice-topic freeze 12/12 (missing topic, mixed topic, flag flip, provisional/non-provisional/missing generation).
- **MA05E.** Applying valid continuity-note patches to the Story row is a **Story Authority SQL mutation** even though validation uses pure Storyteller contracts. `publishStorytellerNotes(tx, input)` lives in `stories/continuity-notes.ts`, and `stories/continuation.ts` imports it from that Story Authority module. The story-lock transaction, patch evidence, report exclusion, stale-base and missing-departure checks and publication order are unchanged. Do not replace this with asynchronous post-commit note publication or a callback added only to satisfy imports. Evidence recorded then: scene-checkpoint publication 5/5, including a failed checkpoint write that leaves no story row.
- **MA05F.** Transactional story start and explicit retry admission are Story Authority SQL operations: `startStorytellerCandidate` (`stories/storyteller-start-candidate.ts`, called inside the `stories/start.ts` transaction), `retryStoryteller` (`stories/storyteller-retry.ts`, its own story-lock transaction) and the pure gate `evaluateStorytellerRetryGate` (`stories/storyteller-retry-policy.ts`). No callback, nested transaction, schema change or second provider reservation was added. Evidence recorded then: publication context 5/5 and playable start 5/5, including stale, pending, malformed and foreign candidates.
- **MA05G.** Storyteller resolution replay, the locked commit and task-record insertion are Story Authority SQL operations: `replayStorytellerResolutionIfMatching` and `commitStorytellerResolution` (`stories/storyteller-resolution-authority.ts`), `insertStorytellerTask` and `selectStorytellerNoticeTopicAtAdmission` (`stories/storyteller-task-record.ts`). The public factory is `createStoryResolution(database, documentStore?)` in `stories/resolution.ts`, injecting `prepareStorytellerResolution` into the resolution core. Preparation stays in `storyteller/admission.ts`: a short read-only snapshot, off-lock CAS and document reads, then the same locked revalidation and one commit transaction. No new package, migration, provider call or callback inside the commit transaction was added.

**MA06A (landed, 2026-11-21).** The implementation of `stories/`, `campaign/`, `storyteller/` and `generations/` lives in `@offscreen/story-engine/src/<domain>/`, unsplit. Story Engine does not depend on `@offscreen/application` (now removed). `CacheIncident` and `ReadCacheOptions` live in `stories/read-cache-options.ts`. No story API, SQL schema, lock order, capture lifecycle or provider-spend behavior changed. Campaign reports, narration and capture remain coupled inside the package. See the [MA06A Change](../../../work/changes/archive/2026-11/other/2026-11-21--ma06a-story-engine-package-cohort/CHANGE.md).

## Preferred capture shape

Some current paths read canonical documents while an action's story lock remains held. The preferred evolution is a **short capture transaction, immutable evidence materialization outside the lock, then a fenced publication transaction**, with the exact captured authority. Early outcome generation stays selective for explicitly covered dependencies. It is not a universal future-action policy. The general capability engine remains a conceptual target until one new mechanic is demonstrated. It is not permission to build a plugin framework.

## World-neutral capability kernel

**Selected conceptual approach, not a finalized schema and not permission to refactor `Character`.** The dream includes ordinary life, a fantasy warrior, a microbe and a bodiless mind. The engine supports meaningful actions with consistent consequences. It keeps the D&D-style backbone where a world uses it, and it does not require every world to have HP, a backpack, currency or Euclidean travel.

| Model | Verdict |
| --- | --- |
| One universal Character schema with optional flags | Reject as the permanent shape. It smuggles a humanoid into every form. |
| Unstructured fact map plus LLM interpretation | Reject as the sole mechanics engine. It cannot enforce scarce items or conflicts. |
| Fully generic ECS and dynamic world-rule scripts | Do not select as the base engine. A tactical world may later use ECS as one module. |
| Small typed rule kernel plus statically registered optional capabilities | Preferred target. |

The kernel owns story and actor identity, revision and accepted receipts, the fictional clock, deterministic outcomes and random evidence, typed effects and conflicts, ordered history, Storyteller candidate validation, and public versus private knowledge. It does not know a microbe's nutrients or a wizard's containment. Those are capabilities a world opts into.

A capability family is a versioned pure handler: applicability, explicit reads, captured randomness, a compact receipt, a negative case, and no provider or SQL inside the policy. World documents may set known parameters. They may not supply new algorithms. LLM-authored rule code is forbidden.

**Negative:** absent HP is not infinite HP. Changing form invalidates stale prepared actions and does not rewrite the prior receipt. Do not add a second inventory beside an existing item-transfer effect. One new family at a time; a plugin framework is not the first slice. The reversal test is in the study history: if fact and quantity effects already carry durable agency, the new family can wait; if every creative action needs a special-case validator, the kernel is too thin.

## Sparse identities

**Target semantics, not an Actor service and not a universal world simulation.** Keep five identities distinct:

- **Viewer:** an authenticated account with read access.
- **Controller:** the actor-authorized user or an approved automated policy that may submit an intention.
- **Actor:** a person, creature, process or mind with agency. It may have no body, HP or inventory.
- **Holder:** a story-scoped thing that can contain something without being able to act.
- **Mention:** a noun in narration. Prose does not automatically create a durable actor or item.

A name can change without changing identity. The same label can be different people. A player owns their character's decisions, not every holder in the world.

**Negatives:** a scarce object has one current holder, or an explicit destroyed or unclaimed state. Do not infer the viewer from a prose holder key. A transfer checks the holder at the effective fictional time, not only when a draft was proposed. Containment is not an item-holder string. Private items are not visible merely because SQL contains them. Storyteller speech does not change the ledger. Do not census every passing mention. A transfer to a holder the current rule context has not admitted is unsupported.

## What stays open

- The first generalized world and actor capability vocabulary needs contrasting fixtures before a public generic schema is frozen.
- The time-domain model for groups and independent scenes must be chosen from actual collaboration scenarios, not by extending the solo clock by fiat.
- How often the Storyteller wakes, and on what criteria, needs narrative evaluation and a resource budget.
- Physical maps, combat depth, a cross-story shared world, a marketplace, NPC simulation and speech each need a later product contract.

## Why this can evolve

The meaning of an accepted action stays stable while a local object adapter is replaced, a capability family is added, a model provider changes, retrieval improves, a second decision participant appears, or workers scale. That is the point of the selection. Splitting the same monolith into ten microservices is not.

**Negative:** an LLM-led chat that writes inventory, time and dice is rejected even if it produces faster novel scenes. A green JSON schema is not proof this architecture is running. Full ENG03 is not implied by this page; see [concurrency and recovery](concurrency-and-recovery.md).

## Production API versus outer Lab dependency boundary (MA12, planned 2026-11-22; since closed)

**Selected direction (still the rule).** Production `@offscreen/api` declares only production owners. A narrowly typed extension point lets one outer tools workspace compose the Chamber/QA controllers; the package direction is `api-lab -> api`, never `api -> api-lab`, and the production API entrypoint carries no Lab route or Lab Support runtime package. This is a **deployment/artifact boundary**, not a generic shared-utilities package and not a reason to move story or SQL authority.

**Current source.** The planned workspace exists as `tools/api-lab` (`@offscreen/api-lab`, depending on `@offscreen/api`, `@offscreen/lab-support` and `@offscreen/story-engine`), and `apps/api/package.json` declares neither Lab package. `infra/images/release/prepare-runtime-tree.sh` now copies only the production workspace dependency closure computed by `production-workspace-closure.mjs`, no longer every compiled package. The MA12 packet records its closure as historical source scope with no new build, graph or artifact PASS ([MA12](../../../work/changes/archive/2026-11/other/2026-11-22--ma12-production-api-lab-isolation/CHANGE.md)). Do not claim a fully minimal image unless a measured release proves it, and TURN03's runner files stay separately owned.
