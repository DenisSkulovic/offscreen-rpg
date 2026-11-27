# Gameplay and Storyteller concepts

This is the shared vocabulary for product descriptions, feature plans and technical contracts. It separates what the player experiences, what the Storyteller does, and what the software stores. The definitions are selected meaning and do not require a new table or class for every term. See [execution language](../../../research/authored-scenarios/execution-language.md) for runtime notation and [progress](../../../STATUS.md) for implemented coverage.

## The answer to “what does the Storyteller do?”

The **Storyteller** is a persistent-knowledge writer, not an immortal chat session and not Game Authority. The selected investigative target gives it, for an opening or continuation, a small pinned orientation. From there it may inspect the rooted Library, search and compare exact pinned sources, consult versioned writing skills, keep a durable task **Workdesk**, use tools, revise drafts, and delegate bounded research or editorial questions to optional independent assistant contexts. It decides how much of that work the mission needs; the product requires no fixed number of model rounds or agents, and one simple scene may need almost none. This is the target the product selects, not a general agent that runs today; [progress](../../../STATUS.md) records what is realized.

A **Storyteller mission** ends by proposing a scene, choices/intentions and any source changes that should accompany it. Everything it proposes passes authority admission: Game Authority validates what may become authoritative and publishes one coherent outcome, and the Storyteller never owns a mechanical result.

A published scene is more than prose. It is a historical boundary tied to the exact admitted Library, fictional state, clock, effective creative/rule pins, choices and active fictional commitments at that point, reviewable and forkable without replaying the writer. “Mission,” “turn,” “scene,” “passage” and “model round” are deliberately not synonyms. Internal reasoning is not player-visible history, and hidden chain-of-thought is not a persistence requirement.

## Player and world concepts

The Storyteller is a product identity; the selected design realizes it through purpose-specific tasks, creative configuration and application logic. A fresh task reconstructs its context from durable evidence; it does not inherit an indefinitely growing agent chat. Reconstructing context must preserve the detailed interaction still unfolding, including nonverbal or nonhuman communication. Dialogue is story evidence, not a requirement to represent gameplay as human chat. [Active-scene continuity](../../technical/storyteller/request-context-and-cost.md#active-scene-continuity-and-disposable-task-conversations) defines its bounded request policy.

| Term | Meaning | Boundary |
| --- | --- | --- |
| Story Prompt | Verbatim player intent used to begin or redirect creation | Authoritative as intent, not automatically a fictional fact |
| Prepared experience | Authored playable package with its own Library, starting constraints and optional customization | Not merely a text seed attached to a generic wizard |
| Library | Persistent, navigable, versioned collection of story sources, private creative records and published material | Not one giant prompt and not a permission-free filesystem |
| Workdesk | Reconstructable research/draft workspace for one Storyteller mission | Durable across mission retries; provisional, not canon |
| Writing skill | Versioned craft guidance the Storyteller may load when useful | Cannot grant runtime permissions, money, clock authority or tools |
| Research assistant | Independent bounded context commissioned for a separable question | Returns evidence/proposals; does not publish canon directly |
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

The terms above group around four distinctions:

- **Scene** is descriptive context, not a synonym for every screen update. A new passage can describe the same scene, and one scene can hold several turns, events and decisions, or no dramatic event at all. Ordinary dialogue can warrant a turn without pretending a new incident happened.
- **Decision** is the moment of choice. Deliberation holds the fiction; the accepted action owns the elapsed time that follows.
- **Activity** is a commitment extended over eligible game time. Immediate dialogue choices and single attempts are actions, even when they share mechanical policies with activities.
- **Authority** decides what becomes true. Narration, reports and Storyteller proposals present or suggest; only committed actions, events and work change the situation.

## Execution and storage concepts

The terms below are the technical vocabulary behind the player concepts. Internal storage labels are names for stored records, not extra product objects; the dated note after the table covers the current ones.

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

A file is not automatically a scene, turn, event or unit of time. One turn may consult many documents, and a scene can be represented by several source passages. A memory segment can split a long conversation without ending it or making the player wait. Summary creation never gates progress merely because a segment reached its size threshold; missing required evidence has a separate recovery rule. Do not assume one model call equals one turn, one passage, one scene, or one file.

**Storage labels are not product objects.** Names such as `result.scene` and `story_passage` are internal storage labels; they add no scene lifecycle or second turn engine, and one model call is not one turn, passage, scene or file. The one current path that can publish both a present passage and a later arrival from the same result is a dated realization, recorded with its scope at [execution and storage concepts: dated realization](../../technical/storyteller/operation-and-controller.md#execution-and-storage-concepts-dated-realization-of-the-vocabulary). [Status](../../../STATUS.md) records what those names currently cover.

## Worked example: one conversation, several decisions

At fictional second 600 a stranger arrives while Mara repairs the beacon. The activity records its earned progress and the event creates an interaction hold.

1. The arrival turn prepares narration of the arrival and offers “Ask who sent you” or a supported withdrawal. Its publication creates the first passage and the first decision point.
2. The player asks. In this illustrative offer the exchange costs 60 fictional seconds; its execution advances the world to second 660. The next turn presents the receipt, narrates the claim, and offers inspection of the badge or disengagement. That passage and decision are still part of the same conversation.
3. The player inspects the badge for its admitted 90 fictional seconds. The engine records the supported D20 result once and commits the outcome at second 750. The following turn describes that result and offers the next passage and decision. It cannot reroll to obtain a more convenient story.
4. The player resolves the confrontation. The last turn publishes the explicit activity handoff. The player selects authorized work or continues another available interaction.

This illustrates the [committed-time contract](../../technical/engine/chronology-and-activities.md). It is not a recorded live run, and it is not proof that every finite action is implemented. In the example, the automatic and check offers have positive admitted durations and settle at their target fictional second. The interrupted beacon earns no labor from the conversation, even though the world advances through the accepted exchanges. Player deliberation and model latency add no fictional time. The durations belong to these offers, not to every conversation. One scene can hold several turns, passages, and decisions without a chapter structure.

In another run, a wait finishes quietly: receipt, updated state, and perhaps the next authorized activity, with no Storyteller turn. A report can arrive later without opening a decision. A microbe sensing a changed environment uses the same distinctions without a conversation, town or human identity.

## Excluded structural assumptions

There are **no chapters in the game model**. Do not create chapter identities, completion triggers, scheduling, file partitions, generation tasks, or player-facing chapter navigation. An earlier informal use of the word named the Storyteller interaction. It was not a feature request.

Use passages for original published text, source-bounded memory segments for internal summaries, and topic/identity links for navigation. Do not rename “chapter” to “episode” and preserve an implicit mandatory narrative arc. Existing “episode memory” wording means a derived memory segment only. A continuous life can change tone, pace and focus without passing through literary containers.
