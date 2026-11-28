# Human operator CLI | E1

**Owner:** repository owner. **Posture:** focused evolutionary tooling, not a new infrastructure architecture. **Source:** `main` at `f686b80d273a8f784d8121c50ac3d9017f35cdfa` (clean committed snapshot; live host not inspected). **Next decision:** owner accepts this E1 and commissions CLI01 at the next implementation launch, 2026-11-28. One Change, one bounded implementation; no formal architecture defense or review batch is necessary for this adapter over settled contracts.

## Outcome

A human returning to the workstation can discover what exists, understand what is running, start a local cluster and select backing services without consulting an agent. One discoverable `pnpm offscreen` entry point; native Docker, Kind, kubectl, Helm and Tilt remain the operator's tools. Keep all 82 existing scripts unchanged, including machine output contracts. No framework, daemon, dependency, global install, replacement controller or new config model.

## Selected interface

All commands below are new E1 targets, not existing capabilities. `dev` and `release` are explicit targets; never infer a mutating target from the current kube context.

| Command after `pnpm offscreen` | Meaning |
| --- | --- |
| (nothing), `--help`, `<group> --help` | Static discoverable help, no probes or writes. |
| `status`, `cluster list`, `cluster status [dev\|release]` | Overview of Docker node containers and explicit kube contexts; native next steps. No implied workload health. |
| `cluster start dev\|release` | Ensure cluster only using the existing guarded `infra:up --services none` route. If retained nodes are stopped, diagnose and show the exact native owner resume route rather than creating a replacement. |
| `platform plan\|up\|status dev\|release [--services SELECTION]` | Existing platform commands, human by default, `--json` opt-in. Default `core`; `none`, `all` and comma-separated services use the existing selection parser. Omitted services are not stopped. |
| `dev up\|new\|reserve\|attach\|status\|stop` | Existing owned slot commands; `--instance` where supported. `up` translates to no positional command. |
| `release up\|status\|down` | Existing release application lifecycle; status human summary, `--json` legacy report. Down removes application resources, not cluster nodes. |
| `postgres plan\|ensure\|status ...` | Existing topology CLI, existing explicit `--env` and other options. |
| `obs connect [--queries]` | Existing dev observability connection; keep foreground and custody behavior. |
| `verify --suite source\|diagnostic ...` | Existing infrastructure verification, not automatic on startup. |

`status`/`cluster` inspection support `--json`; other delegated commands advertise only their own real output options. Plain text, bounded errors, nonzero failures, static help, no secrets in new summaries. Existing app/DB/observability guards, admission, child events and machine outputs remain authoritative. Keep native inspection out of the project CLI rather than wrapping every kubectl command.

## Deliberate limit: retained cluster shutdown/resume

Kind has no project-qualified suspend/resume contract. Existing platform ownership assertions need a reachable API and namespace UID; a stopped Docker node cannot prove that live identity. Arbitrary automated Docker start/stop would introduce an unqualified host lifecycle and risk active dev leases, durable workloads and cross-cluster ownership. E1 intentionally does **not** add a whole-cluster stop or automatic retained-node resume mutation. The owner can use native Docker for known local node containers after checking custody, quiescing workloads and preserving storage; the CLI then verifies readiness using the existing guarded route. No scale-all, Docker prune, delete/recreate, volume deletion or operator bypass. A later evolution is justified only if the native resume route proves a recurring inconvenience; it needs explicit stopped-node identity, custody, shutdown ordering and recovery qualification. Platform suspend/resume is likewise deferred, not simulated by re-installing services.

## Acceptance and closure

[CLI01](../../../changes/open/2026-11-28--cli01-human-operator-cli/CHANGE.md) owns the entire source delivery. One CLI route, existing entrypoints, focused fake-runner/real help tests, one existing operator runbook and canonical operator contract update. No live mutation during implementation; owner walkthrough after source integration is an explicitly separate, NOT-RUN qualification of existing delegated operations, not a new promised Docker resume guarantee. Success means discoverable commands, accurate observed state and failure guidance, no changes to legacy command behavior or permissions. Close and archive both artifacts in the same implementation commission after focused source acceptance; promote selected meaning and retain residual live-proof limits. No further design round for ordinary mechanical issues.
