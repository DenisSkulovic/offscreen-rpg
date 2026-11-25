# Kubernetes Temporal

Operate the local shared Temporal platform using the pinned upstream Helm chart and existing CNPG. See [technical contract](../technical/platform/temporal-infrastructure.md) for ownership, configuration and invariants. This replaces the removed embedded-database installer and toy smoke scripts. The old [2026-11-19 run](https://github.com/DenisSkulovic/offscreen-rpg/blob/3bf63b3ab46de8974b76886031853249c15e1e10/docs/runbooks/kubernetes-temporal.md#observed-local-run) is historical evidence only.

## Prerequisites and targets

From the repository root in supported Linux/WSL environment: installed workspace dependencies, Docker/Kind, kubectl, Helm, curl and flock, sufficient host memory; verified target cluster and healthy CNPG writable service. See [local platform quick reference](local-development-platform.md) and [PostgreSQL](kubernetes-postgres.md). Use explicit contexts, never rely on the current kubectl context.

| Profile | Context | Kubernetes namespace |
| --- | --- | --- |
| dev | kind-offscreen-dev | offscreen-dev-temporal |
| release | kind-offscreen-release | lab-temporal |

Development procedure below is live-observed on an existing cluster. Release uses the same commands with release profile/context/namespace, but release isolation and installation remain unproven. In particular, current source refuses unrelated PUBLIC CONNECT grants; do not bypass that check or change unrelated grants without an approved PostgreSQL operation.

## Plan, render, install and repeat

```bash
pnpm infra:plan --env dev --services temporal
pnpm infra:render temporal dev > /tmp/temporal-dev.yaml
pnpm infra:status --env dev --services temporal
```

Plan/status are read-only; render downloads and verifies the pinned chart but does not contact the cluster. If PostgreSQL is absent, provision it through the normal explicit platform path first (separate authorization). On a fresh authorized target:

```bash
pnpm infra:up --env dev --services temporal
```

This prepares the two databases/role in CNPG, creates the projected credential and namespace, and installs the upstream Helm release. First observed run succeeded in 66 seconds after correcting CNPG normalization handling. Repeating on matching healthy state took 2 seconds; no automatic upgrade or schema replay. Do not run legacy install.sh, release-install.mjs or deleted smoke scripts.

## Inspect the runtime

```bash
helm --kube-context kind-offscreen-dev -n offscreen-dev-temporal list --all
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal get deploy,pod,svc,job,pvc
kubectl --context kind-offscreen-dev -n offscreen-dev-postgres get databaserole temporal
kubectl --context kind-offscreen-dev -n offscreen-dev-postgres get database temporal temporal-visibility
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal exec deploy/temporal-admintools -- temporal operator cluster health
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal exec deploy/temporal-admintools -- temporal operator namespace list
```

Expect deployed Helm chart temporal-1.8.0, six ready Deployments/Pods, six Services, no Temporal PVC, both databases and role applied=true, health SERVING. Successful hook Job may already be deleted by Helm. Fresh dev initially has temporal-system only; ordinary dev lifecycle owns game namespace registration. Do not manually create default to bypass tenant binding.

## Browser UI

```bash
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal \
  port-forward svc/temporal-web 8233:8080 --address 127.0.0.1
```

Keep terminal running and open http://localhost:8233. Restart forwarding after web Pod replacement; use hard refresh if old assets are cached. UI 2.58.1 includes upstream Chrome CSP correction; do not disable browser security. No external ingress or public bind.

## Failure and maintenance

If ensure refuses, stop and inspect Helm list, Deployment/Pod events and CNPG CR status. For a failed schema hook, inspect its Job/Pod logs locally with credential redaction. Do not dump Secret values, raw Helm-generated credentials or full sensitive environment. CNPG can temporarily report Secret forbidden before its own RBAC converges; the installer waits for semantic reconciliation. Do not patch operator RBAC manually. Partial resource state is intentionally preserved; do not blindly rerun, adopt, delete, or rotate credentials.

Existing release with different values/chart refuses normal ensure. The observed 2.56.1→2.58.1 UI-only upgrade used the checksum-verified same chart, committed values, explicit target and no hooks because server/schema were unchanged. This is historical scoped maintenance, not a general upgrade procedure. Generic upgrade/rollback and schema compatibility workflow still require design; never skip hooks on a server/schema upgrade just because UI-only maintenance did.

Stop owned consumers before separately authorized replacement. Do not delete an existing namespace or SQL state solely because install refuses. External CNPG stores/role are retained independently of Helm/namespace; cluster destruction may delete all local volumes. No backups/restore proof or production HA. Never treat disposable local permission as permission for another cluster or foreign slot.

## Verification scope

```bash
node --test infra/platform/temporal/tests/*.test.mjs \
  infra/platform/postgres/tests/temporal-persistence.test.mjs \
  infra/environments/platform-plan.test.mjs \
  infra/environments/infra-cli.test.mjs \
  tools/dev-environments/test/dev-temporal-tenant.test.mjs
pnpm infra:verify --suite diagnostic
```

Source fixtures and read-only health are not workflow acceptance. The old toy workflow smoke was retired; no replacement live smoke is claimed. See [dated evidence](../../evidence/runs/2026-11-26-temporal-platform.md) for exact tests and outcomes, and [capability catalog](../../infra/verification/CAPABILITIES.md) for remaining proof.
