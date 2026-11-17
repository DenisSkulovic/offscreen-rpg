# Composition lab | Browser observations and exclusions

**2026-11-17**, self-contained HTML, Chromium via Playwright. No running app/API/Storyteller/real history. Tested **34 layout cases**: 320/375/768/1440 CSS px × (long ten-paragraph or Unicode/markup-looking source) × 100%/200% **custom text-scale setting** × optional media present/absent (32), plus a 6,000-character single-paragraph source at 320px and 1440px (2).

**Result:** 34/34 basic checks passed. Exact source paragraph strings were reconstructed from the measured **leaf plan**; checked for horizontal overflow and overflowing visible leaf, current authored options remained present where applicable. No browser JavaScript exceptions. Maximum derived leaf count in the matrix: 17.

Ten additional **browser-simulated** assertions passed: source anchor retained through 375→1440 resize, source fidelity after reflow, newer offer ID recognized, stale offer rejected by identity check, old source remains pinned after simulated new publication, latest authoritative source announced, explicit Now opens the new original fixture, published words intact, Journal read-only, and continuous mode still renders the original prose.

### Important defects discovered during the experiment

1. Markup-looking user prose including a literal closing script tag initially terminated the stand-alone experiment's script **at HTML parse time**; the fixture was escaped, and the actual renderer inserts words via `textContent`, not HTML. Real source words must never become raw DOM markup.
2. Reflow initially reset the reading location to the first paragraph of the new physical page. Fixed by retaining an **exact logical passage/paragraph/offset anchor**, with only the temporary physical page index recalculated.
3. Simulated “new publication” initially changed passage identity without swapping source text. Corrected by separating authoritative Now from the reader's pinned source. This is critical for async story updates.

### Not proven

These are prototype smoke tests, **not** proof of production pagination, player usability, live backend authority, source privacy, touch and selection, historical seek, actual 200–400% browser zoom, screen-reader reading order, RTL/bidi caret restoration, late real media, 2,000 passage archive performance, a validated rich narrative score or Storyteller-generated illustrations. The illustration is a labeled fixture. Font controls are not browser zoom. Plan-level text equality is not a full accessibility test.

The UI is research scaffolding rather than an art direction. No final choice on CSS columns, DOM-measured pagination, page-curl library or source V2 has been made. **Continuous reading is the mandatory safe alternative in the proposed design.**