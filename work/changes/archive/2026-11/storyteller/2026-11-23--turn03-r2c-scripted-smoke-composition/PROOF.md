# R2C verification | no live run

**Planner test status: NOT RUN** at authoring. **Executor status:** source-only tests run on `change/turn03-r2c-scripted-smoke` from `022385df`. No cluster, account, S3, LLM or live HTTP.

Commands and counts:

- `node --test infra/kubernetes/lab/app-release/turn03/player-smoke.test.mjs` — 9 pass
- `node --test infra/kubernetes/lab/app-release/turn03/run.test.mjs` — 7 pass
- `node --test infra/kubernetes/lab/app-release/turn03/live-http.test.mjs` — 6 pass
- `node --test infra/kubernetes/lab/app-release/turn03/adversarial.test.mjs` — 5 pass
- `node --test infra/kubernetes/lab/app-release/turn03/preflight.test.mjs` — 3 pass
- `node --test infra/kubernetes/lab/app-release/turn03/fixture-pins.test.mjs` — 7 pass, after a local `@offscreen/documents` `tsc` because this worktree had no `dist/`
- `pnpm exec prettier --write` and `pnpm exec eslint --config eslint.quality.config.mjs` on the two new files — pass
- `git diff --check` — pass

There is no `trace-route.test.mjs`. Route behavior is covered by `run.test.mjs` and `player-smoke.test.mjs`.

| Contract | Expected positive | Diagnostic negative |
| --- | --- | --- |
| Fail-closed preconditions | Full frozen identity + explicit authorization + matching source pin/readiness enters injected trace | No consent, mismatched release/bucket/roots, invalid role or missing callback = 0 requests |
| HTTP story flow | R1 exactly once, returns scene1, scene2 and historical-fork lineage as **local observation**, not PASS | 401/403, pending opening/receipt, missing checkpoint, false fork do not emit success; no resend |
| Secrets/errors | Small result only with IDs, hashes, disposition | Fake cookie, HTTP body or exception text never leaked in output |
| Cross-Pod evidence | None produced | Even a complete fake trace never becomes `kind-cross-pod`, never all-eight PASS |
| Source quality | focused test, changed-file formatting and `git diff --check` run and recorded | No cluster, database, provider spend or live session access |

**Actual subsequent R3 live approval remains separate:** R2C's `authorized:true` argument is an orchestration-level precondition, not proof of operator identity or a grant from the user. An operator must later supply a real verified session and release identity from independently controlled credentials and explicit run approval.

**Readiness review G0–G7:** G0 current GitHub repo/source verified, local dirty state unknown (guard required); G1 source contracts inspected; G2 algorithm, failure state, return tier defined; G3 task cards bounded; G4 immediate T01 dispatch; G5 independent of R2D write set and DB/cluster state; G6 positive/negative tests defined but NOT RUN; G7 source-only resources/no spend. Verdict **READY WITH EXPLICIT LIMITS**, not R3 authorization.