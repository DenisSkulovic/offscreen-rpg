# OBS-E2-01 | Named historical artifact identities and history rows

**Kind:** implementation. **Standing:** PROPOSED — source-determined; independent readiness review pending; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Freeze the historical resolver without activating E2. Add pure artifact/history contracts so downstream construction is not forced to reinterpret `desired`. No E2 pins, new Helm resources, or changed default behavior.

**Requires:** No source predecessor; owner commission and branch checks.

**Exclusive write owners:** `artifacts.mjs`, new `artifact-history.mjs`, `tests/render.test.mjs`, new `tests/artifact-history.test.mjs` (OBS-E2-08 later touches artifacts after 01).

**Collisions:** None beyond group join lock.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 08/09 consume frozen artifact identities and row definitions; 13 owns G5.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
