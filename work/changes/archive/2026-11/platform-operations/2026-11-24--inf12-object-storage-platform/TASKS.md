# INF12 | dispatch

Gate INF09; branch/worktree guard. Sequential bounded children; forward selected EXECUTION section and named anchors only. No live operations.

| T-ID | Read anchors | Exit proof |
| --- | --- | --- |
| T01 SeaweedFS chart | infra/platform/object-storage/store.yaml; tools/dev-environments/src/adapters/dev-object-store-bootstrap.mjs::renderDevObjectStore; dev-object-store-bootstrap.test.mjs | Exact positive/negative cases in EXECUTION T01; changed paths and test receipt |
| T02 Guarded installer | dev-object-store-bootstrap.mjs; dev-object-store-host-probe.mjs; dev-object-store-bootstrap-cli.mjs; infra/verification/smoke/object-storage/smoke.sh | Exact positive/negative cases in EXECUTION T02; changed paths and test receipt |
| T03 Verification and content bootstrap split | infra/verification/smoke/object-storage/smoke.sh; infra/environments/release/content-bootstrap/smoke.sh; docs/runbooks/kubernetes-object-storage.md; docs/runbooks/kubernetes-content-bootstrap.md | Exact positive/negative cases in EXECUTION T03; changed paths and test receipt |

Parent closes after all required proof; no next packet automatically.
