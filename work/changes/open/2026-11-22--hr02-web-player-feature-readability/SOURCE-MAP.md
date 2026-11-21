# HR02 | real source groups, consumer fanout and behavior locks

Source snapshot `d3ba2917`, read actual Next `app/` and `src/features` files and existing `features/play/README.md`.

**Flat stories files to move, exact old→new map (within `apps/web/src/features/stories`):**
- `live-story-list.tsx`, `draft-list.tsx`, `stories-home-actions.tsx` → `library/` (Story library screen, fixtures and Storybook)
- `draft-content.ts`, `draft-editor.tsx`, `use-draft-save.ts`, `storyteller-select.tsx` → `drafts/`
- `opening-preview.tsx`, `use-opening-generate.ts`, `use-start-story.ts` → `opening/`
- `story-launch-form.tsx`, `story-launch-status.tsx`, `use-story-launch.ts` → `launch/`
- `stories-library.css` and `story-launch.css` retain their existing shared stylesheet roles; imports adjust relative depths. Other already-present opening/launch modules found on post-integration HEAD must be grouped coherently, not silently dropped.

**Current external consumers observed:** Next route `app/(authenticated)/stories/page.tsx` imports lists/actions; `.../stories/new/page.tsx` and `.../stories/[id]/page.tsx` import draft editor; `.../[id]/preview/page.tsx` imports preview; `.../stories/launch/page.tsx` imports launch form. Storybook under `apps/web/src/stories/{list-states,stories-library,ux-evidence,platform-entry,design-system-matrix,draft-states}.stories.tsx` imports moved public components; direct feature tests co-located with moved filenames, e.g. `use-story-launch.test.tsx`, `draft-editor.test.tsx`, `opening-preview.test.tsx`, `draft-list.test.tsx`, `live-story-list.test.tsx`. Some story presenters import `draft-content`; move importer paths only, do not change fixture behavior. Use TypeScript compiler failures and a one-shot scoped import search to ensure complete caller cutover, not a separate “discovery phase” tasked to Cursor.

**Already-structured Play:** `features/play/model/` holds pure pace/projections/status and offer path, `api/` campaign command hook, `presentation/` parse/resolve/types and fixtures, `ui/` 24 direct components for scene/status/offer/history etc. `view.tsx` ~328 lines is orchestration; it reads `playStorySnapshotQueryOptions`, subscribes to `useStoryLiveUpdates`, and passes existing command hooks into composed UI. `use-resolution-command.ts` ~327 lines has sessionStorage frozen-intent and GET receipt recovery; `use-control-command.ts`, `api/use-campaign-command.ts` each preserve command idempotency and no automatic retries. These are **not** candidates for free-form state refactoring.

**Stable seams:** StorySnapshot contracts from `@offscreen/contracts/stories`; Next authenticated route and Web client query use same owner/story; one TanStack Query source; SSE hints cause invalidation and authenticated GET, never commit a fictional state. Launch `use-story-launch.ts` freezes request UUID and recovers 202 via GET; `use-resolution-command.ts` preserves immutable operation ID and digest across process/network recovery. Play offer navigation local only until action-bearing leaf. Existing `features/play/README.md` has useful navigation but still mentions older main branch/source; update to actual undertaking HEAD as part of change. None of these change server contracts.

**Collision:** CL01 will add a Next `terminal/connect` page under authenticated routes and read existing Story UI; HR02 does not write its page or auth provider. If CL01 happens to add imports into moved Stories features, mechanically update those import paths at custodian integration. No shared code write with HR01 (Nest) or HR03 (DB).
