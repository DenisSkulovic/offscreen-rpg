# Phase 0 | The Living Edition: what a player's story history could become

**Status:** Exploratory product study. Not a selected feature, wireframe, schema or implementation request.  
**Primary authority to reconcile:** `docs/product/experience/return-and-journal.md`, `docs/product/foundations/concepts.md`, proposed player replay document.

## 1. Reframe the problem

Persisting prior passages is **storage success**, not **narrative experience success**. A history list that faithfully renders 500 passages may be correct and nearly impossible to enjoy. Conversely, an AI-generated memoir that drops ordinary entries or invents emotional significance can be beautiful and untruthful. We need a deliberately designed hierarchy that preserves both.

A campaign is **not** a novel with compulsory acts or chapters. One conversation may span many published passages; an ordinary afternoon may be important after months; a later event may change what a previous moment means. The design should support reader-defined bookmarks and derived editorial groupings without converting them into canonical story boundaries.

## 2. Separate four different information objects

| Object | Product meaning | Authority | Reader behavior |
| --- | --- | --- | --- |
| **Published passage** | Immutable original scene prose as shown in the story | Canonical, exact passage ID and sequence | Read fully; copy/link if permissions permit |
| **Committed development** | A verified action/world/activity fact | Authoritative player-visible event/projection, with its own coverage | Understand how a state changed and when it was visible |
| **Editorial preview** | Short sourced extract, synopsis, or visual thumbnail of a passage/window | Derived, with source references, coverage and version; may be regenerated | Scan and select, not substitute for reading |
| **Reader's mark** | Bookmark, private label, last-read position or collection | User preference, not fiction canon | Return, annotate and curate |

Never silently treat an editorial preview as the original Storyteller prose, or imply an unrecorded event happened merely because a generated summary includes it.

## 3. Candidate information architecture

### Layer 0: Return orientation

When reopening after a break: **Where am I now? What changed since I last attended? Is an action possible?** A compact, source-bounded recap may point to highlights and a jump to the newest verified passage. It must disclose the coverage window and avoid stale claims when new events arrive. It cannot block an already available choice.

### Layer 1: Overview / the 'story spine'

A vertical, navigable sequence of **moments**, not equally prominent full-prose cards. A moment may be one published passage or a derived cluster explicitly referencing several passages. Hierarchy depends on context and what can be justified: current segment, bookmarked moments, long elapsed spans, major verified developments, plus ordinary stretches as accessible compact entries. It must never invent chapter boundaries or apply a generic 'dramatic = important' model.

Candidate visual treatments: a continuous typographic spine with asymmetric excerpt tiles; a restrained folio index with highlighted source citations; a horizontally scrubbed filmstrip of *saved* narrative moments while the current scene remains anchored. These are distinct designs to prototype, not a feature backlog to combine indiscriminately.

### Layer 2: Passage reader

Open one saved passage in a focused, beautiful reading pane with its original title and prose; show adjacent previous/next passage controls, a stable source sequence, optional truly known context and a clear path back to current Now. Old choices are never clickable current commands. A source-backed 'what followed' link may be more useful than a generic timestamp.

### Layer 3: Thread explorer (only when real source links exist)

Alternate lens: **People, Places, Promises/Commitments, Objects and Questions** when the underlying evidence recognizes them. A thread shows appearances and meaningful developments with links to original passages. It is *not* a world encyclopedia generated from a bag of embeddings and not a reason to expose private DM knowledge. Missing or partial coverage must be explicit.

### Layer 4: Verified Replay (separate future capability)

Optional read-only progression through recorded source-backed frames and chosen actions; potentially includes mechanical events where source coverage supports it. Keep separate from ordinary Journal reading. The existing proposed `work/designs/open/player-replay/player-replay-experience-v1.md` owns its own fidelity tiers. A fancy next/previous passage animation does not make the Journal an R2 mechanical replay.

## 4. A candidate 'moment card' anatomy

**Required:** original passage ID; source sequence (for internal identity even if not visibly printed); a truthful title or direct excerpt; open-reader action.

**Optional with provenance:** an editorial one- or two-sentence gist; saved thumbnail or historic appearance if retained; known in-fiction time; linked character/place/thread; verified response/consequence badge; personal bookmark. Each optional field independently falls back if unknown.

**Never infer from style:** significance, danger level, outcome, location, whether a choice was made, or a portrait. No current-game command action on history cards. Avoid every card having the same two-line description and glow. Density and composition should express genuine content roles.

## 5. Main tension to design around: overview versus truth

**Summaries can be useful but need an explicit product policy.** They are sourced, revisioned, scoped to a passage set, marked as derived and regenerable. A generated 'gist' must not rewrite the original or be displayed as direct quotation unless it is. If we cannot fund or validate a summary pipeline, a robust extractive fallback (original first sentence + ellipsis where appropriate) is better than fabricated elegance.

**Chronology has two axes:** publication order (what the player encountered and when it was shown) and fictional world time (when the event occurred in the story). A later publication can narrate an earlier fictional event. Default reading order should be publication sequence; an optional in-world timeline must label and handle discrepancies rather than sort by a single guessed clock.

**World neutrality:** a 'character life' may belong to a microbe or a distributed mind. Do not require portrait cards, human relationships, cities, calendar dates or possessions to make the archive work. Content-driven visual accents are allowed; compulsory ontology is not.

## 6. Existing data reality

`packages/contracts/src/stories.ts` `storyHistorySchema` currently exposes page items with `{id, sequence, content: {version,title,paragraphs}}` and a cursor `nextBefore`. `packages/application/src/stories/reads.ts` reads up to 20 passages/page, in descending sequence. `apps/web/src/features/play/history.tsx` displays full prose in that order. This is **enough to build a more intentional original-passage reader and index** with no new game model, but **not enough to truthfully show** historical choice, old appearance, occurrence time, relationship links, place context, summaries or source-backed highlights unless those come from separately proven projections.

The `publicStoryEventSchema` and the proposed Replay model indicate plausible future data sources, but they have different coverage and privacy contracts. Product design should name each desired field, exact source, allowed fallback, and whether it requires a new read model. Do not bury API decisions in a component design mock.

## 7. Test corpus for the Journal before we select a layout

1. **One passage:** Does the layout feel intentional without empty sidebars or fake sections?
2. **Twenty passages:** Can the reader identify recency, re-find a title and move sequentially?
3. **Two thousand passages:** Can the player jump near #1500 without loading #1–1499 and without overwhelming the page?
4. **Rapid exchange:** Fifteen short passages in one ongoing conversation; no fake fifteen 'chapters'.
5. **Long absence:** A week of legitimate developments and a pending decision; recap coverage remains true.
6. **Important ordinary moment:** A quiet gift later becomes important; previous passage stays unchanged while the derived overview may be updated.
7. **Failed/interrupted process:** No history card says the expected reward was earned.
8. **Non-human world:** No faces, towns, dates, bodies or inventory are required.
9. **Conflicting temporal orders:** Fictional second and publication sequence differ; user sees both without deception.
10. **Missing assets/derivations:** Original text remains readable, linked and searchable.
11. **Mobile and keyboard:** Reader can browse without losing the Now-return context; focus and scroll anchoring are predictable.
12. **Shared/permission-sensitive future story:** Reader cannot see unpublished or other-perspective content.

## 8. Leading hypotheses to test next

**H1:** 'Now' should be the living situation, while Journal should be a **primary in-story destination**, not a collapsed `Details` panel. It currently lives inside `details` and `#story-journal`; that weakens the feeling that the story has a life behind it.

**H2:** Journal should have at least **overview and full-passage reading modes**, but not necessarily a mechanically complex Replay feature. Different levels of density solve different reader tasks.

**H3:** A source-linked moment/index card is the right compact unit; full prose belongs in a clear reader. Do not choose the card treatment until three concrete page arrangements have been prototyped.

**H4:** The best first feature might be *jump to a previous passage and return to Now preserving place*, not elaborate AI retrospectives. It offers immediate value and a proof for source identity, pagination and reading quality.

**H5:** Relationship/character/thread browse could be extraordinary later, but only after canonical identity and visibility models allow accurate links. Do not fake a knowledge graph for visual spectacle.

**Pending decision:** choose the Journal reading model after observing actual high-fidelity alternatives with real test passages, not after reading this proposal.
