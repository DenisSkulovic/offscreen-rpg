# AD06 technical usage exposure evidence | 2026-11-14

**Change:** [AD06](../../../changes/archive/2026-11/admin/2026-11-14--admin-usage-exposure/CHANGE.md). Provider spend: none. Disposable DB only.

## Commands run

- `pnpm --filter @offscreen/application exec node --test test/admin-usage.test.mjs test/admin-policy.test.mjs` → 9/9 pass.
- `pnpm --filter @offscreen/web exec vitest run src/features/admin/usage-lookup.test.tsx` → 1/1 pass.
- `pnpm test:focus admin-usage` → 1/1 pass.

## Behaviors proved

| Case | Result |
| --- | --- |
| `admin-reader` alone on usage status | 404 |
| `usage-observer` + `accountIds` scope | 200; reserved/dispatched microusd; commercial `unsupported` |
| Foreign funding account | 404 |
| Empty/unknown allocation projection | `costAuthority: unknown` (not free-tier / not invented settled 0) |
| Control usage lookup UI | Vitest shows technical exposure; no “Free tier” / “paid turns” |

## Not claimed / residual

- Playwright `/control` SSR covered by AD04 residual suite `admin-control-ssr` (cleared 2026-11-14).
- `platform.spend.read` path exists in Nest gate; not separately seeded in this suite.
- No commercial subscription ledger (explicitly unsupported).
