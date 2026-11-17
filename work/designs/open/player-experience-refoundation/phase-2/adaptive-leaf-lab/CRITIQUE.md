# Adaptive Leaf | Visual and interaction review

**Status:** qualitative designer critique of rendered Chromium prototype, **not** human usability testing, a selected design system, or owner acceptance.

## What this improves

The earlier Codex, Stage and Field experiments forced a choice between a literary page, dramatic atmosphere and a consistent interface. This lab demonstrates **one composed narrative structure** with bounded input data varying appearance. The same Greywater prose and three intentions survive switching Weathered (warm, tactile), Translucent (cool technical), Luminous (dark, nonliteral), and Neutral (plain fallback). That is the main conceptual success.

| Direction fixture | Strength | Weakness requiring review |
| --- | --- | --- |
| Weathered | Literary calm, legible text, material character | Unintended universal medieval flavor; surface grain too regular |
| Translucent | Crisp and readable; page suggests a record, not old paper | Can resemble a generic white SaaS editorial site |
| Luminous | Strongest proof the leaf need not be physical parchment | Must test long dark reading for fatigue; avoid empty sci-fi telemetry |
| Neutral | Words/actions stand on their own with no creative direction | Not yet distinctive or rich enough as the truly default state |

## Problems the screenshots reveal

1. **The present choice is below the fold on mobile.** For a long story this becomes a navigation problem. Design a discoverable, accessible decision anchor without a permanently obstructive CTA rail.
2. The **design-lab control strip is huge on mobile**, but is *not* part of the proposed game UI. Judge the player surface underneath it independently.
3. An intentionally empty illustration slot is educational in the lab, but undesirable production chrome; when no approved media exists it should normally disappear.
4. The editor-facing page material effects are only a small fraction of the desired dynamic expressive range. We still need grounded wear changes, lighting continuity and a real illustration slot with source-safe assets.
5. The reader and Journal share basic visual DNA, but dense, thousand-passage discovery still needs a carefully researched compact navigation model and real source data.
6. The finished-volume and branch views communicate truthful semantics, but are still rough diagrams, not polished experiences.
7. Typography, especially long Cyrillic, Hebrew shaping/bidi, screen-reader flow, 200% zoom and contrast across gradients, needs targeted experiments before ratification.
8. The model should author **very few** semantic style marks; every line shouting as an inscription or declaration would be worse than plain text.

## Guardrails confirmed as design requirements

- Stable platform layout/commands/navigation/source identity regardless of appearance direction.
- Source text is not rewritten; optional semantic marks refer to exact existing spans, with invalid/missing mark fallback.
- No model-authored HTML, CSS, arbitrary fonts, external media URLs or control-state changes.
- Appearance is story signature → source-grounded scene atmosphere → sparse passage-level marks. No repainting every turn.
- The Journal metaphor does not mean the character actually wrote an in-fiction diary; a found record is a separate nested document.
- No mandatory paper, map, body, portraits, illustrations, ambient animations or progress clocks.
- Endings and forkability are engine authority, not typography or fiction sentiment.

**Recommendation:** retain the **adaptive leaf as leading unratified product hypothesis**, but do not approve these exact colors, layout, figure treatment or score schema yet.