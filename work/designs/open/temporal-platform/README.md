# Temporal platform | greenfield design

**Status: Proposed; owner review required. No implementation commission.**

Original source baseline: main 03ea79c469d0, 2026-11-25. Next review: 2026-11-26 or earlier with owner. Next decision: approve exact file responsibilities and configuration specimen. Existing Temporal infra directory deliberately excluded; no live cluster inspected. PostgreSQL tuning deferred.

## Architecture

One shared Temporal installation per Kind cluster, upstream Helm chart, four independently deployable server roles, existing CNPG persistence, UI and admin tools. Dev slots share the server but retain distinct durable Temporal namespaces. Native Helm owns deployment and schema hooks; our adapter does not recreate Kubernetes reconciliation.

```text
API / application workers
         | gRPC 7233
    Temporal frontend
         |
history / matching / internal worker
         |
CNPG: temporal + temporal_visibility
```

Trusted local deployment, not production HA/security claim. No Elasticsearch, Redis or RabbitMQ dependency, private chart, second Temporal operator or per-slot server.

## Proposed infrastructure tree and ownership

| Target path under infra/platform/temporal/ | Contents / owner | Design |
| --- | --- | --- |
| README.md | Short operating guide: prerequisites, configuration, commands, diagnosis, upgrade warning | This overview + [operations](OPERATIONS.md) |
| chart.pin | Released chart version, URL, checksum | [HELM.md](HELM.md#artifact-chartpin) |
| values.yaml | Common upstream Helm values, topology, persistence, resources, UI/admin, metrics | [HELM.md](HELM.md#common-configuration-valuesyaml) |
| profiles/development.yaml | Dev SQL endpoints and genuine dev-only overrides | [HELM.md](HELM.md#profiles-profilesdevelopmentyaml-and-profilesreleaseyaml) |
| profiles/release.yaml | Release SQL endpoints and genuine release-only overrides | [HELM.md](HELM.md#profiles-profilesdevelopmentyaml-and-profilesreleaseyaml) |
| install.mjs | One mutating adapter, artifact and prerequisite checks, native Helm invocation | [OPERATIONS.md](OPERATIONS.md#installmjs) |
| readiness.mjs | Read-only release, rollout and RPC observations | [OPERATIONS.md](OPERATIONS.md#readinessmjs) |
| tests/install.test.mjs | Deterministic installer contract tests | [VERIFICATION.md](VERIFICATION.md) |
| tests/readiness.test.mjs | Deterministic observation contract tests | [VERIFICATION.md](VERIFICATION.md) |

No local chart templates, persistence DSL, shell installer or duplicate bootstrap. Common platform profile owns cluster/namespace; existing PostgreSQL authority supplies databases/credentials. Namespace registration belongs to environment tenant lifecycle.

## Design reading order

1. [HELM.md](HELM.md): vendor choice, artifact pin, values and profiles, render review.
2. [PERSISTENCE.md](PERSISTENCE.md): databases, credential ownership and application namespace boundaries.
3. [OPERATIONS.md](OPERATIONS.md): exact division between install and readiness, operation semantics and failures.
4. [INTEGRATION.md](INTEGRATION.md): existing external callers and common utilities.
5. [VERIFICATION.md](VERIFICATION.md): source tests, rendering and live proof.
6. [REVIEW.md](REVIEW.md): decisions, review history and outstanding acceptance gates.

## Outstanding evidence

Candidate chart 1.8.0 tagged source inspected; published artifact URL and checksum recorded. [Concrete values specimen](specimen/README.md) and [source-derived inventory](specimen/RESOURCE-INVENTORY.md) available. Archive-byte verification and actual render still outstanding. Concrete PG credential integration and full caller migration map remain unresolved. Existing deployment adoption requires separate permission; no destructive default.

After owner acceptance, reconcile permanent technical/runbook owners before selecting implementation Changes. See [design lifecycle](../../README.md).
