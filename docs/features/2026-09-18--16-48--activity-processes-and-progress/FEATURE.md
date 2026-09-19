# Activities, participation and world-defined progress

Status: Expanded design proposal. The owner requested this architecture/design pass on 2026-09-19. The contribution/runtime subset was previously approved and partially implemented; the broader policies and implementation phases below remain proposals.

## Intended outcome

Activities are a foundational gameplay concept: characters attempt things, commit effort, cooperate, change plans and live with consequences. The engine must express this across conventional lives, strange creatures and abstract worlds without making every action a timer or every goal a progress bar.

The owner explicitly described dwarf, SpongeBob, dragon, microbe, abstract consciousness, movement and rifle examples as brainstorming. They challenge the design; they do not mandate species systems, weapons, maps or a class hierarchy mirroring those nouns. RimWorld inspires depth of work and participation, not a specification to clone.

The current A → B → A slice retains work but still has one campaign character, one advancing activity, contribution-only state and no enforced capacity reservations. See the inspected findings and proposed technical contract in [PLAN.md](PLAN.md).

## Separate work from participation

A work instance and a character's participation in it are different things.

One beacon repair has a target and durable progress. Several characters may contribute, assist, leave or replace one another under its rules. Leaving releases the participant's claims; it does not erase the repair. Personal learning has a different binding: progress belongs to the learner and cannot be given to a replacement reader. An autonomous transformation might have no current performer at all.

The right to direct work, the right to operate a character and ownership of the result are separate. Repairing a ship does not make the worker its owner. Changing a supervisor does not transfer a player's character or redirect a promised reward.

## Representative play

Mara starts restoring a beacon. She has the required knowledge and tools. Its state says “3 of 12 repair work completed,” with a conditional estimate based on her method and capability. Reaching that estimated time grants nothing by itself.

Ivo joins as a qualified contributor. His effort contributes to the same repair using his own capabilities and recorded checks. Alternatively he holds a light as an assistant: that supported role improves Mara's attempt without also earning an independent worker's contribution. Two people do not automatically mean twice the output.

A stranger arrives. Mara leaves the repair to respond. If Ivo's role can continue independently, work continues; if the method requires both roles together, it becomes blocked. The player sees the missing condition and whether progress is safe. An immediate response introduces no artificial wait; a response that takes meaningful effort can itself be a process.

Mara performs other work and later returns. Resume names this exact repair. Missing tools produce “Needs a suitable tool,” not a new zero-progress repair or arbitrary failed roll. An eligible replacement can take her role without acquiring her skills or property. A destroyed beacon invalidates the repair. A deadline can expire while nobody works; an authored spoilage rule can erase progress with a recorded cause.

In a contrasting story, an abstract consciousness allocates two declared attention channels to separate connections. One pauses while the other continues. The engine requires no hands, wages or physical distance. A microbe's environmental transformation can progress without an assigned worker when its rule and environment permit it.

## Shared concepts, distinct semantics

| Concept | Responsibility |
| --- | --- |
| Activity definition | Supported rules, parameters, roles, prerequisites, targets, costs and result terms |
| Admitted instance | Stable identity, accepted definition, bound targets, progress and lifecycle |
| Participation | Actor, role, method, state and capacity claims |
| Attempt | One immediate resolution or due productive contribution with a receipt |
| World clock | Simulation ordering and elapsed time, independent of productive progress |
| Process rule | Meaning of progress, due boundaries, completion and estimates |
| Consequence | Committed effects and their recipients; narration subsequently explains them |

These are responsibilities, not a table or base class per noun. Immediate actions share admission, capability, cost and effect policies without creating long-running process records.

Movement is an activity whose rule changes authoritative place, route segment or relation. Geometry is optional. A combat encounter coordinates contested state and action opportunities; aiming, moving and shooting can be its actions/processes. A shot need not be an entire encounter, and an encounter need not be a contribution meter. Combat scheduling and attack rules require a separate ruleset slice.

## Configuration axes

Configuration selects finite implemented semantics. The Storyteller supplies validated, evidence-backed parameters and supported combinations, never scripts or invented resolvers.

| Axis | Proposed choices and meaning |
| --- | --- |
| Participation | Solo, independent contributors, required cooperating roles, or autonomous process with optional supervision |
| Eligibility | Particular actors, applicable capabilities, declared skills/proficiencies, current facts, access and supported equipment requirements |
| Allocation | Claims against declared actor or shared-resource capacity pools; no universal body model |
| Progress binding | Personal to an actor, shared on work/target, or owned by a world process |
| Transfer | Whether a role may be replaced, under whose authority and with what continuity requirements |
| Resolution | Immediate automatic/check, earned contribution, clock condition, transformation or traversal; add a family only for a concrete semantic need |
| Conditions | Admission-only, rechecked on each attempt, or required continuously |
| Interruption | Preserve, block, explicitly lose/decay progress, or terminate |
| Termination | Completion, abandonment, rule-defined failure, expiry or invalidation |
| Results | Once at completion, per attempt or at milestones; explicit recipient, cost and refund terms |

Not all combinations are legal. Personal learning rejects transfer of learned progress. An assistant cannot also contribute using the same allocated effort unless supported explicitly. Autonomous incubation does not require attention unless its supervision semantics say so. Validate cross-field meaning, not only JSON shape.

Eligibility differs from effectiveness. A lucky d20 cannot replace a mandatory capability. Eligible actors may differ in cadence, success chance, contribution, cost and supported quality outcomes. Ground those differences in recorded capabilities and circumstances. A copied “+5 for tools” cannot survive loss of the required tool.

## Time, interruption and loss

One shared simulation clock governs the initial solo scene. Work instances separately record productive intervals and progress. Running another activity never rewinds that clock. Deadlines, decay and autonomous progression can remain scheduled while participants are suspended.

Distinguish world-clock deadlines, accumulated active-work duration and real response allowances. “Wait twenty minutes of world time” differs from “spend twenty active minutes observing.” Published real response windows belong to autonomy/pause policy, not an activity's estimate.

Switching settles due effects first, discloses material known loss, releases claims and admits the new participation atomically. It does not suspend unrelated workers. Campaign pause freezes its simulation scope; leaving work stops only that participant's contribution. Narrative holds and system failures remain separate reasons.

One failed attempt need not fail the activity. Permanent failure, destruction, expiry, temporary blocks and abandonment have different consequences. Reset is a supported rule result with history, never a generic recovery action. Retrying terminal work creates a new linked instance; repairing disrupted open work preserves its identity and loss history. Neither erases receipts or refunds spent resources accidentally.

## Storyteller and player experience

The Storyteller receives supported mechanics, relevant entities/capabilities, ongoing work, participation, deadlines and evidence. It proposes contextual actions and bounded changes. Revising saved work requires an explicit admitted transition after settling old terms; regenerating an offer cannot rewrite it.

Unsupported mechanics produce a useful hold or a supported approach. Do not turn impossibility into a low-chance check or invent effects through narrative text. Genre shapes content/framing; story names and species never choose runtime branches.

The view should answer: what am I doing, who is helping, what remains, what could interrupt it, and can I leave or return? Show relevant commitments and known blockers. Estimates disclose their assumptions and can be unknown. Keep the scene central; a colony-management dashboard and UI redesign are outside this task.

## Acceptance

- Actual A → B → same A settlement preserves valid work and monotonic chronology; old offers/wake-ups cannot award extra progress.
- Multiple instances of the same definition can coexist and be resumed precisely.
- Workers contribute to one repair under independent or cooperating-role rules; assistance, departure and replacement have explicit effects.
- Missing capabilities block admission; differences between eligible workers affect recorded productivity.
- Capacity is enforced. A declared two-channel actor may do compatible work concurrently; a shared tool cannot be reserved twice.
- Shared work survives worker replacement; personal learning does not transfer. Control and rewards remain separate.
- Waiting needs no work points. Suspended work can expire or decay; campaign pause follows its declared scope.
- Failure, expiry, invalidation, reset and abandonment have legible outcomes and no accidental completion rewards.
- Races between completion, leave and timeout, duplicate delivery and stale narration yield one coherent history.
- Map-free traversal and small/abstract examples share authority/lifecycle without mandatory anatomy, equipment or economy.
- Connected offline rehearsal demonstrates participation, blockers and earned consequences. Owner taste and later live evaluation separately establish storytelling quality.

## Scope and staged delivery

[PLAN.md](PLAN.md) starts with identity/clock correctness, then cooperative participation/capacity, lifecycle/deadline/loss, distinct process rules and Storyteller configurability. Each implementation phase includes enough presentation to experience its result.

The cooperative proof uses relevant authored actors under explicit solo-campaign authority. Human multiplayer negotiation, independent scenes, autonomous NPC job search/priorities, full combat, arbitrary dependency graphs, universal maps/physics, open scripting and simulated populations remain separate features.

## Decisions still needed

Before bulk implementation, review the proposed distinctions between shared/personal work; simultaneous roles and replacement; disclosure of destructive interruption; and the initial solo-scene clock with authored cooperative actors. The plan provides concrete defaults. Preparing this design requires no further choice.

## Owning specifications

[Game rules](../../game-rules.md), [time and autonomy](../../time-and-autonomy.md), [rules and activities](../../technical/rules-and-activities.md), and [ticks and tags](../../technical/ticks-and-tags.md) own maintained contracts. Fold agreed decisions there before implementation. Until then, this folder owns the broader proposal and does not claim runtime support.
