# INF32 route

- T01 Apply selected desired state regardless of image change — infra/environments/release/rollout.mjs::buildFilteredApplyManifest/prepareReleaseApplyManifest; infra/environments/release/install.sh; infra/environments/release/test/rollout.test.mjs. Exact edits and negative proof in EXECUTION.md section T01.
- T02 Verify selected rollout actual replicas — infra/environments/release/rollout.mjs::verifyDeploymentRolloutExecution/verifySelectedReleaseRollouts; infra/environments/release/test/rollout.test.mjs; infra/images/distribution/kind-image-loader.mjs. Exact edits and negative proof in EXECUTION.md section T02.

Sequential tasks; dependency INF31.
