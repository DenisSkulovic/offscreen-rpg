# One execution language for all the examples

Read with the [atlas legend](README.md#how-to-read-a-claim). Reusable authority belongs to [rules and activities](../rules-and-activities.md), [execution](../execution.md) and the activity/autonomy plans, not to the invented field names in these examples.

The authoritative vocabulary is [Gameplay and Storyteller concepts](../../concepts.md). A Storyteller turn prepares the next playable situation; a decision point is the player's opportunity to respond; a scene can span many such exchanges. Passage is a publication record. None is a chapter or fixed time unit.

## The things the player experiences

| Thing | Example | Technical meaning |
| --- | --- | --- |
| Scene | Gary guards the window throughout a conversation | Current dramatic/perceptual context; may span several turns and decisions |
| Storyteller turn | Narrate Gary's answer and prepare the next choices | One bounded logical operation; may use multiple model rounds before publication |
| Passage | The published account of Gary's answer | Recorded narration tied to committed chronology; does not automatically begin a new scene |
| Decision point | The player can choose what to do about Gary's answer | A current authored offer requiring selection; no literary or clock boundary |
| Offer | Talk Gary down / take cover | Public intentions and risks, backed by private admitted plans. Selecting a label is not submitting arbitrary effects. |
| Immediate action | Take cover now | Automatic outcome or supported check; receipt/effects without an activity or tick advance. |
| Activity | Repair, patrol, travel | Durable work over eligible simulated time. The rule determines progress, not the text label or displayed ETA. |
| Boundary | Repair attempt due at tick 5 | A meaningful settlement position. No row, timer or model request is required for every intermediate tick. |
| Event | A stranger reaches the landing | A committed development and, when required, a new interaction. Not synonymous with every failed roll. |
| Report | “The gate was reached at dusk” | Explanation of committed history. The implemented report-only path does not create current choices, rewards or a hold. |
| Chain | Travel → sleep → travel | Bounded accepted successor intentions with revalidated starts. Not one giant activity with duplicated rewards. |

The current runtime has immediate actions, contribution and wait activities, reports and bounded accepted chains. Broader activity families and document retrieval remain feature work. Narrative-only prepared intervals also exist, but are not proof of authoritative travel mechanics.

## Three axes that must not collapse into one

1. **Progress:** contribution, elapsed wait, repeated cycles, traversal or another supported rule.
2. **Boundary treatment:** factual receipt, prepared text, generated report, generated choice scene, or some legal combination.
3. **Continuation:** stay idle, continue accepted work, or hold for a decision/system recovery.

A repair may complete silently; a wait may end with a scene; arriving at a gate may generate a retrospective report while the next activity proceeds. Neither “everything narrates” nor “activities never narrate” is the design. A continuation is not permission to invent new tasks outside the accepted plan.

## Trace state and command notation

The following is **conceptual notation, not a valid current DTO**:

```text
world: tick W, story revision R, holds {manual?, decision?, system?}
work A: definition/version, targets, beneficiary, progress, lifecycle
participation: actor -> A, role/method, eligible interval, capacity claims
chain Q: accepted entries, current entry, horizon, stop/follow-up policy
offer O: expected revision, public choices, private plans
receipt X: command/boundary identity, tick, dice, effects, evidence
generation G: immutable source snapshot, task, policy, result/publication state
```

Activity definition ID (“repair beacon”) is not instance ID (“this damaged beacon this morning”). Resuming names the latter in the target. A repeated request with the same identity and payload returns its existing result; a different payload cannot reuse that identity. A fresh request against a consumed/stale offer does not receive a fresh roll.

No current schema should be changed merely to match these labels. They make the required distinctions inspectable before implementation chooses the smallest suitable representation.

## Time without cheating

Each trace declares its own tick presentation and rate. Ticks have no universal fictional unit. When a fixture declares 1 tick = 1 fictional minute and 1 tick per real second, 60 active ticks take one real minute; this is not a promise about another campaign. Paused/decision-held time is excluded. Provider latency is wall time, not fictional labor.

For a constant rate, a projection is:

```text
eligible ticks = floor(retained fraction + elapsed unheld real time * rate)
next due boundary = rule/cadence/deadline, not the next browser refresh
```

Settling those ticks still processes ordered rules and can stop earlier at an interruption. ETA derives from the remaining work and current assumptions; it does not award completion. In a contribution rule, a failed attempt may spend eligible effort time and earn zero. A literal “wait 20 minutes” can finish purely by elapsed time. A repair should not be represented as that wait to simplify scheduling.

The current per-activity cursor is not the intended owner of world chronology. When A pauses and B runs for five ticks, resuming A must continue at the new world tick, with A's previous effort retained according to its rule. It must not reconstruct the world as `A.originalStart + A.localCursor`.

## Who does what at a choice

1. The application publishes a valid passage and its admitted offer together. The public view exposes intention/risk, not private DCs, all branches or future hidden events.
2. The player submits an opaque offer/choice reference, expected state and command identity. The application authenticates and rechecks current authority, eligibility and resources.
3. The rules resolve an automatic action or make the needed server-side draws. An activity start instead captures accepted terms and begins at zero earned progress.
4. The transaction commits the receipt, supported effects, consumed offer and any outbox work. A model is not inside that transaction.
5. Only when the captured follow-up calls for it is a Storyteller task prepared. Activity completion supports quiet, historical report and controlling-turn policies; quiet work needs no turn.
6. Generation and publication are separate. Publication rechecks the source/offer/world fence and admission. A valid but obsolete scene is not authoritative.

Preparation may produce a future scene, but reading its output does not make a villain exist or advance travel. Conversely, when a rule has already committed a hazard, lack of prose or budget cannot erase it. Recovery must retain the real receipt.

## Dice are purpose-specific

Current ability checks use the selected D&D subset: `d20 + ability modifier + applicable proficiency + admitted modifiers >= DC`; ability modifier is `floor((score - 10) / 2)`. Advantage/disadvantage, when applicable, change which recorded draw is used. Do not silently import attack-roll critical rules into ability checks. Detailed rule authority stays in [game rules](../../game-rules.md).

An occurrence check such as `d20 <= 8` asks whether an event happens; it is not a skill check with Batman's Persuasion added. A contribution attempt asks how much work this attempt earns. Separate receipts identify the purpose and policy version. The examples fix draws to show consequences; production randomness remains server-owned.

Every five minutes of clock time does not automatically justify a roll. An assured rest may need only a terminal boundary. Uncertainty, meaningful risk and a selected rule justify a check; simulation detail is not automatically gameplay depth.

## Pause, switch, cancel and absence

These are target distinctions; current lifecycle support is partial:

| Player intention | What stops | What survives | What does not follow automatically |
| --- | --- | --- | --- |
| Pause solo campaign | Its permitted simulation clock and relevant response countdown | Work, offers, fractional time, receipts | Unpause because generation finishes |
| Suspend A to do B | A's participation; world can advance through B | Earned A work, if its retention policy allows | Award A progress for time spent on B |
| Cancel remaining chain | Future accepted starts | Current/historical work unless separately stopped | Undo costs or return the actor home |
| Abandon current work | That instance, terminally under its policy | History, committed consequences, declared surviving world progress | Resume a terminal instance or refund consumed resources |
| Close browser | Nothing by itself | Accepted offscreen work and holds | Invent new decision permissions |

Cancelling future generation does not roll back mechanics. Cancelling a client wait does not prove a provider attempt was unbilled. A manual hold and a system/decision hold can coexist; clearing one must not clear the others.

## Race and recovery obligations shared by the traces

- Boundary retry: one receipt, one reward, one follow-up identity. At-least-once scheduling must not produce repeated chance draws.
- Simultaneous event and completion: explicit settlement order and a recorded result; no automatic successor sneaks past an unresolved event.
- Late wake: settle bounded batches in chronological order, stop at a hold; do not jump to the present and infer all intermediate rewards.
- Stale plan: revalidate the next chain entry; blocked preconditions are visible, not an invitation for the model to rewrite the itinerary.
- Late report: label the historical boundary it describes. It cannot replace current options or change current state.
- Invalid/failed generation: preserve committed mechanics; expose recovery or the captured optional-report fallback. Required scenes do not silently become optional.
- Multiple actors: current solo hold rules do not answer multiplayer pause/control conflicts. Those remain open rather than being hidden in a scheduler.
