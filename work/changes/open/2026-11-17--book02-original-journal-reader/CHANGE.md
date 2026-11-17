# BOOK02 | Browse original saved passages within the book

**State:** PROPOSED / unselected. **Dependency:** BOOK01 has landed and is verified; this packet does not authorize executing it in the same diff. **Executor on selection:** Cursor (frontend). Product scope is deliberately narrower than the eventual literary/AI-enhanced Journal.

**Outcome:** From the in-book Journal, the player scans the saved chronology, opens one **exact original published passage** in a proper reading surface, moves among **loaded authorized** passages and returns to the current Now without treating history as active play. It must work with the existing 20-item `before` cursor API and without an invented search or random seek.

**Authority:** [Living Book POC](../../../../docs/product/experience/living-book-poc.md#poc-journal-intentionally-modest) → [client POC](../../../../docs/technical/client/living-book-poc.md#book02-read-only-original-passage-journal) → [Return/Journal](../../../../docs/product/experience/return-and-journal.md). Use [Play source map](../../../../apps/web/src/features/play/README.md) to locate Query/history owner.

## Source snapshot and reinspection

Design baseline: `main@7c2fd93a08b718e956a66cdf963ed6ad238a4723`, before BOOK01. At start inspect merged BOOK01 code and current HEAD; never assume old StoryFrame prop names remain unchanged. Existing source `apps/web/src/features/play/history.tsx` uses `storyHistoryInfiniteOptions(viewerId, storyId)`, disabled until opened, then `useInfiniteQuery` and `flattenUniqueById`, newest-first original titles and paragraph bodies, plus a `Read older passages` button. `apps/web/src/shared/api/story-history-query.ts` exposes only numeric `before` pagination and no random seek. `packages/contracts/src/stories.ts` returns `id`, `sequence`, `content`; no stored historical offer, scene appearance or synopsis.

## Implementation boundaries

1. Keep **one history Query owner** with viewer/story-keyed cache; do not fetch from an ad-hoc local cache, preload all pages, or copy story history to a parallel permanent state store. Existing history GET and 20-item cap remain unchanged.
2. Transform the old full-text-everywhere list into **overview + selected original reader**. Overview rows show sequence, saved title and optionally a **source-extracted** short excerpt. Do not fabricate AI gist, importance ranking, scene/chapter labels, relationship tags or in-fiction timestamp. Ordinary entries stay findable.
3. Reader displays exact saved title and every saved paragraph for selected `passageId`; label history clearly. Previous/next operate only within the currently loaded authorized set in publication order. When the reader reaches a loaded-window edge, offer an explicit “Load older” when the server's `nextBefore` allows it; do not guess what resides beyond it or claim a 2000-passage index exists.
4. Player can return to overview (preserve selection/window/scroll where practical) or explicitly to the latest Now. Reading or page-turning never submits a command, charges a provider, changes fictional time, or acknowledges an unseen live passage just because the Journal loaded.
5. A history passage is an **inert source document**. Do not render historic `IntentionChoice` with current callback or reconstruct past decisions from newer game state. The current `StorySnapshot` is queried separately from history; opening or closing history cannot roll it backward.
6. Source anchor should be the real saved `storyId+passageId` with a local paragraph/scroll location, **not** physical leaf index. No promise of cross-device bookmark persistence or arbitrary deep-link seek until a read model actually exists. If the selected passage drops from authorized loaded history, clear selection and explain, rather than display cached private text.
7. Maintain BOOK01's stable book shell, stage and contrast; no new visual style system, high-fidelity art or page-curl. The Journal can use a focused leaf regardless of whether Now has two facing leaves.
8. Handle empty history, single passage, 20 loaded with more available, no more older, slow/failing GET, session expiry, foreign viewer/story and loading focus correctly. Keep native keyboard, selection and screen-reader semantics.

**Scope exclusions:** no server or Zod schema update, search, random passage seek, summaries, event graph, World/You rewrites, Replay, fork UI, historical art retention, generated images, all-history eager loading or Storyteller changes.

## Falsifiable acceptance and negative checks

- **Normal:** open Journal from BOOK01 contents, fetch only authorized first page when requested, inspect exact title/paragraphs of entry #N, navigate adjacent *loaded* published records, load older once when `nextBefore` is present, return to overview/Now with a stable reader position; no fake chapters. On mobile, same original words remain readable with large text.
- **Negative:** no extra HTTP POST during any journal navigation. Historical `IntentionChoice` not enabled. Unloaded #1500 cannot be jumped to via a fabricated control. A later arrival/publication does not rewrite the selected older prose or turn history into current action. Viewer/story switch, revoke/logout, 401 and 404 cannot reveal previous private cached history. `nextBefore:null` never triggers an invented request.
- **Accessibility:** keyboard navigation, visible focus, correct heading hierarchy, predictable previous/next disabled/edge behavior, no giant 20 full-text cards, usable 320px/large text, reduced motion.
- **Performance:** bounded mounted DOM: loaded overview rows compact, only one full passage reader at a time; do not mount whole archive just because pagination exists.

**Suggested proof:** component tests of overview/reader selection with MSW history pages including duplicate/empty/older cursor and 401; Playwright provider-free route/history navigation, mobile and keyboard smoke; run existing `pnpm test:fast`, scoped web build/typecheck. Capture actual commands and human UX evidence. No paid providers or destructive DB.

## Dependencies, handoff and permissions

- **Requires BOOK01** first to establish primary Journal surface in book and preserve Now navigation. If BOOK01 changes history owner semantics, adapt at source **without** broadening authority.
- No impact on currently selected HAR09, W-program or engine. This packet remains unselected unless the owner explicitly switches the current Change or provides an equivalent bounded direct implementation instruction.
- If exact deep linking/seek or derived recap is requested during execution, **stop**: it requires separate product/technical design and probably backend read models, not a hidden add-on to BOOK02.

## Reconciliation ledger on exit

| Owner | Expected disposition | Evidence | State |
| --- | --- | --- | --- |
| [POC product](../../../../docs/product/experience/living-book-poc.md) | unchanged POC scope | original reader walkthrough | Pending |
| [Return/Journal](../../../../docs/product/experience/return-and-journal.md) | still future full history search/recap | missing capability explicitly disclosed | Pending |
| [Client POC](../../../../docs/technical/client/living-book-poc.md) | preserve source/Query bounds | tests and source path | Pending |
| [Client state boundary](../../../../docs/technical/client/state-and-server-boundary.md) | no duplicate cache or command | Query and no-POST evidence | Pending |
| [Play source map](../../../../apps/web/src/features/play/README.md) | update if Journal owners move | actual symbol links | Pending |
| [STATUS](../../../../STATUS.md) | source/test tier only after proof | tested details and exclusions | Pending |

**When selected:** implement only the original-passage Journal reader, not the final Book design system. Preserve all original texts, identities and permissions; if richer history requires API changes, report as a future Change rather than inventing an endpoint.
