# OBS-E2-03 | Authenticated direct node and container metrics

**Kind:** implementation. **Standing:** DONE source (focused gate passed; joint native/G5 proof transferred to the Design; source `b4f6b6e2dd86ef2045a1e00d245e7cd54a05b193`). Previously READY — independent review 03 at `0660d98a19012c2974ecc4c70c5d77cbe88e8844`; owner ratified G2 and commissioned construction 2026-11-28. **Baseline:** `main` `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. **Authority:** [defended E2](<../../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../../../../open/observability-infrastructure-visibility/README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Add only direct verified HTTPS kubelet scrape jobs and exact additional discovery permissions. No `nodes/proxy`, insecure TLS, CSR approval or host changes.

**Requires:** 02 joined and shared overlay ownership available; selected G2 construction freeze in NATIVE-INPUTS reviewed and ratified. No repeat native specimen.

**Exclusive write owners:** `values/profiles/dev/prometheus.yaml`, `tests/e2-collection.test.mjs`, `coverage/inventory.json`, new `kubelet-trust.mjs`, `tests/kubelet-trust.test.mjs`; no committed real CA, no node configuration. 08/09/10/11/12 consume the frozen binding interface.

**Collisions:** 02/04/05 are mutually exclusive overlay writers; no arbitrary imposed order among post-02 metric additions.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** 07 dashboard resource queries; 08 artifact inventory; 13 G5.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
