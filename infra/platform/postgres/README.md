# PostgreSQL platform (CNPG)

Navigation and operator entrypoints for local CloudNativePG installation, baseline bootstrap, and explicit topology reconciliation. Normative contracts and guarantees live in [database infrastructure](../../../docs/technical/platform/database-infrastructure.md); this file maps source layout and commands only.

## Entrypoints

| Surface | Role |
| --- | --- |
| `pnpm infra:postgres` → `topology-cli.mjs` | Read-only `plan` / `status` and mutating `ensure` for instance count and owned clusters |
| `install.sh` | Release baseline: pinned operator + one primary in `lab-postgres` (invoked from release stack install) |
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
  dev-plan.mjs, dev-execution.mjs     # Dev baseline create/reuse
  release-plan.mjs, release-execution.mjs, release-observation.mjs
  observation-helpers.mjs
topology/
  arguments.mjs   # CLI parsing, owned vs baseline mode
  baseline.mjs    # Baseline plan/ensure/status control
  owned.mjs       # Owned namespace/cluster lifecycle
  observation.mjs # Live cluster reads
  model.mjs       # Rendering, CAS patch, memory preflight, DNS labels
topology.mjs      # Public control API + receipt assembly
topology-presentation.mjs  # Human output (no schema change)
```

Baseline cluster creation stays with bootstrap/install paths. Instance scaling and owned experiment clusters go through `topology-cli.mjs` only.

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
node --test infra/platform/postgres/tests/topology-presentation.test.mjs
node --test infra/platform/postgres/tests/topology.test.mjs
node --test infra/platform/postgres/tests/readiness.test.mjs
```