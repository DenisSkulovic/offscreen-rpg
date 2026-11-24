# INF26 dispatch

Sequential T-IDs; first T01. Dependency: INF20. One child at a time.

- T01: Canonical CNPG readiness and primary selection. Read infra/platform/postgres/dev-bootstrap.mjs; infra/platform/postgres/dev-host-probe.mjs; tools/dev-environments/src/application/dev-shared-core-readiness.mjs; infra/platform/common/commands.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-canonical-cnpg-readiness-and-primary-selection).
- T02: Canonical object and Temporal read-only readiness. Read infra/platform/object-storage/dev-bootstrap.mjs; infra/platform/temporal/dev-bootstrap.mjs; tools/dev-environments/src/application/dev-shared-core-readiness.mjs; infra/platform/common/commands.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t02-canonical-object-and-temporal-readonly-readiness).
