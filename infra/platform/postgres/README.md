# PostgreSQL platform (CNPG)

Navigation and operator entrypoints for local CloudNativePG installation, baseline bootstrap, and explicit topology reconciliation. Normative contracts and guarantees live in [database infrastructure](../../../docs/technical/platform/database-infrastructure.md); this file maps source layout and commands only.

## Entrypoints

| Surface | Role |
| --- | --- |
| `pnpm infra:postgres` → `topology-cli.mjs` | Read-only `plan` / `status` and mutating `ensure` for instance count and owned clusters |
| `install.sh` | Release baseline: native create-only installation or compatible reuse; preserves the live instance count |
| `release-install.mjs` | Programmatic release CNPG install path used by environment assembly |
| `dev-bootstrap.mjs` | Dev CNPG plan/status/ensure exports (`bootstrap/dev-*.mjs`) |
| `infra/environments/{dev,release}/platform.mjs` | Environment-level platform ensure ordering (postgres among other backing services) |

## Chart, pin, and config

- **Chart:** `chart/` — local Helm chart; profile values in `chart/profiles/{development,release}.yaml`.
- **Operator pin:** `operator.pin` — CNPG version, manifest URL, SHA256, operator and Postgres images (`parseCnpgPin` in `config.mjs`).
- **Config:** `config.mjs` — baseline names (`dev-pg` / `lab-pg`), namespaces, kubectl contexts, operator deployment identity, memory admission floors.
- **Readiness:** `readiness.mjs`, `cluster-readiness.mjs` — CNPG healthy phase, poll/timeouts, and topology readiness predicates (used by control layer, not human CLI text alone).

## Source map: bootstrap vs topology

```
bootstrap/
  ensure.mjs          # Single native baseline mutation owner
  operator.mjs        # Pinned inventory and effective object policy
  compatibility.mjs   # Typed effective Cluster spec comparison
  reference/          # Measured dev/release admission references
  observation.mjs     # Full inventory + narrow writable-primary observation
  custody.mjs         # Monotonic deadline and cooperating writer lock
  projection.mjs      # Read-only legacy diagnostic projection
  dev-plan.mjs, release-plan.mjs, dev-execution.mjs, release-execution.mjs
  release-observation.mjs, observation-helpers.mjs
topology/
  arguments.mjs   # CLI parsing, owned vs baseline mode
  baseline.mjs    # Baseline plan/ensure/status control
  owned.mjs       # Owned namespace/cluster lifecycle
  observation.mjs # Live cluster reads
  model.mjs       # Rendering, CAS patch, memory preflight, DNS labels
topology.mjs      # Public control API + receipt assembly
topology-presentation.mjs  # Human output (no schema change)
```

Baseline cluster creation stays with the shared native worker. The exact upstream operator manifest belongs in `vendor/cnpg-1.30.2.yaml`; its SHA256 must match `operator.pin`. No network download occurs during baseline ensure.

Existing compatible baselines are observed, not reapplied. Creation requires explicit maintenance quiescence (`OFFSCREEN_POSTGRES_MAINTENANCE=authorized`) in addition to the entrypoint authorization. Stop topology, tenant and Temporal writers first; the local lock only coordinates baseline writers. Unknown mutation outcomes stop without retries. Do not use ordinary ensure to repair a partial operator inventory.

 Instance scaling and owned experiment clusters go through `topology-cli.mjs` only.

## State and mutation ownership

- **Read-only:** `plan` and `status` never write Kubernetes objects; human output labels plan readiness as not observed and status as observation complete (not cluster READY).
- **Mutating:** `ensure` may patch `spec.instances` (compare-and-swap) or create owned namespace/cluster with `kubectl create` only; requires `--confirm-context` matching the profile context.
- **Receipts:** JSON fields and exit codes are owned by `topology.mjs` / control; presentation in `topology-presentation.mjs` is display-only.

## Commands (examples)

```bash
pnpm infra:postgres plan --env release --cluster lab-pg --instances 2
pnpm infra:postgres status --env release --cluster lab-pg --instances 2
pnpm infra:postgres ensure --env release --cluster lab-pg --instances 2 \
  --confirm-context kind-offscreen-release
pnpm infra:postgres ensure --env release --cluster lab-pg --instances 1 \
  --confirm-context kind-offscreen-release --allow-scale-down
pnpm infra:postgres plan --env release --owner RUN_ID --cluster pg-repl-a --instances 2
pnpm infra:postgres ensure --env release --owner RUN_ID --cluster pg-repl-a --instances 2 \
  --confirm-context kind-offscreen-release
pnpm infra:postgres status --env release --owner RUN_ID --cluster pg-repl-a --instances 2 --json
```

Profiles: **dev** → context `kind-offscreen-dev`, baseline `dev-pg`; **release** → context `kind-offscreen-release`, baseline `lab-pg`. Owned clusters use namespace `offscreen-pg-<owner>`.

## Tests

```bash
node --test infra/platform/postgres/tests/*.test.mjs
node --test tools/dev-environments/test/dev-cnpg-bootstrap.test.mjs
node --test infra/environments/platform-plan.test.mjs
```