# AD01 | Explicit staff principal, Admin session and bootstrap audit

**State: Done (2026-11-14).** Code-bearing security foundation. **Depends on:** none. **Parent:** [Admin program](../../../../../../docs/programs/admin/implementation-program.md). Evidence: [ad01-staff-session](../../../../../../docs/programs/admin/evidence/ad01-staff-session-2026-11-14.md).

## Cursor first-screen

> **Outcome:** verified signed-in staff can deliberately enter and exit a short-lived, revocable Admin-purpose session; nonstaff and player-only cookies cannot. A one-time out-of-band bootstrap creates the first minimally scoped staff principal and audit record without public self-registration.
>
> **Authority:** [accepted staff-only product](../../../../../../docs/programs/admin/product-acceptance-and-scope.md); [identity/session target](../../../../../../docs/programs/admin/technical/staff-identity-and-policy.md), [chosen V1 adapter](../../../../../../docs/programs/admin/technical/first-wave-design-decisions.md) and [V1 endpoints](../../../../../../docs/programs/admin/technical/core-v1-contracts.md).
>
> **Start/revalidate:** `apps/api/src/modules/auth/{auth,identity}.ts`, `apps/api/src/app.ts`, `packages/db/src/schema/auth.ts`, `packages/db/src/migrate.ts`, migrations and [integration auth tests](../../../../../../tools/api-integration/README.md). Existing `/api/me` is player identity only.
>
> **Do not:** install Admin UI, add `user.isAdmin`, expose `POST /create-root`, invite everyone with a particular email, call a paid provider, deploy or change game access.

## Landed code delta

1. Additive `admin_staff_principal`, `admin_staff_session`, inert `admin_capability_assignment`, `admin_audit_event` + migration `0004_ad01_admin_staff_session`.
2. `@offscreen/application/admin` session enter/resolve/exit + CLI bootstrap; digest-only tokens; 8h/30m TTL; ≤15m login freshness via Better Auth `session.createdAt`.
3. Nest `POST /api/admin/session/enter`, `GET /api/admin/me`, `POST /api/admin/session/exit` with Origin CSRF (existing `/api` middleware), loopback `offscreen-admin` / HTTPS `__Host-offscreen-admin`.
4. `scripts/repo-tools/admin-bootstrap-staff.mjs` (local|staging only; production rejected).
5. Pure cookie/token tests + disposable `pnpm test:focus -- admin-session` (API-only, no Next).

## Normal and discriminating negative

**Normal:** bootstrapped staff enters Admin, gets `AdminSelfV1` with empty `workspaceFamilies`; exit revokes Admin cookie only; audits record bootstrap/enter/exit.

**Negative:** anonymous 401; nonstaff enter 403 `not_authorized`; player cookie alone 403 `staff_session_required`; cross-origin enter 403; forged Admin cookie 403; inert assignment never grants customer reads (no read endpoints yet).

## Excluded / next

No Admin UI, no grant evaluator (AD02), no MFA claim, no production bootstrap. Provider spend: none. Next dependency: **AD02** grant policy/guard.
