# AD01 staff session evidence | 2026-11-14

**Change:** [AD01](../../../../work/changes/archive/2026-11/admin/2026-11-14--admin-staff-session/CHANGE.md). Provider spend: none. Disposable DB: `offscreen_auth_test`.

## Commands run

- `pnpm --filter @offscreen/application exec node --test test/admin-session.test.mjs` → 3/3 pass (cookie mode, serialize/digest, freshness constant).
- `pnpm db:reset:test` then `DATABASE_TEST_URL=…/offscreen_auth_test node --test tools/api-integration/dist/test/admin-session.integration.js` → pass.
- Suite registered as `pnpm test:focus -- admin-session` (builds API path without requiring the current broken `@offscreen/web` production typecheck).

## Behaviors proved

| Case | Result |
| --- | --- |
| Anonymous `GET /api/admin/me` | 401 `unauthenticated` |
| Signed-in nonstaff `POST …/enter` | 403 `not_authorized` |
| CLI/bootstrap idempotent staff + inert `admin-reader` assignment | created then idempotent; assignment `status=inert` |
| Cross-origin enter | 403 (existing Origin gate) |
| Staff enter → Admin cookie → `GET /me` | 200 `AdminSelfV1`, `workspaceFamilies: []` |
| Player cookie alone on `/me` | 403 `staff_session_required` |
| Forged Admin cookie | 403 |
| Exit then reuse cookie | 403 |
| Audit kinds | `admin.bootstrap.created`, `enter_denied`, `enter`, `exit` |

## Not claimed

Grant evaluation, customer reads, Admin UI, hosted MFA, production staff bootstrap.
