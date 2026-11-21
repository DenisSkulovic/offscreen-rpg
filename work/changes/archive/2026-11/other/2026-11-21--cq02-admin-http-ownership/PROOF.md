# CQ02 | proof matrix
| Condition | Required |
| --- | --- |
| API builds under NodeNext | no lost .js imports, symbols/class exported unchanged |
| Staff session enter/me/exit | same auth, cookie, 401/403 statuses |
| Missing scope / case permission | same privacy-404 behavior, no body leak |
| Access inspector unknown capability | same response and no extra authority |
| Source dependency graph | controller → actor-service/errors; actor-service → errors/application, **no import from controller** |
| Diff review | function bodies/permissions unchanged apart from import/re-export movement |

Run `pnpm --filter @offscreen/api typecheck`; build API + `pnpm --filter @offscreen/api-integration build` and `test:admin-session` / `test:admin-policy` / `test:admin-cases` when disposable integration resources are authorized; changed-file quality lint and format. No model spending. The Cursor parent verifies permission-path and error equivalence against the source diff and focused negative tests before integration; optional independent ChatGPT audit follows the joined Change. No mandatory pre-merge second opinion for this behavior-preserving extraction.

## Observed on the Change branch

Worktree `/home/dskul/projects/offscreen-rpg-cq02`, base `f1c3b254cd04ae81853719c9bc5e115556504edb`. Disposable database `postgresql://offscreen:local-development-only@localhost:5432/offscreen_auth_test` only.

| Check | Result |
| --- | --- |
| Prettier and `eslint.quality.config.mjs` on the three admin files | PASS |
| `pnpm --filter @offscreen/api build` | tsc exit 1 on pre-existing `TS2742` in `stories/controller.ts`; `dist/src/modules/admin/admin-http-errors.js` and `admin-actor-service.js` were emitted |
| `pnpm --filter @offscreen/api typecheck` | same pre-existing `TS2742`; zero errors under `modules/admin` |
| `@offscreen/api-integration` full build | NOT RUN as a green build; unrelated `@offscreen/worker/runtime` errors. Admin test sources were unchanged, so the existing dist tests were used |
| Four admin integration files together | 6 pass, 5 fail, `EADDRINUSE` on port 3199 |
| Same four files one at a time | 6 pass, 0 fail: session, policy, cases, situation |
| Denial inspection versus HEAD | unknown failure 503 `unavailable`; `not_authorized` / `step_up_required` / `staff_session_required` 403; missing session 401 `unauthenticated`; customer `not_authorized` with `hideDenialAsNotFound` stays 404 in `AdminActorService.requireCapability` |

The owner directed archive and the join to `undertaking/storyteller-workshop` on 2026-11-21 after this implementation proof. A separate ChatGPT review receipt was not collected.
