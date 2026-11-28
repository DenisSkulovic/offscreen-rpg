# OBS-E2-02 | Kubernetes inventory and bounded Prometheus identity

**Kind:** implementation. **Standing:** PLANNER-BLOCKED — G1 KSM pin and effective KSM chart/render inputs; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Build the dev-only KSM foundation and base E2 scrape limits. No node/exporter/service additions yet. This is a construction overlay, not independently activated.

**Requires:** 01 integrated for named descriptor conventions; G1 KSM pin frozen, KSM service/collector and chart permissions proven as specified in NATIVE-INPUTS.

**Exclusive write owners:** `values/profiles/dev/prometheus.yaml` (new), `locks/e2-images.tsv` (new), `tests/e2-collection.test.mjs` (new), `coverage/inventory.json` (new); later metric owners append narrowly; 08 owns artifact integration.

**Collisions:** Serialize all writes to dev Prometheus overlay and e2-collection test with 03/04/05/06 enrollment; 05 also edits helper lock.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 03/04/05/06 share overlay only under exclusive path ownership; 07 consumes G1 metric contracts; 08 owns exact render.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
