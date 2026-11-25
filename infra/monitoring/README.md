# Workstation monitoring install tree

`offscreen-monitor-managed: v1`

Python companion modules under this directory install to `/usr/local/lib/offscreen-monitor` via `install.sh`.

| Module | Role |
| --- | --- |
| `host.py`, `processes.py`, `storage.py`, `collector.py`, `records.py` | INF44 host windows, safe processes, JSONL retention |
| `runtime.py` | Explicit Docker context / Kind identity and docker snapshots |
| `kube.py` | Read-only kubelet summary, pod identity/events, cgroup collector |
| `cgroup_probe.sh` | Read-only cgroup v2 peak/events probe (stdin 64-hex CRI IDs) |
| `install.sh`, `config/`, `systemd/` | Guarded plan/apply install assets |

Source acceptance runs the full Python suite under `infra/monitoring/tests/` plus staged `install.sh --apply --confirm` in `OFFSCREEN_MONITOR_FIXTURE=1` temp roots. Composition proof invokes the real installed `collector.py --config` entrypoint (fixture mode only), asserts timestamped `host_window` records, process snapshots, health coverage, SIGTERM flush, and restart session rollover in the same state root.

Emitted supplemental records use `schemaVersion=1` with kinds `host_window`, `host_rollup`, `process_snapshot`, `docker_snapshot`, `pod_snapshot`, `cgroup_snapshot`, `coverage`, and `health` as implemented today; [INF47](../../../work/changes/open/2026-11-24--inf47-historical-observability-queries/CHANGE.md) owns historical CLI/query on top of these streams without changing the v1 field contract.

Live native Netdata package install, systemd activation, nested daemon visibility, and live dbengine tier counts are **not** established by source-only proof and remain separately operator-authorized.
