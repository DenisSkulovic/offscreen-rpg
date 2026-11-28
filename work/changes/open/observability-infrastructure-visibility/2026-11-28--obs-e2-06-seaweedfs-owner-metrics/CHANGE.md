# OBS-E2-06 | Guarded object-storage native metrics transition

**Kind:** implementation. **Standing:** PROPOSED — G4a owner construction contract frozen, focused readiness/owner selection pending; not commissioned. **Baseline:** `main` `872c39b5c6bc4ebcacca3272d1c613758fc870cd`. **Authority:** [defended E2](<../../../../designs/open/observability-infrastructure-visibility/README.md>), [pass 02](<../../../../designs/open/observability-infrastructure-visibility/committee/pass-02.md>) at `0e731739c8a97e6e83896612acec40f89a26516f`; [selected technical direction](<../../../../../docs/technical/platform/observability-native-infrastructure.md>). See [group register](../README.md) for branch, custody, source dependencies and acceptance. Recheck exact source and target before dispatch; no remote or live permission is granted by this packet.

## Outcome and boundaries

Add dedicated 9327 listener on existing dev mini process, retain S3 port, image, Secret, PVC/PV and data. Separate owner transition, no observability-side restart. G4a candidate now specifies upgrade invocation/schema and predecessor/target chain in [NATIVE-INPUTS](../NATIVE-INPUTS.md#g4a-owner-transition-candidate--bounded-seaweedfs-metrics-enablement). Selected planner split: this Change owns source only; 04 T03 owns metrics enrollment after G4b. Review/owner selection before commission. No live permission.

**Requires:** G4a frozen owner transition/authority, independent affected readiness and owner commission. No predecessor construction join, no G4b prerequisite. Source construction precedes separately authorized G4b proof; 04/07/08/13 consume that result.

**Exclusive write owners:** `infra/platform/object-storage/providers/seaweedfs/{observe,install,mutation-guard,live-sdk}.mjs`; provider `chart/{values.yaml,values.schema.json,profiles/development.yaml,templates/deployment.yaml,templates/service.yaml}`; `infra/platform/object-storage/dev-bootstrap.mjs` only as needed for additive dev variant status; exact focused fixtures in TASKS. No Prometheus overlay, coverage JSON, Grafana, release profile or tenant authorization edits. Canonical object-storage contract in the planning revision; realized claim deferred to 13.

**Collisions:** Source independent of 01–05, PG01 and 07; only serialized branch joins/shared-register reconciliation. G4b live operation requires separate owner permission, no simultaneous PG01 maintenance, object-store ensure, dev workload use or observability live transition.

No unrelated cleanup, E1 re-certification, release mutation, paid work, external telemetry, auto-recovery or permission expansion. No implementation of a missing native fact by guess. This packet must not introduce a new public scope switch.

## Execution and closure

- [Tasks](TASKS.md) (one bounded card at a time; coordinator may execute directly).
- [Source map](SOURCE-MAP.md) (coordinator/reference, not wholesale worker preload).
- [Proof](PROOF.md) (assigned source boundary; no shared-cluster command unless separately authorized).

**Downstream obligation:** G4b owner proof after source archive/join; 04/07/08/13 consume frozen metrics endpoint. No native PASS at source closure.

At source closure: retain actual command/result, changed paths, commit, failed/not-run evidence and durable limitations. Transfer remaining joint proof to the Design, archive this Change before joining the Design branch only if its assigned gate passed. Otherwise leave it open. Do not merge main or dispatch another uncommissioned Change.
