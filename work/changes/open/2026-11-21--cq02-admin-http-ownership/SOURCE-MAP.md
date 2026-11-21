# CQ02 | inspected source map
- `apps/api/src/modules/admin/controller.ts`: imports (1–77), exported `ADMIN_* = Symbol(...)` constants (79–90), `AuthProof` + decorated `AdminActorService` (92–224), `adminError` + `mapAdminError` (226–252), `AdminController` @Controller routes (263–~973), final provider factory wrappers (~975–1003). Uses both Nest decorators and application Admin interfaces.
- `apps/api/src/app.ts` imports `ADMIN_*`, `AdminActorService`, `AdminController` from `modules/admin/controller.js`; static providers and controllers depend on stable injection token identities. Keep that import surface via re-export.
- `tools/api-integration/test/admin-session.integration.ts`, `admin-policy.integration.ts`, `admin-cases.integration.ts`, `admin-situation.integration.ts` cover normal/negative HTTP behavior; `@offscreen/application/admin` owns actual grant logic.
- `apps/api/package.json`: `build` and `typecheck` run tsc/NodeNext.
