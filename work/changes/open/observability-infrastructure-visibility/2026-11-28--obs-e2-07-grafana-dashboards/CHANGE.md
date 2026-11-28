# OBS-E2-07 | Repository-owned Grafana dashboard provisioning

**Kind:** implementation. **Standing:** PLANNER-BLOCKED — exact metric/coverage contracts G1–G4; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Eight provisioned dashboards, one native Grafana provider, stable UIDs, no UI state. No change to base Grafana values or lifecycle implementation.

**Requires:** Frozen selected metric families, labels, exact panel queries and coverage rows in NATIVE-INPUTS from G1–G4 (G4b before SeaweedFS enabled). Source joins of 02–06 are acceptance dependencies, not dashboard construction prerequisites.

**Exclusive write owners:** `values/profiles/dev/grafana.yaml` (new), `dashboards/{overview,kubernetes,nodes,postgres,temporal,storage,messaging-cache,observability}.json` (new), `tests/e2-dashboards.test.mjs` (new).

**Collisions:** Can construct independent of lifecycle; no edits to shared Prometheus overlay.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 08 artifact rendering; 13 joint operator visibility.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
