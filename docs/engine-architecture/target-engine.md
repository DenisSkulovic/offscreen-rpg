# Target engine | independently selected operating model

**Status:** **first-pass architectural recommendation**, not yet ratified; no code authorization. Starts from [product requirements](product-derived-requirements.md). Avoid interpreting present packages as mandatory simply because they exist.

## Select the architecture by its failure model

What kind of engine best serves a fiction whose character can live for months and whose decisions can be both creative and mechanically earned?

**Recommended:** a **modular monolith with a durable, versioned story authority core**, separate pure capability/rule policies, a bounded Storyteller proposal engine, and an event/boundary-driven execution layer. Data is authoritative in PostgreSQL + immutable narrative objects; workers can be scaled independently behind one deployment-friendly contract. Project selected state to the browser. The server retains command idempotence; player intent never directly writes outcome.

This is close to some current choices, but for **product reasons**, not because the repo already uses Nest and Temporal.

## Alternatives that could reasonably have won

| Candidate | What it does well | Why it loses *now* | Revisit trigger |
| --- | --- | --- | --- |
| **LLM-led chat+state** | Fast novel scenes and arbitrary player prompts | Undermines earned time, provenance, authority and repeatable consequences | Never as sole source of mechanical truth |
| **Turn-based CRPG rules engine** | Testable tactical actions and deterministic replay | Too narrow for hours-long offscreen life, abstract forms and social stories | Optional rules package for tactical worlds |
| **Persistent world simulation/ECS** | High-frequency actors, physical spaces and many concurrent entities | Requires universal world model, irrelevant load, and high simulation cost for mostly narrative worlds | Specific shared-world simulation truly requires it |
| **Event-sourced microservices** | Independent scaling and replayable event history | Many contracts/operational failures before domain seams are stable; fiction materialization isn't simple event reduction | Measured independent hot domains/team ownership and event semantics become stable |
| **Modular monolith + durable workflows + immutable evidence** | Transactional correctness, extensible capabilities, sparse work, clear diagnostics; scalable deployment topology | Must defend internal boundaries and evolve storage/clock models intentionally | **SELECTED working target** |

## Six logical subsystems, one coherent runtime

```text
         Player intention (typed choice / future reviewed custom intent)
                                 │
                                 v
                    [STORY AUTHORITY / ADMISSION]
             actor, permissions, current offer, versions, risks,
             resource preconditions and immutable operation identity
                                 │
                    ┌────────────┴─────────────┐
                    v                          v
             [RULE CAPABILITIES]        [EXECUTION ENGINE]
       optional body, skills,           earned game time, activities,
       items, location, relations,      event boundaries, deadlines,
       checks, effects                  pauses, approved delegation
                    └────────────┬─────────────┘
                                 v
                    [COMMITTED CANON / RECEIPTS]
               state and causal ledger + immutable sources
                                 │
               ┌─────────────────┴────────────────┐
               v                                  v
      [STORYTELLER PROPOSAL]               [READ / REENTRY]
      context retrieval, scene             Now, Journal, World/You,
      options, descriptive patches,        notifications, audit view
      bounded model/cost                    only viewer-authorized
               │
               └── proposed, validated and published ──> new situation
```

**One owner per fact, distinct owners per purpose.** Storyteller output is not truth until admitted. A generated scene may be published later than mechanical settlement. The read model can lag or be unavailable, never silently recalculate the underlying game.

## The causal spine of any meaningful action

1. **Situate:** retrieve an authorized view of current scene, actor and relevant known world state.
2. **Intend:** player selects an authored valid attempt, or *future* proposes a custom intention for interpretation and review.
3. **Admit:** application checks actor, story membership, version, current offer, rule compatibility, resources, time, cost and accepted autonomy. Stores immutable intent and receipt identity in one transaction.
4. **Execute/Wait:** deterministic time and mechanic effects advance at valid boundaries; Temporal coordinates wake/recovery, not game authority.
5. **Commit:** exactly one durable rule result, check, progress, event and effect at the correct canonical time. Multiple deliveries observe the same receipt.
6. **Narrate/Publish:** bounded Storyteller turns propose a source-grounded passage and next options; application verifies canonical source/version/effects and publishes once. Failure leaves saved truth.
7. **Remember:** significant original evidence remains addressable; optional summaries, indexes and recaps are derived/refreshable, not new canon.
8. **Return:** per-viewer projection tells what actually changed, what is still running, and which decisions now require a human.

The **same causal skeleton** should support studying for a week, a five-second sentence, giving away an item, sensing a chemical gradient or crossing a road. New capabilities implement new policies rather than a duplicate engine.

## Architectural non-negotiables

- **Rules are pure, explicit, testable:** no DB/Nest/OpenRouter inside a game policy. The exact selected ruleset/version and content evidence are part of admission.
- **PostgreSQL owns authoritative mutable state** and serialized business transitions. Prefer durable receipts/event facts rather than making raw JSON blobs the sole history.
- **Immutable documents own prose and source-linked descriptive canon**, with versioned manifests and clear distinction between observed, attributed, derived and private.
- **Temporal owns durable coordination**, timers and retryable *idempotent* Activities. SQL/outbox owns the fact that a command happened; a workflow start signal isn't a reward.
- **LLM inference is bounded proposal:** never allowed to execute instructions, money, inventory movement or cross-actor authority directly.
- **Read models are viewer-scoped projections**; SSE is an invalidation hint, not the truth. Query/version cache is optional acceleration, not business authority.
- **Every expensive or irreversible effect is budgeted and recoverable** under an explicit authority boundary; transport uncertainty is a state.
- **Evolution is a protocol**, not a schema rename: old campaigns, admitted plans, long-running workflows and prior evidence must remain coherent through releases.

## Domain decomposition should reflect independent reasons to change

| Boundary | Changes when | It should own | What it must not own |
| --- | --- | --- | --- |
| Story authority | actor/offer/consent/revision rules | identities, admission, state transition fences | narrative tone or provider transport |
| Mechanics/capabilities | a game rule family or applicable actor changes | rule definitions, validation, pure resolution | SQL, world-specific scene narration |
| Time/execution | activity/interruption/deadline policies change | earned clock and eligible next boundary | infinite model-planned agendas |
| Storyteller | creative prompt, tools, model/cost recipe changes | candidate generation and evidence selection | committed resource transfers |
| Canon/memory | source identity, knowledge visibility, retrieval changes | versioned source truth, derivations and references | roll/clock authority |
| Read surfaces | browser/notification/Journal needs change | safe public projections and relevance | private hidden state or new mechanics |
| Platform/ops | load, deployment, retention, isolation changes | adapters, queue pools, telemetry, compatible release | game semantics |

**Avoid repository bureaucracy:** These are **logical ownership lines**. Do not necessarily create seven top-level packages. Existing `packages/game`, `application`, `storyteller`, `documents`, `db`, `workflows` and deployables may already be appropriate. The audit decides if a specific file, import or transaction violates the intended seam.

## One situation can have many concurrent aspects

Stop thinking of the “story state” as one enum. A passage can be published while work is interrupted, a report can be delayed while a different task runs, and a network command can be uncertain after mechanics settle. Model **orthogonal axes** and compose them for the player rather than inventing multiple sources of truth.

The engine should not require a Storyteller call at every second, every chance roll, every user menu inspection or every minor activity completion. A rules event may request a Storyteller wake at an admitted meaningful boundary. **No event** is a valid result.

## Revised causal boundaries from pass 2

The source shows some context reading from canonical documents while an action's story lock remains held. The preferred evolution is a **short capture transaction → immutable evidence materialization outside the lock → fenced publication transaction**, with exact captured authority; see [locking/context decision](decisions/context-capture-and-locks.md). Early outcome generation must remain selective for explicitly covered dependencies rather than become a universal future-action policy; see [prediction fences](decisions/prediction-dependency-fences.md). The general capability engine remains a *conceptual* target pending one demonstrated new mechanic, not permission to build a plugin framework; see [capability-kernel alternatives](decisions/world-capability-kernel.md). These aren't demonstrated performance fixes or authorized migrations.

## What stays deliberately open

- The right first generalized **world/actor capability vocabulary** needs multiple contrasting fixtures before freezing a public generic schema.
- The larger **time-domain model** for groups/independent scenes must be chosen from actual collaboration scenarios, not by extending a solo clock by fiat.
- The frequency and criteria for Storyteller wakes need real narrative evaluation and resource budgets.
- Full event sourcing is **not selected**. A transactionally committed **causal business ledger** plus current projections is sufficient initially; event replay as authority is a separate, expensive architectural choice.
- Physical map, combat depth, cross-story shared world, marketplace, NPC simulation and full speech/voice each need a later product contract.

## Why this is evolution-friendly

It lets us replace a local object adapter with an S3-compatible one, add a new capability family, change a model provider, improve retrieval, introduce a second decision participant, or scale workers **without changing the meaning of an accepted action**. That's a stronger portfolio accomplishment than deploying the same monolith as ten microservices.
