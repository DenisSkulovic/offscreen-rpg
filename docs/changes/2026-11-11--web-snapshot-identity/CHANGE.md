# Change W03: Monotonic, viewer-scoped story snapshots in TanStack Query

> **Cursor first look (current source ≠ selected target):** [Play state map](../../../apps/web/src/features/play/README.md) → the **one** owning symbol. **Primary contract:** [F4](../../engineering/targets/react-next.md#f4-versioned-snapshot-reconciliation).  
> **Pre-investigated trap:** Existing `preferNewerSnapshot` compares version, not user/story identity; no second canonical Query store.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done.** Architecture and library choices are **DECIDED by the owner-authorized [React/Next target](../../engineering/targets/react-next.md)**. Implemented after W15 on **2026-11-12**. Verified with pure reconcile negatives + `pnpm test:fast` + typecheck.

**Dependencies:** W01 + W15; prerequisite of W04 W05 W10 W12 W17.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F3 F4 F10**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G13 G17 G27**.

## Code-bearing outcome and ownership

**Outcome:** Monotonic, viewer-scoped story snapshots in TanStack Query.  
**Source starting points:** `apps/web/src/lib/story-transport.ts`; `apps/web/src/features/play/view.tsx`; server `app/play/[id]/page.tsx`; `packages/contracts/src/stories.ts` (read).

## Binding implementation design

**Remove the competing `useState(initialStory)` canonical story store.** The Query entry keyed `['viewer', viewerId, 'story', storyId, 'snapshot']` is the only remote story projection. Make a **pure domain reconciliation function** that checks viewer/story identity and `viewVersion`, uses `resolution.version` when needed, and treats equal-version dynamic projections by latest eligible request epoch, not response arrival timestamp. Wire via query `structuralSharing`/guarded `setQueryData` so poll, command response, SSE, SSR hydration and manual GET cannot regress. App Router entity transition must show loading/previous story *clearly labeled* rather than A as B; no prior viewer content may be shown as the next viewer.

## Bounded implementation sequence

1. Implement/verify pure resource-version policy and request-epoch tie semantics including null resolution and optional version.
2. Refactor Play to use `useQuery` and derived selectors, preserve presentational props and command callbacks; guard initial hydration/soft navigation transitions.
3. Make one narrow update function the only allowed Query write for story snapshots; adapt command/poll later via defined API.
4. Remove old local story setState path and add A→B, v14→v13, wrong story high-version, same-version projection and auth switch tests.

## Falsifiable acceptance

- **Normal scenario:** Story SSR, browser Query and subsequent GET show the highest valid authoritative view version with current permitted resolution details.
- **Adversarial negative scenario:** Late old A/old viewer/wrong story with higher version cannot enter current cache or appear under B before B loads; Query dataUpdatedAt is not accepted as gameplay freshness.
- **Verification/evidence:** Pure selection tests, React controlled async/soft navigation tests and selected browser identity test when safe.
- **Explicit exclusions:** No global state/store, game version semantics invention, realtime backend implementation, visual UI redesign.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
