# DXK05 | Compose-free CI and clean-clone Kubernetes lab protections

**State:** Done (2026-11-20). CI no longer boots Compose. Lab scripts do not require historical Compose volumes. Static guards cover stale compose commands, the node image pin, and the lab context. A live kind deploy of this CI path was not executed. DXK06 still owns deleting Compose.
**Kind:** implementation. **Date:** 2026-11-20.
**Program:** [Kubernetes-first developer experience](../../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md) · [planner source map](../../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/SOURCE-MAP.md) · [parent Cursor waves](../../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/CURSOR-HANDOFF.md).
**Inspected source:** attached 13bcd6cf + connected GitHub main through 8796daaa on 2026-11-20; unpushed Cursor changes NOT inspected.
**Owner selected destination:** Kubernetes-only app development on kind, 1-command run, visual Tilt + Headlamp, no active Compose after all DXK Changes pass. Selection is via work/QUEUE.md, not this heading.

## Goal, ownership, dependencies

Compose-free CI and clean-clone Kubernetes lab protections. **Own/edit:** .github/workflows/code.yml, scripts/repo-tools/{ci-change-scope.mjs,ci-change-scope.test.mjs}, infra/kubernetes/lab component smoke/install scripts; scoped CI/kind tests.

**Source and technical authority:** .github/workflows/code.yml native Postgres services and Compose Temporal/infrastructure jobs; infra/kubernetes/lab/lib.sh snapshot_* and assert_* helpers; named volume assumptions. **Prerequisites:** DXK01 safe cluster entrypoint and actual TURN02 app release. CI must remain useful before full cluster verification and must not create expensive broad jobs by default.

**Avoid duplicate writers:** TURN02 alone owns real app image manifests, Kubernetes resource integrations and one Gateway; TURN03/BOOT03/STORY03 own mechanics/fork/real worker correctness. This Change must consume verified upstream work, not build a second fake app stack. Another selected DXK packet cannot edit this packet's named owner files concurrently.

## Cursor first-screen route card

**DEPTH:** PATCH-M per task except PATCH-L where explicitly stated; default Composer 2.5 Standard. **Start:** read this Change and **one** T-ID from [TASKS.md](TASKS.md), then the first 2-5 source anchors that T-ID names, not the entire wiki/program dossier. Confirm git status and actual HEAD. Patch named owner files, focused positive and discriminating negative, then run targeted tests. No paid provider call, cluster reset, foreign context mutation or secret log. Exact scope and test matrix are in TASKS.md.

**What fails acceptance:** a green unit smoke masking non-working Kubernetes or fabricated app readiness; silent mutation of existing DB/campaign; broad 0.0.0.0 host bind; losing unrelated volumes; an unobserved browser/cluster claim; resurrecting Compose as a second blessed boot path. Stop on a newly discovered authority conflict or failed prerequisite with precise source evidence; do not force a PASS by dropping a necessary assertion.

## Implementation checkpoints (details only in TASKS.md)

- **T01 | CI lanes without Compose:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
- **T02 | Remove hard dependency on historical named volumes:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
- **T03 | CI scoping and failure probes:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
**Verification tiers:** focused static/unit tests may be run before real kind. For a live acceptance tier, use exact current cluster context, actual Pods/Jobs/SQL/S3 and browser; record PASS/FAIL/NOT-RUN for normal and negative cases separately. Repeated runs must be safe. Finish CHANGE.md receipt with executed command, current SHA/image digests/context, failures and residual gaps. Update actual technical docs/STATUS and link health only for changed truths, not guesses. Close/archive only after the bounded goal is proved, then update catalog and work selector without skipping dependent work.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended delta | Proof and no-op |
| --- | --- | --- |
| Product | unchanged: accepted game rules, content rights, and player intent stay as already written | Demo/release may not invent gameplay or broaden staff privileges |
| Technical | changed: code CI and lab volume rules in docs/technical/platform/deployment-and-compatibility.md and docs/runbooks/kubernetes-lab.md | The workflow is not a live cluster proof and does not claim multi-Pod gameplay |
| Code | changed: .github/workflows/code.yml, scripts/repo-tools/ci-change-scope.mjs, scripts/repo-tools/check-dxk05-ci-guards.mjs, and infra/kubernetes/lab/lib.sh | negative: a compose.yaml-only push does not force integration, and a lost unrelated volume fails |
| Related | changed: STATUS.md, work/changes/README.md, and work/IMPLEMENTATION-ROADMAP.md | Catalog and status record the CI fact and leave QUEUE unselected |

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Code checks do not boot Compose | docs/technical/platform/deployment-and-compatibility.md Tests that demonstrate the architecture | changed: the code workflow parses lab YAML and a GitHub Postgres service, and it does not start Compose or kind | docs/technical/platform/deployment-and-compatibility.md#tests-that-demonstrate-the-architecture; .github/workflows/code.yml; scripts/repo-tools/check-lab-manifests.mjs; scripts/repo-tools/check-lab-manifests.test.mjs; base 4bf21285 | fixture-tested: check-lab-manifests.test.mjs 3 pass / 0 fail; workflow text has zero docker compose matches | a deliberately invalid YAML file makes parseLabYamlFile throw | deployment page states this workflow is not a live cluster proof |
| CI path scope follows Kubernetes files | docs/technical/platform/deployment-and-compatibility.md Tests that demonstrate the architecture | changed: Tiltfile, lab dev/release paths, and Dockerfiles select integration; a compose.yaml-only push does not | scripts/repo-tools/ci-change-scope.mjs; scripts/repo-tools/ci-change-scope.test.mjs | fixture-tested: ci-change-scope.test.mjs 7 pass / 0 fail | classifyChangeScope of compose.yaml on push keeps runIntegration false and runCode true | same deployment paragraph |
| Stale compose, image pin, and lab context fail closed | docs/technical/platform/deployment-and-compatibility.md Tests that demonstrate the architecture | changed: infrastructure job runs check-dxk05-ci-guards.mjs | scripts/repo-tools/check-dxk05-ci-guards.mjs; scripts/repo-tools/check-dxk05-ci-guards.test.mjs; infra/kubernetes/lab/lib.sh; infra/kubernetes/lab/app-release/images.pin | fixture-tested: check-dxk05-ci-guards.test.mjs 5 pass / 0 fail; CLI scanned 28 targets | docker compose config text throws; a pin without NODE_DIGEST throws; context minikube throws | same deployment paragraph |
| Cold clone does not need historical Compose volumes | docs/runbooks/kubernetes-lab.md What it must not do | changed: existing unrelated volumes stay; absence of the two historical Compose volumes is valid | infra/kubernetes/lab/lib.sh; infra/kubernetes/lab/cnpg/install.sh; infra/kubernetes/lab/cnpg/smoke.sh; infra/kubernetes/lab/temporal/install.sh; infra/kubernetes/lab/temporal/smoke.sh; infra/kubernetes/lab/object-storage/smoke.sh; infra/kubernetes/lab/content-bootstrap/smoke.sh; infra/kubernetes/lab/document-access/smoke.sh; infra/kubernetes/lab/test/volume-guard.test.mjs | fixture-tested: volume-guard.test.mjs 5 pass / 0 fail | disappearing some-other-volume exits nonzero and names that volume | requirement bullets in kubernetes-lab, kubernetes-postgres, kubernetes-temporal, kubernetes-content-bootstrap, kubernetes-document-access, kubernetes-skeletons, kubernetes-observability, kubernetes-object-storage, and kubernetes-redis |
| Product gameplay rules | docs/product | unchanged: this Change does not alter story, time, permissions, or player intent | no product source behavior changed | unchanged because the diff is CI classification, static guards, and lab volume assertions | a product page was not rewritten to match the lab scripts | STATUS.md records the CI fact and no product heading moved |

**Diff paths named for the close guard:** `.github/workflows/code.yml`, `scripts/repo-tools/ci-change-scope.mjs`, `scripts/repo-tools/ci-change-scope.test.mjs`, `scripts/repo-tools/check-dxk05-ci-guards.mjs`, `scripts/repo-tools/check-dxk05-ci-guards.test.mjs`, `docs/technical/platform/deployment-and-compatibility.md`, `STATUS.md`, `docs/runbooks/kubernetes-lab.md`, `docs/runbooks/kubernetes-postgres.md`, `docs/runbooks/kubernetes-temporal.md`, `docs/runbooks/kubernetes-content-bootstrap.md`, `docs/runbooks/kubernetes-document-access.md`, `docs/runbooks/kubernetes-skeletons.md`, `docs/runbooks/kubernetes-observability.md`, `docs/runbooks/kubernetes-object-storage.md`, `docs/runbooks/kubernetes-redis.md`, `work/changes/README.md`, `work/IMPLEMENTATION-ROADMAP.md`, `work/designs/open/kubernetes-first-developer-experience-2026-11-20/README.md`, `work/changes/ledger/2026-11.md`.

**Remaining:** A live kind image deploy of the CI workflow was not executed. Deleting compose.yaml and the local Compose boot path stays with DXK06. QUEUE stays none.
