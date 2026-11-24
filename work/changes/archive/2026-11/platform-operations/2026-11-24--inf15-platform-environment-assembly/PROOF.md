# INF15 | proof

Offline real Helm render/lint and fake runner only. Compare normalized full objects to tracked pre-change baseline by kind/namespace/name; preserve labels, storage, commands, secrets refs and selectors, except explicit selected deltas. Assert negative command traces: no mutation on unreadable/foreign state, no deletes or credential replacement during normal lifecycle, no schema replay. Failure after create retains owned state; next attempt reobserves. No actual secrets in snapshots.

- T01: Explicit environment plans; exact cases specified in EXECUTION T01; inspect infra/platform/common/profile.mjs; existing dev bootstrap CLIs; infra/platform/{postgres,temporal,object-storage,gateway}/install.sh; infra/clusters/kind/release/up.sh.
- T02: Stack and slot startup; exact cases specified in EXECUTION T02; inspect scripts/repo-tools/stack-lifecycle.mjs::buildStackPlan; scripts/repo-tools/stack.mjs::runPlannedCommand; tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileOwnedDevSlot; stack-lifecycle.test.mjs; stack-run.test.mjs.
- T03: Final guard and docs join; exact cases specified in EXECUTION T03; inspect scripts/repo-tools/infra-layout.test.mjs; scripts/repo-tools/check-lab-manifests.mjs; infra/README.md; docs/technical/platform/deployment-and-compatibility.md; docs/runbooks/dev-worktree-stacks.md.

Run owner node --test files and named legacy tests, bash -n/node --check, changed-source formatting/quality checks, docs health. Required missing tool = NOT-RUN; failed tests = FAIL. Record actual receipt, live NOT-RUN.
