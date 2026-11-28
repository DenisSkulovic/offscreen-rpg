# OBS-E2-06 | source and transferred native proof

Baseline `main` `872c39b5c6bc4ebcacca3272d1c613758fc870cd`. Source construction only. Run from the dedicated Change worktree root after T01–T03. No native mutator, paid work, cluster test or marker preparation during construction. Helm local rendering is a focused source check. Preserve existing fixture tiers.

```bash
node --test infra/platform/object-storage/tests/object-storage-chart.test.mjs \
  infra/platform/object-storage/tests/readiness.test.mjs \
  infra/platform/object-storage/tests/object-storage-install.test.mjs \
  infra/platform/object-storage/tests/mutation-guard.test.mjs \
  infra/platform/object-storage/tests/metrics-transition.test.mjs \
  tools/dev-environments/test/dev-object-store-bootstrap.test.mjs \
  tools/dev-environments/test/dev-s3-tenant-live-adapter.test.mjs
git diff --check
```

Gate: exact predecessor/target/release parsed manifest comparison and history rows, existing/target S3 admission, strict pending and private capability, source-fixture quiescence, identity and marker/endpoint preservation, exactly one permitted write or zero on refusal/repeat; injected failed/unknown writes retain intent and no further mutation. Actual focused tests must pass. No claim of a real rollout or S3 proof. Review source/postconditions, archive 06 before serialized join, transfer G4b to Design.

## G4b | transferred acceptance-lead and object-owner operation (NOT RUN)

Source permitted only from exact clean joined `implementation/observability-infrastructure-visibility` SHA containing archived 06, passing focused receipt and **separate owner authorization of that SHA** for object-store maintenance. This is a narrow exception to the intermediate observability activation prohibition, not a permission to run unfinished E2 or PG01. No live operation on a child Change branch. Serialize native work with PG01, cluster lifecycle, slot/tenant and object-store operations. Owner verifies quiescence, excludes arbitrary external S3 clients/old writers, registry, memory, current exact predecessor and marker descriptor. If marker does not exist, separately authorize one-use marker preparation by acceptance lead per [G4a](../NATIVE-INPUTS.md#g4a-owner-transition-candidate--bounded-seaweedfs-metrics-enablement); no app object, no credential output, no automatic deletion or retries.

Only after those conditions, separately authorized exact command (marker descriptor path supplied by owner, not a default):

```bash
OFFSCREEN_OBJECT_STORAGE_METRICS_UPGRADE=authorized \
OFFSCREEN_OBJECT_STORAGE_MAINTENANCE=quiesced \
node infra/platform/object-storage/providers/seaweedfs/install.mjs upgrade-metrics dev \
  --confirm-context kind-offscreen-dev --marker-file <private-local-json>
```

Require recorded exact SHA/context/cluster and old/new Helm/identity chain, retained marker byte count/hash and independent readback, same admin Secret/PVC/PV/Service/Deployment, old Pod absent/new ready, 9327 native metrics family/types/label keys/units, clean forward/intent finalization. Repeat exact target is a read-only no-op, no extra Helm revision; never reconstructs a missing transition receipt. Refuse wrong context/predecessor, active consumers, pending/mismatch/unknown, no automatic resume, rollback or retry. Do not manufacture a failure by disrupting occupied data. 04 T03/04 T04 remain gated until planner freezes actual G4b rows; 07/08/13 consume the same evidence. Failure/NOT RUN remains explicit, no reduced scope by default.
