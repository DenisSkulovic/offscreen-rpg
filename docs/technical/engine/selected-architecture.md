# Selected engine architecture

**Owns:** the long-term engine shape: what kind of runtime can keep a life coherent for months without handing mechanical truth to a chat model.  
**Status:** **selected working target** from the November 2026 engine architecture pass. The alternatives table in that pass marks modular monolith plus durable workflows plus immutable evidence as the selected working target. The same pass is **not a code authorization**, and the items under [What stays open](#what-stays-open) are not ratified.  
**Not implemented** by the existence of this page. Landed prototype contracts remain in [authority and transitions](authority-and-transitions.md), [mechanics](mechanics-and-capabilities.md), [chronology](chronology-and-activities.md) and [lifecycle](lifecycle-and-compatibility.md). Narrow concurrency proof is in [concurrency and recovery](concurrency-and-recovery.md).  
**Product:** [rules](../../product/gameplay/rules.md), [actions](../../product/gameplay/actions-and-commitments.md), [time](../../product/gameplay/time-and-autonomy.md).

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

These are logical ownership lines. They are not an order to create seven top-level packages. Existing `packages/game`, `application`, `storyteller`, `documents`, `db` and `workflows` may already be the right deployable seams. A file, import or transaction that crosses the seam is the defect, not the absence of a new package.

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
