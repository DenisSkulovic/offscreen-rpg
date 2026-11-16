# AD03 player safe reads evidence | 2026-11-14

**Change:** [AD03](../../../../../../work/changes/archive/2026-11/admin/2026-11-14--admin-player-safe-reads/CHANGE.md). Provider spend: none. Disposable DB: `offscreen_auth_test`.

## Commands run

- Pure: `admin-player-reads.test.mjs` (+ policy suite) → pass.
- `pnpm test:focus -- admin-player-reads` → pass.
- `pnpm test:focus -- admin-policy` → pass (updated for real player routes).

## Behaviors proved

| Case | Result |
| --- | --- |
| Exact-ref search for scoped player | 200, one hit, no email |
| Exact-ref search for out-of-scope known player | 200, empty items |
| `GET /players/:id` allowed | envelope with `status=unknown`, commercial `unsupported`, legacy count 1 |
| Forbidden / missing detail | 404 `not_found` |
| Anonymous search | 401 |
| Wire JSON | no email, no access_token, no story `source` text |

## Not claimed

Campaign metadata pages, Admin UI, email lookup, billing tiers.
