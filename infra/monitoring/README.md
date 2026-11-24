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

Source acceptance uses injected runners and temp fixtures. Live host package install, service activation, and nested daemon visibility require separate operator authorization.
