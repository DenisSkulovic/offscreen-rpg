# INF09 | dispatch

Gate INF08 (Done); branch/worktree guard. Sequential bounded children; forward selected EXECUTION section and named anchors only. No live operations.

| T-ID | Read anchors | Exit proof |
| --- | --- | --- |
| T01 Profile and observation | infra/clusters/kind/manager/config.mjs; infra/clusters/kind/manager/dev-host-probe.mjs; EXECUTION common contract | Exact positive/negative cases in EXECUTION T01; changed paths and test receipt |
| T02 Pins and local render | infra/platform/postgres/operator.pin; infra/platform/temporal/images.pin; infra/workloads/render.mjs | Exact positive/negative cases in EXECUTION T02; changed paths and test receipt |
| T03 Validation integration | scripts/repo-tools/check-lab-manifests.mjs; scripts/repo-tools/check-lab-manifests.test.mjs; .github/workflows/code.yml; .prettierignore | Exact positive/negative cases in EXECUTION T03; changed paths and test receipt |

Parent closes after all required proof; no next packet automatically.
