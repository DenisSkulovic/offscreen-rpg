# OBS-D04 | Developer topology and exact classifier

**State: Done (source implementation; joint A1–A12/V01–V12 ACCEPTANCE PENDING).** Closed 2026-11-27 on Change branch `change/obs-d04-collector-topology` from `implementation/observability-developer` `437e10f3db4836e552a899383e395e7db8df9fff`. Source SHA `67b0bf4fabfcb12647dd17a82adee2275e7457d9`. **Kind:** CONTRACT (source implementation). Independent readiness verdict was never PASS; owner-released offline source only. Joint Design certification remains open and is not marked passed. No live cluster/Docker proof, no main merge, no activation.

## Outcome
Render the accepted dev-only second Collector lane and recognize only exact supported native configurations, with install-only public lifecycle and typed refusal preserved.

Authority: [accepted R5 contract](././././docs/technical/platform/observability-native-infrastructure.md), [design](./././designs/open/observability-developer/README.md), [programme acceptance](./././designs/open/observability-developer/ACCEPTANCE.md). [Pass 03](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) defended D01 only; all other staged boundaries remain unratified. Dependencies: D01 descriptor; D02 frozen identity; D03 custody. D07/D09 and D08 live proof tooling needed before activation; coordinate candidate, do not require already-merged changed default. Existing joint certification binds until affected revised boundary is defended and accepted. Owner's explicit release authorizes offline implementation only; no live operation, deployment, spend or main merge.

## Scope and exclusions
Own P/artifacts, inventory, readiness, install, receipt and fixtures; dev Collector overlay; scoped environment/verification callers and exact tests; raw-scan overlay exclusion. No generic upgrades, release changes, SDK enrollment or additional Collector. Candidate has five assignments; upper-end size/effort requires review and may need safe repartition.

## Source release and remaining proof

Pinned offline rendered manifests and exact classifier/caller tests; stop on mismatch, unsafe classification or unexpected source owner.

Owner directed immediate release of this frozen candidate for reversible offline implementation despite outstanding independent review. This is not a READY verdict or canonical ratification. Prior G0 rejection and unreviewed G1–G7 remain visible; no architecture choice delegated. Parent checks predecessor receipt, local ownership and named anchors, runs focused positive/negative tests, and reports actual blockers with exact source evidence. No broad review or repeated approval before dispatch. When this Change's own source gate passes, archive its packet on the implementation branch and record the joint A1–A12/V01–V12 obligations on the Design. Do not mark those joint gates passed. No live activation or main merge.

[TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [EXECUTION](EXECUTION.md) · [PROOF](PROOF.md). The implementation coordinator owns the diff, focused proof, archival, commit, serialized source join and clean worktree retirement when the Change-level gate passes. The acceptance lead and owner own joint A1–A12/V01–V12 proof. Pending joint acceptance does not mark the Change Done, does not keep its packet in open, and does not retain the worktree after the permitted source join.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | docs/product/README.md | no SDK enrollment or gameplay changes |
| Technical | changed: docs/technical/platform/observability-native-infrastructure.md#structural-inventory-and-readiness; record exact dev variant, predecessor classification and diagnostic deadline/receipt realization after approved F08 | docs/runbooks/kubernetes-observability.md | [PROOF](PROOF.md), selected authority only; no invented live PASS |
| Code | changed: infra/platform/observability/artifacts.mjs, inventory.mjs, readiness.mjs, install.mjs, receipt.mjs; exact mapped callers/tests; negative: pending/foreign/revision mismatch classified ready or developer lane in release | [SOURCE-MAP](SOURCE-MAP.md) | [TASKS](TASKS.md), [PROOF](PROOF.md) |
| Related | changed: docs/runbooks/kubernetes-observability.md; reconcile only affected operational instructions and realization status at accepted closure | work/changes/open/README.md, STATUS.md | no premature operational advertisement; parent records actual changed/unchanged dispositions |

## First dispatch — owner-released

Prerequisite: OBS-D01, OBS-D02 and OBS-D03 tested source receipts joined to implementation/observability-developer. Use `change/obs-d04-collector-topology` in dedicated linked worktree from recorded `implementation/observability-developer`. Run `node scripts/repo-tools/change-branch-guard.mjs --change OBS-D04 --target implementation/observability-developer --design observability-developer`. Dispatch T01 and continue the authorized tasks. No new owner approval is required for the routine lifecycle. Only offline renders, local process tests and injected fixtures. No actual cluster commands, Docker experiments, paid calls or deployment. When the Change-level gate passes, move this packet to its archive, record the remaining joint obligations on the Design, reconcile the catalog, commit that closure, and join with `node scripts/repo-tools/change-lifecycle.mjs integrate --leaf <this-leaf> --obligations-transferred`. Verify the archived packet is on the implementation branch and the open packet is absent, record that target SHA, stop owned resources and retire the clean integrated worktree. Design-level A1–A12/V01–V12 acceptance remains pending and does not block that source join or the archive. Do not join main. Do not start another Change. A failed indispensable Change-level proof keeps the worktree. A concrete material contradiction stops the affected work.

## Touched paths

infra/platform/observability/artifacts.mjs
infra/platform/observability/identity.mjs
infra/platform/observability/install.mjs
infra/platform/observability/inventory.mjs
infra/platform/observability/readiness.mjs
infra/platform/observability/receipt.mjs
infra/platform/observability/values/profiles/dev/collector.yaml
infra/platform/observability/tests/diagnostic-worker.test.mjs
infra/platform/observability/tests/install.test.mjs
infra/platform/observability/tests/inventory.test.mjs
infra/platform/observability/tests/readiness.test.mjs
infra/platform/observability/tests/receipt.test.mjs
infra/platform/observability/tests/render.test.mjs
infra/platform/observability/tests/snapshot-fixtures.mjs
infra/environments/infra-cli.mjs
infra/environments/infra-cli.test.mjs
infra/environments/platform-plan.mjs
infra/environments/platform-plan.test.mjs
infra/verification/diagnostic-live.mjs
infra/verification/diagnostic.mjs
infra/verification/diagnostic.test.mjs
infra/verification/provisioning.mjs
infra/verification/provisioning.test.mjs
scripts/repo-tools/check-lab-manifests.mjs
docs/technical/platform/observability-native-infrastructure.md
docs/runbooks/kubernetes-observability.md
work/changes/README.md
work/changes/open/README.md
work/changes/ledger/2026-11.md
work/designs/open/observability-developer/ACCEPTANCE.md
work/designs/open/observability-developer/IMPLEMENTATION-PLAN.md

Exception: scripts/repo-tools/check-lab-manifests.mjs because the new profiles/dev overlay path must be allowlisted for lab-manifest scanning.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/observability-native-infrastructure.md#structural-inventory-and-readiness | docs/technical/platform/observability-native-infrastructure.md | changed: record offline source realization of ordered base+overlay desired, base predecessor, Helm history/manifest projection, upgrade-required, owned ensure adapters, F08 worker aliases; no live certification claim | infra/platform/observability/artifacts.mjs; infra/platform/observability/inventory.mjs; infra/platform/observability/readiness.mjs; infra/platform/observability/install.mjs; infra/platform/observability/receipt.mjs; infra/platform/observability/identity.mjs; infra/platform/observability/values/profiles/dev/collector.yaml; SHA `67b0bf4fabfcb12647dd17a82adee2275e7457d9` | source-tested offline 237/237 PASS; live cluster/Docker NOT-RUN | unknown variant/release predecessor/malformed overlay refuse before template; pending never ready; predecessor ensure refuses with upgrade-required and no writes | Design ACCEPTANCE transferred joint A1–A12/V01–V12; catalogs/ledger |
| docs/product/README.md | docs/product/README.md | unchanged because local observability does not alter player behavior, authorization, persistence or paid model policy | none; product pages untouched | unchanged and source-inspected as out of scope | no product claim introduced; SDK enrollment remains absent | none |
| docs/runbooks/kubernetes-observability.md#what-the-selected-native-platform-is | docs/runbooks/kubernetes-observability.md | changed: document dev overlay merge and upgrade-required predecessor refusal without advertising live readiness | docs/runbooks/kubernetes-observability.md | source-reconciled; live acceptance NOT-RUN | runbook still refuses to treat ensure/status exit as live certification | catalog links retained |
| work/designs/open/observability-developer/ACCEPTANCE.md | work/designs/open/observability-developer/ACCEPTANCE.md | unchanged: A1–A12/V01–V12 remain NOT-RUN / pending and are not marked passed; obligations transferred from this Change | work/designs/open/observability-developer/ACCEPTANCE.md; work/designs/open/observability-developer/IMPLEMENTATION-PLAN.md | evidence-gated | live gates NOT-RUN | ACCEPTANCE + IMPLEMENTATION-PLAN + catalogs |
