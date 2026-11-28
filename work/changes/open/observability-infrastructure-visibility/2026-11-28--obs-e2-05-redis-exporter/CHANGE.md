# OBS-E2-05 | Fixed Redis exporter and native cache metrics

**Kind:** implementation. **Standing:** PROPOSED — source-determined, G1/G3 Redis specimen passed; readiness review pending, dependency-gated on 02; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Deploy one pinned Redis exporter as part of the Prometheus release, without changing Redis itself. No API token, write command, credentials or arbitrary scrape endpoint.

**Requires:** 02 joined; Frozen v1.97.0 pin, flags, exact endpoint/labels/coverage in NATIVE-INPUTS owner replacement specimen; independent readiness and commission required.

**Exclusive write owners:** `values/profiles/dev/prometheus.yaml`, `locks/e2-images.tsv`, `tests/e2-collection.test.mjs`, new `coverage/redis.json`.

**Collisions:** Serialize overlay/test/lock writes with 02/03/04/06.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 07/08/13; G3 disposable proof passed; G5 live owned backend and exact final render qualification remain necessary.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
