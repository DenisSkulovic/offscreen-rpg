# INF45 implementation decisions

Read the canonical contract, not prior draft messages. All new paths below are selected future files, not claimed existing source.

## T01 Explicit local runtime discovery and Docker snapshots

Anchors: infra/clusters/kind/manager/config.mjs::PROFILE_HOME/readKindProfile; infra/platform/common/commands.mjs::assertPlatformTarget (read-only semantics only); infra/monitoring/runtime.py (new); infra/monitoring/tests/test_runtime.py (new).

Use fixed context allowlist kind-offscreen-dev,kind-offscreen-lab and exact Kind names offscreen-dev/offscreen-lab, expected control-plane/worker nodes; no import Node code or new cluster authority. Config stores explicit Docker context and kubeconfig absolute path, don't use ambient context. Bounded subprocess argv no shell interpolation, 2–3s timeout, max4MiB output, verify kind inventory and Docker node cluster label, kubeconfig named context+cluster and loopback port (dev24443–24543, release6443) before Kube calls, if unreadable record gap. Docker ps --no-trunc format id/name/state, docker inspect safe formatted ID/name/start/state/image only, docker stats --no-stream --format '{{json .}}' at5s one in flight; resolve full IDs, units parse SI/IEC precisely, MemUsage cache-subtracted separately labeled; do not persist raw inspect or arbitrary labels. Distinguish daemon absent, timeout, denied, no containers, stale. Tests injected runner exact context, malformed/missing IDs, context mismatch zero kube probes, units, no raw secret fields, docker absent, duplicate/reused names, partial response.

## T02 Kubelet summary and pod identity/events

Anchors: infra/monitoring/runtime.py; infra/monitoring/kube.py (new); infra/monitoring/tests/test_kube.py (new).

10s staggered bounded per-node summary via explicit kubeconfig/context and /api/v1/nodes/<expected>/proxy/stats/summary; parse only actual node/pod/container usage, source timestamp, UID, CPU cumulative/instant rate, memory usage/workingSet/rss, FS/network and PSI if available. Read pod list metadata+status using kubectl get pods -A -o json with exact context, whitelist UID, namespace, workload owner ref name/kind/UID, role from known app identity, container ID, started/terminatedAt, reason/exit code, restarts, resource requests/limits. Read events via bounded watch using resourceVersion, reconnect/relist on 410 with coverage gap and dedup UID+resourceVersion; allowlist reason/type/object UID/time/count only, no freeform message. No metrics-server install, no get secret/log or cluster write. Keep source time, repeated timestamps marked stale, namespace/Pod UID join only, scope parent/child not additive. Tests kubelet summary stale times, pod restart/new UID, unknown fields ignored, 403/timeout/relist, event dedup, unavailable fields, release/dev cross-target refusal.

## T03 Read-only nested cgroup peaks and safe process attribution

Anchors: infra/monitoring/cgroup_probe.sh (new); infra/monitoring/kube.py; infra/monitoring/tests/test_cgroup.py (new).

At10s, one bounded docker exec per verified exact Kind node, pass validated lowercase 64hex CRI container IDs via stdin to fixed read-only script, no interpolated shell command, find unique cgroup v2 directory matching basename cri-containerd-ID.scope or ID under /sys/fs/cgroup; bound depth/time/output, do not follow symlinks, no cgroup writes/reset. Read memory.current/peak/events/local/stat/swap.current/peak, cpu.stat/io.stat/PSI allowlisted keys; preserve lifetime peak scope and counter resets; sample cgroup.procs safe process stat/status and start ticks, cap 100 process records/node cycle, mark truncation/coverage. No app pod exec, privileged container or host mount. If directory absent/multiple/unreadable or v1 unsupported, record gap; summary survives. Fake temp cgroup tree and fake runner prove peak retained after gauge drop, oom_kill counter delta, PID reuse, ambiguous ID refused, malicious input refused, no mutation, timeout. Live visibility proof read-only after host service authorization: report actual daemon boundary/coverage and one owned node's pod/cgroup mapping if running, no start to manufacture coverage.
