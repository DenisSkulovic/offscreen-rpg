# OBS-E2-10 | Route ordinary ensure, status, render and connect to exact artifacts

**Kind:** implementation. **Standing:** PLANNER-BLOCKED — H05 correction frozen; narrow re-review and 08/09 joins pending; [review 07](../READINESS-REVIEW-07.md) at `b681cdcfb4cd10f5db2a1ea6d10ebcdc6f66b8d2`; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Make normal operations use E2 desired and admit existing E1 developer for connect. No implicit upgrade, no disruption/upgrade implementation in this Change. Source-only branch not activated live until all consumers complete.

**Requires:** 08,09 joined; full selected E2 artifact frozen. 01 historical API preserved.

**Exclusive write owners:** `install.mjs`, `receipt.mjs` (closed operational receipt extension only), `connect.mjs`,  `readiness.mjs` public observation wrapper only, `artifacts.mjs` render/lint wrapper only, `infra/environments/{infra-cli,platform-plan}.mjs`, `infra/platform/common/cli.mjs`, `infra/verification/diagnostic-live.mjs`, corresponding install/receipt/forward/diagnostic/infra-cli/plan tests.

**Collisions:** Shared readiness/artifacts wrapper edits only after 08/09; 11/12 must not edit these wrappers; serialize 10 with any conflicting active infra CLI work.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 13; 11/12 separate lifecycle mutation/proof admission.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
