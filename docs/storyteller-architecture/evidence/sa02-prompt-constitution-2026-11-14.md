# SA02 evidence | prompt constitution v17

**Date:** 2026-11-14. **Change:** [SA02](../../changes/2026-11-14--sa02-prompt-constitution/CHANGE.md). **Provider spend:** none.

## Prompt delta (common authority)

| Removed / avoided | Replacement |
| --- | --- |
| `Never ... end the character's life` | Respect currently captured supported nonlethal/risk policy; do not invent unauthorized lethal/irreversible harm |
| `Offer 2-5 genuinely different...` | Offer only currently authorized next choices; one or more distinct intentions when a choice is required; use held/end/interval when no current choice; no empty menu |
| “cannot execute actions or tools” (absolute) | Cannot mutate world / call tools unless captured recipe admits bounded memory-read |

New capture version: `inputVersion: 17` / `promptVersion: storyteller.v17`. v10–v16 remain parseable for replay.

## Validator

Narrative choice admission aligned to schema: **1–12** distinct choices (was 2–5). Empty choice menus still refused. Consequence held zero-plan semantics unchanged. No lethal policy or inventory/reroll permission added.

## Proof

| Case | Result |
| --- | --- |
| quiet vs comic profile packets | Different tone/taskGuidance in user JSON; shared mechanical authority |
| single reasonable next action | Validates |
| historical report | No choice-offer instructions; no continuity planner; smaller than continuation packet |
| legacy v16 task | Parses and validates scripted continuation |
| held consequence (0 plans) | Validates `state: held` |
| empty options | Rejected |

## Commands

- `pnpm --filter @offscreen/storyteller build`
- `pnpm --filter @offscreen/storyteller test` (47/47)
- `pnpm storyteller:packet-audit`

## Not proved

Paid model quality, lethal play, GM04 anti-spam mechanics, live campaign taste.
