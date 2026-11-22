# MA09 | independent readiness review and adversarial state proofs

**Baseline:** source `e122d080`; current branch subject to WR09. **No local execution or SQL tests performed by planner.** Current verdict **PLANNER-BLOCKED solely on WR09 source/interface finalization and prerequisite MA08 integration**, not on an undecided architectural goal. This packet freezes the intended port/callback algorithm, transaction order, failure semantics and exact caller groups; once dependency lands, ChatGPT must re-audit and, if stable, promote to Ready before Cursor receives it.

**G0** PASS target branch/permissions, dependency named; **G1** PASS inspected direct source edges, SQL lock callbacks, direct tests; **G2** PASS target design and callback algorithm; **G3** PASS task initial reads/callers but WAIT external contract stability; **G4** BLOCKED first dispatch until WR09; **G5** PASS serial single-owner tasks, MA08/WR09 sequential integration; **G6** PASS planned positive/negative/rollback tests, not run; **G7** PASS substantial ownership inversion, not a package proliferation exercise. Overall NOT READY pending integration input.

| Fault | Expected invariant |
| --- | --- |
| `prepareStorytellerResolution` denies stale revision | existing story unchanged, no duplicate response |
| `port.pending` throws | no action receipt, generation, hold, version, or outbox committed |
| `port.historicalReport` throws under lock | no report row/sourceKey consumed; retry succeeds once |
| `port.scheduleNarrativeContinuation` throws | action execution does not settle, clock/hold/outbox rollback |
| CAS materialization blocked/delayed | no long DocumentStore read inside `FOR UPDATE`, precise existing stage/retry |
| preapproved withdrawal invokes same port | no permission bypass, no split-brain clock |
| forbidden authority→Writer direct import in source | AST guard fails; allowed `stories/index.ts` composition passes |

**Test location:** `packages/application/test/eng03-t05-historical-report-capture.live.test.mjs`, `eng03-resolution-lock-measurement.live.test.mjs`, scripted action/replay tests (discover only adjacent named fixture, do not invent unrelated harness). Root `pnpm repo:module-graph`, `pnpm repo:module-graph:test`; Story Engine, GA and Worker builds. SQL proofs use only explicitly disposable DB. No paid provider call. A post-WR09 review must verify all cited methods and typed arguments still exist.
