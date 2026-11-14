# AD01 | Explicit staff principal, Admin session and bootstrap audit

**State: Proposed, NOT Ready.** Code-bearing security foundation. **No implementation authorized by this design branch.** **Depends on:** none; first source/Better Auth version revalidation. **Parent:** [Admin program](../../admin/implementation-program.md).

## Cursor first-screen

> **Outcome:** verified signed-in staff can deliberately enter and exit a short-lived, revocable Admin-purpose session; nonstaff and player-only cookies cannot. A one-time out-of-band bootstrap creates the first minimally scoped staff principal and audit record without public self-registration.
>
> **Authority:** [accepted staff-only product](../../admin/product-acceptance-and-scope.md); [identity/session target](../../admin/technical/staff-identity-and-policy.md), [chosen V1 adapter](../../admin/technical/first-wave-design-decisions.md) and [V1 endpoints](../../admin/technical/core-v1-contracts.md).
>
> **Start/revalidate:** `apps/api/src/modules/auth/{auth,identity}.ts`, `apps/api/src/app.ts`, `packages/db/src/schema/auth.ts`, `packages/db/src/migrate.ts`, migrations and [integration auth tests](../../../tools/api-integration/README.md). Existing `/api/me` is player identity only.
>
> **Do not:** install Admin UI, add `user.isAdmin`, expose `POST /create-root`, invite everyone with a particular email, call a paid provider, deploy or change game access.

## Intended code delta

1. Add additive `admin_staff_principal`, `admin_staff_session` and minimal protected `admin_audit_event` tables/migration with uniqueness, indexes, status/epoch and non-cascading audit provenance. Keep Better Auth schema and story ownership intact.
2. Implement Admin actor resolver requiring an existing Better Auth login **plus** distinct high-entropy opaque, digest-stored Admin session, bound to underlying authenticated session, staff status and revocation epoch.
3. Implement typed `POST /api/admin/session/enter`, `GET /api/admin/me`, `POST /api/admin/session/exit` with appropriate Origin/CSRF, secure cookie and safe error response; **entry requires a verifiably fresh real login (≤15 minutes), not merely a refreshed seven-day session**. If fresh auth cannot be proven, deny/re-authenticate; no other Admin resource is yet exposed.
4. Implement explicit local operator CLI for first staff bootstrap by **verified auth subject ID**, environment, narrow starter package, no automatic startup grant; audit bootstrap/entry/logout/revocation.
5. Select the [bounded cookie/session settings](../../admin/technical/first-wave-design-decisions.md#1-staff-authentication-adapter-for-the-first-safe-foundation). In HTTPS use Secure HttpOnly `__Host-offscreen-admin`, SameSite Strict, Path=/; dev nonsecure fallback only on loopback. Check actual Better Auth APIs before coding.
6. Add pure and integration tests for session binding, expiry, revocation, no player privilege and no token exposure.

## Normal and discriminating negative

**Normal:** a deliberately bootstrapped active staff subject signs into Better Auth, enters Admin, obtains safe `AdminSelfV1`; logout revokes only Admin purpose and auditing captures the event.

**Negative:** ordinary player uses `/api/admin/me` or tries `session/enter`, user with matching email but no staff subject, stale epoch, expired/forged cookie, cross-origin mutation, terminated staff or repeated bootstrap. All fail closed; no private customer payload or Admin privilege is created.

**Proof:** provider-free tests of pure session context; **approved disposable** PostgreSQL/Nest auth integration demonstrating two distinct users, cookie/CSRF/epoch and recorded audit. A mocked auth unit alone does not prove session safety.

## Excluded / risk

No SSO provider change or production staff MFA claim; hosted real-user operator launch requires separately approved assurance/ops controls. No migration/deployment to non-disposable DB. `pnpm test:focus` resets disposable DB and requires explicit safe environment check.

**Ready gate:** owner selects AD01; Cursor revalidates Better Auth session interface, config and migrations at current main; confirms disposable DB and no concurrent auth/source modifications. **Return:** paths/diff, positive and negative test commands/results, security risk, database reset target, spend none, next AD02 dependency.
