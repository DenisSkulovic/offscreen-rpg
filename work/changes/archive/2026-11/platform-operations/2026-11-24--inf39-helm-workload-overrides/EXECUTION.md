# INF39 execution

## T01 Per-role replicas without new config language

Anchors: infra/workloads/chart/values.yaml; infra/workloads/chart/values.schema.json; infra/workloads/chart/templates/_helpers.tpl; infra/workloads/tests/workload-chart.test.mjs.

Add optional replicasByRole map with only web/api/authority/control/executor/relay, integer min1; keep global replicas default1. Helper `offscreen-app.roleReplicas` receives {ctx,role}, uses hasKey not default; update all 12 Deployment templates to call it. Dev remains exactly one active replica per role in this slice; reject any dev count !=1 at chart validation, release supports role counts. INF38 will park inactive via rendered graph selection rather than allowing user zero override. No changes to resources defaults or identity. Tests no-overlay exact baseline parity, release executor3/API2 only those change, invalid role/count, dev multi replica refusal. Run node --test infra/workloads/tests/*.test.mjs (Helm present).

## T02 Helm values file with constrained effects

Anchors: infra/workloads/render.mjs::renderWorkloadDocuments/runReleaseCli; infra/workloads/tests/render.test.mjs; infra/workloads/profiles/{development,release}.yaml.

Extend renderer input `valuesPath?: string`, CLI release <section> [--values PATH]. Validate regular readable local file, resolve absolute. Use Helm native -f profile -f valuesPath -f - (internal section/bindings last). Render baseline and candidate all documents for given section; compare identities, count and every non-resource/non-replica field using deep equality after stripping only Deployment.spec.replicas and main container.resources (do not strip init containers/job or sidecars). Reject change to anything else, malformed/missing objects, duplicate identities. Compare actual resource values and replica shapes; CPU/memory quantities must be valid positive Kubernetes quantity strings (simple supported subset m, whole/decimal cores; Ki/Mi/Gi or integer bytes; requests <= limits if both), reject invalid prior to mutations. Existing resource values use shared requests.cpu + per-role requests/limits.memory; document these exact keys, not new DSL; no fake per-role CPU support. Values file should be local ignored path, don't print contents. No-overlay path unchanged. Tests actual Helm custom release resources + replicas, invalid count, override namespace/image/command/secret/port/section refused; dev resource override works, dev replicas2 refused. No CLI lifecycle wiring here (INF38/40).

## T03 Measured preset target and example

Anchors: infra/workloads/profiles; docs/runbooks/local-development-platform.md; infra/workloads/tests/workload-chart.test.mjs.

Add tracked `infra/workloads/profiles/experiments/release-replicas.yaml` with replicasByRole api2,authority2,executor3, rest default; render only example. Document default resource values and how to make local override file using existing keys; no unmeasured 'small' preset claimed safe, record RES-01 remains target until live measurements. Do not change admission memory floor or default resource limits. Source proof render example, no live apply.
