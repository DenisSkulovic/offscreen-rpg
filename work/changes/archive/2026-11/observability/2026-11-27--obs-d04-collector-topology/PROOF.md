# OBS-D04 proof

**Focused offline source: PASS** at `67b0bf4fabfcb12647dd17a82adee2275e7457d9` on `change/obs-d04-collector-topology`. Live cluster, image pull, network and paid operations: NOT RUN. Joint Design A1–A12/V01–V12: NOT RUN / ACCEPTANCE PENDING (not marked passed).

| Gate | Predicate | Disposition |
|---|---|---|
| V02/V03 (source slice) | exact generator overlay; desired dev five ports, same four Collector object identities, unchanged other releases; no developer ports/pipeline in base/release | PASS offline render/classifier tests |
| V04/A3 (source slice) | absent/current/predecessor/rev2/release exact; history/config/secret/image/UID/PV negatives; pending never ready | PASS offline fixtures |
| A5/A2/A12/V11 (source slice) | prefix/no later write; typed receipt and expected profile/op; predecessor explicit refusal; optional release absent only NOT-RUN | PASS offline install/receipt/caller tests |
| OD-05–07 / live A6–A11 | real health/upgrade/connection/signal proof | NOT RUN — Design joint acceptance |

```bash
node --test --test-concurrency=1 infra/platform/observability/tests/{render,identity,inventory,readiness,install,receipt,diagnostic-worker}.test.mjs infra/environments/{platform-plan,infra-cli,infra-cli-operation}.test.mjs infra/verification/{diagnostic,provisioning}.test.mjs
```

Observed: **237/237 PASS**. `scripts/repo-tools/check-lab-manifests.test.mjs` full suite NOT RUN for Change gate (pre-existing unrelated object-storage Namespace parse failure on this branch); observability overlay path allowlisted in `check-lab-manifests.mjs`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| Dev Collector overlay + exact classifier | docs/technical/platform/observability-native-infrastructure.md#structural-inventory-and-readiness | changed: offline source realizes ordered base+overlay desired, base predecessor, upgrade-required, Helm history/manifest projection, F08 worker aliases | `infra/platform/observability/{artifacts,inventory,readiness,install,receipt,identity}.mjs` + callers; SHA `67b0bf4fabfcb12647dd17a82adee2275e7457d9` | source-tested offline 237/237; live NOT RUN | unknown variant/release predecessor/malformed overlay; pending never ready; predecessor refusal no writes | catalogs + Design ACCEPTANCE joint obligations |
| Product behavior | docs/product/README.md | unchanged: no player/auth/persistence/paid policy change | none | N/A | N/A | N/A |
| Joint A1–A12/V01–V12 | work/designs/open/observability-developer/ACCEPTANCE.md | unchanged: remain NOT RUN / pending; not marked passed | transferred to Design | evidence-gated | live gates NOT RUN | ACCEPTANCE + IMPLEMENTATION-PLAN |
