# MA05B | source-reviewed G0–G7 and transactional proof contract

**Planner review:** remote source inspected at `681c5fa910344551c5b4f40fd39dc1fdf87378ca`, no tests/SQL/provider run.

| Gate | Verdict | Grounded reason |
| --- | --- | --- |
| G0 scope/branch | PASS | one generic SQL primitive move, Undertaking target, no schema or provider |
| G1 source | PASS | current `outbox/index.ts`, DB schema/database/package, frozen-topic test |
| G2 semantics | PASS | verbatim enqueue check, exact `Notice`, `Transaction`; old public alias is direct re-export, lease dispatcher left alone |
| G3 child dry-run | PASS T01–T03 | every path/algorithm and test existing or exact new file |
| G4 parent first dispatch | PASS | T01 after branch guard, no architecture review |
| G5 DAG/parallel | PASS | serial due DB compiled subpath, one SQL fixture owner |
| G6 positive/negative | PASS plan / NOT RUN execution | strict function identity + reject mismatched same-ID transaction and zero committed rows |
| G7 cost/closure | PASS | focused Application fixture, no broad integration sweep; SQL proof required to close |

**Permission and risk:** existing `story03-notice-topic-freeze.test.mjs:withDisposable` dynamically provisions disposable sandbox from full migrations. That test may require operator-controlled local PostgreSQL and approved disposable-provision parameters. Do not run without those. SQL mismatch rollback is a hard acceptance gate and cannot silently be skipped; NOT RUN keeps Change open until a permitted fixture can prove it. Do not switch to a different DB or bypass limits to obtain green tests.
