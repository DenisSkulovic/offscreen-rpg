# CQ02 | split Admin HTTP authentication from route orchestration

**State:** Done. Owner directed archive and integration onto `undertaking/storyteller-workshop` after the implementation proof. **Kind:** implementation, behavior-preserving refactor. **Priority:** P1. **Integration target:** `undertaking/storyteller-workshop`. **Change branch:** `change/cq02-admin-http-ownership`. **Dependency:** CQ01 landed on the undertaking branch before this branch was cut (`d2ec6fb7`). No new staff authority.

**Planning basis:** Inspected committed `undertaking/storyteller-workshop` at `c13d64ee450ad6b2b1da75dddf0a3de8331efa1a` on 2026-11-21. GitHub source inspection only; no local tests executed. Recheck relevant symbols in the actual Change worktree before execution. **Do not touch another agent's dirty worktree.**

**Custody:** Create dedicated linked worktree + `change/<id>-<slug>` from the then-current `undertaking/storyteller-workshop` HEAD; keep user's primary checkout unchanged. Integrate only to the undertaking branch, with integration custodian serializing shared indexes/STATUS/closure; do not change `main`. No automatic work selection, paid providers, non-disposable data or destructive infra.

**Observed:** `apps/api/src/modules/admin/controller.ts` is ~1,003 lines combining DI symbol registry, `AdminActorService` Better Auth/cookie/grant enforcement, error mapper, HTTP route handlers and provider factory shims. `apps/api/src/app.ts` imports both controller and symbols from the same file. All existing admin routes must retain decorators and permission decisions; the code needs explicit separate owners.

**Selected refactor:** Extract the **actor/auth service and its DI symbols** into `admin-actor-service.ts`, and HTTP error creation/mapping into `admin-http-errors.ts`; `controller.ts` retains all routes and provider adapter factory exports plus **re-exports** the existing symbols/actor-service for unchanged `app.ts` import compatibility. No route splitting, no semantics or grant precedence changes. Optional later route-family decomposition is a separate decision, not this packet.

**Out of scope:** New Zod API request contracts, renaming routes, changing 403/404, Admin roles, environment mapping, migrations and new feature design. Existing type contracts preserved.

**Completion contract:** Whole-Change commission includes integration into `undertaking/storyteller-workshop` after the specified tests, parent diff review, reconciliation and branch refresh; independent ChatGPT review is not required before joining. Real permission regressions or unsafe Git conflicts remain blockers.

**Proof:** imports resolve under NodeNext, DI uses the same symbol instances/class token, original API tests still exercise normal + denied paths, no copied second grant evaluator. Reviewer compares control flow with old code. **Do not use “smaller file” as sole acceptance.**

## Planned specification and implementation delta

planned-impact.v1, recorded before implementation and kept as the plan the close guard reads.

| Owner | Disposition |
| --- | --- |
| Product | unchanged because no product page changes and staff rights and status codes stay the same |
| Technical | unchanged because the Admin HTTP and permission contract is the same; only the source file that holds the actor checks moves |
| Code and tests | changed: apps/api/src/modules/admin/admin-actor-service.ts and apps/api/src/modules/admin/admin-http-errors.ts own the moved checks; the negative case is the existing non-staff and privacy denial |
| Related status, maps and evidence | changed: apps/api/README.md and docs/technical/platform/security-and-trust-boundaries.md name the actor-service file; STATUS.md is not a new capability |

This is **planning**, not the post-implementation affected-claim closure ledger. The ledger below records the implementation inspection. The owner directed archive and join after that inspection.

## Reconciliation ledger

exception: work/changes/README.md because the catalog only moves this finished packet out of the open list.
exception: work/changes/ledger/2026-11.md because the ledger only records this finished packet.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Staff control plane | docs/technical/platform/security-and-trust-boundaries.md#boundary-map | unchanged: staff actor checks and privacy 404 stay the same rule; the citation now names the actor-service file because `requireStaffActor` and `requireCapability` moved | docs/technical/platform/security-and-trust-boundaries.md#boundary-map; apps/api/src/modules/admin/admin-actor-service.ts; apps/api/src/modules/admin/controller.ts; f1c3b254cd04ae81853719c9bc5e115556504edb | fixture-tested | non-staff enter is 403 `not_authorized`; customer denial with `hideDenialAsNotFound` stays 404 | boundary cell and evidence-read link name `admin-actor-service.ts` |
| Authorization claim map | docs/technical/admin/topology-and-authorization.md#authorization-claim-map | unchanged: no new staff role, capability, or grant precedence | docs/technical/admin/topology-and-authorization.md#authorization-claim-map; apps/api/src/modules/admin/admin-actor-service.ts; f1c3b254cd04ae81853719c9bc5e115556504edb | source-inspected | unknown capability remains 403 and customer `not_authorized` remains privacy 404 | N/A |
| API route inventory | apps/api/README.md#find-the-request-route | unchanged: admin routes still enter through the controller; the session and capability methods are named on the actor service | apps/api/README.md#find-the-request-route; apps/api/src/modules/admin/controller.ts; apps/api/src/modules/admin/admin-actor-service.ts; f1c3b254cd04ae81853719c9bc5e115556504edb | source-inspected | `app.ts` still imports the controller re-exports, so the Nest tokens are the same objects | AD01 and AD02 rows name the actor service |
| Admin HTTP errors | apps/api/src/modules/admin/admin-http-errors.ts | unchanged: status codes moved with the functions and were not redesigned | apps/api/src/modules/admin/admin-http-errors.ts; f1c3b254cd04ae81853719c9bc5e115556504edb | fixture-tested | unknown failure is 503 `unavailable`; missing session is 401 `unauthenticated` | N/A |
| Product staff experience | docs/product | unchanged: no product page changes and no new staff authority | no source behavior changed; f1c3b254cd04ae81853719c9bc5e115556504edb | source-inspected | a non-staff player still cannot enter a staff session | N/A |

[Source](SOURCE-MAP.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).
