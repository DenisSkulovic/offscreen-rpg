# MA08B | readiness and negatives

**Static source readiness:** source `e122d080`, MA07 integrated. G0 verified target/branch; G1 exact outbox SQL and logger symbols; G2 choose copy+direct imports not transaction refactor; G3 bounded tasks/file custody; G4 first task legal; G5 lane disjoint from MA08A/MA10A; G6 proof conditions; G7 meaningful infrastructure ownership. No build/test run by planner. **Planner-ready with integration custodian lockfile requirement.**

Proof: first claim leases earliest available id; two workers cannot claim same row concurrently; wrong/stale leaseId never marks delivered, correct token does; injected failure rolls back claim; logs have timestamp/level/event/message/service and only allowlisted correlation/errorKind, no raw arbitrary Error serialization; existing API/GA/Worker bootstrap functions compile; legacy Application relay remains testable. No schema changes, provider sends or protected DB writes. All code-failure statuses truthfully reported.
