# CQ02 | landed source map
Compared with `undertaking/storyteller-workshop` at `f1c3b254cd04ae81853719c9bc5e115556504edb`.

- `apps/api/src/modules/admin/admin-http-errors.ts` (32 lines): `adminError` and `mapAdminError` only. Unknown failures stay HTTP 503 `unavailable`. `AdminSessionError` denials stay 403, except `unauthenticated` at 401. `AdminSessionError` itself stays in `@offscreen/application/admin`.
- `apps/api/src/modules/admin/admin-actor-service.ts` (176 lines): `ADMIN_*` symbol tokens, `AuthProof`, and `@Injectable() AdminActorService`. Imports `admin-http-errors.js` and does not import the controller. `AuthProof` is `export type` so the controller can name the proof; it was file-private before the split.
- `apps/api/src/modules/admin/controller.ts` (849 lines): `@Controller('admin')` routes, privacy 404 overrides at the route catch sites, and provider factory wrappers. Re-exports `ADMIN_*` and `AdminActorService` from `admin-actor-service.js`.
- `apps/api/src/app.ts` still imports `ADMIN_*`, `AdminActorService`, and `AdminController` from `modules/admin/controller.js`. That file was not edited.
- Integration coverage stays in `tools/api-integration/test/admin-session.integration.ts`, `admin-policy.integration.ts`, `admin-cases.integration.ts`, and `admin-situation.integration.ts`. Grant decisions stay in `@offscreen/application/admin`.
