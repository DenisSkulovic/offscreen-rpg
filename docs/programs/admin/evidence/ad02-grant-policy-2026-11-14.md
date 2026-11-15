# AD02 grant policy evidence | 2026-11-14

**Change:** [AD02](../../../changes/archive/2026-11/admin/2026-11-14--admin-grant-policy/CHANGE.md). Provider spend: none. Disposable DB: `offscreen_auth_test`.

## Commands run

- `pnpm --filter @offscreen/application exec node --test test/admin-policy.test.mjs` (+ cookie suite) → 11/11 pass.
- `pnpm test:focus -- admin-policy` → pass.
- `pnpm test:focus -- admin-session` → pass (bootstrap now `active`).

## Behaviors proved

| Case | Result |
| --- | --- |
| Named in-scope `player.summary.read` probe | 200 allow |
| Out-of-scope player probe | 404 `not_found` (no existence leak) |
| `environment=production` vs local scope | access/check `deny` / `environment_mismatch` |
| Unknown capability | `deny` / `unknown_capability` |
| Compound packages | intact union; no Cartesian widen |
| Case gate without provenance | `case_assignment_unproven` |
| Inert assignment | never allows |
| Player-only cookie on probe | 403 |
| Self `GET …/staff/:id/access` | lists active `admin-reader` |

## Not claimed

Real Player 360 DTO (AD03), Admin UI, hosted MFA, production bootstrap.
