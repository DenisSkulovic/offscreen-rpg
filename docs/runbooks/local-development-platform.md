# Local developer platform | operator quick reference

Current baseline 91bc2af40a94cdf9a95ee7db31a846d60f3abd0c. See [selected target](../technical/platform/local-developer-platform.md) and [permanent verification catalog](../../infra/verification/CAPABILITIES.md). The target commands in that design are NOT implemented until explicitly recorded as such. Use the existing commands below and their linked runbooks. No new live authorization.

| Need | Current command / route |
| --- | --- |
| Plan selected dev/release platform ensures | `pnpm infra:plan --env dev --services core` |
| Ensure cluster and selected platform services | `pnpm infra:up --env dev --services core` |
| Read-only cluster and service status | `pnpm infra:status --env dev --services core` |
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
| Optional release services | individual [Redis](kubernetes-redis.md), [RabbitMQ](kubernetes-rabbitmq.md), [observability](kubernetes-observability.md) runbooks |
| Inspect cluster UI | [Tilt / Headlamp](kubernetes-developer-ui.md) |
| Verify expected capabilities | `pnpm infra:verify --suite source`; `pnpm infra:verify --suite diagnostic` (source + existing local readiness, private per-run JSON); [catalog](../../infra/verification/CAPABILITIES.md) |
| Inspect platform manifests (readable YAML) | `pnpm infra:render <service> <dev\|release> [section]` (default section `all`); direct CLI defaults to compact legacy JSON: `node infra/platform/common/cli.mjs render <service> <dev\|release> [section] [--format yaml\|json\|legacy]` |
| Inspect workload release manifests (readable YAML) | `pnpm infra:render:workloads [section]` (default section `all`); direct CLI: `node infra/workloads/render.mjs release [section] [--format yaml\|json\|legacy] [--values PATH]` |

Do not use proposed flags on current commands. Linux/WSL is the current host assumption. Prefer source tests when a stack is unnecessary; run only selected authorized live cases. On capacity failure stop only the attempted owned workload set, preserve tenants, report blocker; do not delete another stack or lower gates. No production connection or paid-provider proof. Report exact current command, phase and next action rather than improvising kubectl writes.

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
