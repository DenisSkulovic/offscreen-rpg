# INF22 dispatch

Sequential T-IDs; first T01. Dependency: INF21. One child at a time.

- T01: Read and create projected Secrets safely. Read tools/dev-environments/src/rendering/dev-slot-project.mjs::readOwnedBackingSecret/applyDevSlotSecret; infra/platform/common/commands.mjs::readPlatformObject; tools/dev-environments/test/dev-slot-project.test.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-read-and-create-projected-secrets-safely).
- T02: No implicit allocation in projection. Read tools/dev-environments/src/rendering/dev-slot-project.mjs; tools/dev-environments/src/application/dev-slot-startup.mjs; tools/dev-environments/test/dev-slot-project.test.mjs; tools/dev-environments/test/dev-slot-startup.test.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t02-no-implicit-allocation-in-projection).
