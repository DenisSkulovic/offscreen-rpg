# INF44 bounded dispatch

Sequential T-IDs; parent reads CHANGE and only selected execution section. None; disjoint from INF29 runtime/lifecycle code. Each child runs focused positive/negative fixtures, reports files/commands/results and stops. No research swarm.

- T01: Native configuration and installed lifecycle. Anchors: infra/monitoring/config/netdata.conf (new); infra/monitoring/systemd/offscreen-monitor@.service (new); infra/monitoring/install.sh (new); docs/runbooks/workstation-observability.md. See [T01](EXECUTION.md#t01-native-configuration-and-installed-lifecycle).
- T02: Bounded record storage and identity primitives. Anchors: infra/monitoring/records.py (new); infra/monitoring/storage.py (new); infra/monitoring/tests/test_storage.py (new). See [T02](EXECUTION.md#t02-bounded-record-storage-and-identity-primitives).
- T03: Sub-second memory windows and rollups. Anchors: infra/monitoring/host.py (new); infra/monitoring/records.py; infra/monitoring/tests/test_host.py (new). See [T03](EXECUTION.md#t03-sub-second-memory-windows-and-rollups).
- T04: Safe process snapshots and service entrypoint. Anchors: infra/monitoring/processes.py (new); infra/monitoring/collector.py (new); infra/monitoring/tests/test_processes.py (new); infra/monitoring/tests/test_collector.py (new). See [T04](EXECUTION.md#t04-safe-process-snapshots-and-service-entrypoint).
