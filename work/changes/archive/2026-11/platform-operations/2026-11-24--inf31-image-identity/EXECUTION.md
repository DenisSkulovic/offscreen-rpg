# INF31 execution

## T01 Compare like identities

infra/images/distribution/kind-image-loader.mjs::ensureKindImage/parseCtrDigest; infra/images/distribution/kind-image-loader.test.mjs; infra/environments/release/migration.mjs::collectAcceptedMigrationImageIds

Keep receipt.digest as Docker config ID for existing consumers. For node ref read exact ctr images ls target digest, then docker exec node ctr -n k8s.io content get TARGET; parse OCI/Docker manifest config.digest; if index resolve platform using docker inspect node OS/architecture (normalize x86_64→amd64, aarch64→arm64), require exactly one matching manifest (exclude attestations/unknown); get manifest content and config.digest. Export readKindImageIdentity({node,ref,run}) returns null on confirmed absent else {configId,manifestDigest,targetDigest}; validate sha256 shape, JSON, media type, bounded runner, unreadable refuse. Compare configId to host .Id at reuse/load/final, never compare target to config. Receipt add nodes map keyed exact node. No Docker archive or registry redesign. Test deliberately distinct config/manifest/index, wrong config, unknown/index ambiguity, absent, reuse and reload. node --test infra/images/distribution/kind-image-loader.test.mjs.

## T02 Aliases and release receipt consumers

infra/images/development/load-dev-slot-image.sh; infra/images/development/image-plan.mjs::confirmLoadedAliasIdentity; infra/environments/release/migration.mjs; infra/environments/release/rollout.mjs

Alias tag skip/verify uses same shared node identity function via loader CLI inspect mode (profile dev/ref/node validated against discoverKindNodes); compare alias target to verified canonical target on same node or config ID via helper, no third-column-as-config. CLI output JSON. Release receipts retain digest and add node identity map; release migration/rollout accepted IDs use verified config+manifest+target for actual node(s), not arbitrary Docker RepoDigests; preserve current stable refs/annotation, no deployment patch in loader. INF32 waits for this. Test distinct digest aliases and valid receipt; node --test infra/images/development/tests/*.test.mjs infra/environments/release/test/{migration,rollout}.test.mjs. Do not edit dev-tilt readiness here; INF34 consumes receipt/identity helper.

## T03 Avoid stale build labels

infra/images/development/build.sh::ensureDevArtifact; infra/images/development/load-dev-slot-image.sh; infra/images/development/image-plan.mjs::fingerprintDevImageContext; infra/images/development/tests/load-dev-slot-image.test.mjs

Recompute fingerprint once under existing fingerprint flock before cache/build; externally supplied fingerprint is hint only; if mismatch exit clear retry diagnostic (do not silently build under stale key). On actual cache miss build under temporary unique tag with fingerprint label, recompute after build before publishing canonical tag; if changed discard temp tag only, refuse and retry by operator; no distribution/ref publication. Cache hit uses verified label and fresh fingerprint; no extra full hash after hit. Remove temp tag on normal completion, preserve unrelated images. Existing source mutation window cannot be perfectly eliminated without snapshot build; this is practical detection, not adversarial proof. Test stale hint, edit during build, stable cache hit no build, successful build.
