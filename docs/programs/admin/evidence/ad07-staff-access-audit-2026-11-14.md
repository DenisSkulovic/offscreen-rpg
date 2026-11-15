# AD07 staff access / audit evidence | 2026-11-14

**Change:** [AD07](../../../changes/archive/2026-11/admin/2026-11-14--admin-staff-access-review/CHANGE.md). Provider spend: none. Disposable DB only.

## Commands run

- `pnpm --filter @offscreen/application exec node --test test/admin-audit.test.mjs` → 2/2 pass.
- `pnpm --filter @offscreen/web exec vitest run src/features/admin/governance-panel.test.tsx` → 1/1 pass.
- `pnpm test:focus admin-audit` → 1/1 pass.
- `pnpm test:focus admin-policy` → still green (staff access schema extended).

## Behaviors proved

| Case | Result |
| --- | --- |
| Self `GET /api/admin/staff/:id/access` | 200 with scope summary + provenanceKind; no raw player ids |
| Other staff without `staff.access.inspect` | 403 |
| Audit without `audit.events.read` | 403 |
| `security-auditor` package | 200 audit page; session kinds present; no narrative payload |
| Other staff access with auditor package | 200 |
| Nonstaff cookie | 403 |
| Unsafe audit kind / payload | unit projection drops kind; strips narrative |

## Not claimed / residual

- Playwright `/control` SSR covered by AD04 residual suite `admin-control-ssr` (cleared 2026-11-14).
- No staff invite / privilege mutation UI.
- Audit coverage `since-enabled` only.
