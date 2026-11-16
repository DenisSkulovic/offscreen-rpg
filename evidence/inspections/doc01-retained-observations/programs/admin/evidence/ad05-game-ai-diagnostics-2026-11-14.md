# AD05 campaign / AI diagnostics evidence | 2026-11-14

**Change:** [AD05](../../../../../../work/changes/archive/2026-11/admin/2026-11-14--admin-game-ai-diagnostics/CHANGE.md). Provider spend: none. Disposable DB only (`offscreen_auth_test`).

## Commands run

- `pnpm --filter @offscreen/application exec node --test test/admin-diagnostics.test.mjs` → 2/2 pass.
- `pnpm --filter @offscreen/web exec vitest run src/features/admin/player-lookup.test.tsx src/features/admin/safe-control-destination.test.ts` → 5/5 pass.
- `pnpm test:focus admin-diagnostics` → 1/1 pass (Nest + disposable DB).

## Behaviors proved

| Case | Result |
| --- | --- |
| Legacy-owned campaign page for scoped player | 200; `relation: legacy-owner`; no `source`/premise bytes |
| Foreign owner campaign operations | 404 (`not_found`) under playerIds scope |
| Redacted operation list/detail | generation state + safeFailureCode; no `input`/`prompt`/`PRIVATE` |
| Succeeded-without-publication projection | unit: publication `pending`, not published |
| Unsafe kind/failure | unit: collapsed to `other` / `failed` |
| Control Player 360 drilldown | Vitest: campaign → operation → detail; no prompt leak |

## Not claimed / residual

- Playwright `/control` SSR covered by AD04 residual suite `admin-control-ssr` (cleared 2026-11-14).
- Exhaustive historical operation coverage (`sourceCoverage: since-enabled`).
- Named `campaignIds`-only grants without player summary (path exists in assert; not separately integration-seeded).
