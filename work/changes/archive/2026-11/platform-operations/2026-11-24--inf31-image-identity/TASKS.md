# INF31 route

- T01 Compare like identities — infra/images/distribution/kind-image-loader.mjs::ensureKindImage/parseCtrDigest; infra/images/distribution/kind-image-loader.test.mjs; infra/environments/release/migration.mjs::collectAcceptedMigrationImageIds. Exact edits and negative proof in EXECUTION.md section T01.
- T02 Aliases and release receipt consumers — infra/images/development/load-dev-slot-image.sh; infra/images/development/image-plan.mjs::confirmLoadedAliasIdentity; infra/environments/release/migration.mjs; infra/environments/release/rollout.mjs. Exact edits and negative proof in EXECUTION.md section T02.
- T03 Avoid stale build labels — infra/images/development/build.sh::ensureDevArtifact; infra/images/development/load-dev-slot-image.sh; infra/images/development/image-plan.mjs::fingerprintDevImageContext; infra/images/development/tests/load-dev-slot-image.test.mjs. Exact edits and negative proof in EXECUTION.md section T03.

Sequential tasks; dependency INF24 Done.
