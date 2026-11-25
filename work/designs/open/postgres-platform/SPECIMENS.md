# Concrete specimens | round 6

2026-11-26. Proposed design, not executable production source. Baseline main 73b3154025e94ad2f827cdb03eda4b389e19ac35. This round inspected the existing chart declarations only to discriminate composition choices; detailed orchestration audit next. No Helm render, local test or cluster mutation performed.

## Decision: retain Helm as a renderer, not a PostgreSQL release manager

Round 3 favored native YAML with minimal composition. Round 6 inspected infra/platform/postgres/chart/{Chart.yaml,values.schema.json,templates/_helpers.tpl,templates/namespace.yaml,templates/cluster.yaml,profiles/*.yaml}. Existing chart has two output resource kinds, no packaged database, no release lifecycle required. The profile supplies identity, resources, storage and bootstrap; common pin overlay supplies operand image. Native YAML duplication would require a separate pin substitution and dynamic owned-experiment identity mechanism; Kustomize could express static overlays but needs dynamic composition for experiment names/labels and changes existing shared renderer contract. Helm already exists and validates profile inputs. Keeping a small chart is provisionally the lowest complexity route. No migration to Helm operator installation or helm install/uninstall of CNPG Cluster. Review exact rendering/JSON stream compatibility before modifying chart. Do not create Helm charts for dynamic database/role resources. Native typed objects plus existing serializer are adequate.

Chart specimens below are conceptual, not a replacement chart. Preserve current schema/sections/pin injection/render contract until source audit. Avoid duplicating profile-specific labels or values in JS. Numeric resource values are carried forward ONLY for comparison of render identity; they are not endorsed and release 20 is rejected as target. Do not deploy specimen.

## Candidate source layout

```text
infra/platform/postgres/
  README.md
  operator.pin
  chart/                   # small native Namespace + Cluster renderer
    Chart.yaml
    values.yaml
    values.schema.json
    profiles/
      development.yaml
      release.yaml
    templates/
      namespace.yaml
      cluster.yaml
      _helpers.tpl          # only where shared render protocol requires
  install.mjs              # common operator / baseline ensure
  readiness.mjs            # observation, semantic compatibility and bounded waits
  topology.mjs             # explicit resize / independent experiment operations
  databases/               # native DB/role operations and ACL primitives
    resources.mjs
    access.mjs
    credentials.mjs        # only PG source credentials; consumer projection stays separate
  temporal-persistence/    # preserve existing dedicated policy until proven simpler
  tests/
```

Not a mandatory file quota or final rename map. Public CLI wrappers/presentation/common helpers may need retention; split a responsibility only if its real source warrants. Application provisioning/migrations and developer slot identity remain consumer-side. Baseline ACL configuration lives with cluster declarations/explicit platform maintenance, not tenant startup. Avoid a broad databases.mjs doing everything; small operations should compose without a generic workflow engine. Final tree follows actual callers and complexity.

## Rendered Cluster specimen

See specimens/cluster-development.yaml: native shape illustrating current identity, bootstrap, storage and settings. Explicit enableSuperuserAccess false documents security intent (upstream default); must prove compatibility. Fresh baseline postInitSQL candidate in specimens/baseline-acl.sql, NOT yet included in Cluster manifest. Bootstrap hook execution order and template/replication/internal role access gated. Existing cluster must not replay bootstrap. No new numeric settings selected.

## Fresh tenant specimen

See specimens/tenant-dev-42.yaml, example only, no Secret values. Names match existing slot derivation. DatabaseRole login false and Database allowConnections false are fresh-only phase declarations. Missing password Secret must be generated create-only before these objects. Never apply specimen to existing identity. Render typed native objects; no string-concatenated YAML. Candidate SQL ACL transaction in specimens/tenant-acl.sql, run from known maintenance DB after confirming closed target and exact roles/owner; SQL identifier quoting/validation required for actual dynamic names. Verify catalog and generation after every consequential step, no broad grants on unrelated DBs. Actual migration/schema permissions remain consumer-owned. Do not grant runtime login before schema proof in fresh path.

## Operational API specimen (illustrative contracts, not implementation)

```ts
type PgTarget = { context: string; namespace: string; cluster: string };
type ObservedIdentity = PgTarget & { uid: string; resourceVersion: string };
type Outcome = "ready" | "absent" | "pending" | "conflict" | "unknown";
type Observation = { outcome: Outcome; identity?: ObservedIdentity; reasons: string[] };
type MutationReceipt = { outcome: "created" | "reused" | "changed" | "refused" | "partial" | "unknown"; reasons: string[] };
```

Conceptual operations (names not frozen):
- render(profile, section) -> existing native manifest protocol, no host access.
- observe(target) -> redacted actual operator/Cluster/identity/readiness data, distinguish absent from unknown.
- ensureBaseline(profile, authorizedScope) -> verified pin and operator ready, compatible Namespace and Cluster create/reuse, baseline ACL validation. No resize, implicit patch, migration or upgrade.
- setInstances(observedIdentity, desired, authorizedScope) -> capacity, healthy state, CAS patch of instances only, wait; no retry unknown mutation, explicit scale-down permission.
- ensureOwnedCluster(profile, experimentIdentity, desired, authorizedScope) -> same rendering and observation, create only owned target; no implicit cleanup.
- createScopedRoles / createClosedDatabases / setDatabaseAccess / verifyRoleAndDatabase / readOrCreateSourceCredential -> narrow native and SQL primitives, not a generic pipeline DSL. Actual data types and imports selected after callers read. An observed identity is not authorization; operation boundary must validate target, actor, lock and scope.
- consumer application/Temporal orchestration composes these operations with explicit policy, retains existing public contracts.

For public interfaces preserve infra:up/plan/status/render and infra:postgres syntax, default JSON vs human modes and exit codes per operator contract; no new public CLI until demonstrated need. Current shared renderer emits legacy JSON document stream internally; don't replace silently. Diagnostic status gives declared/observed instances, primary, readiness, resource budget and refusal reason, not credentials. Preserve progress on stderr.

## Discriminating review

1. Does chart preserve exact native manifest and resource identities? Compare old/new parsed documents; no live apply.
2. Does same ensure work for both contexts with policy supplied as data? Trace actual callers next round; refuse ambient context.
3. Does ordinary reuse preserve explicit live replica count? Test differing observed count and semantic drift separately.
4. Can application and Temporal reuse small primitives without merging policy? Compare actual source; retain proven Temporal path unless measurable simplification and equivalent proof.
5. Is fresh ACL safe before login/open? Disposable CNPG proof needed, including internal health and wrong-role negatives. Existing baseline remediation separate.
6. Is file layout actually smaller in responsibility and code, not just moved? Source audit next. No arbitrary line/file cap, no demand to remove working Helm.

Next: detailed legacy gap analysis. Read actual installer/topology/readiness, common helpers and consumers/tests. Map every retained or retired entrypoint and incompatible canonical requirement. Revisit provisional tree based on source evidence; no implementation or destructive operation authorized.

## Defense revision (round 8)

[Defense pass 1](DEFENSE.md) rejects generic tenant orchestration; use narrowly scoped common PostgreSQL access and native resource primitives based on stronger existing Temporal implementation, including actual primary discovery, identity fencing, bounded commands, verified catalog attributes and credential revision. Preserve separate consumer sequences. Shared operation lock/admission ownership and exact compatibility matrix must be resolved before commissioning; no final layout guarantee. No runtime proof.
