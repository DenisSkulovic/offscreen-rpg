# OBS-E2-08 | Frozen E2 render, helper locks and exact inventory

**Kind:** implementation. **Standing:** DEPENDENCY-GATED — selected G1–G4 inputs and construction joins; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Produce one validated dev E2 bundle and explicit operational selector, retain historical and release artifacts byte-for-byte where meaningful and parsed-document equality. No live activation yet.

**Requires:** 01–07 joined (only approved selected scope); G1–G4 closed or explicit owner-ratified scope correction; accepted manifests/metric rows and canonical contract frozen.

**Exclusive write owners:** `artifacts.mjs`, `expected-inventory.json`, `tests/render.test.mjs`, `tests/e2-artifacts.test.mjs` (new); no coverage or workload values edits without original owner.

**Collisions:** 01 finishes artifacts.mjs before 08; 02–07 freeze inputs; 10 later changes public default routing.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 09 classifier and 10/11/12 routing consume immutable descriptors; 13 full G5.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
