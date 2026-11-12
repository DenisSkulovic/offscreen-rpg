# Change W04: TanStack useMutation with frozen Play intent and durable recovery

**State: Specified / Proposed.** Architecture and library choices are **DECIDED by the owner-authorized [React/Next target](../../engineering/targets/react-next.md)**. This packet remains **unselected for code execution** until the owner instructs Cursor to perform it. **Source baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source inspection only; recheck current branch/worktree at execution).

**Dependencies:** W15 + W03 + W19; do not parallel-edit the same Play controller as W05/W06.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F3 F5 F11**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G12 G16 G31**.

## Code-bearing outcome and ownership

**Outcome:** TanStack useMutation with frozen Play intent and durable recovery.  
**Source starting points:** `apps/web/src/features/play/view.tsx`; `use-campaign-command.ts`; `resolution-recovery.tsx`; `src/lib/story-transport.ts`; Nest stories controller (read).

## Binding implementation design

Use **`useMutation`** for HTTP transport with `retry: 0` and `networkMode: 'always'`. Outside the mutation's ephemeral status, maintain explicit typed **intent reducer**: idle -> submitting -> admitted/pending or confirmed immediate -> conflict, uncertain or terminal. Capture viewer/story/kind, UUID, endpoint, expected revision and immutable typed body once per user intent. Repeating a request uses the **exact same envelope**, no generic `send(anything)` action with unknown body. After 202, Query snapshot/receipt drives visible pending, never 'published'; 200 interpreted per endpoint. Store minimal safe resolution envelope + reference with viewer-scoped short-lived sessionStorage; on reload **GET W19 receipt and story first**, then allow *user-triggered* safe same-payload retry only. Invalid input/401/404/409/429/timeout have separate correct transitions. After confirmed status, guarded `setQueryData`/`invalidateQueries` update story/list/history, never optimistic rolls or narration.

## Bounded implementation sequence

1. Define endpoint-specific typed builders, discriminated reducer, error taxonomy and minimal recovery store.
2. Migrate ordinary Play choice/resolution/control/allowed recovery; connect Query story selectors and receipt endpoint.
3. Migrate campaign actions/settings dispatch where identical invariants exist; keep domain-specific 200/202/409 statuses.
4. Test rapid duplicate clicks, timeout after backend commit, changed UI values before retry, reload/receipt, session expiry, wrong resource and no background mutation replay.

## Falsifiable acceptance

- **Normal scenario:** One deliberate choice becomes one frozen operation ID/payload; 202 is accepted and later Query refresh publishes authoritative result once.
- **Adversarial negative scenario:** Loss of HTTP ACK and reload never create a second effect or new UUID; changed body under same UUID is rejected; GET/visibility/SSE cannot dispatch a paid operation; 409 does not overwrite a newer view.
- **Verification/evidence:** RTL/MSW deterministic command/race tests and focused real backend idempotency with disposable test DB if explicitly permitted.
- **Explicit exclusions:** No optimistic mechanics, no automatic Query offline mutation resume, no generic command bus, no extra gameplay.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
