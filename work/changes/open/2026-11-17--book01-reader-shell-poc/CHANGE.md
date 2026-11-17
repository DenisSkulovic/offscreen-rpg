# BOOK01 | Deliver the first live Living Book reader shell

**State:** READY / **selected for execution** (2026-11-17). Design and contract are approved as a *minimal POC direction*. HAR09 stays open and is not current. **Executor:** Cursor (frontend). **Dependency:** none from BOOK02. **User approval:** book structure acceptable for POC; actual visual polish, buttons and top-toolbar layout deliberately deferred.

**Outcome:** An authenticated live story at `/play/:id` is presented inside a recognizable, quiet, accessible **book reading surface** instead of the current top-chrome-dominated `StoryFrame`. The player can read all original current prose, see every legitimate live action/wait/recovery, open the saved Journal through a discreet in-book affordance and return to Now. Existing behavior and server authority survive unchanged.

**Start here:** [Product POC contract](../../../../docs/product/experience/living-book-poc.md#poc-promise) → [Client POC integration](../../../../docs/technical/client/living-book-poc.md#book01-book-shell-and-current-now-composition) → [Play source map](../../../../apps/web/src/features/play/README.md). If these plus below source paths answer the task, **stop**; do not ingest the entire Phase 2 design research archive.

## Current implementation baseline / must revalidate

Inspected `main@7c2fd93a08b718e956a66cdf963ed6ad238a4723` (2026-11-17). Before any code edit, run `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json` and inspect relevant symbols at actual HEAD. Do not overwrite concurrent HAR09/HAR05 or other uncommitted changes.

| Current owner | POC intent |
| --- | --- |
| `apps/web/src/features/play/view.tsx` `PlayScene` | Keep current Query, frozen action/wait controls, campaign composition, SSE and recovery; refactor only view/Journal child wiring |
| `apps/web/src/features/play/ui/story-frame.tsx`, `story-frame.css` | Convert visual shell to stable book, minimal in-book controls and responsive reader; eliminate prominent external toolbar/nav arrangement |
| `apps/web/src/features/play/ui/narrative-passage.tsx`, `scene-media.tsx` | Preserve exact plain source words, optional media and validated current appearance; no rich-score parser |
| `apps/web/src/features/play/ui/intention-choice.tsx`, `campaign-offer.tsx` | Preserve current legacy/campaign option identity, explore/back vs commit and disabled/recovery semantics; may adjust presentation spacing only |
| `apps/web/src/features/play/history.tsx` | Relocate **existing** read-only history view out of collapsed Details; no new search/query model in BOOK01 |
| `apps/web/src/shared/api/story-snapshot-query.ts`, `story-snapshot-write.ts`, `story-history-query.ts` | **No edits by default**; preserve authoritative Query and history ownership |

The currently rendered story has `<header className='story-frame__chrome'>` and a `#story-journal` section nested inside `details`. That is the primary UX seam to change; the current authenticated reads and frozen command handlers are not a design defect.

## Boundaries for actual implementation

1. Render **one book-like object** in the center as the player-facing experience. Default to an accessible, naturally flowing narrative leaf. A desktop two-leaf/spread treatment is optional where safe and can be accomplished without word-level fragmentation; never force it with clipped prose or separated choices. Mobile and enlarged text must become single-leaf and naturally scroll.
2. No permanent top navigation bar, left tabs, developer control strip, side inspector, arbitrary status dashboard, or genre-specific page theme. Minimal book identity + an in-book discoverable, accessible contents/navigation control; visible navigation must still be usable without hunting for a tiny invisible icon.
3. Retain `Now` and `Journal` as main labelled destinations. Move the existing saved chronology outside the generic Details disclosure. Keep the settings/technical information in a quiet secondary menu/disclosure, not deleted. No new route/API unless the documented hash/view approach demonstrably fails during review.
4. All current V1 title and paragraph strings remain present and selectable in original order. No `innerHTML`, prose rewriting, paragraph hiding, AI-generated markup or fixed physical page numbers. `NarrativePassage` can be composed inside book but must remain source-bound.
5. The **current question + all eligible options** form one logical region with no incomplete “one choice here, two beyond the turn” view. If six options require a long folio, allow full normal document scroll. Preserve original offer/option IDs and accessible labels. Preserve existing control/status/intent paths; all callbacks still originate from `PlayScene` / campaign command owners.
6. New current passage after committed publication updates Now through the existing versioned Query state. An open Journal page must not act as a live command. Client-side book state must not clone mutable story payloads into a parallel store or cause a paid mutation.
7. Neutral material fallback must be readable for cave, ship, microbe and no-art stories. Existing validated V1 appearance may influence background and low-risk atmosphere, but book text/controls/focus retain stable readable contrast. No untrusted CSS/HTML or model-authored page DOM.
8. Default motion **none or restrained CSS only**. Respect reduced motion. No new book package, complex compositor, 3D physics, runtime image generation or model spending. A visually incomplete but functional book is acceptable for this POC.

**Scope cut discipline:** BOOK01 changes the view shell and Journal entrypoint, **not the detailed history browsing experience**. BOOK02 owns the overview/reader transformation. Don't opportunistically redesign Landing, Stories, Create, Settings forms, Chamber or Admin.

## Falsifiable acceptance

**Normal POC proof**
- A safe provider-free story fixture renders exactly the saved title/paragraphs in a recognizably book-like reading composition before/after hydration. Now/Journal/Back navigation works with keyboard and browser Back/Forward.
- Existing legacy interaction and campaign contextual choices (including inspect/back without spending time) work against the actual current offer. All accessible options remain discoverable at 320/375px and enlarged text. Real submission still uses the same frozen command and no duplicate POST.
- Existing wait, pause/resume, pending, blocked, uncertain, error and recovery controls remain present and truthful, not hidden in art. POC style can be rough; status behavior cannot.

**Discriminating negative proof**
- Long passage with a 6000-character paragraph plus six intentions at 320px/large text: no clipped or missing text/choices, no nested option scroller, no fixed-height shrinking.
- Journey accepted/202 but not published: no invented “next page” or reroll; simply opening Journal/back/turning/resize causes **zero** POSTs. Foreign story switch and logout show no stale private content.
- Live offer changes while Journal is open: stale option callback cannot remain committed; returning to Now uses current snapshot. Failure of backdrop/image does not break text.
- The book still works with `prefers-reduced-motion`, keyboard focus and ordinary continuous reading; no external page-turning dependency.

**Smallest valid proof:** add narrow component/storybook/RTL tests for book shell/nav/current source and a focused Playwright keyboard/viewport smoke on existing provider-free fixtures. Reuse `pnpm test:fast`; run a targeted web build/typecheck. Record performed commands and actual results. Human check that no prominent design-lab or app-topbar chrome remains and all actions can be found. Never describe screenshot-only smoke as complete WCAG success.

## Risks, permission and exclusions

- **Safety:** existing authenticated Query, viewer/story privacy, current viewVersion reconciliation, frozen command envelope, 401/409/503 recovery and pause semantics are protected. If changing a current owner requires new backend or command behavior, **stop and propose a separate Change** rather than widening BOOK01.
- **Visual:** don't try to impress with genre presets, fake book illustrations or 3D effects. No final font/texture/button library approval is implied.
- **Cost:** provider-free tests only, no charged Storyteller operation, image generation, production data or destructive DB.
- **Portability:** no new app-wide global CSS, state library, flipbook package or custom storage. Keep changes scoped to Play/Book and preserve Demo/Chamber.
- **Dependency:** BOOK02 may be prepared but must not be implemented as part of BOOK01.

## Reconciliation ledger (complete at implementation exit)

| Authority / owner | Intended treatment | Implementation receipt needed | Status |
| --- | --- | --- | --- |
| [POC product](../../../../docs/product/experience/living-book-poc.md) | selected target unchanged | Storybook shell walkthrough; live `/play` not run | Target unchanged. Shell is source, not final art |
| [POC technical](../../../../docs/technical/client/living-book-poc.md) | preserve source/reader/command separation | `story-frame.tsx`, `view.tsx`, `story-frame.test.tsx`, `view.test.tsx` | Landed shell noted. No new route or API |
| [Client state](../../../../docs/technical/client/state-and-server-boundary.md) | unchanged | Journal open/close posts 0 in `view.test.tsx`; choice path still posts once | Unchanged |
| [Presentation V1](../../../../docs/technical/client/presentation-runtime.md) | unchanged schema/resolver; fit new shell | `story-frame-presentation.test.tsx` still resolves fixture choices by id; book ink is not presentation CSS | Unchanged schema. Book page ignores atmosphere ink |
| [Play source map](../../../../apps/web/src/features/play/README.md) | update if shell owners move | Living Book shell row | Updated |
| [STATUS](../../../../STATUS.md) | update source/test tier only on proof | `pnpm test:fast`: 202 passed. Web typecheck and `next build` passed. Storybook shell checked. No paginator, BOOK02, or live Play claim | Updated |

**Handoff when explicitly selected:** Read only this packet, the two POC owner docs and `apps/web/src/features/play/README.md`; recheck source; implement the narrow shell first. If physical two-leaf layout conflicts with long text/choices, use the single flowing leaf rather than inventing a general compositor. Keep other selected queue items intact; this proposal is not itself a Cursor instruction to begin.
