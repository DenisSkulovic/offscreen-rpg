# INF32 execution

## T01 Apply selected desired state regardless of image change

infra/environments/release/rollout.mjs::buildFilteredApplyManifest/prepareReleaseApplyManifest; infra/environments/release/install.sh; infra/environments/release/test/rollout.test.mjs

Remove digest-only skip. Always include selected Deployment annotated with current verified config digest, selected Services; unselected Deployments excluded. Kubernetes apply idempotent on unchanged manifest. Keep migration digest gate and existing ordering; no automatic restart command. Update messages from 'unchanged' to 'prepared selected' where appropriate. Test same digest changed resources/replicas/env appears, same desired manifest identical annotation, web-only excludes API. node --test infra/environments/release/test/rollout.test.mjs.

## T02 Verify selected rollout actual replicas

infra/environments/release/rollout.mjs::verifyDeploymentRolloutExecution/verifySelectedReleaseRollouts; infra/environments/release/test/rollout.test.mjs; infra/images/distribution/kind-image-loader.mjs

After rollout status verify Deployment observedGeneration>=generation, ready/updated replicas equal spec.replicas, list nonterminating Pods and ReplicaSets with exact app selector, use RS controller owner UID linked to Deployment UID, verify expected count and named main container ready + image ID among INF31 verified node identities. Ignore terminating old pods, refuse unexpected nonterminating old replicas or unknown image. Do not create general rollout engine. Tests two replicas one wrong, old RS, foreign pod, missing status, valid multiple, zero replicas if selected spec allows (current chart minimum1). Preserve source-only proof.
