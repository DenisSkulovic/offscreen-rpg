# Local developer platform | operator quick reference

Current baseline 91bc2af40a94cdf9a95ee7db31a846d60f3abd0c. See [selected target](../technical/platform/local-developer-platform.md) and [permanent verification catalog](../../infra/verification/CAPABILITIES.md). The target commands in that design are NOT implemented until explicitly recorded as such. Use the existing commands below and their linked runbooks. No new live authorization.

## Human walkthrough (`pnpm offscreen`; source-tested, owner walkthrough NOT RUN)

1. Start Docker Desktop (WSL integration on).
2. `pnpm offscreen status` shows dev/release Kind node state (container observation, not Kubernetes readiness).
3. `pnpm offscreen cluster start dev` ensures the cluster via the guarded `infra:up --services none` route.
4. `pnpm offscreen platform up dev --services core` (`plan`/`status` are read-only; `none`, `all` or a comma list also work; omitted services are not stopped).
5. `pnpm offscreen dev up` starts the application; `pnpm offscreen dev stop` parks your owned slot. `pnpm offscreen release down` removes release application resources, not cluster nodes.

Other routes: `release up|status`, `postgres plan|ensure|status --env ...`, `obs connect`, `verify --suite ...`; `pnpm offscreen --help` lists them.

**Stopped nodes.** If `cluster start` reports STOPPED it will not start Docker nodes for you. After confirming no other session or job uses them, run `docker start <cluster>-control-plane <cluster>-worker` and `kubectl --context <context> wait --for=condition=Ready nodes --all --timeout=180s`, then retry. Stopping nodes is owner-only and manual, not a qualified suspension protocol: first stop owned applications (`dev stop`), verify no other active sessions or jobs, quiesce stateful services by their own procedures ([PostgreSQL](kubernetes-postgres.md), [RabbitMQ](kubernetes-rabbitmq.md), [dev stacks and Tilt](dev-worktree-stacks.md)), never scale everything down or delete volumes, and never stop an unknown or shared cluster. Scale a standalone Deployment only with a known intended replica count and exclusive ownership.

**Native inspection** (the CLI does not wrap these): `docker ps -a`, `kind get clusters`, `kubectl config get-contexts` (optional `kd`/`kr` aliases for the dev/release contexts), `kubectl --context <ctx> get nodes`, `get pods -A`, `get deploy,sts -A`, `get pvc -A`, `get events -A`, `logs`, `helm list -A --kube-context <ctx>`.

| Need | Current command / route |
| --- | --- |
| Plan selected dev/release platform ensures | `pnpm infra:plan --env dev --services core` (default JSON; add `--human` for plain text) |
| Ensure cluster and selected platform services | `pnpm infra:up --env dev --services core` (default JSON; `--human` adds phase progress on stderr) |
| Read-only cluster and service status | `pnpm infra:status --env dev --services core` (default JSON; add `--human` for plain text) |
| Start dev application (full) | `pnpm dev`; [dev lifecycle](dev-worktree-stacks.md) |
| Allocate another full environment | `pnpm dev:new` |
| Reserve or attach without starting | `pnpm dev:reserve`, `pnpm dev:attach --instance dev-N` |
| Observe or park owned slot | `pnpm dev:status`, `pnpm dev:stop`, optional `--instance dev-N` |
| Development platform plan | `node infra/environments/dev/platform.mjs plan` |
| Ensure dev core on existing cluster | `node infra/environments/dev/platform.mjs ensure kind-offscreen-dev` |
| Release core plan | `node infra/environments/release/platform.mjs plan` |
| Release platform ensure | `node infra/environments/release/platform.mjs ensure kind-offscreen-release` |
| Release application | explicit image build then `pnpm stack:up`; [release runbook](kubernetes-lab.md) |
| Release observation / application stop | `pnpm stack:status`, `pnpm stack:down` |
| Optional platform services (dev or release when selected) | individual [Redis](kubernetes-redis.md), [RabbitMQ](kubernetes-rabbitmq.md), [native observability](kubernetes-observability.md) runbooks; observability is structural on both profiles, dev is the primary live target |
| Inspect cluster UI | [Tilt / Headlamp](kubernetes-developer-ui.md) |
| Verify expected capabilities | `pnpm infra:verify --suite source`; `pnpm infra:verify --suite diagnostic` (source + existing local readiness, private per-run JSON); [catalog](../../infra/verification/CAPABILITIES.md) |
| Inspect platform manifests (readable YAML) | `pnpm infra:render <service> <dev\|release> [section]` (default section `all`); direct CLI defaults to compact legacy JSON: `node infra/platform/common/cli.mjs render <service> <dev\|release> [section] [--format yaml\|json\|legacy]` |
| Inspect workload release manifests (readable YAML) | `pnpm infra:render:workloads [section]` (default section `all`); direct CLI: `node infra/workloads/render.mjs release [section] [--format yaml\|json\|legacy] [--values PATH]` |

Do not use proposed flags on current commands except the documented `--human` / `--json` / `--help` / `--no-color` output modes on `infra:plan` / `infra:up` / `infra:status`. Linux/WSL is the current host assumption. Prefer source tests when a stack is unnecessary; run only selected authorized live cases. On capacity failure stop only the attempted owned workload set, preserve tenants, report blocker; do not delete another stack or lower gates. No production connection or paid-provider proof. Report exact current command, phase and next action rather than improvising kubectl writes.

## Platform CLI human output (INF56 source)

Default stdout for `pnpm infra:plan|up|status` remains one JSON object for existing machine callers. Explicit `--json` is equivalent. Explicit `--human` prints a plain multi-line summary on stdout and, for `up` only, phase `START`/`OK`/`FAIL` lines with elapsed ms on stderr. `--help` is static and makes zero host/cluster calls. `--no-color` is accepted only with `--human` (output is already plain). Mutually exclusive or repeated flags refuse before any runner.

Limits: human text allowlists service/phase/refusal ids and never prints raw child stderr, argv, or env; overall `ok` is not equated with every service healthy; failed `up` does not claim data unchanged. Source fixtures cover both profiles; live readiness and human operator acceptance remain NOT-RUN. PostgreSQL topology uses `pnpm infra:postgres` (human default, `--json` for receipts); see [kubernetes-postgres](kubernetes-postgres.md).

## Workload chart defaults and local values overrides

Profile-owned defaults live in `infra/workloads/profiles/development.yaml` and `infra/workloads/profiles/release.yaml`. They are the chart inputs today; changing them is a repository change, not a per-developer tweak.

**Release profile (`profiles/release.yaml`)**

| Setting | Value |
| --- | --- |
| `resources.requests.cpu` (shared across roles) | `50m` |
| Per-role `resources.requests.<role>.memory` | web `256Mi`, api `384Mi`, authority `384Mi`, control `256Mi`, executor `256Mi`, relay `256Mi` |
| Per-role `resources.limits.<role>.memory` | web `768Mi`, api `1024Mi`, authority `1024Mi`, control `768Mi`, executor `768Mi`, relay `768Mi` |
| Deployment replicas | `1` per role unless overridden |

**Development profile (`profiles/development.yaml`)**

| Setting | Value |
| --- | --- |
| `resources.requests.cpu` (shared) | `50m` |
| Per-role `resources.requests.<role>.memory` | web `384Mi`, api `384Mi`, authority `384Mi`, control `256Mi`, executor `256Mi`, relay `256Mi` |
| Limits | not set in the dev profile (chart applies requests only) |
| Deployment replicas | must remain `1` per role |

Per-role CPU overrides are not supported. Only the keys above plus `replicas` / `replicasByRole` may appear in a values override file (see `infra/workloads/render.mjs`).

**Local untracked override file**

Keep override files outside Git (for example under `/tmp` or a personal ignored path). Pass them only through the existing renderer:

```bash
pnpm infra:render:workloads all --values /path/to/my-overrides.yaml
# or explicit format / legacy compact JSON:
node infra/workloads/render.mjs release all --values /path/to/my-overrides.yaml
node infra/workloads/render.mjs release all --format yaml --values /path/to/my-overrides.yaml
```

A valid override is a YAML mapping using only the permitted keys, for example:

```yaml
replicasByRole:
  api: 2
  executor: 3
resources:
  requests:
    cpu: 100m
    api:
      memory: 512Mi
  limits:
    api:
      memory: 768Mi
```

On the development profile, `replicas` and every `replicasByRole` entry must stay `1`. Release accepts per-role counts for roles `web`, `api`, `authority`, `control`, `executor`, and `relay`.

**Tracked example (replicas only)**

`infra/workloads/profiles/experiments/release-replicas.yaml` shows release-style `replicasByRole` overrides (`api` and `authority` at `2`, `executor` at `3`; other roles omitted so chart default `1` applies). It is documentation and source-test input only; it is not the default dev or release profile and is not applied automatically by `pnpm dev` or `pnpm stack:up`.

**RES-01 and admission**

Capability [RES-01](../../infra/verification/CAPABILITIES.md) (measured small/default resource preset) remains **target-only** until live workstation measurements exist. Do not treat an unmeasured “small” preset as safe for scheduling or as permission to lower existing admission memory floors (for example the lab `MemAvailable` gate documented in [kubernetes-lab.md](kubernetes-lab.md) and [dev-worktree-stacks.md](dev-worktree-stacks.md)). This runbook does not change default resource limits in the profiles or any admission threshold.
