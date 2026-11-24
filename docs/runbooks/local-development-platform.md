# Local developer platform | operator quick reference

Current baseline 91bc2af40a94cdf9a95ee7db31a846d60f3abd0c. See [selected target](../technical/platform/local-developer-platform.md) and [permanent verification catalog](../../infra/verification/CAPABILITIES.md). The target commands in that design are NOT implemented until explicitly recorded as such. Use the existing commands below and their linked runbooks. No new live authorization.

| Need | Current command / route |
| --- | --- |
| Start dev application (full) | `pnpm dev`; [dev lifecycle](dev-worktree-stacks.md) |
| Allocate another full environment | `pnpm dev:new` |
| Reserve or attach without starting | `pnpm dev:reserve`, `pnpm dev:attach --instance dev-N` |
| Observe or park owned slot | `pnpm dev:status`, `pnpm dev:stop`, optional `--instance dev-N` |
| Development platform plan | `node infra/environments/dev/platform.mjs plan` |
| Ensure dev core on existing cluster | `node infra/environments/dev/platform.mjs ensure kind-offscreen-dev` |
| Release core plan | `node infra/environments/release/platform.mjs plan` |
| Release platform ensure | `node infra/environments/release/platform.mjs ensure kind-offscreen-lab` |
| Release application | explicit image build then `pnpm stack:up`; [release runbook](kubernetes-lab.md) |
| Release observation / application stop | `pnpm stack:status`, `pnpm stack:down` |
| Optional release services | individual [Redis](kubernetes-redis.md), [RabbitMQ](kubernetes-rabbitmq.md), [observability](kubernetes-observability.md) runbooks |
| Inspect cluster UI | [Tilt / Headlamp](kubernetes-developer-ui.md) |
| Verify expected capabilities | [catalog](../../infra/verification/CAPABILITIES.md); unified runner is planned |

Do not use proposed flags on current commands. Linux/WSL is the current host assumption. Prefer source tests when a stack is unnecessary; run only selected authorized live cases. On capacity failure stop only the attempted owned workload set, preserve tenants, report blocker; do not delete another stack or lower gates. No production connection or paid-provider proof. Report exact current command, phase and next action rather than improvising kubectl writes.
