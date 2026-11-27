# Phase 1 | Journal as an editorial reading product

**State:** OPEN DESIGN, not an accepted standalone Journal implementation. No new endpoint or historical evidence is claimed.
**Authority references:** `docs/product/experience/return-and-journal.md` (accepted), `docs/product/foundations/concepts.md` (accepted); `work/designs/open/player-replay/` (separate **proposed** product).

## 1. A personal edition of an actually lived life

The journal's promise is **“I can rediscover what happened to this character, in the words and sequence in which it was published.”** The feeling should be closer to reading an evolving personal chronicle than browsing an application event log.

This does **not** make the campaign a novel with mandatory acts, chapters, endings or emotional beats. A scene can span many passages. An internal memory segment has no inherent story meaning. A day with no publication does not become a fabricated diary entry.

The proposed Journal offers **two reading depths now** and **optional deeper lenses later**:

1. **Overview / Story Spine:** a scannable index across an entire history; compact source-linked moments; meaningful anchor points without compulsory story segmentation.
2. **Original Passage Reader:** the exact saved prose as an immersive reading composition, with stable prev/next, source identity, return-to-overview and return-to-Now.
3. **Thread lens (later):** appearances of known people, places, possessions, promises or motifs **only when actual source links and visibility exist**.
4. **Recorded Replay (different feature):** stepped player-visible historical frames and selected action/receipt evidence under the separate proposed Replay contract. It is not a synonym for the passage reader.

## 2. Four content objects, not four interchangeable cards

| Object | Canonical or derived? | Required shape | Example label |
| --- | --- | --- | --- |
| **Published passage** | Original source | Immutable passage ID, sequence, exact saved title and paragraphs; viewer authorization | “Passage 184 • original” |
| **Committed development** | Source-backed event/receipt | Source ID, visible publication/commit context, supported statement; may be absent | “Recorded development” |
| **Editorial moment** | **Derived presentation unit**, 1 or N passages | Anchoring original passage IDs/range; preview kind and coverage; source links | “From passages 180–184” |
| **Personal reader mark** | User preference | Viewer, source ref, optional label/position, independent of story truth | “Bookmarked” |

A moment may be a direct one-passage excerpt or a cluster of adjacent passages. It **cannot** silently become a canonical scene, chapter, action or new publication. Different degrees of editorial density must be testable; we need not store a fabricated moment table.

## 3. Overview: a story's shape without falsifying its structure

**Suggested overview composition grammar** (not a layout commitment):
- **Orientation:** story identity, reliable record coverage and clear current/past distinction.
- **Reading position:** a source-grounded jump to the latest published passage and the player's last opened historical passage if saved.
- **Sequence spine:** compact, unevenly weighted previews. Recent, bookmarked or source-verified relevant ranges can be prominent, but ordinary life remains findable.
- **Navigation tools:** accessible sequence seeking, text search if indexed, optional source-backed filters; never a fake chapter browser.
- **Source affordance:** open the exact original, see its sequence/relationship to nearby published passages, and return without resetting the index.
- **Now affordance:** visibly leave history and return to the authoritative present at any point.

**A reference scene, five passages:** A person knocks; you ask why; the stranger lies; you inspect a badge; you decline to help. These may all be the **same encounter**, and grouping them for overview readability is sensible. The moment must not claim the fifth passage is a new “Chapter V”, nor imply the model minted one scene per database row.

**An ordinary week:** two logged ordinary repairs and a later consequential gift can be surfaced through verified event/passage evidence. The seven days are not represented as seven invented diary pages. A real time gap can be displayed as a *gap* only if the relevant clocks and coverage justify it.

## 4. Reader: the passage is the art object

The full passage reader should:
- show original title and paragraphs with excellent typographic measure and long-form readability;
- preserve **historical source identity**, independent of a later regenerated summary;
- use adjacent passage navigation in the visible publication sequence, **not** merely nearest fictional timestamp;
- allow return to the original index position and a separate explicit route back to Now;
- show historical option/choice context only with verified source and as **non-actionable**;
- optionally render retained historical scene appearance/media, with graceful absence when source or permission is missing;
- make copy, focus, text selection, screen-reader reading order and narrow screens first-class;
- keep all historical reads **free of game commands and model calls**.

Do not animate old options as if a live input can still be selected. “Read next” is a reader operation. “Continue story” leaves history and opens the current authorized Now; they must look and behave differently.

**Historic visual fidelity caution:** the journal can recompose old prose using today's approved editorial system without pretending to reproduce the exact former browser pixels. Claiming historical art/theme fidelity requires saved directives, asset revisions and renderer versions (as the separate Replay proposal explains).

## 5. The two chronologies must not be conflated

**Primary order:** source publication sequence: what became available to the player and when. This supports reliable reading, links and original prose.

**Secondary optional order:** in-fiction time, when the system can actually prove it. A report published today may describe something that happened yesterday in the fiction. Re-sorting by gameSecond without clearly explaining this creates a false experienced narrative.

A hypothetical marker may say “Recorded later about an earlier event,” with source, if known. When time metadata is absent, omit date decorations rather than invent them. The browser's local timestamp is neither a world calendar nor proof of fictional elapsed duration.

## 6. Compact “moment” anatomy and fallbacks

**Minimum usable moment preview**
- Original passage ID(s) and published order.
- Unmodified title or accurately extracted short source text.
- The action “Read original passage” (or “Read passages X–Y” for a source range).
- Distinction between preview and full source.

**Optional sourced enhancements**
- **Gist:** user or model/editorial derived paraphrase with source window, provenance/version, coverage and an extractive fallback. It is not an original quote.
- **Known person/object/place tag:** only from admissible player-visible identity links; words in prose alone do not guarantee a durable entity.
- **Verified action/outcome tag:** receipt/event source link and its visibility contract.
- **Historical art:** retained authorized asset and original appearance if available; never a generic unrelated portrait.
- **Reader's mark:** private bookmark/note independent of fiction.
- **Time:** only from a reliable simulation/publication source, clearly labeled.

**Do not add:** emotional score, danger level, “importance 94%”, number of choices, simulated chapter names, invented map position, estimated XP, or automatic image generation just to fill the card.

## 7. The complete data and capability truth table

| Desired reader feature | Source available in pinned ZIP? | Proposal / missing proof |
| --- | --- | --- |
| Published title, prose, passage ID and sequence | **Yes:** `storyHistorySchema` items: `{id,sequence,content}` | Can support original reader and a basic extractive preview |
| Descending paged history | **Yes:** `readHistory` 20/page with `nextBefore` | Supports load older; not random seek or high-scale search by itself |
| Current passage | **Yes:** `StorySnapshot.current` | Must stay separate from historical view and refresh truth |
| Story appearance for the current passage | **Optional:** `StorySnapshot.current.appearance` | Do not assume history endpoint returns historic appearance |
| Historical chosen response / offer | **Not in** `storyHistorySchema` | Requires a separately authorized projection before the reader claims it |
| Past fictional timestamp | **Not in** history items | Need read model backed by authoritative event/clock source |
| Committed event index | **GM05 public event schema exists**, distinct from passage history | Reconcile event coverage/order/visibility; cannot assume all passages have matching event metadata |
| “Since last foreground visit” | **GM06 checkpoint exists** outside history | Only state it when foreground evidence, correct perspective and coverage exist |
| Source-based gist/semantic thread | **No proven end-user Journal projection** | Design source/coverage/revision policy first; don't fake linkage |
| Bookmarks and last-read sync | **No proven cross-device private preference** | Optional separate preference design |
| Indexed search / jump to #1500 | **Not implied by numeric `before` paging** | Requires access-scoped search/seek index, stable cursor or source-window API |
| Player historical replay with effects | **Separate proposed study** | Do not name current Journal “Replay”, especially R2 mechanics |

These gaps are **design dependencies**, not an implementation backlog authorized today. Their policy and interaction implications belong in later selected product specifications before technical design.

## 8. Evidence-aware editorial policy

- A synopsis/recap is **derived and revocable**, not silently inserted into original source.
- Every derived group has an explicit source range, version, viewer scope and coverage boundary. A changed gist can change emphasis, never rewrite a past paragraph.
- If a generation or search index is stale, the reader can still access original prose.
- If a source was deleted or permission revoked, don't display its cached synopsis or thumbnail.
- Ordinary moments remain accessible even when no recommender considers them “important”.
- A newly relevant old gift can be featured in a later overview **without** mutating the published source. The source date/order remains original.
- Where hidden Storyteller plans or another participant's private text exist, no browsing lens may leak them.

## 9. Long-lived story design stress ladder

**1 passage — the seed.** Present a fine reading page and a minimal index, not a gigantic empty graphic timeline. No placeholder “arc”.

**20 passages — the recognizable life.** Preview rows can be a mixture of single excerpts and source-linked adjacent groups. The reader must locate a named moment, move both directions and return to the overview without losing its position.

**200 passages — growing complexity.** Add source-based discovery and efficient overview windows; do not load every full paragraph into the initial overview. Repeated titles remain distinct by passage ID/sequence.

**2,000 passages — a genuine archive.** Reader must be able to navigate near an old position, deep-link safely and progressively load bounded windows. Scanning ~2,000 cards must not be the only way to find one moment. Search/seek design must name its unimplemented read-model requirements.

**Noisy content:** fifteen short passages in one conversation. Never label them fifteen scenes/chapter transitions.

**Sparse content:** one long low-drama interval, little published prose. Empty space and gaps should be visually intentional, not faked by model-generated events.

**Non-human content:** a sentient weather pattern has neither face nor hometown. The same archive works without portrait/place/calendar chips.

**Time reversal in narration:** a later report about an earlier event must not scramble canonical publication order.

**Permission-sensitive content:** revoked viewer or future group perspective cannot see private history by guessed passage ID.

## 10. Relationship to Replay: clear product seam

The current Journal concept is **reading**. It offers source prose, editorial navigation and perhaps source-backed contextual links. The proposed [Player Replay](../../player-replay/README.md) is **recorded playback** and may progress through events, accepted choices and mechanistic evidence with its own fidelity/coverage levels. Passage next/previous is *not* replaying mechanics.

No historical rendering may ACK a live foreground checkpoint, submit an old offer, charge a model, roll new dice, fork a story or change the current game clock. A future “fork from here” is an entirely separate authorized operation.

## 11. Questions requiring visual comparison and product approval

1. For 20/2000 passages, is the best overview a **continuous typographic spine**, an **editorial mosaic of sourced moments**, or a **compact annotated index with a full reader**? Prototype materially different arrangements using identical copy.
2. Is a grouped editorial moment a default index item, or only an optional condensation? Test the 15-passage conversation and the mundane week.
3. Should a history search match original published text only at first, with entity/thread expansion staged as a later, evidence-dependent lens?
4. Do we require a portable private bookmark at the first release or is reliable in-session restoration sufficient until researched?
5. Which historical visuals should be preserved as an archival promise, if any? Never mistake current appearance capability for historic retention.

**Gate:** the player can skim, locate, verify, read and return while always knowing which words are original, which are derived, and which controls are safe historical navigation.
