# Workstation observability | operator runbook

**Target, not currently runnable.** [Technical contract](../technical/platform/workstation-observability.md). Workstation collector independent of Kubernetes and game. Native Netdata v2 at http://127.0.0.1:19999 after authorized install, private supplemental state ~/.local/state/offscreen-monitor. No cloud connection, no raw process argv exports.

## Installation and inspection

Source changes INF44–47 first. Native package version/availability check, explicit operator installation of Netdata v2 via trusted distro/vendor package and systemd support, then `bash infra/monitoring/install.sh --plan` and explicit authorized `--apply` using selected Docker context/kubeconfig. No WSL restart, no implicit sudo/package repo changes. If systemd or package version unavailable, report BLOCKED and exact prerequisite, no alternative monitoring stack. Collector starts on distro boot, but WSL shutdown stops collection; gaps recorded. Optional atop raw logging requires separate acknowledgement of sensitive argv storage, off by default. Native dashboard and report distinguish WSL distro vs Docker engine/Kind descendants; Windows physical host metrics not implemented.

## Planned commands

```sh
pnpm infra:monitor:status
pnpm infra:monitor:report --last 30m
pnpm infra:monitor:report --from 2026-11-24T18:00:00Z --to 2026-11-24T19:00:00Z --slot dev-10 --json
pnpm infra:monitor:export --from 2026-11-24T00:00:00Z --to 2026-11-25T00:00:00Z --out /tmp/offscreen-incident
````

Read current coverage before interpretation. Min/max observed vs kernel peak, source measurement timestamp vs collection time, separate nested scopes, unknown gaps and collector cost. No live data export without user request. Service stop is not data deletion; never clear vendor DB to fix a query. Retention actual may be shorter than targets. Source verification does not authorize live install. See technical contract for retention and proof.
