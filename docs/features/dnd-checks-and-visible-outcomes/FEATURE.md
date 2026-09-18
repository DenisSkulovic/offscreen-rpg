# D&D checks and visible persistent outcomes

Status: Designed; not implemented.
Approval: The owner requested these product capabilities and documentation/handoffs on 2026-09-18. Detailed POC policies below are proposed design decisions; bulk implementation is not authorized by this documentation request.

## Intended outcome

Deliver the first mechanically real POC action: a character attempts a supported task, sees an actual d20 check and receives its persisted consequence. Storytelling narrates the rule result rather than selecting success in prose.

## Representative flow

Start the pineapple story with an authored character sheet. Select a supported short paid task. See its known terms, then a saved roll such as 14 + 2 + 2 versus DC 12, and the earned currency. Reload: the roll and balance are unchanged. A narration failure shows the mechanical result with narration pending; retry cannot reroll or pay twice. An unsupported action is not silently narrated as mechanically complete.

## Scope and boundaries

Six abilities, skill proficiency, captured proficiency bonus, HP/currency storage, d20 checks, advantage/disadvantage, supported currency effects and public roll history. HP is stored for later combat, not a complete damage/death system. One authored character and activity definition are sufficient. No character builder, full combat, XP, arbitrary model-defined effects or live inference.

## Acceptance

- The UI shows raw dice, modifiers, result and effect from durable records, not a fake animation or prose extraction.
- Server rolls and validated rule data determine the result before narration; a failed check can change earnings.
- Duplicate commands, narration retry and reload preserve one result and one payment.
- Old saved narrative stories remain readable; only explicitly enrolled mechanical stories obtain a character sheet.
- Context contains the authoritative result, while hidden information remains private.

## Decisions still needed

No blocker to the documented bounded offline subset. Exact D&D edition/content reuse must be selected before claiming full compatibility or importing published content. Broader combat, autonomy and shared-world policies are outside these features.

## Owning specifications

- [D&D rules and agency](../../game-rules.md)
- [Storyteller customization](../../storyteller-settings.md)
- [Rules and activities](../../technical/rules-and-activities.md)
- [Settings and clock](../../technical/story-settings.md)
