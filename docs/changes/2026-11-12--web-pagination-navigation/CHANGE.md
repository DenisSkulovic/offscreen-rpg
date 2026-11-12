# Change W10: Viewer-scoped useInfiniteQuery for stories, drafts and chronology

> **Cursor first look (current source ≠ selected target):** [List owner map](../../../apps/web/src/features/stories/README.md) → the **one** owning symbol. **Primary contract:** [F12](../../engineering/targets/react-next.md#f12-list-history-and-navigation-consistency).  
> **Pre-investigated trap:** Story list uses UUID `before`, drafts opaque `cursor`, history numeric `before`; do not normalize them into one cursor type.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Specified / Proposed.** All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**; this packet is **not yet active or authorized for application changes**. **Audited source:** `470a5df069470bf758eb1a560c515846ce781637` (source-read only; revalidate current branch/worktree before execution). **Future executor:** Cursor, one selected packet at a time.

**Depends on:** W01 W02 W15; W03 for history viewer/resource identity.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F3 F11 F12**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G20 G27**.

## Code outcome and owners

**Measurable code/test/config change:** Viewer-scoped useInfiniteQuery for stories, drafts and chronology.  
**Start at:** `apps/web/src/features/stories/live-story-list.tsx`; `draft-list.tsx`; `apps/web/src/features/play/history.tsx`; `apps/web/app/stories/page.tsx`; `packages/contracts/src/stories.ts` and drafts contracts.

## Binding technical design

Replace hand-written `page/items/cursor/pending` stores with **`useInfiniteQuery`** keyed viewer+resource+filter. Implement correct per-endpoint `initialPageParam`, `getNextPageParam` and runtime Zod parse. Story list `before` is UUID; draft list opaque string `cursor`; chronology `before` is numeric. Render flattened pages with stable deterministic de-dupe/order and a clear exhausted state. Keep existing 'Load older' buttons, not infinite-scroll UX. On mutation invalidate appropriate lists; no page from prior viewer/story/route may enter the current query. On query key change cancel/ignore in-flight old request and show scoped placeholder until B resolves.

## Bounded implementation steps

1. Define typed key/`infiniteQueryOptions` for story list, draft list and history; prove cursor encoding and next-page semantics.
2. Migrate each reader to `useInfiniteQuery` and QueryClient cache rather than a separate useState mirror; preserve current visible list controls.
3. Add reversed page response, duplicate item, expired session, empty cursor and A→B history navigation tests.

## Acceptance and verification

- **Normal outcome:** Next page appends older entries exactly once and shows a usable end-of-list state; fresh Server Component prefetch hydrates first page with no redundant GET.
- **Discriminating negative case:** Wrong viewer/old story data cannot display on new route; duplicate cursor/items and rapid `fetchNextPage` cannot loop or erase previous pages.
- **Safe proof and evidence:** Pure cursor/query tests + RTL/MSW controlled page races, provider-free existing real Nest pagination tests when authorized.
- **Must preserve / exclude:** No GraphQL, new product filtering requirements, infinite-scroll layout or virtualized renderer without measured need.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
