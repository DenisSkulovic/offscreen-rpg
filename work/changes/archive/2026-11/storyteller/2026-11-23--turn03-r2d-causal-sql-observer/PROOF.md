# R2D verification | injected SQL only

**Executor test status: PASS, fake reader only.** Baseline `undertaking/storyteller-workshop@022385df`. `node --test infra/kubernetes/lab/app-release/turn03/causal-sql.test.mjs` reported 6 pass, 0 fail. Focused Prettier and ESLint on `causal-sql.mjs` and `causal-sql.test.mjs` passed. `git diff --check` passed. No PostgreSQL connection, Kubernetes Secret, Pod, migration, or provider call was made. A fake PASS is not a TURN03 gate.

| Contract | Normal | Negative |
| --- | --- | --- |
| Input and SQL | UUIDs, exact topic, fixed four SELECTs with bind parameters | Bad IDs/topic, quote/injection content = no queries |
| Notice | one operation/topic row | none/duplicate/mismatch = BLOCKED/FAIL, never observed |
| Attempt | one generation row, expected owner/story | foreign owner, story mismatch, null story or duplicate = FAIL/BLOCKED |
| Publication | exactly one `published` row for generation | pending/blocked/stale/missing = BLOCKED/FAIL |
| Passage | exact `[1,2]` for requested story | [1], [1,3], duplicate, unordered/extra = BLOCKED/FAIL |
| Evidence scope | `observed:true,evidence:'injected-readonly-query'` | No data-body/secret output, no `kind-cross-pod`, no Temporal proof implied |
| Execution safety | fake reader with four SELECT captures | fake reader throws secret-bearing error: safe BLOCKED, no retry; no live DB |

**G0–G7 readiness:** G0 GitHub HEAD/authority read; live checkout writer guard required; G1 schema/topic/test sources inspected; G2 SQL contract frozen, no credentials; G3 T01/T02/T03 bounded; G4 immediate dispatch; G5 disjoint R2C source/test, serial catalog join; G6 tests specified but NOT RUN; G7 fake-only, no DB or provider access. Verdict **READY WITH EXPLICIT LIMITS**, not live SQL permission.

**Later real adapter remains planner-held:** DB-level read-only role (not merely SELECT query strings), tenant authorization and operation-to-Temporal provenance remain unprovided. A fake PASS cannot satisfy TURN03 eight gates.