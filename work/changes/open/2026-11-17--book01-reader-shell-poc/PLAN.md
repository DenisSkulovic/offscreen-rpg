# BOOK01 | Planned implementation sequence

**State:** PLAN / BOOK01 selected (2026-11-17). [Bounded outcome and proof](../../archive/2026-11/other/2026-11-17--book01-reader-shell-poc/CHANGE.md). Product [selected POC](../../../../docs/product/experience/living-book-poc.md); technical [selected POC](../../../../docs/technical/client/living-book-poc.md).

## S0. Recheck code and safe baseline

- [x] Capture `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`; reconcile with the named current Change selection. Do not overwrite dirty state.
- [x] Read `apps/web/src/features/play/README.md`, `view.tsx`, `ui/story-frame.tsx`, `ui/story-frame.css`, `history.tsx`, `ui/campaign-offer.tsx`, then only exact source necessary for the action and Query boundaries.
- [x] Identify existing RTL/Storybook fixtures for legacy/campaign choices, pending/blocked/recovery and current appearance. Add/use a deterministic provider-free test case rather than new paid gameplay.
- [x] Note route/hash behavior and whose current source/offer identity it is. Confirm no new backend or schema is needed.

## S1. Book shell, no mode migration yet

- [x] Replace the default top-chrome-dominant stage with one stable *book* reading surface using exact source prose and existing validated atmosphere. No giant external bar or sidebar.
- [x] Preserve existing PlayScene's current source, options and status/recovery/wait children without moving command ownership.
- [x] Native fluid layout: 320/375 single leaf, desktop book-like treatment where safe, continuous fallback for long/large text.
- [x] Test no-art, 6000-char paragraph, 10 paragraphs/6 choices, and no-clipping at narrow/large-text. Fix source/focus bug before adding motion.

**Checkpoint:** tests show exact source/option IDs; no command behavior changed. Visual shape is recognizable, not the final theme.

## S2. Primary Now/Journal navigation

- [x] Give book one small, discoverable, keyboard-accessible contents affordance; Now and Journal are actual modes, no collapsed-Details trap.
- [x] Relocate existing `StoryHistoryView` without redesigning its query, item rendering or pagination. Settings and technical disclosures survive quietly.
- [x] Handle initial direct link, Back/Forward and return to latest Now. Preserve reader/source anchor, clear stale local state on viewer/story change, and never mount a historic choice callback.
- [x] Test navigation with history empty/loaded/failed and pending current resolution. No auto-post during navigation. Book navigation posts nothing in `view.test.tsx`. Empty, loaded, and failed history stay covered by the unchanged `history.test.tsx`.

**Checkpoint:** Now → Journal → Now works with keyboard, browser navigation and provider-free Query; safe source isolation.

## S3. Regression, evidence and documentation reconciliation

- [x] Run focused UI tests and `pnpm test:fast` where safe; typecheck and build `@offscreen/web`. `pnpm test:fast` passed 202 tests. Typecheck passed. `next build` passed. Playwright was not run.
- [x] Verify legacy choice id and campaign explore/back/commit semantics, wait pause/resume, 202/pending/uncertain/blocked, invalid presentation, foreign story/logout, 401/409, and SSE/GET reconciliation. No new paid calls, no DB resets. Existing Play tests still pass; no new paid calls or DB resets.
- [x] Capture screenshots to evaluate **structural** readability/book identity, not claim final visual acceptance. Storybook Desktop Decision and Narrow Long Prose were opened in a browser. Now/Journal hash switching worked. At 375px the narrow story had no horizontal overflow. Final art is still deferred. Live authenticated `/play` was not opened.
- [x] Complete CHANGE.md reconciliation ledger, `apps/web/src/features/play/README.md` source map changes if any, `STATUS.md` tested/source tier, and actual commands/evidence. Hand off BOOK02 only after BOOK01 has a clean bounded result.

## Explicitly excluded from this PLAN

No new page-curl package, model prompt, rich text schema, source-to-leaf persistent pagination, historical search, fork UI, new gameplay action, optional art generator, landing page or final styles/buttons. A feature creep proposal is a new design/Change, not a silent checkbox here.

**Current checkpoint:** S1–S3 code, `pnpm test:fast`, typecheck, and `next build` are in. Storybook checked the shell at desktop and 375px. Live authenticated `/play` and Playwright were not run. BOOK02 is not started. Final visual polish is still deferred.
