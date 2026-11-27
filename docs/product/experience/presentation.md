# Presentation

**Owns:** what players should perceive: atmosphere, honest media, and illustration that does not block the text.  
**Technical owner:** presentation runtime / language under `docs/technical/client/` (P3)—not duplicated here.

## Product promises

Scene expression serves the reader and never outranks the truth of the situation.

- The browser is a visual, atmospheric place to inhabit the current scene. An illustration can establish atmosphere; it need not regenerate for every sentence or choice, and quiet moments need no artificial activity to fill the screen.
- Media never blocks or misleads. A delayed image must not block play or replace the scene the player is in now; it may attach only to the passage it was made for. Private story media is not a permanent public URL, and a failed image leaves a readable text scene.
- Expression is not authority. Cinematic presentation (shot, lighting, palette) guides prose/illustration generation but does not independently change game state ([continuity](../gameplay/continuity.md)).

This page owns scene expression. It does not accept a final palette, illustration style, or art direction. A decorative scene never overrides system status: danger, focus, and command identity stay in [Visual hierarchy and ownership](design-system-and-expression.md#visual-hierarchy-and-ownership). The published passage stays in [Reader jobs](living-book-poc.md#reader-jobs-and-non-negotiable-outcomes).

## Honesty gate (C3)

The selected contract: color is never the only carrier of meaning, focus does not depend on scene styling, and a deterministic fallback (readable text scene, neutral platform defaults) is always available.

Presentation architecture is a **selected** design target, not a statement of what is built. PX portfolio work landed basic parser/resolver/Storybook seams; visual calibration and engine-integration acceptance remain open. Do **not** use present-tense “no implementation authorized by this file” as a status banner, and do **not** claim human UX validation from synthetic screenshots alone: they show what renders, not that readers understood it.
