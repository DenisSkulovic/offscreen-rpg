# Owner-operated Redis acceptance observations — 2026-11-26

Status: acceptance pending. No canonical mutation or join authorization.

| Candidate | Owner-reported evidence |
| --- | --- |
| df2934e3f2d34f77cdb1bb8880ce732c5a4e31eb | 113 test executions passed. Dev positive smoke, malformed-secret and matching-orphan refusal/cleanup passed. Release positive smoke stopped at recovery PING; release fixtures skipped. Before/after canonical Deployment/Service and PV/PVC UID/spec snapshots matched in both contexts (host report /tmp/offscreen-redis-acceptance.45Rmpj). |
| f3b5b1401952473a6e674d8ad054dbe8923e5346 | 26 focused tests passed; release positive smoke and both refusal fixtures passed after verified recovery of retained specimen. Both canonical plans legacy/old-selector, mutated=false. |
| 5167ee20f82bd9fa8d7622d9a834abcf65ad4094 | 46 source/actual Helm tests passed. Both fault-only image installs failed with Helm exit 1, context deadline exceeded, no host timeout; pending receipt retained; subsequent ensure refused pending custody. Both fault namespaces recovered with verified absence and receipts archived. Both canonical plans legacy/old-selector, mutated=false. |

Evidence is owner terminal output, not independently executed by ChatGPT. Snapshot evidence is scoped to canonical Redis workload/service identity/spec and PV/PVC identity/spec, not volume bytes or complete foreign inventory. All prior fault receipts recovered. No repeat-ensure live evidence yet. Source correction integrates fresh installed observation/no-op under the existing lock and returns the proof receipt. Final owner batch: focused smoke/install regression, positive smoke both contexts, compare preservation snapshots. No repeat of fault/negative fixtures unless affected by subsequent changes. Final join remains held for essential proof reconciliation, current-main reconciliation, and owner decision accepting interim canonical legacy refusal or separately authorizing cutover.
