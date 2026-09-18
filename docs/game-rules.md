# D&D foundation and player agency

Required foundation, reaffirmed by the owner on 2026-09-18. The connected authored slice implements immediate checks, fact/quantity effects and receipt-based storyteller narration. General generated adjudication remains unfinished; see the [playable DM loop](features/2026-09-18--17-21--playable-dm-adjudication-loop/FEATURE.md). D&D is the mechanical foundation, and the storyteller fills the dungeon master's role. Work, fishing, studying, bargaining, travel and fighting ultimately resolve through character capabilities, explicit rules, checks and recorded consequences. Dice are authoritative mechanics, not decoration over model-written outcomes.

The initial implementation uses a small, explicitly versioned D&D-style rules subset. It must not claim full compatibility with a particular D&D edition. The owner delegated edition choice: use revised fifth edition, pinned to [SRD 5.2.1](https://www.dndbeyond.com/srd). Full combat, character advancement and long-running progress remain separate slices. The POC needs real checks and persistent effects before that larger scope.

## Authority

The DM interprets intent, proposes applicable challenges and narrates outcomes. Code validates the challenge, rolls dice, determines results and applies supported effects. A model cannot choose a die face, reroll a failure, award an unsupported resource or narrate away a committed result. The player's character, resources and completed history survive changes of storyteller.

Certain ordinary actions can succeed without a check; impossible actions cannot become possible through a lucky roll. Uncertainty with consequences warrants a check. Encounter occurrence is separate from action success: an uneventful road is not evidence that the character failed to travel. Routine checks can produce useful progress without producing a dramatic incident.

## World-independent foundation

The game is D&D checks plus an LLM dungeon master plus time, for arbitrary worlds and characters. Work, wages and fishing are example content, not core systems or a required progression loop. A microbe story need not have money, employment or any replacement for them. Only represent quantities or consequences that the particular story needs.

D&D is the default mechanical language, not an assumption that every protagonist currently has a humanoid body or medieval life. The six ability scores remain part of the selected rules sheet, while the character's current form explicitly declares which abilities and skills can apply. An unavailable ability is not a score of zero and cannot be invoked by a generated plan. A distributed consciousness may currently support Intelligence, Wisdom and Charisma checks plus setting-specific skills; a later materialized dwarf may support the full physical set. Changing form is an admitted state transition, not something prose silently accomplishes.

Use the ordinary D&D skill catalogue when it fits. A setting may declare additional named skills such as environmental sensing or dimensional attunement, but a model cannot invent one inside an action package. Ability checks still use the selected D&D calculation. This preserves familiar D&D behavior in a conventional fantasy game while letting unusual worlds state where that behavior is applicable.

## First rules subset

Use six ability scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma), modifiers calculated as floor((score - 10) / 2), an explicit current ability/skill catalogue, named skill proficiencies, a captured proficiency bonus and hit points. A story may define quantities when needed; no currency, wage, profession or resource analogue is mandatory. The initial sample character is authored data; no character builder is required. Ability checks use d20 + ability modifier + proficiency when applicable + explicitly supported situational modifiers against a difficulty class (DC). Advantage/disadvantage rolls two d20s and selects the higher/lower; opposing sources cancel, repeated sources do not stack. Natural 1 and 20 do not automatically fail/succeed on these ability checks. These are selected POC rules, not a complete ruleset.

Long-running work, travel and study will contribute rule-defined progress at meaningful tick boundaries. A process can pause while retaining committed progress; it does not complete merely because a requested number of ticks elapsed. The applicable rule decides whether a tick contributes distance, craft progress, recovery, waiting or nothing. Encounter occurrence and action success remain distinct checks. Their exact process contract is still under design and must not be inferred from the immediate-action implementation.

## Visible rolls

Show an expandable roll record alongside the relevant outcome: purpose, tick or operation segment, raw dice, chosen die, modifiers, DC when knowable, result and applied effect. Animation illustrates an already saved roll. Reloading, retrying narration or changing pace cannot roll again.

Hidden encounters must not reveal future threats through a public roll log. Show permitted completed checks and redact secret DCs/modifiers where they disclose unknown facts; retain the full record privately. Repeated quiet checks may be grouped for presentation while preserving their individual records.

## The range of available actions

Choice breadth follows actual opportunity: available time, proximity, mobility, equipment, knowledge, commitments and immediate threats. It is not a fixed option count or a difficulty slider. Danger often narrows possibilities, but a dangerous scene can still offer several tactics; low HP alone does not prove escape, negotiation or environmental action is impossible.

In a peaceful town, present several directions such as work, trade, study, explore and rest. A direction can open another prepared menu without advancing game time or implying the character already acted. Under a close threat, offer only feasible immediate responses. If there is one meaningful action, show one. If nothing can be influenced, resolve the event and present its aftermath rather than inventing three synonymous buttons. Expressive choices are allowed when their emotional or social consequence is real, but must not pretend to avert an unavoidable outcome.

Options disclose apparent commitments, approximate duration and known risks without leaking hidden facts. Distinguish attempts, safe menu navigation and already determined consequences. No free-text action box is required for broad agency. Player-written storyteller preferences belong in settings; they are not a channel for issuing immediate character actions.

See [storyteller customization](storyteller-settings.md), [time](time-and-autonomy.md) and the [mechanical execution contract](technical/rules-and-activities.md).

## Implemented entry and limits

On the opening preview, select either mechanical rehearsal before Start. Pineapple and microbe use the same immediate-action contract: the public offer contains labels and intentions, while immutable private plans hold prerequisites, checks, DCs and outcome branches. The browser submits only the offer identity and selected path. Current plans are authored fixture data; generated planning is the next core implementation.

Immediate automatic actions and ability checks commit through the same receipt path. Outcomes may explicitly declare a bounded durable story fact when the current action establishes something not previously represented; updating an existing character fact remains a different effect. Immediate plans may require a minimum declared quantity, which is checked before any roll. Latest 100 activity roll records and recent immediate receipts are exposed in the play view. Long-running process semantics, full combat, study/level progression and generated adjudication remain outside this subset. Existing narrative stories are not silently assigned character sheets. Rules attribution is available at `/rules` and in [the attribution document](rules-attribution.md).
