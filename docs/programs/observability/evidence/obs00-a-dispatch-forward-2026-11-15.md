# OBS00-A | Worker dispatch forward (2026-11-15)

**Change:** [OBS00](../../../changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md) part A only  
**Provider spend:** zero. No network transport; mock underlying provider only.

## What landed

- `wrapApprovedWorkerProvider` preserves `(task, dispatch)` and forwards both unmodified.
- Worker still rejects mismatched `task.execution` vs approved `STORYTELLER_EXECUTION_JSON` before calling the provider.
- `readStorytellerWorkerOptions` does **not** supply `dispatchAuthority` (OBS00-B remains blocked).

## Proof

| Check | Result |
| --- | --- |
| Forward repair override ≠ task.request | pass |
| Mismatched execution fails closed before provider | pass |
| Live options omit dispatchAuthority | pass |
| Offline live flag → empty options | pass |

```text
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test test/obs00-dispatch-forward.test.mjs
```

## Still blocked (OBS00-B)

Independent current `dispatchAuthority` resolver is not wired. Paid sends remain denied until a separately authorized authority source exists. Do not hardcode captured task policy as current entitlement.
