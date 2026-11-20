# Character lifecourse | unratified proposal

**Status: Proposed. Not selected.** This page is an open design. It is not a product rule, not a technical contract, and not permission to implement.

**Reader question:** What lasting change is already required, and which choices about growth, injury, death or irreversible loss, aging, form, return, and story ending stay inside one world?

This page is the unratified map for that question. The [gameplay domain coverage catalogue](../gameplay-domain-coverage/README.md#progression-and-fate) keeps the coverage classification and leaves unanswered whether a lasting bodily change should become a typed condition. Selected promises stay on the headings named below. `docs/product/gameplay/character-life-and-progression.md` is not created.

Consequences remain real. Hit points, fatigue, aging, skill trees, and disease are ruleset content when a world admits them. A missing applicable Strength for a microbe is not an engineering bug. A wound example is not a universal damage track. Death is not selected because a scenario mentions loss.

## Two existences

These existences show the same selected continuity under different bodies. Neither existence publishes a hit-point ladder, an age counter, or a level.

### A humanoid adventurer

A campaign may admit six abilities and a health pair. The inspected legacy human in `packages/game/test/actor.test.mjs` is named Mara. She declares every ability applicable and stores `hp` 10 with `maxHp` 10. A Strength check is available for that form. An important injury, once the story establishes it, constrains later choices until the story changes it. Ordinary atmosphere stays atmosphere.

That adventurer may speak of wounds, recovery, study, and risk. Those words belong to a campaign that admits them. The [first rules subset](../../../../docs/product/gameplay/rules.md#first-rules-subset-poc) names hit points, skills, and a proficiency bonus. Study and level progression stay outside the subset. [Foundation](../../../../docs/product/gameplay/rules.md#foundation) keeps full combat, character advancement, and long-running progress as separate scope. The subset label `srd-5.2.1-subset.v1` is that subset. It is not selected or implemented D&D 5e combat. [The D&D foundation](../../../../docs/product/foundations/vision.md#the-dd-foundation) already treats full edition fidelity and combat depth as separate scope decisions.

[Earned life](../../../../docs/product/foundations/vision.md#earned-life) may picture recovering over days, and it may say that serious injury, theft, or death can cost earned things where the campaign permits them. Those pictures are conditional. They are not a damage track. [Return and conclude](../../../../docs/product/gameplay/acceptance-scenarios.md#6-return-and-conclude) may name dying during an attempt. That sentence is an illustration of a possible conclusion. It does not select death. The same paragraph already leaves open whether survivors start another adventure as the same characters.

### A microbe, or a disembodied mind

The inspected healthless microbe in the same test stores Strength 8 and lists only constitution and wisdom as applicable. A wisdom check can succeed. A Strength check is rejected because Strength is not applicable to the current form. The stored number is not Strength 0. The rejection is the rule. Filing the missing applicable Strength as an engine defect would be the mistake. Inapplicability is not unlimited capability. [Flexible settings and protagonists](../../../../docs/product/gameplay/worlds-and-characters.md#flexible-settings-and-protagonists) and [World-independent foundation](../../../../docs/product/gameplay/rules.md#world-independent-foundation) already say this.

That microbe omits `hp` and `maxHp`. Absent health is not HP 0. The storyteller rehearsal `microbe.v3` in `packages/storyteller/test/storyteller.test.ts` includes `hp` 5 and `maxHp` 5. That opening is fixture content. It does not require every microbe, or every adventurer, to carry hit points, and it does not apply a wound.

A bodiless consciousness may have no current use for Strength. A later embodied form can gain abilities through an admitted transformation. This inspection found no disembodied character fixture. The selected text already allows the form. A pattern with no body can lose an established condition when its own rules say so. That loss does not require a hit-point ladder. Membrane damage matters when the story establishes it. Seeming tired does not open a fatigue counter, a disease meter, or an age.

**Normal:** a form that declares Strength can be checked with Strength, and a form that does not declare it cannot invoke it. An established lasting change constrains the next choice. **Negative:** a missing Strength for a microbe is filed as an engine defect, a wound example becomes a universal damage track, an implied death always destroys the story or becomes an arbitrary model result, or every world inherits human health, age, and fatigue counters.

## Consequences remain real

These limits are already selected. This page repeats them so the ruleset counters below stay separate.

| Selected limit | Owner | What is already true |
| --- | --- | --- |
| Earned completion, and loss only where the campaign permits it | [Earned life](../../../../docs/product/foundations/vision.md#earned-life) | Completion is authoritative. An estimate is not yet owned. Where the campaign permits injury, theft, or death, earned things can be lost. The storyteller must not protect that progress merely because loss is inconvenient. |
| The current form scopes abilities | [World-independent foundation](../../../../docs/product/gameplay/rules.md#world-independent-foundation), [Flexible settings and protagonists](../../../../docs/product/gameplay/worlds-and-characters.md#flexible-settings-and-protagonists) | The current form declares which abilities apply. An unavailable ability is not a score of zero and cannot be invoked. Inapplicability is not unlimited capability. An admitted transformation can add abilities later. |
| A lasting change constrains later choices | [People, objects and capabilities](../../../../docs/product/gameplay/continuity.md#people-objects-and-capabilities) | Important injuries and other lasting changes constrain subsequent choices until the story changes them. Ordinary atmospheric description is not a tracked attribute. |
| No automatic life ending | [Selected solo proof boundary](../../../../docs/product/storyteller/behavior-and-quality.md#selected-solo-proof-boundary), [Developments, choices and endings](../../../../docs/product/storyteller/behavior-and-quality.md#developments-choices-and-endings) | There are no automatic life endings. A character can remain for real months with no compulsory ending. A deliberately finished story stays readable and does not keep scheduling new developments. |
| Return is a recap of the current situation | [After absence](../../../../docs/product/experience/return-and-journal.md#after-absence) | Coming back offers a focused recap and the current decision. A recap does not rewrite what happened. An old notification opens the current state. |

## Ruleset-specific counters

Each counter below is withheld as a universal mechanic. A world may admit one when its own rules say so.

| Counter | Where the limit already lives | What source shows at `b3113814` |
| --- | --- | --- |
| Hit points | The subset names them. The [capability kernel](../../../../docs/technical/engine/selected-architecture.md#world-neutral-capability-kernel) is a conceptual target and already withholds a requirement that every world have HP. Absent HP is not infinite HP. | `health.v1` is an optional capability. `hp` and `maxHp` are present together or both omitted. A half pair is rejected. `packages/game/src/effects.ts` outcome effects are `fact.set.v1` and `quantity.change.v1`. This read found no effect that changes `hp`. |
| Fatigue | Atmosphere is not a tracked attribute. | The character schema has no fatigue field. |
| Aging | [Earned life](../../../../docs/product/foundations/vision.md#earned-life) says reading choices, navigating menus, and waiting for the model do not age the world. | The character schema has no age field. |
| Skill trees and levels | Named skills and a proficiency bonus are in the subset. Study and level progression stay outside it. | `proficiencyBonus` is a stored integer from 0 to 6, used when a declared skill applies. There is no level field. Contribution progress is progress toward one admitted activity. It is not a character level. |
| Disease | A universal disease track is intentionally absent from the selected gameplay pages. The catalogue already says so. | The character schema has no disease field. A declared fact can record a condition the story already established. That fact is not a disease table. |

## Event map

| Event | Selected reading | Source status at `b3113814` | Still open |
| --- | --- | --- | --- |
| Growth and skills | Declared skills and a proficiency bonus belong to a form that admits them. Level progression is outside the subset. Remembering an earned change does not require an experience ladder. | Checks reject an undeclared skill and an inapplicable ability. No effect grants a level or a new skill. | Whether any world shares a skill-tree vocabulary. |
| Injury and recovery | An established injury constrains later choices until the story changes it. A recovery picture on Earned life is an illustration. It is not a universal damage track. | A declared fact can change through `fact.set.v1`. An undeclared fact is rejected. Hit points can be stored and are not changed by the outcome effects read here. | Whether a lasting bodily change becomes a typed condition beyond the continuity constraint. The catalogue leaves this unanswered. |
| Death or irreversible loss | Loss of earned things is real where the campaign permits it. A scenario sentence about dying is an illustration. Locked settings do not imply an implemented permadeath system. | No death flag and no ending effect appear in the outcome-effect list. | Who may declare a fatal outcome, whether it ends the story, and whether it can be reversed. |
| Aging | The world does not age because the player is reading. No universal age counter is selected. | No age field. | Whether any world admits age, and what that age changes. |
| Form transitions | The current form declares applicable abilities. An admitted transformation can add abilities. The kernel's negative, as a conceptual target, is that changing form invalidates stale prepared actions and does not rewrite the prior receipt. | No effect in `packages/game/src/effects.ts` changes `applicableAbilities`. | How a transformation is admitted, and which prepared actions it invalidates, once a world needs that mechanic. |
| Player return | Return shows the current situation and admitted results. It is not resurrection, healing, or aging. | This inspection found no resurrection effect in the outcome-effect list. | Whether a return account must mention a bodily change that is still only proposed. |
| Story ending | No automatic life ending. An adventure can resolve without ending the playable life. The controls that choose a finite adventure or a continuing life are still to be designed. | No story-ending effect was found in the outcome-effect list. `condition.set.v1` in `packages/game/src/world-obligations.ts` sets a world condition from a due obligation. It is not a character death and not a story ending. | Whether a finished story, a fatal loss, and a continuing life are different commits, and who chooses among them. |

## Open authority

Each row is unratified. Naming it here does not select it.

| Open choice | What stays unchosen |
| --- | --- |
| Fatal outcomes | Who may commit death or irreversible loss, which ruleset must admit it first, and whether the model may narrate it without a committed effect. An implied death does not destroy a story and does not become an arbitrary model result. |
| Fairness and legibility | [Choice breadth](../../../../docs/product/gameplay/rules.md#choice-breadth-mechanical) already discloses known risks for an offered choice. Whether a fatal or irreversible stake must be named before it commits stays unchosen. |
| Irreversible changes | A lasting constraint is already selected. A typed bodily condition, a wound track, and a rule for undoing that constraint are not. |
| Account and story fork | [Free and locked campaigns](../../../../docs/product/storyteller/profiles-and-settings.md#free-and-locked-campaigns) can lock rule version, risk, storyteller customization, and speed. That lock is not permadeath. A future settings fork is a new continuation, not a rewritten locked record. Whether a fatal loss forks the account or the story stays unchosen. Survivors continuing as the same characters stays the open choice already named on the return scenario. |
| Audit | The player journal is a recap, not a staff forensic record. Who may inspect a fatal or irreversible commit, and whether that record is the player chronology or a separate staff record, stays unchosen. |

## Inspected records

This inspection does not add an effect, a field, or a schema. Source was read at `b3113814` and was not executed again.

| Record | What the source shows | Still open |
| --- | --- | --- |
| Applicable abilities | `packages/game/src/checks.ts` rejects a check whose ability is outside `applicableAbilities`. The same gate exists for immediate actions and contribution checks. | A stored Strength score on a microbe does not make Strength applicable. |
| Optional health | `packages/game/src/state.ts` records that absent health is not HP 0. The healthless microbe test omits both health fields and still resolves an applicable wisdom check. | A health pair on Mara, or on the `microbe.v3` opening, is not a wound system. |
| Outcome effects | Facts and quantities change only when already declared. Prose does not create them. | A fact named `exposed` is not an injury type, a disease, or a death. |
| World obligation condition | `condition.set.v1` writes one world condition with obligation provenance. | That condition is not a character lifecourse track. |
| Permadeath wording | Profile lock text says the lock does not imply an implemented permadeath system. Ironman may eventually bundle permadeath. The initial label is Locked settings. | Writing the word permadeath there does not select it. |

## Refused ratification

This proposal does not publish `docs/product/gameplay/character-life-and-progression.md`. It does not select injury, death, disease, leveling, or aging as product rules. It does not claim D&D 5e combat is selected or implemented. It does not add a hit-point track, a fatigue counter, an age field, a skill tree, or a disease table. A later owner may ratify a distinct player promise and then choose an owner. Until that acceptance, the selected headings above remain the rules.

Packet: [DOC33](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/documentation/2026-11-18--doc33-character-lifecourse-policy/CHANGE.md).
