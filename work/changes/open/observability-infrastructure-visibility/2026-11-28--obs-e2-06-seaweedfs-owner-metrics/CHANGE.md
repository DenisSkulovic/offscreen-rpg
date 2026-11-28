# OBS-E2-06 | Guarded object-storage native metrics transition

**Kind:** implementation. **Standing:** PLANNER-BLOCKED — G4 owner transition details and native feasibility; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Add dedicated 9327 listener on existing dev mini process, retain S3 port, image, Secret, PVC/PV and data. Separate owner transition, no observability-side restart. G4a must freeze exact upgrade invocation/schema and predecessor/target chain before dispatch; this packet does not pretend that this currently exists.

**Requires:** G4a selected exact owner transition contract and authorization boundaries; native version/port and fixture inputs frozen. Source construction precedes separately authorized G4b proof. Enrollment task T03 additionally requires 02 joined and G4b or explicit owner-ratified exclusion; 08/13 consume that result.

**Exclusive write owners:** Object-storage owner only: `dev-bootstrap.mjs`, `providers/seaweedfs/{observe,install,mutation-guard}.mjs`, chart `templates/{deployment,service}.yaml`, exact dev/release values and object-storage tests identified in G4a. `coverage/seaweedfs.json` plus Prometheus overlay enrollment after G4b, serialized with 02–05.

**Collisions:** Independent object-store paths initially; enrollment shares overlay/test lock. No simultaneous object-store ensure, dev workload use, or observability live transition.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** G4 owner proof; 07/08/13 consume frozen metrics endpoint.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
