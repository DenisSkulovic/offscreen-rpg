# Living Book | Interaction and decision laboratory

**Status:** OPEN DESIGN, not accepted UX or production frontend. No implementation Changes or selected page-turn dependency.

[**Open interactive prototype**](index.html) in a browser. It is standalone HTML/CSS/JS. The discreet bottom-right **Design lab** toggle controls **two decision arrangements**, short/long source fixtures, 100/150/200% text, and surrounding atmosphere. The top-level player experience uses a book, small page controls and a bookmark that opens a Now/Journal/source-reading index. No permanent sidebars or inspector.

**D1: Dedicated decision folio.** A book turn leads to a separate logical sheet with the source-backed question and all six options. A long/high-scale decision folio extends with normal document scrolling, not a hidden inner scrollbar.

**D2: Continuous reading.** Source prose and the complete offer live on one tall leaf. A simple in-book link skips to the decision and focuses the prompt. Deliberately less tactile but more robust for long-form/enlarged reading.

Both styles use the **same original fixture words and choice identities**. Both have the same physical book across all fictional atmospheres. Historical passages are inert; choice clicks open a design-only notice and do not dispatch commands. The three-entry Journal is illustrative, not a real large-history projection.

The demo paginator is **not production grade**: D1 naively groups two paragraphs per reading leaf, and the leaf body grows naturally. Physics, meaningful source/folio layout and long-story seek are explicitly unresolved.

See [design analysis](../12-BOOK-INTERACTION-AND-DECISION-FLOW.md) and [evidence/limitations](RENDER-EVIDENCE.md). The downloadable chat artifact additionally contains screenshot captures and the runnable Playwright script.

**To continue:** source-faithful layout/anchor composition, live-offer replacement and reading-position behavior, actual accessibility/keyboard/zoom/RTL review, and a physical-sheet animation study. No library selection until those are credible.