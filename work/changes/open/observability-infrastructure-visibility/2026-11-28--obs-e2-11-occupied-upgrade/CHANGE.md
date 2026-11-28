# OBS-E2-11 | Explicit E2 pending state and guarded occupied upgrade

**Kind:** implementation. **Standing:** DEPENDENCY-GATED — 08/09 exact artifact/history interfaces; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

One explicitly authorized dev transition from exact E1 developer to E2 with retained backend data and history. Preserve existing no-args Collector upgrade and refusal; no automated resume/rollback.

**Requires:** 08/09 joined; G1–G4 selected scope frozen; 12 must finish before any E2 live activation; no live permission during construction.

**Exclusive write owners:** `custody.mjs`, `upgrade.mjs`, `forward.mjs`, new `upgrade-e2.mjs`, new `e2-preservation.mjs`, `tests/{custody,upgrade}.test.mjs`, new `tests/e2-upgrade.test.mjs`.

**Collisions:** Parallel with 10 and 12 after 09; 10 and 11 share `tests/forward.test.mjs` only, serialize that write or use the separate E2-upgrade fixture in 11. 11 exclusively owns the new forward capability; 10 uses the existing forward API and does not edit forward.mjs. 12 may extract read-only primitive only in proof owners; any shared primitive signature change agreed first.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 13 occupied upgrade with positive real markers; 12 proof admission must join before any live E2.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
