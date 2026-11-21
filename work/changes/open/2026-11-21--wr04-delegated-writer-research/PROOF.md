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