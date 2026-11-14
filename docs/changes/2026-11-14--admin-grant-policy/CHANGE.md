# AD02 | Scoped capability packages and deny-by-default Admin policy

**State: Proposed, NOT Ready.** Code-bearing authorization. **Depends on:** AD01. **Parent:** [Admin program](../../admin/implementation-program.md).

## Cursor first-screen

> **Outcome:** every Admin request evaluates one complete scoped grant against a typed resource/action and current staff actor; overlapping job packages do not create cross-product permissions or allow a player into Admin.
>
> **Authority:** [bounded policy](../../admin/technical/staff-identity-and-policy.md#2-capability-registry-and-bounded-grants), [accepted default safeguards](../../admin/product-acceptance-and-scope.md), [case-assignment abuse](../../admin/product-adversarial-review.md#pr-01-case-ownership-becomes-privilege-escalation).
>
> **Start/revalidate:** AD01 modules, `apps/api/src/app.ts`, existing user ownership handling `apps/api/src/modules/stories/controller.ts` and `packages/application/src/stories/reads.ts`. No source owner should be imported just to bypass its player boundary.
>
> **Do not:** add generic IAM scripting, unrestricted `isAdmin`, role header from browser, legacy story owner spoofing, private narrative reads, admin mutations or unrelated UI.

## Intended code delta

1. Add closed typed capability/resource registry, stable package versions, complete scoped grant assignments with expiration/provenance. Package content is code-defined for V1; assignments are durable and revocable.
2. Implement pure policy evaluator: valid Admin actor + resource kind + requested operation + environment + exact scope/conditions + deny and assurance/approval gates; union of **intact** grants, not verb/scope Cartesian product.
3. Add Nest Admin guard/context that centrally denies by default for each new Admin endpoint. Resource existence and protected metadata cannot leak through denied lookups or policy failure responses.
4. Make case/assignment-based scope conditional on separately authorized assignment provenance. A fabricated self-assignment must not satisfy private/sensitive access.
5. Add Access Inspector internal decision model and safe result codes; no broad policy-introspection endpoint yet.
6. Tests for resource families, compound-role intersections, expiry/revocation and no scope elevation.

## Normal and discriminating negative

**Normal:** a staff Reader can inspect a named allowed player summary (once AD03 exists) and an Engineer Observer can inspect redacted operations where permitted; a staff user can hold both grants without losing their legitimate permissions.

**Negative:** case-scoped compensation grant plus global analytics read does **not** permit global compensation. Self-assigning a case cannot make the hidden player readable. Nonstaff, stale privilege epoch, unknown capability, environment mismatch and exported/hidden field access all deny.

**Proof:** pure table-driven policy cases and disposable DB/Nest access guard integration, including legitimate allowed request and forbidden guessed resource. Distinguish 401, safe 403 and privacy-preserving 404 without exposing hidden subject existence.

## Excluded / risk

No money-moving action, permissions-editing UI, full invitation system, external SSO policy or staff-hosted production approval.

**Ready gate:** AD01 Done and current staff DB/auth code inspected; owner selects this packet. No single helper should silently skip resource checks for a future Admin route. **Return:** actual tests/negative proof, migration changes, audit and denied behavior, next AD03.
