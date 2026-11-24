# INF28 dispatch

Sequential T-IDs; first T01. Dependency: INF24, INF26. One child at a time.

- T01: Remove last duplicate SeaweedFS manifest authority. Read infra/platform/object-storage/store.yaml; infra/verification/fixtures/document-access; infra/platform/common/render.mjs; infra/platform/object-storage/install.sh. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-remove-last-duplicate-seaweedfs-manifest-authority).
- T02: Retire trial code from runtime surface. Read tools/dev-environments/src/adapters/dev-s3-tenant-trial.mjs; dev-sql-tenant-trial.mjs; dev-sql-tenant-migrate-trial.mjs; dev-temporal-tenant-trial.mjs; tools/dev-environments/test/dev-toy-breaker-campaign.test.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t02-retire-trial-code-from-runtime-surface).
