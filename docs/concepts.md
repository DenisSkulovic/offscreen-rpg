# Gameplay and Storyteller concepts

This is the vocabulary for product descriptions, feature plans and technical contracts. It distinguishes what the player experiences, what the Storyteller does, and what the software stores. These definitions do not require a new table or class for every term. See [progress](progress.md) for implemented coverage and [execution language](technical/playthroughs/execution-language.md) for runtime notation.

## The answer to “what does the Storyteller do?”

A **Storyteller turn** is one bounded operation to prepare the next playable presentation of the current situation: inspect context, retrieve evidence when useful, compose narration, and propose the available choices or explicit absence of choices. The application validates and publishes the result. The player then sees the narration and, when a choice is requested, a **decision point**.

The next player decision can lead to another Storyteller turn. Several turns can develop the same conversation or confrontation. Each selected in-world action has its own admitted time semantics; a rapid presentation does not imply a frozen conversation. Reading choices and generating prose consume no fictional time themselves. A turn can also hand back routine activity access, leave progression held, or establish that no choice is currently available. The game does not require a fixed alternation between turns and activities.

“Turn” here describes the Storyteller's logical work; it does not mean a combat round, fixed duration, player action, model API call or literary division. Reports and memory maintenance are other Storyteller tasks with different outputs. Internal reasoning is not a player-visible gameplay unit or a transcript we need to preserve.

## Player and world concepts

The Storyteller is a product identity realized by purpose-specific tasks, creative configuration and application logic. A fresh task reconstructs its context from durable evidence; it does not inherit an indefinitely growing agent chat. Reconstructing context must preserve the detailed interaction still unfolding, including nonverbal or nonhuman communication. Dialogue is story evidence, not a requirement to represent gameplay as human chat. [Active-scene continuity](technical/context-and-cost.md#active-scene-continuity-and-disposable-task-conversations) defines its bounded request policy.

| Term | Meaning | Boundary |
| --- | --- | --- |
| Campaign | The continuing character/world experience with its history, rules and settings | Does not need a planned plot or compulsory ending |
| Narrative direction | The campaign-owned Storyteller intent for what larger pressures, themes or developments to cultivate, when the selected settings permit one | May be absent; it is a revisable private strategy, not a promised sequence or authority over player choices |
| Situation | The relevant present circumstances, plus currently authorized possibilities | Changes through committed actions/events/work; prose alone cannot fabricate mechanical progress |
| Scene | The local dramatic or perceptual context: this conversation, confrontation, visit or stretch of experience | Can span multiple Storyteller turns and activities; no mandatory start/end state machine or clock duration |
| Narration | Prose presenting a situation or explaining an outcome | Presentation, not an instruction that directly mutates game state |
| Decision point | A currently open opportunity for the player to choose among authored options | Deliberation holds fiction; the accepted action owns subsequent elapsed time |
| Offer | The concrete authorized choices and their private admitted plans | A reusable activity offer can survive through fresh projections without a new Storyteller turn |
| Action | The player's selected intention resolved by supported rules with explicit time semantics | Atomic resolution does not imply zero fictional duration; starting/resuming an activity commits its work rule |
| Execution | A durable accepted action or active activity that authorizes a bounded span of progression | Shared clock authority, not a second clock or a table required for each action family |
| Calendar | A defined interpretation of simulation positions as days, dates and optional era labels | Does not advance time or cause seasons merely by displaying a date; optional for a campaign |
| World obligation | An admitted scheduled condition change or development at a simulation boundary | Joins shared execution settlement; no independent permission to advance the clock |
| Activity | A durable commitment extended over eligible game time | Progress follows its admitted rules: contribution, literal waiting, or another supported process |
| Event | A committed development in the world, such as someone arriving | May prompt a Storyteller turn; not every turn requires a new event |
| Report | An account of an already committed result | Does not create current choices or take control of ongoing activity |
| Accepted activity plan | The player's finite sequence of future activity intentions under explicit bounds | Cannot choose responses at decision points or override fresh situation authority |

Scene is useful descriptive context, not a synonym for every screen update. A new passage can describe the same scene. One scene can contain several events and decisions, or no dramatic event at all. Ordinary dialogue can warrant a turn without pretending a new incident happened.

## Execution and storage concepts

| Term | Responsibility |
| --- | --- |
| Storyteller task | A captured unit of work with a purpose and output contract: opening, continuation/consequence, historical report, or future memory maintenance |
| Storyteller turn | The logical task that prepares a playable situation; its result is not current until publication |
| Model round | One model request/response within a task; future retrieval and repair can require several rounds for one turn |
| Publication | Admission of a valid result into current gameplay or historical reporting under its own consistency rules |
| Passage | A recorded unit of published narration; retains its identity and provenance in history |
| Receipt | The exact accepted command or settled mechanical outcome, including relevant rolls and effects |
| Memory segment | A bounded source range used for extraction/indexing/summarization; an internal storage concern |
| Summary | A derived, source-linked account of selected history; may be regenerated without changing that history |
| Canonical document | A versioned authoritative document for its declared role; a summary's role remains derived, while a published source preserves original prose |
| Story fork | A new first-class story copied from one exact committed position; lineage records provenance, while later mutable state is independent and neither branch is automatically canonical |

A file is not automatically a scene, turn, event or unit of time. One turn may consult many documents. A scene can be represented by several source passages. A memory segment can split a long conversation without ending it or making the player wait. Summary creation never gates progress merely because a segment reached its size threshold; missing required evidence has a separate recovery rule.

Existing code uses `result.scene` for a result envelope containing content and next-step data; that field name does not establish a persisted scene lifecycle. `story_passage` records publications. A generation record captures execution, and the legacy prepared-interval path can publish both current and later arrival passages from one result. Do not assume one model call = one turn = one passage = one scene = one file. Rename code only in an owning implementation slice when it improves the contract; this vocabulary change does not require a parallel turn engine.

## Worked example: one conversation, several decisions

At world tick 10 a stranger arrives while Mara repairs the beacon. The activity records its earned progress and the event creates an interaction hold.

1. Storyteller turn T1 prepares narration of the arrival and offers “Ask who sent you” or a supported withdrawal. Its publication creates passage P1 and decision point D1.
2. The player asks. In this target example the offered exchange costs two simulation ticks; its execution advances the world to tick 12. T2 presents the receipt, narrates the claim and offers inspection of the badge or disengagement. P2/D2 are still part of the same conversation.
3. The player inspects the badge for its admitted three ticks. The engine records the supported D20 result once and commits the outcome at tick 15. T3 describes that result and offers P3/D3. It cannot reroll to obtain a more convenient story.
4. The player resolves the confrontation. T4 publishes the explicit activity handoff. The player selects authorized work or continues another available interaction.

This is target behavior from the [committed-time contract](technical/committed-time.md); the current immediate-action path still spends zero ticks. The interrupted beacon earns no labor from the conversation, even though the world advances through it. Player deliberation and excess model latency add no ticks. This is one contextual scene with several turns, passages and decisions, without a larger literary structure.

In another run, a wait finishes quietly: receipt, updated state, and perhaps the next authorized activity, with no Storyteller turn. A report can arrive later without opening a decision. A microbe sensing a changed environment uses the same distinctions without a conversation, town or human identity.

## Excluded structural assumptions

There are **no chapters in the game model or current product scope**. Do not create chapter identities, completion triggers, scheduling, file partitions, generation tasks or player-facing chapter navigation. The owner's earlier use of the word was an uncertain label for the Storyteller interaction, not a feature request.

Use passages for original published text, source-bounded memory segments for internal summaries, and topic/identity links for navigation. Do not rename “chapter” to “episode” and preserve an implicit mandatory narrative arc. Existing “episode memory” wording means a derived memory segment only. A continuous life can change tone, pace and focus without passing through literary containers.
