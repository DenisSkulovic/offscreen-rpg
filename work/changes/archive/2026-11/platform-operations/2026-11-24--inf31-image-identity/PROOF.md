# INF31 proof

Parent re-ran, from the INF31 worktree:

`node --test infra/images/distribution/kind-image-loader.test.mjs infra/images/development/tests/load-dev-slot-image.test.mjs infra/images/development/tests/dev-slot-image-plan.test.mjs infra/environments/release/test/migration.test.mjs infra/environments/release/test/rollout.test.mjs`

Result: 78 pass, 0 fail.

Negatives observed in that run: post-load config mismatch, ambiguous index, absent ref, stale fingerprint hint, fingerprint drift during build, malformed receipt nodes.

Live cluster, Docker daemon, Tilt, and registry: NOT-RUN. No adversarial or production acceptance.
