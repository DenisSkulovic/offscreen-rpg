# Ability checks

Use an ability check when an attempted action has meaningful uncertainty and consequences. Routine possible actions can succeed without a roll; an impossible action does not become possible through a high roll.

The implemented total is:

`d20 + ability modifier + applicable proficiency bonus + admitted situational modifiers`

The ability modifier is `floor((score - 10) / 2)`. The result succeeds when the total equals or exceeds the difficulty class.

The plan must name one currently applicable ability. It may name one skill already declared for the character's current form. Proficiency is added only when that declared skill is also proficient. The Storyteller may propose the purpose, ability, skill, difficulty and supported modifiers; application code validates them before rolling.

For these ability checks, a natural 1 is not an automatic failure and a natural 20 is not an automatic success. The total still determines the result.

This page adapts the ability-check foundation of SRD 5.2.1. The current-form applicability boundary and admitted-modifier policy are Offscreen rules.
