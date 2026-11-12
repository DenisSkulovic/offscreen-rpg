# Change W05: TanStack Query pending-state refetch, visibility and fallback

**State: Specified / Proposed.** Architecture and library choices are **DECIDED by the owner-authorized [React/Next target](../../engineering/targets/react-next.md)**. This packet remains **unselected for code execution** until the owner instructs Cursor to perform it. **Source baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source inspection only; recheck current branch/worktree at execution).

**Dependencies:** W15 W03 W04; groundwork for SSE client W17.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F3 F4 F6 F9**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G18 G27 G30**.

## Code-bearing outcome and ownership

**Outcome:** TanStack Query pending-state refetch, visibility and fallback.  
**Source starting points:** `apps/web/src/features/play/view.tsx`; `src/lib/story-transport.ts`; selected Query options; Chamber/preview polling (comparison only).

## Binding implementation design

Replace manual Play `useEffect` timer loops with **TanStack Query `refetchInterval`/`enabled` and abortable `queryFn`**. Pending/unresolved story uses **2-second foreground GET** before SSE rollout; settled story stops background polling. Hidden tab suspends periodic reads; focus/reconnect triggers one authoritative Query invalidation/read. Use 5s snapshot `staleTime`, one bounded transient GET retry, explicit offline/stale-state status and backoff; do not create a timer per child. Feed all reads through W03 domain gate and dedupe Query key. When W17 activates SSE, change primary pending refresh to event-driven + 30s safety poll with 2s fallback only on broken stream.

## Bounded implementation sequence

1. Remove ad hoc Play polling effect after Query migration; encode pending predicate and client visibility/reconnect behavior in Query options/feature subscription.
2. Explicitly distinguish background read failures from command failure; provide accessible 'last update failed, refresh' control.
3. Test hidden/visible, Strict Mode, repeated 503, overlapping GET, A→B and settlement; hand W17 clear integration seam.

## Falsifiable acceptance

- **Normal scenario:** Unresolved Play updates via one foreground GET loop; settled status halts polls; focus resumes current data without second command.
- **Adversarial negative scenario:** No duplicate timers, stale story overwrite, silent 503 infinite loop, mutation dispatch from GET or permanent 'fresh' label while offline.
- **Verification/evidence:** Fake clock/visibility React+MSW tests, instrumented request counts and selected browser recovery observation.
- **Explicit exclusions:** No custom cache/store, SSE backend (W16), global event system, visual redesign.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
