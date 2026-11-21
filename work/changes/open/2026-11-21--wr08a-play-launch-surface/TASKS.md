# WR08A | three bounded Composer tasks

**Ready successor when WR07C merged, not dispatched while WR07C writes Contracts.** One linked worktree `change/wr08a-play-surface` from actual `undertaking/storyteller-workshop` HEAD. One parent executes T01–T03, integrates to undertaking only, archives and retires branch/worktree. No backend work.

## T01 | Immutable request/pointer + network adapter | PATCH

**Read:** `apps/web/src/shared/api/start-intent-store.ts`, `apps/web/src/features/stories/use-start-story.ts`, `packages/contracts/src/story-launch.ts` after WR07C lands. **Write:** `apps/web/src/shared/api/story-launch-intent-store.ts`, `apps/web/src/features/stories/use-story-launch.ts`, corresponding Vitest tests.

Create viewer-scoped versioned session pointer `{viewerId,operationId,requestHash?,createdAt}` with max 24h TTL and strict parser, no prompt/body. `beginLaunch(source)` creates one UUID and one parsed frozen request; PUT to exact URL once. If response lost, GET by existing operationId, do not reconstruct a new command. Follow `StoryLaunchStatus` schema for all returned states. Avoid storing private prose in sessionStorage/URL. Tests: same-operation retry, 404 after reload shows unknown/needs-input (not auto-resend), invalid viewer pointer ignored, failed response does not navigate. **Stop:** WR07C's live DTO differs materially from packet; return exact mismatch to ChatGPT, do not improvise a second wire format.

## T02 | Form, status and capability-gated route | PATCH

**Read:** `apps/web/app/(authenticated)/stories/{page,new/page}.tsx`, `apps/web/src/features/stories/draft-editor.tsx`, `apps/web/src/shared/ui/action.tsx`. **Write:** new `apps/web/app/(authenticated)/stories/launch/page.tsx`, `apps/web/src/features/stories/{story-launch-form,story-launch-status}.tsx`, scoped stylesheet. Change existing Stories-home link **only** under a provably enabled launch capability, default false; legacy `/stories/new` works without flag.

Form: freeform prompt up to 24,000 chars; preset selection only from version-pinned server catalogue when actually available, no invented preset metadata. Optional world-invention hint only if WR07C accepts it. Status display: pending/preparing/composing honest; held/failed/uncertain attention; `ready` link /play/<id> only with validated id. Use current contract; no fake server answer, decorative disabled buttons or mandatory avatar. Accessibility: label, visible progress, disabled duplicate submit while pending, keyboard and screen-reader status. **Stop:** requires bypassing authentication or making a request to an endpoint not capability-enabled.

## T03 | Focused proof and closure | VERIFY/PATCH

**Read:** `apps/web/package.json` Vitest scripts, existing stories client tests, Change proof. **Write:** tests for one prompt, preset path, operation retry, rejected 404, uncertain, ready, cross-viewer pointer, disabled gate. `pnpm --filter @offscreen/web test`, `pnpm --filter @offscreen/web typecheck`, changed-file lint/format; record actual passing names, not generic green claim. Archive, reconcile catalog and docs, squash-integrate, delete clean worktree/branch. No model call, DB migration, backend or schema edit. A missing backend is expected under default-disabled production gate, not an excuse to claim full Play.
