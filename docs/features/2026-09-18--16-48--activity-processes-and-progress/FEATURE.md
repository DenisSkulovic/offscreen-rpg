# Activities, participation and world-defined progress

Status: Expanded design proposal. The owner requested this architecture/design pass on 2026-09-19. The contribution/runtime subset was previously approved and partially implemented; the broader policies and implementation phases below remain proposals.

## Intended outcome

Activities are extended commitments that carry ordinary life forward through supported rules. Characters commit effort, cooperate, change plans and live with consequences. Immediate actions and Storyteller scenes share mechanical authority with activities but have different lifecycles. The engine must express this across conventional lives, strange creatures and abstract worlds without making every action a timer or every goal a progress bar.

The owner explicitly described dwarf, SpongeBob, dragon, microbe, abstract consciousness, movement and rifle examples as brainstorming. They challenge the design; they do not mandate species systems, weapons, maps or a class hierarchy mirroring those nouns. RimWorld inspires depth of work and participation, not a specification to clone.

The current A → B → A slice retains work but still has one campaign character, one advancing activity, contribution-only state and no enforced capacity reservations. See the inspected findings and proposed technical contract in [PLAN.md](PLAN.md).

The owner's prepared-local-life direction permits independent selection/repetition only among the Storyteller's explicitly authorized choices for the current situation. The engine never invents choices from possessions or capabilities. Each new interactive situation supplies or explicitly carries forward its selection, which can allow no activities at all. While a quiet authorization remains valid, its prepared activities need no inference per click. Several rapid scenes can follow without reopening that selection. See [product behavior](../../gameplay.md#prepared-local-life-while-the-storyteller-is-dormant) and the [technical opportunity contract](../../technical/rules-and-activities.md#prepared-local-opportunities-proposed). This direction is recorded; implementation choices remain proposed.

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
| Local opportunity | Scoped, versioned availability of a prepared definition and targets; distinct from a consumed scene offer or an accepted queue |
| Admitted instance | Stable identity, accepted definition, bound targets, progress and lifecycle |
| Participation | Actor, role, method, state and capacity claims |
| Attempt | One immediate resolution or due productive contribution with a receipt |
| World clock | Simulation ordering and elapsed time, independent of productive progress |
| Process rule | Meaning of progress, due boundaries, completion and estimates |
| Consequence | Committed effects and their recipients; narration subsequently explains them |

These are responsibilities, not a table or base class per noun. Immediate actions share admission, capability, cost and effect policies without becoming activities or creating long-running process records. Reserve activity for something extended in time; the generic admission/effect layer can support both.

Sustained movement is an activity whose rule changes authoritative place, route segment or relation. Geometry is optional. A combat encounter coordinates contested state and action opportunities; an individual shot can resolve as an action, while a patrol or sustained maneuver can be an activity. The current storytelling focus is routine patrol escalating into a developed encounter, not treating every shot or scene as a background job. Full combat scheduling/attack rules require a separate ruleset slice.

## Configuration axes

Configuration selects finite implemented semantics. The Storyteller supplies validated, evidence-backed parameters and supported combinations, never scripts or invented resolvers.

| Axis | Proposed choices and meaning |
| --- | --- |
| Participation | Solo, independent contributors, required cooperating roles, or autonomous process with optional supervision |
| Eligibility | Particular actors, applicable capabilities, declared skills/proficiencies, current facts, access and supported equipment requirements |
| Allocation | Claims against declared actor or shared-resource capacity pools; no universal body model |
| Progress binding | Personal to an actor, shared on work/target, or owned by a world process |
| Transfer | Whether a role may be replaced, under whose authority and with what continuity requirements |
| Process rule | Earned contribution, clock condition, repeating routine, transformation or traversal; immediate actions share policies but are not process variants |
| Conditions | Admission-only, rechecked on each attempt, or required continuously |
| Interruption | Preserve, block, explicitly lose/decay progress, or terminate |
| Termination | Completion, abandonment, rule-defined failure, expiry or invalidation |
| Results | Once at completion, per attempt or at milestones; explicit recipient, cost and refund terms |
| Boundary follow-up | Factual report, prepared/generated narration, scene/choice preparation and continuation policy, in validated combinations |
| Composition | Standalone activity or an entry in a bounded itinerary; milestone hooks and remaining intentions survive interruption |

Not all combinations are legal. Personal learning rejects transfer of learned progress. An assistant cannot also contribute using the same allocated effort unless supported explicitly. Autonomous incubation does not require attention unless its supervision semantics say so. Validate cross-field meaning, not only JSON shape.

Eligibility differs from effectiveness. A lucky d20 cannot replace a mandatory capability. Eligible actors may differ in cadence, success chance, contribution, cost and supported quality outcomes. Ground those differences in recorded capabilities and circumstances. A copied “+5 for tools” cannot survive loss of the required tool.

## Time, interruption and loss

One shared simulation clock governs the initial solo scene. Work instances separately record productive intervals and progress. Running another activity never rewinds that clock. Deadlines, decay and autonomous progression can remain scheduled while participants are suspended.

Distinguish world-clock deadlines, accumulated active-work duration and real response allowances. “Wait twenty minutes of world time” differs from “spend twenty active minutes observing.” Published real response windows belong to autonomy/pause policy, not an activity's estimate.

Switching settles due effects first, discloses material known loss, releases claims and admits the new participation atomically. It does not suspend unrelated workers. Campaign pause freezes its simulation scope; leaving work stops only that participant's contribution. Narrative holds and system failures remain separate reasons.

One failed attempt need not fail the activity. Permanent failure, destruction, expiry, temporary blocks and abandonment have different consequences. Reset is a supported rule result with history, never a generic recovery action. Retrying terminal work creates a new linked instance; repairing disrupted open work preserves its identity and loss history. Neither erases receipts or refunds spent resources accidentally.

## Storyteller and player experience

The [ordinary-life/scene direction](../../vision.md#ordinary-life-and-storyteller-scenes) determines how this machinery serves play. Mechanical settlement and continuation do not inherently require generation. An accepted follow-up policy can nevertheless request completion narration, a planned milestone vignette, a choice, next work or compatible combinations. Quiet execution is an available configuration, not a universal ban on narration. Starting a novel routine may require preparation. Detailed chain/reporting/scene policy is owned by [bounded autonomy](../2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md#configurable-boundary-follow-ups).

The owner's Red Mountain journey probes composition: travel to Balmora, rest, spend time at its tavern, travel to the Gate, rest, then travel onward. Any leg can have supported optional events; arriving at the Gate can independently request planned narration. The itinerary is accepted intentions, not completed travel or a second reward-producing process. A tavern visit can remain routine social downtime or open detailed dialogue. These are configurable uses of one system, not place-name branches. Preserve finished legs when revising the remainder after an event.

The first proof after clock correction is a bounded quiet sequence and one optional event, before broader cooperative mechanics. This keeps architecture work tied to the desired feeling of time creating value. Rest then patrol is an illustrative contrast; no Batman-specific mechanics or mandatory daily timetable. A repeating routine can produce bounded periodic results until its stop condition without manufacturing a final completion reward.

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
- A quiet routine can finish and transition to a permitted next routine with zero generation task admissions, including consequence narration. A distinct event path records one escalation, preserves committed work and prevents the queue bypassing the decision.
- Within an explicitly authorized quiet situation, the player can independently choose another eligible authored activity and repeat supported work with zero new generation tasks. Conditions can restore only a choice still included in that authorization. New scenes never inherit routine access implicitly; inventory alone adds no choice. Three consecutive scene-only decisions do not expose activities between them. Stale commands and queued/ongoing incompatible work cannot bypass the boundary; repeatable rules never replay rewards or reset scoped occurrence/finite-finding state.
- The same mechanical outcome can instead narrate and continue, or hold for a contextual choice, under a different admitted policy. Scheduled milestone narration requires no random event. Late report-only prose remains historical; it cannot overwrite the current situation or introduce unadmitted facts.

## Scope and staged delivery

The [Storyteller-authored situations feature](../2026-09-19--13-49--storyteller-authored-situations/FEATURE.md) owns definition selection/current authorization across immediate and extended play. This feature supplies work, clock and mechanical eligibility; autonomy supplies boundary follow-ups and accepted chains. The [ordered handoff](../README.md) and [solo integration contract](../../technical/solo-gameplay-contract.md) replace the formerly oversized phase-two delivery with bounded named slices while preserving the broader acceptance below.

[PLAN.md](PLAN.md) starts with identity/clock correctness, then proves quiet routine progression and selective event escalation together with the autonomy feature. Cooperation/capacity, richer loss policies and additional process families follow that playable proof. Each phase includes enough presentation to experience its result; do not require the whole activity framework before showing a meaningful quiet interval.

The cooperative proof uses relevant authored actors under explicit solo-campaign authority. Human multiplayer negotiation, independent scenes, autonomous NPC job search/priorities, full combat, arbitrary dependency graphs, universal maps/physics, open scripting and simulated populations remain separate features.

## Decisions still needed

Before bulk implementation, review the proposed distinctions between shared/personal work; simultaneous roles and replacement; disclosure of destructive interruption; and the initial solo-scene clock with authored cooperative actors. The plan provides concrete defaults. Preparing this design requires no further choice.

## Owning specifications

[Game rules](../../game-rules.md), [time and autonomy](../../time-and-autonomy.md), [rules and activities](../../technical/rules-and-activities.md), and [ticks and tags](../../technical/ticks-and-tags.md) own maintained contracts. Fold agreed decisions there before implementation. Until then, this folder owns the broader proposal and does not claim runtime support.
