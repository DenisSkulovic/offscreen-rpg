# INF15 | dispatch

Gate INF10–INF14; branch/worktree guard. Sequential bounded children; forward selected EXECUTION section and named anchors only. No live operations.

| T-ID | Read anchors | Exit proof |
| --- | --- | --- |
| T01 Explicit environment plans | infra/platform/common/profile.mjs; existing dev bootstrap CLIs; infra/platform/{postgres,temporal,object-storage,gateway}/install.sh; infra/clusters/kind/release/up.sh | Exact positive/negative cases in EXECUTION T01; changed paths and test receipt |
| T02 Stack and slot startup | scripts/repo-tools/stack-lifecycle.mjs::buildStackPlan; scripts/repo-tools/stack.mjs::runPlannedCommand; tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileOwnedDevSlot; stack-lifecycle.test.mjs; stack-run.test.mjs | Exact positive/negative cases in EXECUTION T02; changed paths and test receipt |
| T03 Final guard and docs join | scripts/repo-tools/infra-layout.test.mjs; scripts/repo-tools/check-lab-manifests.mjs; infra/README.md; docs/technical/platform/deployment-and-compatibility.md; docs/runbooks/dev-worktree-stacks.md | Exact positive/negative cases in EXECUTION T03; changed paths and test receipt |

Parent closes after all required proof; no next packet automatically.
