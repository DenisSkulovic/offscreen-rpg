# Living Book | Narrative document composition, not book-page storage

**State:** OPEN DESIGN RESEARCH; product-owner review required, no production implementation authorization. **Date:** 2026-11-17. Source inspection: lean repository `9e821c6e15bb` code and accepted product/client documentation on GitHub `main` at `ad799b0e67ab424e496a1fed17bc3225758c1723`. The lean archive is earlier than current main; do not treat unverified post-archive implementation details as current code facts.

**Predecessors:** [12 Book interaction and decision flow](12-BOOK-INTERACTION-AND-DECISION-FLOW.md), [10 stable book/adaptive surroundings](10-READER-BOOK-AND-STORY-WORLD.md), [06 rich narrative score](06-RICH-NARRATIVE-SCORE.md), and the [book-engine boundary](09-BOOK-ENGINE-DEPENDENCY-BOUNDARY.md). This proposal neither supersedes current selected `docs/technical/client/presentation-runtime.md` V1 nor authorizes a V2.

## 1. Actual current source, and what does not exist yet

The archived code's `packages/contracts/src/stories.ts` defines `passageContentSchema` as strict `version:1`, `title` (1–160 chars), and `paragraphs` (1–10 strings, 1–6,000 chars each). `StorySnapshot.current` contains `{id,content,interaction,appearance?}` and authorized decision/wait/resolution context. `storyHistorySchema` contains pages of at most 20 `{id,sequence,content}` entries plus `nextBefore`, no historical appearance, no passage seek/index/search. `apps/web/src/features/play/ui/narrative-passage.tsx` outputs `<h1>`, `<p>` and validated media slots, with optional arrival effect. Current player history shows original paragraphs in a newest-first list. No rich-text block AST, historical art score, scene-as-page ontology, production paginator or embedded document contract is demonstrated by these sources.

**Consequence:** Do not “improve” the API by quietly calling old paragraph strings a new content tree. Propose a future adapter and separately version any real product read-model/storage change. Existing passages must keep exactly their original text.

## 2. Three independent coordinate systems

**A. Canonical publication:** `{storyId, passageId, sequence, contentVersion, original title, original paragraphs}`. Immutable, viewer-scoped and subject to server permission. The source is never changed because a browser repaginates.

**B. Semantic reading content:** a client-resolved **DocumentTape** with ordered blocks that have stable links back to canonical source, e.g. title, paragraph, source-backed embedded document, allowed illustration (with source/asset provenance), and a **separate current-offer region** that is not historical passage prose. An optional validated semantic score decorates exact existing source spans without copying or changing their words. This representation can be rebuilt and is not necessarily a database object.

**C. Physical composition:** derived **LeafPlan**(s) for viewport, font metrics, layout mode, image presence, user preferences and renderer capabilities. It may be a two-leaf spread, one focus leaf, naturally extending decision folio, or continuous mode. Recompute at any time. Nothing in the story identity, source sequence, bookmarks, choice authority, or Storyteller prompts may depend on physical page number.

### Proposed conceptual data flow

```
Viewer-scoped StorySnapshot / History pages
    + optional validated, identity-matched appearance / semantic score
    + user text & motion preferences
    └─> Source adapter (lossless source text + exact anchors)
         └─> Semantic document tape (source title / prose / verified media)
              ├─> Continuous reader (always works, authoritative fallback)
              └─> Paginator (display-only, measured & cancelable)
                   └─> Leaf plans (spreads, single leaf, decision folio)
                        └─> Book shell (same book across worlds)
                             └─> Optional replaceable turn effect
```

The **current offer** is projected beside the current passage by the authorized read model and is not converted into historical source text. Never attach an old offer to a Journal page as an actionable control. No model output or animation transition can mint new choice IDs.

## 3. Suggested semantic block roles: minimal, not a universal document editor

| Role | Provenance | Composition behavior | Non-goal |
| --- | --- | --- | --- |
| `title` | Current passage title, unchanged | Keep with at least the start of source prose when feasible | Chapter creation |
| `paragraph` | Exact original stored string | May fragment at safe word/grapheme boundaries across leaves | Semantic rewriting or chunk-based “scenes” |
| `emphasis` | Optional *validated* exact-source score | Changes appearance but not text or anchor | Generated markup tags/HTML |
| `inset-document` | Explicitly present, source-backed in-fiction text or validated markup hint | Prefer bounded group; if very long, continue across leaves with visible marker | Pretending the whole game book is an in-fiction diary |
| `figure` | Authorized source/asset reference, optional | Bounded placement near anchor; a missing asset collapses, loading can reflow while preserving place | Empty picture placeholder or image as lore fact |
| `decision` | **Current authoritative** offer, not canonical passage | Group question and the complete option set as one interaction region; naturally extend on narrow screens | Force choices to fit a 3D page turn; historical replay |
| `system-state` | Authorized pending/accepted/blocked/quiet state | Accessible out-of-fiction label/receipt without consuming prose source | Storyteller-authored system status |

Do not introduce a Storyteller-authored arbitrary block tree or a fully general editor schema in the first design slice. If source-block richness is eventually needed, use versioned published content with an explicit migration policy and budget impact, rather than unversioned HTML or silently mutating V1.

## 4. Anchor and text fidelity contract

A reader's durable location refers to **source**, e.g. `{storyId, passageId, paragraphIndex, logicalTextLocation}` or an eventual immutable source segment ID. Do not store `{page:52, spreadSide:'right'}`. A **tentative design candidate** for source-bound immutable paragraphs is a grapheme-boundary index or a validated quote-context selector; the exact persisted representation needs Unicode/bidi, editing and migration proof.

At runtime a physical fragment can store `{passageId, paragraphIndex, startUtf16, endUtf16}`, where ranges are **only** ephemeral browser layout coordinates. They must cover the original paragraph with no gaps/overlaps and be sliced only at valid grapheme boundaries. A future saved anchor need not use UTF-16 offsets. Test `<script>`-looking text, ampersands, emoji sequences, Cyrillic, Hebrew, combining marks and long unbroken strings. Never decode text as HTML.

**Lossless check:** for each source paragraph, concatenate `textContent` of its ordered rendered fragments and compare **byte-for-byte or JS string-for-string** with the original. This proves preservation of characters, not perfect accessibility, semantics or editorial quality. Every mark is an offset-preserving decoration and is locally rejectable; it cannot remove text.

For score matching, prefer one **source ID + exact passage content version/hash + paragraph index + unique literal quoted span**. Ambiguous repeat, stale content hash or invalid Unicode span means drop that mark, not guess. The model does not calculate UI pixel positions or page numbers.

## 5. Pagination policy: progressive enhancement with hard stop rules

**Plain continuous reader is the baseline.** Optional physical book pagination is a projection, not an obligation. Experiment with DOM-measured pagination using real computed font metrics; do not use a constant characters-per-page limit or naïve two-paragraph packing.

Suggested rules:
1. Compute a layout key from viewport dimensions, font role/scale, actual resolved asset sizes, source identity/revision, score version, and page/spread mode. Invalidate and cancel pending measurements on any relevant change.
2. Preserve a semantic top-visible source anchor before reflow. Recompose. Find that same source anchor in the new derived leaves and restore its reading position; never save a physical page index.
3. Keep title with opening words when possible; avoid a leaf consisting solely of a title, a widowed line, or a decorative asset.
4. Split an overflowing paragraph only at validated text boundaries (prefer word boundaries; fall back to grapheme for unbroken sequences) and preserve all original code units in order.
5. Illustration may be paired with source only if actually available/authorized; if missing, normal reading flow consumes the space. Image loading late may trigger a background layout calculation, not destroy the current cursor/focus/selection.
6. Decision group is **atomic semantically**, not physically required to fit. If the whole choice set is too tall, render a naturally extending leaf with document-level scroll or intentional accessible full decision sheet. Never create a nested scrolling trap, clip alternatives, or create partially visible choices that imply a complete set.
7. Do not mount 2,000 complete passages just to compute pages. Compose bounded neighboring passage windows and use source-identity seek/search only when a real API exists; current 20-result historical cursor is not random access.
8. If any critical layout operation fails, exceeds bounded work or cannot guarantee text integrity, **fall back to continuous reading** with the exact source and current controls.
9. The book's page-turn physics receives composed leaf faces only. It does not split words, own the current offer, mutate React source nodes, store bookmarks or decide canonical chronology.

### Important decision on “one passage = one page”

Reject it. A six-thousand-character paragraph can span several leaves; a short publication can share a spread with adjacent source material when allowed by chosen reading-mode/chronology rules. A source passage may span physical pages, and a single physical page might include more than one sourced passage in Journal. **Scene**, **Storyteller turn**, **memory segment** and **page** remain different concepts.

## 6. Layout policy per product task

| Task | Preferred treatment to test | Fallback |
| --- | --- | --- |
| Live Now: short/medium prose | Stable book; current source, then dedicated decision folio if a choice exists | Continuous book reading, source + complete options |
| Live Now: long prose | Measured adjacent leaves with explicit “To your decisions” jump | Continuous book reading |
| Accepted activity / quiet | Last committed original, concise separate truthful state | Exact prose with no fake option/page effect |
| Journal deep reading | Measured facing spreads for prose; original source anchors and next/previous | Single-leaf or continuous reader |
| Journal overview/discovery | Compact sourced moment index, not 2,000 pages mounted | Page through authorized history; disclose missing search/seek |
| In-fiction document | Distinct source-backed inset, can continue as needed | Normal quoted source text |
| Large text/mobile/RTL/forced colors | Single readable leaf, natural top-level scrolling, explicit navigation | Continuous reader with no curl |

## 7. Top risks and competing solutions

| Choice | Candidate | Why not silently select it? |
| --- | --- | --- |
| Browser pagination | DOM-measured fragmentation | Async font/media availability, expensive measurement, grapheme handling, focus/selection risks |
| Browser pagination | CSS columns/print-style pagination | Break behavior and page controls are difficult with interactive choices; may require rebuilding on update |
| No physical fragmentation | Continuous-scrolling book | Most robust, but may lose desirable page-turn sensation |
| Rich text | Plain V1 + optional semantic score | Safest compatibility, weaker embedded documents than a true published block AST |
| Rich text | Versioned block AST | More expressive, but difficult data migration and higher Storyteller burden |

**Working preference:** begin design of source adapter + semantic tape and a continuous reader, with experimental measured pagination beside it. Do not select a production paginator from a single demo; compare correctness first. Storyteller cues are optional and sparse. No external page-turn package chosen.

## 8. Review gates before implementation Changes

- [ ] Prove exact original prose preserved under 1/20/200/2000 source scales (the latter need not mount all sources).
- [ ] Test one 6,000-character paragraph, ten source paragraphs, six authorized choices, and an inset document.
- [ ] Anchor survives desktop/mobile changes, font zoom, and optional art arrival without replacing history source or unexpectedly jumping.
- [ ] No partial/hiding option group or duplicate command after stale offer replacement.
- [ ] Test long Cyrillic, Hebrew (bidi), emoji ZWJ, combining marks, unbroken text; include screen reader reading order and keyboard focus.
- [ ] Reproduce exact fallback when score is invalid, artwork absent or pagination times out.
- [ ] Assess performance and bounded work on modest mobile hardware; document CPU/memory, not merely screenshots.
- [ ] Review the actual art direction of the physical book and its subtle environment with the product owner.
- [ ] Ratify product spec into existing `docs/product/experience/`, then settle client/Storyteller V2 and historical persistence technical contracts before Cursor Changes.

**No code authorized by this file.** The adjacent composition lab is disposable evidence, not production architecture or a passed accessibility suite.