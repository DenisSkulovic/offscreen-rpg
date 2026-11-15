# AD08 support case anchors evidence | 2026-11-14

**Change:** [AD08](../../../changes/archive/2026-11/admin/2026-11-14--admin-support-case-anchors/CHANGE.md). Provider spend: none. Disposable DB only.

## Commands run

- `pnpm --filter @offscreen/application exec node --test test/admin-cases.test.mjs` → 1/1 pass.
- `pnpm test:focus admin-cases` → 1/1 pass.

## Behaviors proved

| Case | Result |
| --- | --- |
| Idempotent case create with permitted player link | 200; same id on replay |
| Foreign player link without player scope | 404 |
| `support-lead` assign | status `assigned` |
| Assigned case does not unlock foreign Player 360 | 404 |
| Migration `0005_ad08_admin_cases` | applied on disposable DB |

## Not claimed / residual

- Playwright `/control` SSR covered by AD04 residual suite `admin-control-ssr` (cleared 2026-11-14).
- No helpdesk/email, Trust evidence, or free-text narrative notes.
- Case queue UI is present on `/control` when `support` family is active; not separately Vitest-covered in this packet.
