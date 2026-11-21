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
