# OBS-E2-12 | Safe proof routing and unsupported disruption refusals

**Kind:** implementation. **Standing:** DONE source (proof 97 + proof-resources 3 + all observability suites 691/691 PASS serial; live disruptive/E2 proof NOT RUN, assigned to 13; source `b80c95ff605bf28bb2e0d297a21558c60084b41f`). Previously READY — review 07, commissioned 2026-11-28. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Preserve matching E1/E2 health, signal and developer proof; refuse unsupported E2 disruption/resource and legacy partial-install paths before any write. No new disruptive campaign.

**Requires:** 08/09 joined; 01 history rows. 11 pending schema must be recognized by existing/new readers before activation, but source construction independent of upgrade implementation.

**Exclusive write owners:** `infra/verification/smoke/observability/{proof,proof-host,signals,developer,resources,disruptions,partial-install}.mjs`, `tests/{proof,proof-resources}.test.mjs` in same directory; new proof admission fixture if needed.

**Collisions:** Parallel with 10/11 after 09; no edits to platform lifecycle files. Coordinate only any approved shared marker primitive signature with 11.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 13 final regression and joint qualification; no E2 outage/persistence recertification.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
