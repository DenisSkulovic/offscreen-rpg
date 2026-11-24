# INF35 route

- T01 Validate slot workload inventory — tools/dev-environments/src/application/dev-slot-startup.mjs::applyOwnedSlotWorkloads; tools/dev-environments/src/rendering/dev-slot-app-graph.mjs::selectColdStartDocuments; tools/dev-environments/test/dev-slot-startup.test.mjs. Exact edits and negative proof in EXECUTION.md section T01.
- T02 Smoke cleanup only what this run creates — infra/verification/smoke/release.sh; infra/verification/source/test/volume-guard.test.mjs; infra/verification/fixtures/probes. Exact edits and negative proof in EXECUTION.md section T02.

Sequential tasks; dependency INF28 Done.
