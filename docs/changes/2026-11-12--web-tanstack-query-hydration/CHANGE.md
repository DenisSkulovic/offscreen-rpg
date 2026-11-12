# Change W15: TanStack Query v5 foundation, authenticated SSR hydration and query keys

**State: Specified / Proposed.** Architecture and library choices are **DECIDED by the owner-authorized [React/Next target](../../engineering/targets/react-next.md)**. This packet remains **unselected for code execution** until the owner instructs Cursor to perform it. **Source baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source inspection only; recheck current branch/worktree at execution).

**Dependencies:** W01 + W02. **Required before W03–W12 feature migrations**.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F1 F2 F3 F4 F10 F11 F14**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G27 G16**.

## Code-bearing outcome and ownership

**Outcome:** TanStack Query v5 foundation, authenticated SSR hydration and query keys.  
**Source starting points:** `apps/web/app/(authenticated)/layout.tsx` (after W02), new scoped Query provider/client helpers, `apps/web/src/lib/story-transport.ts`, private SSR pages, `apps/web/package.json`.

## Binding implementation design

**Install @tanstack/react-query v5 and @tanstack/eslint-plugin-query.** One client QueryClient per authenticated browser session, one *new* server QueryClient per private SSR request, no server-global cache. Use `prefetchQuery`/`dehydrate`/`HydrationBoundary` for initial private story, drafts and lists. Server and browser query functions use **same validated DTO and key** with separate transport; keep the server-reader module `server-only`. Place Query provider only inside authenticated route group, not all public pages. Implement exact [selected target](../../engineering/targets/react-next.md#2-tanstack-query-architecture-exact-operating-contract): viewer ID key prefix, `staleTime` 5s story / 15s draft+list / 30s history / 300s catalogue, `gcTime` 5min, no persistence, GET transient retry at most once, mutation retry=0/networkMode=always. Ensure Query devtools if enabled are dev-only; do not ship private payloads through telemetry.

## Bounded implementation sequence

1. Install/lock stable compatible package versions, provider and request-scoped server/client Query helpers.
2. Add typed query keys/`queryOptions` templates for story, draft, list, preview, settings and Chamber; expose browser/server queryFns from proper runtime boundaries.
3. Convert one authorized private route end-to-end to SSR `HydrationBoundary` and `useQuery`, then establish repeatable pattern for subsequent migrations; do not mix redundant server-rendered mutable state with a second client Query view.
4. Add no-double-fetch, soft-navigation, session reset and SSR serialization tests, and wire TanStack ESLint in W13 if full lint rollout is best staged.

## Falsifiable acceptance

- **Normal scenario:** Initial authorized story HTML contains real scene, hydrates from prefetched Query without duplicate browser GET, Query cache has one viewer/story key.
- **Adversarial negative scenario:** Never share QueryClient across SSR requests/users; default `initialData` cannot block newer SSR snapshot; logout flushes browser Query + hard-navigation Router Cache; no session token appears in keys/hydrated payload.
- **Verification/evidence:** Web unit/SSR tests plus Next production build and authenticated HTML/network check; demonstrate cache state isolation in two separate request contexts.
- **Explicit exclusions:** No Redux/Zustand, Query persistence, global game state, experimental SSR helper, automatic mutational retries or UI redesign.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
