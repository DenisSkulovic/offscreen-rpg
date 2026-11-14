# Core Admin first-wave technical details | no delegated implementation choices

**Status:** Chosen implementation-level architecture for the **read-only foundation only**, 2026-11-14. Pairs with [core V1 wire contracts](core-v1-contracts.md) and [staff access](staff-identity-and-policy.md). Authoritative product: [accepted scope](../product-acceptance-and-scope.md). These decisions make proposed packets narrowly implementable once the owner authorizes code. **Recheck the actual Better Auth version and branch state before coding.**

## 1. Staff authentication adapter for the first safe foundation

**Choose to reuse Better Auth as human authentication proof, but not as Admin authorization.** Do not introduce a second SSO vendor or separate auth microservice for the first read-only implementation. The existing Better Auth session identifies the human. A distinct **Admin staff principal** and separate **Admin-purpose session** authorize entry.

Exact initial flow:
1. Operator signs in through existing Better Auth. Player session alone cannot reach Admin resources.
2. A staff principal exists only after explicit, out-of-band bootstrap or later governed invitation/acceptance. Link it by stable authenticated `user.id`, **never email, domain or OAuth handle alone**.
3. `POST /api/admin/session/enter` checks the current Better Auth session and staff principal; it mints a cryptographically random, >=256-bit opaque Admin token, stores only a cryptographic digest, binds it to the current authenticated session and staff principal, and responds with an HttpOnly Admin-purpose cookie. Login/entry is audited.
4. Every Admin API request and private `/control` SSR read checks the still-valid original auth session, Admin token digest, session purpose, staff status, expiry/idle window, access epoch and current policy. API authorization is never inferred from cookie presence.
5. Logout/revocation deletes/invalidates the Admin session and increments the relevant revocation marker. An expired/changed assignment cannot continue authorizing open browser tabs.

**Selected initial session envelope:** absolute life **up to 8 hours**, idle limit **30 minutes** and immediate revocation on staff suspension/epoch change. Allow deployment-specific stricter values; never silently extend to the player's existing 7-day session. Sensitive future operations require additional step-up and an approved stronger assurance mechanism. **Production launch of privileged hosted operations is blocked until strong MFA/assurance is proven.**

**Cookie:** same-origin `__Host-offscreen-admin` in HTTPS deployments (`Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, no Domain). The explicit Path=/ permits `/control` SSR to see the cookie. A deliberately named **localhost-only** non-Secure dev cookie may be used in disposable environments; reject that fallback under a non-loopback production origin. Never persist the raw Admin token in DB or localStorage.

**CSRF:** require the expected trusted Origin/anti-CSRF policy for state-changing staff endpoints, plus the existing API request constraints; do not treat `SameSite` alone as sufficient. Do not let a Next Server Action become an alternate unguarded mutation path.

**No implicit staff invite endpoint at bootstrap:** a deliberate CLI/provisioning step with explicit authenticated subject ID, intended environment, narrow initial package and durable bootstrap audit reference. It is idempotent/controlled, not auto-run at startup or exposed on a public page. No email allowlist that silently grants staff on login.

## 2. First-wave persistence responsibilities

Use additive Drizzle schema/migration naming consistent with `packages/db/src/schema/*`; do not repurpose Better Auth's `user`, `session`, `account` or existing game tables as a role store.

| Logical record | Essential V1 meaning | Safety requirement |
| --- | --- | --- |
| `admin_staff_principal` | Stable staff ID linked to verified auth user subject, status, epoch | Unique link, explicit active/inactive, no role inferred from email |
| `admin_staff_session` | Opaque-token digest, staff+underlying auth session link, expiry, idle/revocation, purpose | Fast invalidation, no plaintext token persistence, bounded lifetime |
| `admin_capability_assignment` | Approved package/version and intact resource scope/conditions/expiry/provenance | No arbitrary policy strings/wildcards from users |
| `admin_audit_event` | Append-only staff/bootstrap/session/privilege and sensitive-operation facts | No secrets/private narratives, immutable from ordinary app roles |
| `admin_case` and assignment/link records | Only in later case-specific Change | Case assignment cannot manufacture sensitive privilege |

Exact SQL column data types/foreign key deletion behavior are implemented under owning Changes, but must preserve **no cascade deletion of audit evidence**, stable actor provenance and DB uniqueness for active session/assignment identity. Protected status may be revoked rather than hard deleted.

**Versioned capability packages are defined in source and validated by a closed registry in V1.** Assignments refer to package identifiers+versions and their **bounded scopes**. No user-supplied executable policy expression, SQL predicate or arbitrary `can*` flag.

## 3. One security owner and one read boundary

- API Nest Admin actor resolver handles cookie, underlying auth proof, staff principal and security context. It is independently tested and reused by every Admin controller.
- `@offscreen/application/admin/access` owns a pure, typed **complete-grant matcher** plus server resource-condition adapters. No controller can decide "this user is support, therefore allow" by string comparison.
- **Every read** checks action/resource/sensitivity before querying and again before returning restricted relationships. A scoped DB query and DTO allowlist are both required.
- Support case assignment/role combination cannot by itself authorize a protected customer's narrative read. At most it can satisfy a narrowly selected summary-grant condition when the assignment itself was authorized.
- Existing `createStoryApplication(...).read({ownerId})` remains player-only. Admin must not borrow its interface with a synthetic `ownerId`. New Admin projection reads query the owned source with independent staff policy and return a new sanitized DTO.

## 4. Minimal UI and API integration

- `/control` server route group with a **dedicated Admin actor reader**, using Nest `/api/admin/me`, no `requireViewer` as permission check.
- First enabled user-visible surface can be a scoped player-ref finder plus permission-safe summary; do not build ten dummy workspaces.
- Use React/Next selected Query and SSR stack. Client key begins `['admin', staffPrincipalId, accessEpoch, ...]`; no shared player query state or raw cookie in JavaScript.
- Raw/unknown billing remains `unsupported` where no commercial source exists; current `story.ownerId` is shown only as `legacy-owner` relation.
- API errors use [core V1 contract](core-v1-contracts.md), not raw Nest errors or user-row 500s.
- Admin reads trigger **no gameplay progression, seen-marker update, generator dispatch or provider spending**.

## 5. First-packet technical proof target

AD01 (staff identity/session/bootstrap) must prove real cookie session rejection for nonstaff/player-only, credential binding, revocation, no autoboostrap and auditable creation under a disposable DB. AD02 (policy) must prove intact-grant composition and scoped denial before any player API is exposed. AD03 (summary) must prove strict no-leak DTOs. Only then does AD04 provide the staff frontend shell.

The next implemented packet must use the current repository source, not assume this 2026-11-14 branch includes ongoing Cursor work. **No separate deployment, paid provider, production DB migration or real staff account is created by this document.**
