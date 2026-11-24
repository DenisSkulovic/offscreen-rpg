# INF24 dispatch

Sequential T-IDs; first T01. Dependency: INF22, INF26. One child at a time.

- T01: Move image factory identity to its actual owner. Read tools/dev-environments/src/image-cache/dev-slot-image-plan.mjs; infra/images/development/load-dev-slot-image.sh; infra/images/development/sync-plan.mjs; tools/dev-environments/test/dev-slot-image-plan.test.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-move-image-factory-identity-to-its-actual-owner).
- T02: Retire platform bootstrap re-export shims. Read tools/dev-environments/src/adapters/dev-{cluster,cnpg,object-store,temporal}-bootstrap.mjs and corresponding host-probe.mjs; infra/environments/platform-plan.mjs; infra/clusters/kind/manager; infra/platform/{postgres,object-storage,temporal}. Exact implementation and proof in [EXECUTION](EXECUTION.md#t02-retire-platform-bootstrap-reexport-shims).
