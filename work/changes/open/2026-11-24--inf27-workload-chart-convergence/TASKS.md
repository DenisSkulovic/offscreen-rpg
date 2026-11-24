# INF27 dispatch

Sequential T-IDs; first T01. Dependency: INF18 Done. One child at a time.

- T01: Make values authoritative without redesign. Read infra/workloads/chart/templates/_helpers.tpl; infra/workloads/chart/values.yaml; infra/workloads/profiles/{development,release}.yaml; infra/workloads/tests. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-make-values-authoritative-without-redesign).
- T02: Trim unused profile declarations. Read infra/workloads/chart/values.schema.json; infra/workloads/chart/values.yaml; infra/workloads/profiles/{development,release}.yaml; infra/workloads/chart/templates/_helpers.tpl. Exact implementation and proof in [EXECUTION](EXECUTION.md#t02-trim-unused-profile-declarations).
