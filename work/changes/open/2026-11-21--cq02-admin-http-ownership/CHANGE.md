# CQ02 | split Admin HTTP authentication from route orchestration

**State:** Ready **after CQ01 is integrated and exact imports refreshed**. **Kind:** implementation, behavior-preserving refactor. **Priority:** P1. **Integration target:** `undertaking/storyteller-workshop`. **Change branch:** `change/cq02-admin-http-ownership`. **Dependency:** CQ01 because both touch `apps/api/src/modules/admin/controller.ts`. No new staff authority.

**Planning basis:** Inspected committed `undertaking/storyteller-workshop` at `c13d64ee450ad6b2b1da75dddf0a3de8331efa1a` on 2026-11-21. GitHub source inspection only; no local tests executed. Recheck relevant symbols in the actual Change worktree before execution. **Do not touch another agent's dirty worktree.**

**Custody:** Create dedicated linked worktree + `change/<id>-<slug>` from the then-current `undertaking/storyteller-workshop` HEAD; keep user's primary checkout unchanged. Integrate only to the undertaking branch, with integration custodian serializing shared indexes/STATUS/closure; do not change `main`. No automatic work selection, paid providers, non-disposable data or destructive infra.

**Observed:** `apps/api/src/modules/admin/controller.ts` is ~1,003 lines combining DI symbol registry, `AdminActorService` Better Auth/cookie/grant enforcement, error mapper, HTTP route handlers and provider factory shims. `apps/api/src/app.ts` imports both controller and symbols from the same file. All existing admin routes must retain decorators and permission decisions; the code needs explicit separate owners.

**Selected refactor:** Extract the **actor/auth service and its DI symbols** into `admin-actor-service.ts`, and HTTP error creation/mapping into `admin-http-errors.ts`; `controller.ts` retains all routes and provider adapter factory exports plus **re-exports** the existing symbols/actor-service for unchanged `app.ts` import compatibility. No route splitting, no semantics or grant precedence changes. Optional later route-family decomposition is a separate decision, not this packet.

**Out of scope:** New Zod API request contracts, renaming routes, changing 403/404, Admin roles, environment mapping, migrations and new feature design. Existing type contracts preserved.

**Proof:** imports resolve under NodeNext, DI uses the same symbol instances/class token, original API tests still exercise normal + denied paths, no copied second grant evaluator. Reviewer compares control flow with old code. **Do not use “smaller file” as sole acceptance.**

## Planned-impact.v1 (before implementation)

| Owner | Disposition |
| --- | --- |
| Product | No product change; all routes, staff rights and status codes preserved. |
| Technical | Existing Admin HTTP/permission contract unchanged; source map only. |
| Code and tests | Admin actor/error extraction, route imports, focused integration tests. |
| Related status, maps and evidence | API source README update if route owner changes; evidence truthful. |

This is **planning**, not the post-implementation affected-claim closure ledger. The parent records actual outcomes and NOT RUN gaps at acceptance.

[Source](SOURCE-MAP.md) · [Execution](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).
