# D&D foundation and player agency

Required foundation, reaffirmed by the owner on 2026-09-18. The connected authored slice implements checks, time, fact/quantity effects and receipt-based storyteller narration. General generated adjudication remains unfinished; see the [implementation checkpoint](features/dnd-checks-and-visible-outcomes/PLAN.md). D&D is the mechanical foundation, and the storyteller fills the dungeon master's role. Work, fishing, studying, bargaining, travel and fighting resolve through character capabilities, explicit rules, checks and recorded consequences. This is not optional decorative dice layered onto model-written outcomes.

The initial implementation uses a small, explicitly versioned D&D-style rules subset. It must not claim full compatibility with a particular D&D edition. The owner delegated edition choice: use revised fifth edition, pinned to [SRD 5.2.1](https://www.dndbeyond.com/srd). Full combat and character advancement remain separate slices. Hourly work rewards, encounter thresholds and pacing are our authored extensions, not claims about tabletop rules. The POC needs real checks and persistent effects before that larger scope.

## Authority

The DM interprets intent, proposes applicable challenges and narrates outcomes. Code validates the challenge, rolls dice, determines results and applies supported effects. A model cannot choose a die face, reroll a failure, award an unsupported resource or narrate away a committed result. The player's character, resources and completed history survive changes of storyteller.

Certain ordinary actions can succeed without a check; impossible actions cannot become possible through a lucky roll. Uncertainty with consequences warrants a check. Encounter occurrence is separate from action success: an uneventful road is not evidence that the character failed to travel. Routine checks can produce useful progress without producing a dramatic incident.

## World-independent foundation

The game is D&D checks plus an LLM dungeon master plus time, for arbitrary worlds and characters. Work, wages and fishing are example content, not core systems or a required progression loop. A microbe story need not have money, employment or any replacement for them. Only represent quantities or consequences that the particular story needs.

## First rules subset

Use six ability scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma), modifiers calculated as floor((score - 10) / 2), named skill proficiencies, a captured proficiency bonus, hit points. A story may define quantities when needed; no currency, wage, profession or resource analogue is mandatory. The initial sample character is authored data; no character builder is required. Ability checks use d20 + ability modifier + proficiency when applicable + explicitly supported situational modifiers against a difficulty class (DC). Advantage/disadvantage rolls two d20s and selects the higher/lower; opposing sources cancel, repeated sources do not stack. Natural 1 and 20 do not automatically fail/succeed on these ability checks. These are selected POC rules, not a complete ruleset.

As a possible authored work activity, each complete game hour uses one supported skill check. Five game hours produce five independently recorded hourly outcomes and the corresponding earned currency. The activity definition supplies skill, DC and success/failure rewards before rolling. A content author could choose DC 12 and two coins on success, one on failure; that example is not a built-in wage mechanic. Fishing can reuse the same activity structure with different content. Studying and fighting will need supported effects and their own rules before prose can grant skill growth or deal damage.

Travel has a separate hourly encounter check. Twenty game hours can yield twenty quiet results. Region, terrain, character capabilities and mechanical tags select an explicit encounter policy; tone alone cannot change a die face. A triggered encounter may then require a skill check or player decision. Encounter frequency, danger severity and success chances are different controls. Do not force a surprise simply because several checks were quiet.

## Visible rolls

Show an expandable roll record alongside the relevant outcome: purpose, game-time segment, raw dice, chosen die, modifiers, DC when knowable, result and applied effect. Example: `Work, hour 3: 14 + 2 Wisdom + 2 proficiency = 18 vs DC 12; earned 2 coins`. Animation illustrates an already saved roll. Reloading, retrying narration or changing pace cannot roll again.

Hidden encounters must not reveal future threats through a public roll log. Show permitted completed checks and redact secret DCs/modifiers where they disclose unknown facts; retain the full record privately. The POC work example uses public checks so the foundation is visible immediately. A twenty-hour report can group quiet hours while preserving their individual records.

## The range of available actions

Choice breadth follows actual opportunity: available time, proximity, mobility, equipment, knowledge, commitments and immediate threats. It is not a fixed option count or a difficulty slider. Danger often narrows possibilities, but a dangerous scene can still offer several tactics; low HP alone does not prove escape, negotiation or environmental action is impossible.

In a peaceful town, present several directions such as work, trade, study, explore and rest. A direction can open another prepared menu without advancing game time or implying the character already acted. Under a close threat, offer only feasible immediate responses. If there is one meaningful action, show one. If nothing can be influenced, resolve the event and present its aftermath rather than inventing three synonymous buttons. Expressive choices are allowed when their emotional or social consequence is real, but must not pretend to avert an unavoidable outcome.

Options disclose apparent commitments, approximate duration and known risks without leaking hidden facts. Distinguish attempts, safe menu navigation and already determined consequences. No free-text action box is required for broad agency. Player-written storyteller preferences belong in settings; they are not a channel for issuing immediate character actions.

See [storyteller customization](storyteller-settings.md), [time](time-and-autonomy.md) and the [mechanical execution contract](technical/rules-and-activities.md).

## Implemented entry and limits

On the pineapple opening preview, select the D&D activity rehearsal before Start. It initializes the authored SpongeBob sheet and safe contextual menus. Local movement is a certain five-minute exchange, observation takes a minute, and delivery negotiation takes ten; these short exchanges resolve immediately. Work/fishing and the twenty-hour local coastal circuit use the selectable activity clock. The circuit stays near the shoreline; an abandoned crossing returns to that safe shoreline, not an invented distant map location.

The worker commits hourly rolls/effects and deterministic summaries together, with captured authored flavor at completion/encounters. No model decides the result or runs per hour. Latest 100 roll records are exposed in the play view; older records remain stored but have no paging UI yet. Full combat, study/level progression and model adjudication of unsupported actions remain outside this subset. Existing narrative stories are not silently assigned character sheets. Rules attribution is available at `/rules` and in [the attribution document](rules-attribution.md).

