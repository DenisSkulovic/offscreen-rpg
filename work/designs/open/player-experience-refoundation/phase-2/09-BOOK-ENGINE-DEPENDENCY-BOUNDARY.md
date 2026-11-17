# Living Journal | Book engine dependency boundary and risk review

**Status:** OPEN DESIGN RESEARCH (2026-11-17), not selected technical architecture and not an implementation Change.
**Owner concern:** A realistic Morrowind-style book is desirable, but a rigid flipbook package could make variable-length narrative, responsive text, Storyteller-directed materials, live offers and archives difficult. Do not let a page-turn animation library become the product's content/layout authority.

**Relationship:** [Adaptive leaf thesis](05-LIVING-JOURNAL-THESIS.md), [rich narrative score](06-RICH-NARRATIVE-SCORE.md), [history and forks](07-EDITION-HISTORY-AND-FORKS.md), [adaptive-leaf experiment](adaptive-leaf-lab/README.md). The accepted V1 presentation boundary remains [client presentation runtime](../../../../../docs/technical/client/presentation-runtime.md). This page does **not** supersede it.

## 1. Recommendation, subject to actual experiments

**Own the book experience in-house; outsource page-curl physics only if an engine proves a clean escape hatch.** Never embed third-party flipbook terminology, page indices or mutable DOM assumptions into game/source contracts.

In practice:
- Own **reader information architecture and app-level book shell**: open/closed state, source identity, Now/Journal modes, unobtrusive navigation, optional index/bookmark menu, adaptive atmosphere and safe choice semantics.
- Own **canonical source-to-display mapping**, exact text fidelity, accessibility and page-breaking policy.
- Keep page-turn animation behind a **replaceable presentation boundary**. First compare simple internal CSS transforms/shadow animation to candidate specialized engines; do not write an elaborate 3D physics engine before proving the need.
- Keep a **continuous-scroll rendering mode** from the same semantic source, especially for assistive technology, zoom, very long content and performance fallback. It is not second-class or an entirely different content implementation.

**Unselected:** OpenPageFlip, Gul Labs Flipbook, StPageFlip and Paged.js. No dependency addition, code change or install authorized.

## 2. Separate the five jobs that are too often confused

| Job | What it owns | What it must not own |
| --- | --- | --- |
| **Narrative source** | Published passage IDs, source order, exact words, verified offers, and optional identity-matched artistic score | Physical screen pages, DOM, CSS, hover/gesture |
| **Reader model** | Current logical source position, selection, original-vs-derived content, Now/Journal context, stable passage/paragraph anchors | Renderer-generated page numbers or animation state |
| **Composition/page layout** | How visible content fits a particular viewport/font/art slot; derived temporary leaf breaks and continuation markers | Canonical passage segmentation, model-generated choices, permanent bookmarks by page index |
| **Book shell/interaction** | Cover/spread, spine/margins, context concealment, keyboard/touch navigation, source reading focus, optional index, mobile one-leaf mode | Source mutation, canonical game time, historical action replay |
| **Turn effect** | Visual transition between two already composed leaf faces, cancel/settle/cleanup, reduced-motion fast path | Splitting text, selecting content, interpreting the Storyteller, retaining historic DOM, server state |

**Non-negotiable:** a passage is not a page. A scene is not a page. Page break locations are device/user/display-dependent projections, and can change without altering history. A reader's durable anchor is `passageId` plus a validated semantic anchor (paragraph, source token/span, text quote or future stable segment ID), **not** "page 38". A purely local pagination cache may use derived page indices but must not put them in the game API.

## 3. Why real flip engines are risky for this product

The libraries reviewed typically receive **already laid out HTML page nodes**. They do not guarantee correct fragmentation of a ten-paragraph, interactive narrative into multiple pages. The cases most likely to hurt Offscreen RPG are:

- **Reflow:** a user changes font size, language, content score, viewport or illustration, invalidating every physical page boundary.
- **Current choices:** offers and interactive controls must remain reliable, not be intercepted by drag gestures, cloned into active duplicates or separated awkwardly from the text they govern.
- **Live publication:** when an authoritative new passage arrives during a turn, the active page must not tear, replay or display an old story as a new one.
- **Long archives:** mounting 2,000 passages as DOM leaf nodes is a trap, even if a library handles the visible fold smoothly.
- **Storyteller atmosphere:** changing paper-material gradients, shadows, opacity or font role cannot rely on undocumented styling of engine-owned page wrappers.
- **Source integrity:** a page's visibility and effects cannot be used to invent chapters, results, facts or fork eligibility.
- **Accessibility:** selectable text, screen-reader order, controlled focus, reduced motion, 200% text zoom, RTL and a no-curl fallback must work without being an afterthought.

Documented example: [Gul Labs' known limitations](https://github.com/gul-labs/flipbook/blob/main/docs/KNOWN-LIMITATIONS.md) say its engine stamps root element styles and can use a temporary `cloneNode(true)` copy during a curl. That clone is not a second React tree and does not inherit later changes. A consumer must style an inner wrapper rather than taking over the engine-owned root. These are legitimate engine design decisions, but exactly the kind of hidden coupling we need to avoid.

## 4. External options, research-only

| Candidate | Positive evidence from published documentation | Lock-in / unresolved concerns | Position |
| --- | --- | --- | --- |
| [OpenPageFlip](https://github.com/benhonda/openpageflip) | MIT; HTML leaf support, React 19 binding, edge-only drag so body text can be selected, SSR-safe, reduced-motion, controlled layouts and explicit destroy | Pre-1.0 and small/new ecosystem; still owns a page-turning DOM layer; does not solve semantic pagination; verify with our actual responsive dynamic pages | First animation **benchmark** |
| [Gul Labs Flipbook](https://github.com/gul-labs/flipbook) | React-aware lazy mounting, stronger mobile/RTL/event and reduced-motion work; documented limitations; core + binding split | Core MPL-2.0 vs MIT React wrapper; engine stamps leaf roots, portrait fold clones DOM, live media behavior needs coordination; does not automatically paginate prose | Second animation **benchmark**, not default |
| [StPageFlip](https://github.com/Nodlik/StPageFlip) / [react-pageflip](https://github.com/Nodlik/react-pageflip) | Mature base for HTML curl and shadow fidelity; good historical reference | Fixed/stretch geometric assumptions, old/mobile/responsive issue reports; no story-aware pagination; weaker case than newer successors | Reference/baseline only |
| [Paged.js](https://pagedjs.org/) | Robust print-oriented HTML fragmentation, page rules and headers; helpful for studying typography and break behavior | Rebuilds paginated DOM; primarily paged-media/print, not a rapidly changing interactive story; changes may require repagination | Research/prototyping aid, not assumed runtime |
| **Internal book shell + simple turn** | Precisely matches source-bound UI, no vendor DOM ownership and clear safe scrolling fallback | We own interaction polish, resize bugs, animation, keyboard and touch correctness; cannot pretend real physics is free | **Proposed foundation** |

Published docs are **claims**, not evidence that these packages work with Offscreen's page materials, model-authorized inline marks, responsive and 2,000-passage stories. Do not claim performance, licensing compliance or physical mobile behavior without running tests and checking current package release/license.

## 5. Narrow hypothetical turn adapter

Sketch only; **not a production TypeScript API**:

```ts
type ComposedLeaf = {
  // Derivative, viewer-scoped temporary layout identity:
  layoutKey: string;
  // Immutable story-source anchor to restore reading place:
  sourceAnchor: { passageId: string; paragraph?: number; segmentId?: string };
  // Actual authored DOM is owned by the reader/shell, not the turn engine.
};

interface LeafTurnDriver {
  transition(args: {
    fromLeaf: ComposedLeaf;
    toLeaf: ComposedLeaf;
    direction: "forward" | "back";
    reduceMotion: boolean;
  }): Promise<"finished" | "cancelled">;
  cancel(): void;
  dispose(): void;
}
```

The effect layer **must not** own navigation state. Our reader decides the next logical anchor, composes source-faithful leaf views, and calls the driver to animate them. If we swap drivers, source, layout and controls continue to work. The actual integration API may differ, particularly when a third-party engine insists on a live host DOM; that is precisely what a disposable experiment must test.

The `ComposedLeaf.layoutKey` does **not** become a permanent ID, because physical breaks differ after font changes, zoom and responsive layout. During a turn, any new authoritative publication either completes/reconciles under the reader owner or safely cancels the effect; it does not allow animation completion to mutate engine state.

## 6. Responsive reading policy to test before selecting a package

**Desktop:** a book can be open as a two-page spread when the available width and actual text scale allow it; leaves should have enough space for genuinely comfortable prose. A one-page open reading surface on desktop may be preferable for complex interactive moments; do not force two pages for symmetry.

**Mobile:** one page/leaf or an intentional continuous-reading plane. If the page is longer than the screen, allow readable scrolling or valid segmented leaves. No fixed book ratio that shrinks text to fit. Drag gestures must not hijack scrolling or selection; tapping source text is not equivalent to turning.

**Long prose:** reading width and font are governed by accessibility and editorial design; physical breaks are rederived on viewport/scale changes. For Now, the decision point may appear after long text; provide an accessible, light-touch way to discover the current valid choice without an always-visible dashboard.

**Journal:** sources stay addressable by passage identity, not their temporary page position. Archives use bounded neighboring source windows, not all historical leaves at once. Book-page navigation and *finding* a past passage are separate tasks; an on-demand index/search can open without pretending it is an always-visible sidebar.

**No-curl mode:** original source text, illustrations, marks and authorized decisions must be fully usable without animation, via page swap/scroll; a fallback is required, not a degraded emergency mode.

## 7. Disposable design experiment before choosing any library

Compare **exact same** content and appearance data with three turn drivers:
- **T0 Internal:** minimal CSS perspective/fold/shadow or an honest 2D page-slide, controlled by the same reader state.
- **T1 OpenPageFlip:** candidate engine hidden behind an integration boundary.
- **T2 Gul Labs:** candidate engine hidden behind that same boundary, noting where it cannot fit without leaking package-specific primitives.

Do not hardcode product routes or game APIs into the experiment; keep it out of production app and `work/changes/`.

### Required fault and scale cases

1. Long original passage: 10 paragraphs, embedded document and six actual choices; preserve complete source and focus/selection.
2. Switch viewport 1440 → 375 → 1440, 200% browser text zoom, user font selection, reduced motion.
3. Live new passage during an in-progress page turn; cancel or finish deterministically, without old-source display or duplicate command.
4. Rapid forward/back, keyboard, swipe/drag, text selection and nested interactive content.
5. A book with 1, 20 and 2,000 source passages; memory and mounted leaf count measured, history seek by source ID.
6. Optional scene art, changed page-material surface, unavailable media, and a nonphysical luminous leaf.
7. Screen reader reading and focus path; forced colors and RTL; smoke plus actual manual device tests, not screenshot-only guesses.
8. No third-party library installed: can original passage and decisions still be read and used after swapping driver to T0/no animation?
9. Remove an external package and its adapter; confirm **no** changes in story models, source anchors, the narrative score or reader navigation behavior.

### Acceptance evidence, not a vibe-based winner

- Source text and offer identity invariant across drivers.
- Reflow maintains logical reader position and never clips/duplicates/hides original source text.
- No private content leak across a story/viewer switch; correct cleanup and cancellation.
- Source-to-visible leaf mapping remains testable, bounded and independent of engine-specific DOM/classes.
- Focus/selection are reliable; no action fires because a fold completed.
- Measured mobile and desktop stability under text scaling and long histories.
- Third-party replacement/deletion remains inexpensive: adapter + visual effect only.

**Gate decision:** if no library can meet the boundary without infecting our semantics/layout, ship the internal modest turn. A perfect 3D curl is not valuable if it compromises the actual evolving book.

## 8. Status and what not to do yet

This is *proposed architecture*, not selected product or technical law. Do not install a dependency, make a new platform package, modify React/Next, introduce book-shaped persistent tables, convert passage history into fixed pages, implement a full CSS-pagination engine or authorize Cursor Changes.

The immediate next design deliverable should be a **realistic book shell and reading-flow study**, not another genre moodboard or fixed-height single-page screenshot. Compare same text/interaction with an internal turn and the two candidate engines, recording why the simpler implementation can or cannot deliver the intended physicality.
