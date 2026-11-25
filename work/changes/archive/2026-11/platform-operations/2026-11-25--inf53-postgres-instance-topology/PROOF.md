# INF53 proof

Separate **source** (fixture/unit, no live cluster) from **live** (owner-operated kind/CNPG). This Change does not claim HA, backup, failover, or production availability.

## Source (parent records join)

**Command (from repository root):**

```bash
node --test \
  infra/platform/postgres/tests/*.test.mjs \
  tools/dev-environments/test/dev-cnpg-bootstrap.test.mjs \
  infra/environments/infra-cli.test.mjs \
  infra/environments/infra-cli-operation.test.mjs
```

Helm is required for chart render tests.

**SOURCE RESULT (parent fills exact stdout; do not invent PASS):**

```text
Worktree: /home/dskul/projects/offscreen-rpg-inf53
Branch: change/inf53-postgres-instance-topology
HEAD before close: post T01–T04 working tree
Command: node --test infra/platform/postgres/tests/*.test.mjs tools/dev-environments/test/dev-cnpg-bootstrap.test.mjs infra/environments/infra-cli.test.mjs infra/environments/infra-cli-operation.test.mjs
Result: tests 76 | pass 76 | fail 0 | duration_ms ~2569
STATUS: PASS
```

**Source scope (fixtures only):** both profiles render instance counts 1/2/4/10; invalid inputs refuse; normal dev/release bootstrap does not reset an existing count; only explicit topology `ensure` CAS-patches `spec.instances`; shared readiness gates count, primary, and healthy condition; topology CLI refuses wrong context/owner, scale-down without flag, and insufficient memory preflight. No live kubectl from tests.

## Live acceptance (NOT RUN during implementation)

**Status:** NOT RUN — owner executes after source join on disposable lab/dev targets.

**Procedure sketch (release baseline `lab-pg`; dev observe-only unless owner authorizes):**

1. `plan` then `status` at target count.
2. `ensure` with `--confirm-context kind-offscreen-release` matching live context.
3. Observe Pods, PVCs, Cluster UID/systemID, endpoints, replication lag; verify committed marker on primary and readable replay on standby where applicable.
4. Scale up if capacity permits; scale down only with `--allow-scale-down` and explicit owner authorization.

Do not run destructive fault injection. Do not claim backup/HA from this procedure.

## Historical release smoke (preserved limitation)

The 2026-11-19 `change/k8s02-cnpg` run in [kubernetes-postgres.md](../../../../../../docs/runbooks/kubernetes-postgres.md#observed-local-run) proved **one** CloudNativePG instance: pod replacement kept the same PVC uid. `infra/verification/smoke/postgres/smoke.sh` still requires `instances: 1`. It is not a multi-instance or failover proof.
