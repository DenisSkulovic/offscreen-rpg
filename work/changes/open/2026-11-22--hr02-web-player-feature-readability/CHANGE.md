# HR02 | Human-readable Next.js player features, not another state architecture

**Profile:** STRUCTURAL/REFACTOR · **State: READY WITH EXPLICIT LIMITS on inspected snapshot `d3ba2917`, but commission only when no active Web edit to the same feature paths.** Target `undertaking/storyteller-workshop`. No new product feature or contract.

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


**Execution-wave coordination:** [HR01–HR03 post-CL01/WR11 wave](../../../undertakings/storyteller-workshop/NEXT-WAVE.md). This packet was promoted from backlog for the next execution window, not retrospectively implemented. Revalidate against the actual post-predecessor undertaking HEAD before starting a linked worktree.
