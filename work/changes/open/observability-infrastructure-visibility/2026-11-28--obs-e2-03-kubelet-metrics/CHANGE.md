# OBS-E2-03 | Authenticated direct node and container metrics

**Kind:** implementation. **Standing:** PLANNER-BLOCKED — G2; not commissioned. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Add only direct verified HTTPS kubelet scrape jobs and exact additional discovery permissions. No `nodes/proxy`, insecure TLS, CSR approval or host changes.

**Requires:** 02 joined; G2 passes both-node verified serving CA/SAN and scoped auth; frozen trust/address/metric inputs.

**Exclusive write owners:** `values/profiles/dev/prometheus.yaml`, `tests/e2-collection.test.mjs`, `coverage/inventory.json`, new dev kubelet CA asset only if G2 establishes a dedicated public CA; no node configuration.

**Collisions:** 02/04/05/06 are mutually exclusive overlay writers; no arbitrary imposed order among post-02 metric additions.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 07 dashboard resource queries; 08 artifact inventory; 13 G5.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
