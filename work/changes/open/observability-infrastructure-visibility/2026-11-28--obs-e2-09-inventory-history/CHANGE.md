# OBS-E2-09 | Scope-aware inventory and exact operational history classification

**Kind:** implementation. **Standing:** PLANNER-BLOCKED — H04 correction frozen; narrow re-review and 08 join pending; [review 07](../READINESS-REVIEW-07.md) at `b681cdcfb4cd10f5db2a1ea6d10ebcdc6f66b8d2`; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

One bounded read, exact named cluster RBAC ownership, exact histories and separate structural readiness vs desired convergence. Preserve legacy wrappers for existing historical proof callers; new classifier consumed by later Changes.

**Requires:** 01 pure history table and 08 exact artifact bundle/inventory joined.

**Exclusive write owners:** `inventory.mjs`, `readiness.mjs`, `tests/{inventory,readiness}.test.mjs`, `tests/snapshot-fixtures.mjs`, new `tests/e2-history.test.mjs`.

**Collisions:** 09 owns readiness/inventory and fixture edits; later 10 may migrate public observation wrapper after 09; others consume API not edit these files.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 10/11/12 consume exact matched descriptor/history and owned verifier.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
