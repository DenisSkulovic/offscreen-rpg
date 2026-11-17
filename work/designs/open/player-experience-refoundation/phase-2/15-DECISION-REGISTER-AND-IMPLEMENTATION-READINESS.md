# Living Book | Composition decisions and path to Changes

**State:** OPEN DESIGN, owner review pending (2026-11-17). **Not an engineering handoff.** This follows [13: narrative compositor](13-NARRATIVE-DOCUMENT-COMPOSITOR.md), [14: reader continuity](14-READER-CONTINUITY-AND-UPDATE-POLICY.md), and [the composition experiment](composition-lab/README.md). Source contracts were rechecked against GitHub `main` at `ad799b0e67ab424e496a1fed17bc3225758c1723` before drafting. The previous lean ZIP was `9e821c6e15bb`.

## Candidate design decisions

| ID | Decision | Working preference | What still needs evidence |
| --- | --- | --- | --- |
| NC01 | Published passage vs physical leaf | Separate forever. A scene/turn/passage is not a physical page | Source fidelity under real historical navigation |
| NC02 | Baseline display | **Continuous reader is fully supported**, not a second-class emergency mode | Real keyboard, zoom, screen-reader trials |
| NC03 | Physical pagination | Optional measured projection, never a fixed char count | Font, selection, image, mobile performance, bidi |
| NC04 | Reading bookmark | Original passage ID + semantic text location | Unicode/RTL, source version and permission behavior |
| NC05 | Player options | Current verified offer separate from prose; group all current choices | Live offer races, six decisions under large text |
| NC06 | Rich text | Exact source plus optional bounded semantic score | Schema, retained historic score, model quality/cost |
| NC07 | Illustration | Source-authorized optional asset, with safe reflow | Late media attachment/rights and source coverage |
| NC08 | Book identity | Recognizable book, Storyteller atmosphere around it | Product-owner art-direction approval |
| NC09 | Turn effects | Disposable optional animation adapter | Internal CSS versus open libraries under stress |
| NC10 | Long-life Journal | Original history plus source-based index/search when supported | Real 2,000-passage access/scoped index API |

These are **ranked recommendations, not accepted product specifications**. They do not override the selected V1 presentation runtime.

## What the disposable lab has demonstrated

The standalone HTML experiment runs a measured text-fragmentation approach, with word/grapheme segmentation and exact paragraph fragments. **34 targeted Chromium layout scenarios** (including a 6,000-character single paragraph, narrow and wide viewports, text-scale controls, optional figure and Unicode/markup-looking text) completed with zero reported matrix failures. **Ten local interaction assertions** passed: source anchor retained through resize, no source rewriting, offer replacement rejects the old offer ID, new publication stays distinct from pinned reading, Journal is read-only, and continuous reading still works.

See [evidence](composition-lab/RENDER-EVIDENCE.md). This was **not** an actual backend, Storyteller, production React, browser zoom, accessibility certification, live artwork operation or real history seek. The lab is deliberately not a proposed finished visual identity.

## Sequence towards bounded implementation work

1. **Reader core (earliest credible future slice):** selected stable book shell, source-bound anchors, V1 source adapter, continuous reading, responsive typography and no-effect fallback. **Preconditions:** owner accepts actual book geometry, UX interaction/keyboard/read model product contracts reconciled.
2. **Truthful Now:** current choice folio and system states; offer replacement, ambiguous command and newer published-source handling. **Preconditions:** a tested live source/offer identity and current-state contract.
3. **Journal reader:** source-faithful original passage browsing, back-to-Now, reader position. **Preconditions:** viewer-scoped history addressability and unambiguous source IDs. Avoid invented history search.
4. **Measured leaves:** optional physical page composition with safe fallback and replaceable turn driver. **Preconditions:** real zoom, large-text, RTL/selection, late art and performance benchmarks.
5. **Art direction and optional rich publication:** validated Storyteller atmosphere, source-aware illustrations, semantic narrative score and historic fidelity. **Preconditions:** accepted product specs, versioned client/backend/Storyteller designs, measured model cost.
6. **Physical page curl:** only if real-use evidence shows its benefit exceeds integration and accessibility cost. This can remain absent indefinitely without invalidating the reader.

These are **future Change boundaries**, not `work/changes` packets, target commit IDs or Cursor instructions. No code changes are authorized by listing them.

## Practical exit criteria before preparing the first Change

- [ ] Product owner accepts the physical **book geometry** and on-page navigation in an actual visually polished specimen.
- [ ] Validate focus, keyboard and **real browser zoom** for the current decision and long reading, not just viewport/text-select smoke.
- [ ] Prove authoritatively updated offers are never command-submitted through stale UI.
- [ ] Choose source-anchor representation and focus/scroll restoration on current-story/Journal transitions.
- [ ] Reconcile accepted outcomes into `docs/product/experience/` and owning client technical designs with explicit supersession of older PX proposals.

**Judgment:** we are close enough to outline the first narrow V1-compatible reader Change after product acceptance. We are **not** ready to ship a full rich-text, adaptive-art, 2,000-entry Journal and realistic page-curl platform as one giant packet. Doing that would recreate the exact vibecode debt this program is meant to eliminate.