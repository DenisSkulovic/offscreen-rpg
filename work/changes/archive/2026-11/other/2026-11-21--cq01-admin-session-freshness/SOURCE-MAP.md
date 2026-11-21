# CQ01 | inspected source / ownership

Baseline `c13d64ee`.
- `apps/api/src/modules/admin/controller.ts:AdminActorService.requireAuthProof` around lines 110–144: Better Auth `getSession`, accepts `Date | string`, maps to `AuthProof.sessionCreatedAt`; `AdminController.enter` passes that to the session store.
- `packages/application/src/admin/session.ts:createAdminSessions.enter` around lines 79–106: application-side 15-minute check; `ADMIN_LOGIN_FRESHNESS_MS` exported. Failure audits `admin.session.enter_denied` before returning `AdminSessionError('step_up_required')`; must remain fail-closed even when caller bypasses HTTP.
- `tools/api-integration/test/admin-session.integration.ts`: staff/nonstaff, cookies and response status; setup `withApiOnlyAuth` and bootstrapped staff fixture. `packages/application/test/admin-session.test.mjs` currently tests cookie and constant but **not** freshness validity.
- `apps/api/src/app.ts` injects `AdminActorService` and `createAdminSessions`; no change required.
- `docs/technical/platform/identities-and-access.md` session authority, `docs/technical/admin/topology-and-authorization.md` staff gate authority.

**Trust route:** Better Auth stored session timestamp → API conversion → application `enter` freshness gate → staff principal selection → staff token mint. Reject before selecting principal/minting token; preserve denial audit.
