# OBS-E2-04 | Native PostgreSQL, Temporal, RabbitMQ, SeaweedFS and observability scrapes

**Kind:** implementation. **Standing:** PLANNER-BLOCKED — G3 applicable endpoints; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Enroll fixed vendor endpoints without changing their workloads or configurations. The coverage declaration must account for optional operators/control-plane as inventory-only unless verified; do not collect arbitrary data.

**Requires:** 02 joined; PG01 positive native receipt for PostgreSQL statistics; 06 source joined and G4b positive native owner receipt; planner-frozen G3/G4 exact endpoint, family, label and query rows for selected CNPG, four Temporal roles, RabbitMQ, SeaweedFS and observability self metrics.

**Exclusive write owners:** `values/profiles/dev/prometheus.yaml`, `tests/e2-collection.test.mjs`; new `coverage/native-services.json` and `coverage/seaweedfs.json` (proposed machine-readable fragments).

**Collisions:** 02/03/05 share overlay/test writes; serialize. 06 owns only independent object-storage source. Service workload ownership is excluded.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 07/08/13.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
