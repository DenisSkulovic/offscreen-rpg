# WR04 | planner proof matrix
**Evidence:** planned only; run after WR03. Provider-free distinct scripted model contexts required.
| Case | Setup | Result |
|---|---|---|
| Isolation | parent asks two different source-heavy questions | two distinct child context IDs + model request/attempt histories |
| Read-only | child invokes stage/submit/publish | command denied, no CAS/SQL authored state |
| Scope | child reads private sibling-root object | denied even if correct hash |
| Budget | 2 children jointly reserve >parent remaining | second admission denied, no charged attempt |
| Join order | child 2 finishes first | reports joined in request order with distinct provenance |
| Citation fabrication | child returns object ID/hash outside pin | parent rejects claim until original source verified |
| Cancellation | parent cancels during unsettled child | no new dispatch, money reservation remains reconciliable |
| Crash | restart before join and after child settled | same child result reused, no duplicated provider calls |
| Missing mandatory | required child held | parent held/partial only if captured policy allows, not fake complete |

**Routes:** focused application unit/integration tests and 200-scene Mira/faction fixture. Scripts must log number of child contexts, independent request hashes, reserved/settled microusd and exact source hashes. Real provider test only after explicit budget approval.

### G0–G7 adversarial review, initial verdict: PLANNER-BLOCKED

G0 PASS (undertaking branch and WR03 Done); G1 PASS for named parent-schema/loop/custody anchors, but complete transitive caller proof not yet available; G2 FAIL (context-parameterization, aggregate reservation ledger and deny-by-execution boundary unselected); G3 FAIL T02–T05 (child must design SQL/step runtime); G4 FAIL (parent cannot safely dispatch this as a whole Change); G5 FAIL (no source-safe parallel pair established); G6 FAIL (no exact child-specific DB/attempt/capability tests and executable commands); G7 FAIL (full Application test glob and oversized task ownership would waste usage). **No implementation tests, SQL execution, or paid provider calls run by this reviewer.**

**Repair acceptance:** each new T-ID needs exact signatures and owned paths, no broad "new helper" allowance, named test and root command, wrong-context/wrong-owner/wider-capability/uncertain-transport negatives and parent compatibility proof. Existing step tables are implemented reality; remove original speculative "after WR03" language once the plan is truly refreshed. Re-audit G0–G7 after repair.


---

### Separate post-P3 G0-G7 cold-read review, 2026-11-21
**Verdict: READY WITH EXPLICIT LIMITS.** The initial FAIL above was accurate for old placeholders and is preserved; current TASKS.md/SOURCE-MAP.md/EXECUTION.md were repaired and reviewed separately against integrated P3-A 852f01a0, P3-B 4005a0e2 and P3-C 5615f077. **No tests, builds, migrations, browser sessions, SQL or provider calls executed by reviewer.** This is packet-readiness, not implementation acceptance.

| Gate | Result | Source-grounded falsification / limit |
| --- | --- | --- |
| G0 repo/authority | PASS | DenisSkulovic/offscreen-rpg, undertaking/storyteller-workshop; commissioned by owner, linked change/wr04-research mandatory; no main/real spend |
| G1 actual source | PASS | Inspected DB storytellerWriterMission/Step and journal idx21, Writer loop hardcoded contextId, custody actual operation/funding/attempt checks, read-only Library executor, P3B transport and fork lineage |
| G2 decided protocol | PASS | Stable child IDs, 0022 single child registry, role from SQL, parent/child same funding operation, finite shadow child allocations (never charged twice), separate child final rather than scene, no default research tool grant, explicit parent join/uncertain stop |
| G3 each T-ID | PASS | T01 schema/migration, T02 scope/funding, T03 read-only child, T04 parent delegate/durable join, T05 joined proof. Each now has named anchors, files, expected result, diagnostic negatives, focused command and stop |
| G4 first dispatch | PASS | Fetch origin Undertaking; create linked worktree change/wr04-research; run pnpm repo:change-branch --change WR04 --target undertaking/storyteller-workshop; T01 immediately executable |
| G5 safe DAG | PASS WITH EXPLICIT LIMIT | T01–T03 Writer/DB only may run with WR08 Web/Worker. T04 shared Worker/Workflow files WAIT until WR08 integrates, then safe refresh and guard --resume; one integration custodian |
| G6 tests | PASS (design, NOT run) | Pure child contract, P3B custody regression, new disposable child SQL test, cross-root/private/forged evidence, oversubscription, duplicate wake, unknown attempt and zero-child scenario |
| G7 cost/closure | PASS | One full Change, 5 small bounded children, focused builds/SQL not whole suite, archive/merge/push/retire by parent |

**Dispatch wave:** T01 → T02 → T03 → WR08 integration dependency → T04 → T05. Old pre-MA06A TIDs are superseded, not independently executable. No additional planning approval for ordinary code adaptation. Real-provider calls remain unauthorized. An actual money/authority contradiction returns to ChatGPT with exact proof instead of bypass.

**Honest limitation:** The reviewer cannot guarantee all tests pass or the final product is correct; these tests are for Cursor to execute. Historical v1/v2/v3 capture hashes must remain stable. The shared cap and SQL locks must be proved, not merely asserted.