# AD02 | Scoped capability packages and deny-by-default Admin policy

**State: Done (2026-11-14).** Code-bearing authorization. **Depends on:** AD01 Done. **Parent:** [Admin program](../../../../../../docs/programs/admin/implementation-program.md). Evidence: [ad02-grant-policy](../../../../../../docs/programs/admin/evidence/ad02-grant-policy-2026-11-14.md).

## Cursor first-screen

> **Outcome:** every Admin request evaluates one complete scoped grant against a typed resource/action and current staff actor; overlapping job packages do not create cross-product permissions or allow a player into Admin.
>
> **Authority:** [bounded policy](../../../../../../docs/programs/admin/technical/staff-identity-and-policy.md#2-capability-registry-and-bounded-grants), [accepted default safeguards](../../../../../../docs/programs/admin/product-acceptance-and-scope.md), [case-assignment abuse](../../../../../../docs/programs/admin/product-adversarial-review.md#pr-01-case-ownership-becomes-privilege-escalation).
>
> **Start/revalidate:** AD01 modules, `apps/api/src/app.ts`, existing user ownership handling `apps/api/src/modules/stories/controller.ts` and `packages/application/src/stories/reads.ts`. No source owner should be imported just to bypass its player boundary.
>
> **Do not:** add generic IAM scripting, unrestricted `isAdmin`, role header from browser, legacy story owner spoofing, private narrative reads, admin mutations or unrelated UI.

## Landed code delta

1. Closed capability/package registry (`admin-reader`, `support-operator`, `engineering-observer`, `staff-access-steward`, `security-auditor` v1).
2. Pure `evaluateAdminAccess`: intact-grant union, env/scope/case-provenance gates; inert/revoked/expired never authorize.
3. Nest `requireCapability` deny-by-default; customer denials → privacy `404 not_found`. `POST /api/admin/access/check`, `GET /api/admin/staff/:id/access`, guard probe `GET /api/admin/players/:id/summary-probe`.
4. Bootstrap assignments now `active` with `environments[]` (AD02 gives package meaning).
5. Pure table tests + `pnpm test:focus -- admin-policy`.

## Normal and discriminating negative

**Normal:** scoped Reader allows named local player probe; self access inspect lists active packages; `/me` workspace families reflect active grants.

**Negative:** out-of-scope player → 404; production env mismatch deny; unknown capability deny; self-made case id without provenance deny; player-only cookie 403; nonstaff enter 403.

## Excluded / next

No AD03 Player 360 DTO, no invitation UI, no MFA. Provider spend: none. Next: **AD03**.
