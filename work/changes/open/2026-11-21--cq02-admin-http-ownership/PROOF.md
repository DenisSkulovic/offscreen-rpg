# CQ02 | proof matrix
| Condition | Required |
| --- | --- |
| API builds under NodeNext | no lost .js imports, symbols/class exported unchanged |
| Staff session enter/me/exit | same auth, cookie, 401/403 statuses |
| Missing scope / case permission | same privacy-404 behavior, no body leak |
| Access inspector unknown capability | same response and no extra authority |
| Source dependency graph | controller → actor-service/errors; actor-service → errors/application, **no import from controller** |
| Diff review | function bodies/permissions unchanged apart from import/re-export movement |

Run `pnpm --filter @offscreen/api typecheck`; build API + `pnpm --filter @offscreen/api-integration build` and `test:admin-session` / `test:admin-policy` / `test:admin-cases` when disposable integration resources are authorized; changed-file quality lint and format. No model spending. The Cursor parent verifies permission-path and error equivalence against the source diff and focused negative tests **before** integration; optional independent ChatGPT audit follows the joined Change. No mandatory pre-merge second opinion for this behavior-preserving extraction.
