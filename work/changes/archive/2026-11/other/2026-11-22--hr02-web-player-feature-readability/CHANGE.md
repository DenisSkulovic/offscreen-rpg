# HR02 | Human-readable Next.js player features, not another state architecture

**State: Done (2026-11-23).** Stories files live under `library/`, `drafts/`, `opening/`, and `launch/`. Play scene order is four local render helpers in `view.tsx`. Joined on `undertaking/storyteller-workshop`. Not on `main`. No product contract change.

**Profile:** STRUCTURAL/REFACTOR. Executed from undertaking HEAD `fb5bf588` (packet snapshot `d3ba2917` is an ancestor; one later stories commit `b59c22e9` kept the same flat files). No other open Change claimed `apps/web/src/features/stories` or `play`. Target `undertaking/storyteller-workshop`. No new product feature or contract.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Story library, draft, opening, and launch navigation | `apps/web/src/features/stories/README.md` | changed: folder grouping only; same screens and HTTP owners | `apps/web/src/features/stories/README.md` at base `fb5bf5880ad371f8c19e55356c05b205420fbfed` | source-inspected; focused tests 66/66 | no second fetch inside presentational lists, forms, preview, or status | stories README and `apps/web/app/README.md` route rows |
| Play query, command, and recovery | `apps/web/src/features/play/README.md` | unchanged behavior because command hooks and Query keys stay in their owners; local render helpers only | `apps/web/src/features/play/view.tsx` at base `fb5bf5880ad371f8c19e55356c05b205420fbfed` | view, recovery, double-submit, live updates, and offer-path checks inside the 66 | no second Query cache; command hooks untouched | play README render order |
| Authenticated story routes | `apps/web/app/(authenticated)/stories/page.tsx` | unchanged route and auth boundary because only import paths moved | `apps/web/app/(authenticated)/stories/page.tsx` at base `fb5bf5880ad371f8c19e55356c05b205420fbfed` | web typecheck PASS | legacy flat feature imports absent | app README paths |
| Player-visible contracts | `docs/product/README.md` | unchanged because this Change does not alter user-visible statuses, revision, or idempotency | no source behavior changed; base `fb5bf5880ad371f8c19e55356c05b205420fbfed` | source-inspected | quality lint findings on moved files match pre-move campaign non-null assertions and existing style | N/A |

Declared diff paths, each an import or folder move because the Stories feature was regrouped without a new contract:

exception: `apps/web/app/(authenticated)/stories/[id]/page.tsx` because the draft editor import path moved.
exception: `apps/web/app/(authenticated)/stories/[id]/preview/page.tsx` because the opening preview import path moved.
exception: `apps/web/app/(authenticated)/stories/new/page.tsx` because the launch form import path moved.
exception: `apps/web/app/(authenticated)/stories/page.tsx` because the library list import paths moved.
exception: `apps/web/app/README.md` because the route table names the new feature paths.
exception: `apps/web/src/features/platform-entry/platform-entry-journey.test.tsx` because it imports a moved stories module.
exception: `apps/web/src/features/play/README.md` because the play navigation map was refreshed.
exception: `apps/web/src/features/play/view.tsx` because PlayScene render helpers were named in place.
exception: `apps/web/src/features/stories/README.md` because the question-to-file map was rewritten.
exception: `apps/web/src/features/stories/drafts/draft-content.ts` because the flat file moved into drafts.
exception: `apps/web/src/features/stories/drafts/draft-editor.test.tsx` because the co-located test moved into drafts.
exception: `apps/web/src/features/stories/drafts/draft-editor.tsx` because the flat file moved into drafts.
exception: `apps/web/src/features/stories/drafts/storyteller-select.tsx` because the flat file moved into drafts.
exception: `apps/web/src/features/stories/drafts/use-draft-save.ts` because the flat file moved into drafts.
exception: `apps/web/src/features/stories/launch/story-launch-form.test.tsx` because the co-located test moved into launch.
exception: `apps/web/src/features/stories/launch/story-launch-form.tsx` because the flat file moved into launch.
exception: `apps/web/src/features/stories/launch/story-launch-status.tsx` because the flat file moved into launch.
exception: `apps/web/src/features/stories/launch/use-story-launch.test.tsx` because the co-located test moved into launch.
exception: `apps/web/src/features/stories/launch/use-story-launch.ts` because the flat file moved into launch.
exception: `apps/web/src/features/stories/library/draft-list.test.tsx` because the co-located test moved into library.
exception: `apps/web/src/features/stories/library/draft-list.tsx` because the flat file moved into library.
exception: `apps/web/src/features/stories/library/live-story-list.test.tsx` because the co-located test moved into library.
exception: `apps/web/src/features/stories/library/live-story-list.tsx` because the flat file moved into library.
exception: `apps/web/src/features/stories/library/stories-home-actions.test.tsx` because the co-located test moved into library.
exception: `apps/web/src/features/stories/library/stories-home-actions.tsx` because the flat file moved into library.
exception: `apps/web/src/features/stories/opening/opening-preview.test.tsx` because the co-located test moved into opening.
exception: `apps/web/src/features/stories/opening/opening-preview.tsx` because the flat file moved into opening.
exception: `apps/web/src/features/stories/opening/use-opening-generate.ts` because the flat file moved into opening.
exception: `apps/web/src/features/stories/opening/use-start-story.ts` because the flat file moved into opening.
exception: `apps/web/src/features/ux-evidence/ux-evidence.test.tsx` because it imports a moved stories module.
exception: `apps/web/src/stories/design-system-matrix.stories.tsx` because Storybook imports follow the move.
exception: `apps/web/src/stories/list-states.stories.tsx` because Storybook imports follow the move.
exception: `apps/web/src/stories/platform-entry.stories.tsx` because Storybook imports follow the move.
exception: `apps/web/src/stories/presenters/draft-state-panel.tsx` because the presenter import follows the move.
exception: `apps/web/src/stories/stories-library.stories.tsx` because Storybook imports follow the move.
exception: `apps/web/src/stories/ux-evidence.stories.tsx` because Storybook imports follow the move.

## Observed source

`apps/web/src/features/stories` contains 13 **flat direct production source files** mixing draft editing, library lists, opening preview and Launch. Contrastingly `features/play` already uses useful `api/`, `model/`, `presentation/`, `ui/` groups, but retains several top-level cross-cutting hooks and a 328-line `view.tsx`. Many names do not immediately disclose whether a file is a query, command, presentation or local draft editor. `apps/web/app` is already relatively small and is not a reason to rewrite Next.js routing.

## Selected target, balanced for human and agent navigation

```text
apps/web/src/features/stories/
  README.md                      # Start here: library / draft / preview / launch user journey
  library/
    live-story-list.tsx
    draft-list.tsx
    stories-home-actions.tsx
  drafts/
    draft-content.ts
    draft-editor.tsx
    use-draft-save.ts
    storyteller-select.tsx
  opening/
    opening-preview.tsx
    use-opening-generate.ts
    use-start-story.ts
  launch/
    story-launch-form.tsx
    story-launch-status.tsx
    use-story-launch.ts
  stories-library.css            # existing intentional shared stylesheet, no CSS rewrite
  story-launch.css
apps/web/src/features/play/
  README.md                      # keep existing api/model/presentation/ui grammar
  view.tsx                       # scene composition, ideally shorter without new state store
  model/, api/, presentation/, ui/ (keep)
  [existing co-located command and recovery hooks if cohesive]
```

**Avoid 13 new index.ts barrels or per-component folders**: users and coding agents should find a screen in two opens. Move only cohesive flat Stories feature files into four domains and update the exact consumers in `app/(authenticated)/stories/**`, Storybook `src/stories/**`, relevant existing tests and cross-feature imports. Preserve selected direct exports or add one small compatibility shim only where an actual external importer cannot be migrated safely.

**Play improvement is *selective***: the existing play folder structure is good. Extract only genuinely separable presentation composition from `view.tsx` when it improves readable top-level flow, leaving TanStack Query/invalidation, mutation retry-zero, frozen operation intents, SSE→GET, sessionStorage recovery and offer-path state machine untouched. Prefer an explicit `PlayScene` high-level render order with 4–8 named JSX sections, not a redesign into hooks/components that must all be read together. No duplicated fetching or second Query source of truth.

**Pattern law:** Route page/server boundary owns auth/prefetch/HydrationBoundary; feature hooks own client Query and commands; presentational components never call command HTTP directly; pure model/presentation functions don't import React or auth clients. Schema parsing stays at actual network/user input boundaries, no gratuitous `.safeParse` in every leaf. All IDs, expected revisions, pending recovery and real-time statuses unchanged. Storybook and test fixtures follow moved import paths but no snapshots regenerated merely for folder cosmetics.

**Exclusive writes:** `apps/web/src/features/stories/**`, `apps/web/src/features/play/{view.tsx,README.md}` plus at most one sibling presentation component and required existing importer/test import adjustments in `apps/web/app/(authenticated)/stories/**`, `apps/web/src/stories/**`, and relevant existing tests. Do not modify `apps/web/app/(authenticated)/terminal/connect/**` (CL01), API/DB/GA/Worker, Contracts, shared Web auth/session, global package manifests or lockfiles. No new workspace package.

**Done:** the path from Story library → Draft/Opening → Launch → Play has a readable source map and consistent HTTP/query/presentation boundaries; existing Play and Launch tests pass with preserved behavior; no accidental new hydration, auto-POST, stale revision, SSE coupling or owner disclosure. A moved file is not counted as extra functionality.

[Source and import map](SOURCE-MAP.md) · [Composer route](TASKS.md) · [acceptance](PROOF.md).


**Execution-wave coordination:** [HR01–HR03 post-CL01/WR11 wave](../../../../undertakings/storyteller-workshop/NEXT-WAVE.md). This packet was promoted from backlog for the next execution window, not retrospectively implemented. Revalidate against the actual post-predecessor undertaking HEAD before starting a linked worktree.
