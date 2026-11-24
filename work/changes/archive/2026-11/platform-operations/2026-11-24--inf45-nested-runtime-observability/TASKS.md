# INF45 bounded dispatch

Sequential T-IDs; parent reads CHANGE and only selected execution section. INF44 schema/storage/collector extension landed; may implement pure runtime parser fixtures independently, integrate after INF44; no INF29 runtime code edits. Each child runs focused positive/negative fixtures, reports files/commands/results and stops. No research swarm.

- T01: Explicit local runtime discovery and Docker snapshots. Anchors: infra/clusters/kind/manager/config.mjs::PROFILE_HOME/readKindProfile; infra/platform/common/commands.mjs::assertPlatformTarget (read-only semantics only); infra/monitoring/runtime.py (new); infra/monitoring/tests/test_runtime.py (new). See [T01](EXECUTION.md#t01-explicit-local-runtime-discovery-and-docker-snapshots).
- T02: Kubelet summary and pod identity/events. Anchors: infra/monitoring/runtime.py; infra/monitoring/kube.py (new); infra/monitoring/tests/test_kube.py (new). See [T02](EXECUTION.md#t02-kubelet-summary-and-pod-identityevents).
- T03: Read-only nested cgroup peaks and safe process attribution. Anchors: infra/monitoring/cgroup_probe.sh (new); infra/monitoring/kube.py; infra/monitoring/tests/test_cgroup.py (new). See [T03](EXECUTION.md#t03-read-only-nested-cgroup-peaks-and-safe-process-attribution).
