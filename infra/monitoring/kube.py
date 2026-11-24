"""Read-only kubelet summaries, pod identity, events, and nested cgroup probes (INF45 T02/T03)."""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Mapping, Optional, Protocol

from records import SCHEMA_VERSION, InjectableClock, build_scope_id
from runtime import (
    ALLOWED_KUBE_CONTEXTS,
    COMMAND_TIMEOUT_S,
    CommandOutcome,
    CommandRunner,
    KubeProbeState,
    RuntimeConfig,
    default_command_runner,
    verify_kubeconfig_identity,
)

KUBELET_SUMMARY_INTERVAL_S = 10.0
CGROUP_PROBE_INTERVAL_S = 10.0
CGROUP_PROBE_TIMEOUT_S = COMMAND_TIMEOUT_S
KUBE_REQUEST_TIMEOUT = "3s"
KUBELET_SUMMARY_PATH = "/api/v1/nodes/{node}/proxy/stats/summary"
KIND_CGROUP_PROBE_PATH = "/usr/local/bin/offscreen-cgroup-probe.sh"
CGROUP_PROBE_SCRIPT = Path(__file__).resolve().parent / "cgroup_probe.sh"
CGROUP_MAX_PROCESS_RECORDS = 100

_CGROUP_ID_RE = re.compile(r"^[a-f0-9]{64}$")

FORBIDDEN_KUBECTL_SUBCOMMANDS = frozenset(
    {
        "create",
        "apply",
        "delete",
        "patch",
        "replace",
        "edit",
        "exec",
        "attach",
        "port-forward",
        "logs",
        "top",
        "auth",
        "certificate",
        "drain",
        "cordon",
        "uncordon",
        "taint",
        "label",
        "annotate",
        "scale",
        "rollout",
        "set",
    }
)

FORBIDDEN_KUBECTL_RESOURCES = frozenset({"secret", "secrets"})

KNOWN_APP_ROLES = frozenset(
    {
        "game-web",
        "game-api",
        "game-authority",
        "game-control",
        "game-executor",
        "game-relay",
        "migrate",
        "redis",
        "postgres",
        "rabbitmq",
        "temporal",
        "traefik",
    }
)

_APP_LABEL_KEY = "app"

_CRI_ID_RE = re.compile(r"^cri-containerd://([a-f0-9]{64})$", re.IGNORECASE)
_DOCKER_ID_RE = re.compile(r"^([a-f0-9]{64})$", re.IGNORECASE)

_PSI_KEYS = frozenset(
    {
        "avg10",
        "avg60",
        "avg300",
        "total",
    }
)


class KubeAccessState(str, Enum):
    OK = "ok"
    REFUSED = "refused"
    TIMEOUT = "timeout"
    DENIED = "denied"
    UNREADABLE = "unreadable"
    SKIPPED = "skipped"


@dataclass
class KubeSourceTimes:
    """Tracks prior kubelet source timestamps to detect stale repeats."""

    _times: dict[str, str] = field(default_factory=dict)

    def observe(self, key: str, source_time: Optional[str]) -> bool:
        """Return True when source_time repeats a prior value (stale)."""
        if not source_time:
            return False
        prior = self._times.get(key)
        stale = prior == source_time
        self._times[key] = source_time
        return stale


@dataclass
class EventWatchState:
    resource_version: Optional[str] = None
    seen: set[tuple[str, str]] = field(default_factory=set)
    coverage_gaps: list[str] = field(default_factory=list)

    def dedup_key(self, event_uid: str, resource_version: str) -> tuple[str, str]:
        return (event_uid, resource_version)

    def remember(self, event_uid: str, resource_version: str) -> bool:
        """Return True if this event was already emitted."""
        key = self.dedup_key(event_uid, resource_version)
        if key in self.seen:
            return True
        self.seen.add(key)
        return False


@dataclass
class KubeCollectionState:
    last_summary_mono_s_by_node: dict[str, float] = field(default_factory=dict)
    source_times: KubeSourceTimes = field(default_factory=KubeSourceTimes)
    events: EventWatchState = field(default_factory=EventWatchState)
    sequence: int = 0


def kubectl_base_args(config: RuntimeConfig) -> list[str]:
    kubeconfig = str(Path(config.kubeconfig_path).resolve())
    return [
        "--kubeconfig",
        kubeconfig,
        "--context",
        config.kube_context,
        "--request-timeout",
        KUBE_REQUEST_TIMEOUT,
    ]


def assert_kubectl_read_only(args: list[str]) -> None:
    """Reject cluster writes, secrets, logs, and other non-read interfaces."""
    if not args:
        raise ValueError("empty kubectl invocation")
    subcommand = args[0]
    if subcommand in FORBIDDEN_KUBECTL_SUBCOMMANDS:
        raise ValueError(f"forbidden kubectl subcommand {subcommand}")
    for index, token in enumerate(args):
        if token in FORBIDDEN_KUBECTL_RESOURCES:
            raise ValueError("forbidden kubectl resource secret")
        if token == "--raw" and index + 1 < len(args):
            path = args[index + 1]
            if "/proxy/stats/summary" not in path:
                raise ValueError("raw path must be kubelet stats summary only")
    if "get" in args and "pods" not in args and "events" not in args and "--raw" not in args:
        if args[0] != "config":
            raise ValueError("kubectl get limited to pods, events, or raw summary")


def extract_app_role(labels: Mapping[str, Any]) -> Optional[str]:
    value = labels.get(_APP_LABEL_KEY)
    if not isinstance(value, str):
        return None
    role = value.strip()
    if role in KNOWN_APP_ROLES:
        return role
    return None


def normalize_container_id(raw: Optional[str]) -> Optional[str]:
    if not raw or not isinstance(raw, str):
        return None
    text = raw.strip()
    cri = _CRI_ID_RE.match(text)
    if cri:
        return cri.group(1).lower()
    plain = _DOCKER_ID_RE.match(text.removeprefix("containerd://"))
    if plain:
        return plain.group(1).lower()
    return None


def _parse_resource_field(value: Any) -> Optional[dict[str, Optional[str]]]:
    if not isinstance(value, dict):
        return None
    requests = value.get("requests") if isinstance(value.get("requests"), dict) else {}
    limits = value.get("limits") if isinstance(value.get("limits"), dict) else {}
    out: dict[str, Optional[str]] = {}
    for key in ("cpu", "memory"):
        req = requests.get(key)
        lim = limits.get(key)
        if req is not None:
            out[f"request{key.capitalize()}"] = str(req)
        if lim is not None:
            out[f"limit{key.capitalize()}"] = str(lim)
    return out or None


def _parse_cpu_stats(cpu: Any) -> Optional[dict[str, Any]]:
    if not isinstance(cpu, dict):
        return None
    out: dict[str, Any] = {}
    if "time" in cpu:
        out["sourceTime"] = str(cpu["time"])
    if "usageNanoCores" in cpu:
        out["usageNanoCores"] = int(cpu["usageNanoCores"])
    if "usageCoreNanoSeconds" in cpu:
        out["usageCoreNanoSeconds"] = int(cpu["usageCoreNanoSeconds"])
    return out or None


def _parse_memory_stats(memory: Any) -> Optional[dict[str, Any]]:
    if not isinstance(memory, dict):
        return None
    out: dict[str, Any] = {}
    if "time" in memory:
        out["sourceTime"] = str(memory["time"])
    for key in ("usageBytes", "workingSetBytes", "rssBytes", "availableBytes"):
        if key in memory:
            out[key] = int(memory[key])
    return out or None


def _parse_network_stats(network: Any) -> Optional[dict[str, int]]:
    if not isinstance(network, dict):
        return None
    out: dict[str, int] = {}
    for iface, stats in network.items():
        if not isinstance(stats, dict):
            continue
        for key in ("rxBytes", "txBytes", "rxErrors", "txErrors"):
            field_name = f"{iface}.{key}"
            if key in stats:
                out[field_name] = int(stats[key])
    return out or None


def _parse_fs_stats(fs: Any) -> Optional[dict[str, int]]:
    if not isinstance(fs, dict):
        return None
    out: dict[str, int] = {}
    for key in (
        "time",
        "availableBytes",
        "usedBytes",
        "inodesFree",
        "inodes",
        "inodesUsed",
    ):
        if key == "time":
            continue
        if key in fs:
            out[key] = int(fs[key])
    if "time" in fs:
        out["sourceTimeMeta"] = str(fs["time"])
    return out or None


def _parse_psi(psi: Any) -> Optional[dict[str, Any]]:
    if not isinstance(psi, dict):
        return None
    out: dict[str, Any] = {}
    for group in ("cpu", "memory", "io"):
        section = psi.get(group)
        if not isinstance(section, dict):
            continue
        parsed: dict[str, Any] = {}
        for kind in ("some", "full"):
            stats = section.get(kind)
            if not isinstance(stats, dict):
                continue
            subset = {k: stats[k] for k in _PSI_KEYS if k in stats}
            if subset:
                parsed[kind] = subset
        if parsed:
            out[group] = parsed
    return out or None


def parse_kubelet_summary(body: Mapping[str, Any]) -> list[dict[str, Any]]:
    """
  Parse node/pod/container usage from kubelet stats summary.
  Scope is per entity; parent/child metrics are not merged.
  """
    entities: list[dict[str, Any]] = []

    node = body.get("node")
    if isinstance(node, dict):
        node_name = node.get("nodeName")
        node_cpu = _parse_cpu_stats(node.get("cpu"))
        node_mem = _parse_memory_stats(node.get("memory"))
        node_fs = _parse_fs_stats(node.get("fs"))
        node_net = _parse_network_stats(node.get("network"))
        node_psi = _parse_psi(node.get("psi"))
        if node_name and (node_cpu or node_mem or node_fs or node_net or node_psi):
            entities.append(
                {
                    "metricsScope": "node",
                    "nodeName": str(node_name),
                    "cpu": node_cpu,
                    "memory": node_mem,
                    "filesystem": node_fs,
                    "network": node_net,
                    "psi": node_psi,
                    "podUid": None,
                    "namespace": None,
                    "containerName": None,
                }
            )

    pods = body.get("pods")
    if not isinstance(pods, list):
        return entities

    for pod_entry in pods:
        if not isinstance(pod_entry, dict):
            continue
        pod_ref = pod_entry.get("podRef")
        if not isinstance(pod_ref, dict):
            continue
        namespace = pod_ref.get("namespace")
        pod_uid = pod_ref.get("uid")
        if not isinstance(namespace, str) or not isinstance(pod_uid, str):
            continue

        pod_cpu = _parse_cpu_stats(pod_entry.get("cpu"))
        pod_mem = _parse_memory_stats(pod_entry.get("memory"))
        pod_net = _parse_network_stats(pod_entry.get("network"))
        pod_fs = _parse_fs_stats(pod_entry.get("ephemeral-storage"))
        pod_psi = _parse_psi(pod_entry.get("psi"))

        if pod_cpu or pod_mem or pod_net or pod_fs or pod_psi:
            entities.append(
                {
                    "metricsScope": "pod",
                    "nodeName": None,
                    "namespace": namespace,
                    "podUid": pod_uid,
                    "containerName": None,
                    "cpu": pod_cpu,
                    "memory": pod_mem,
                    "network": pod_net,
                    "filesystem": pod_fs,
                    "psi": pod_psi,
                    "parentScope": "pod",
                    "metricsAdditive": False,
                }
            )

        containers = pod_entry.get("containers")
        if not isinstance(containers, list):
            continue
        for container in containers:
            if not isinstance(container, dict):
                continue
            name = container.get("name")
            if not isinstance(name, str):
                continue
            cpu = _parse_cpu_stats(container.get("cpu"))
            memory = _parse_memory_stats(container.get("memory"))
            rootfs = _parse_fs_stats(container.get("rootfs"))
            net = _parse_network_stats(container.get("network"))
            psi = _parse_psi(container.get("psi"))
            if not (cpu or memory or rootfs or net or psi):
                continue
            entities.append(
                {
                    "metricsScope": "container",
                    "namespace": namespace,
                    "podUid": pod_uid,
                    "containerName": name,
                    "cpu": cpu,
                    "memory": memory,
                    "filesystem": rootfs,
                    "network": net,
                    "psi": psi,
                    "parentScope": "pod",
                    "metricsAdditive": False,
                }
            )

    return entities


def parse_pod_list(body: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Extract allowlisted pod metadata/status fields; ignore unknown API fields."""
    items = body.get("items")
    if not isinstance(items, list):
        return []

    pods: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        metadata = item.get("metadata")
        status = item.get("status")
        spec = item.get("spec")
        if not isinstance(metadata, dict):
            continue

        pod_uid = metadata.get("uid")
        namespace = metadata.get("namespace")
        if not isinstance(pod_uid, str) or not isinstance(namespace, str):
            continue

        owner: Optional[dict[str, str]] = None
        refs = metadata.get("ownerReferences")
        if isinstance(refs, list) and refs:
            ref = refs[0]
            if isinstance(ref, dict):
                name = ref.get("name")
                kind = ref.get("kind")
                uid = ref.get("uid")
                if isinstance(name, str) and isinstance(kind, str) and isinstance(uid, str):
                    owner = {"name": name, "kind": kind, "uid": uid}

        labels = metadata.get("labels") if isinstance(metadata.get("labels"), dict) else {}
        app_role = extract_app_role(labels)

        containers_out: list[dict[str, Any]] = []
        spec_containers = spec.get("containers") if isinstance(spec, dict) else None
        resources_by_name: dict[str, Optional[dict[str, Optional[str]]]] = {}
        if isinstance(spec_containers, list):
            for spec_container in spec_containers:
                if not isinstance(spec_container, dict):
                    continue
                cname = spec_container.get("name")
                if isinstance(cname, str):
                    resources_by_name[cname] = _parse_resource_field(
                        spec_container.get("resources")
                    )

        status_containers = status.get("containerStatuses") if isinstance(status, dict) else None
        if isinstance(status_containers, list):
            for st in status_containers:
                if not isinstance(st, dict):
                    continue
                cname = st.get("name")
                if not isinstance(cname, str):
                    continue
                state = st.get("state") if isinstance(st.get("state"), dict) else {}
                running = state.get("running") if isinstance(state.get("running"), dict) else {}
                terminated = (
                    state.get("terminated") if isinstance(state.get("terminated"), dict) else {}
                )
                waiting = state.get("waiting") if isinstance(state.get("waiting"), dict) else {}
                started_at = running.get("startedAt")
                terminated_at = terminated.get("finishedAt")
                reason = terminated.get("reason") or waiting.get("reason")
                exit_code = terminated.get("exitCode")
                restart_count = st.get("restartCount")
                container_id = normalize_container_id(st.get("containerID"))

                entry: dict[str, Any] = {
                    "name": cname,
                    "containerId": container_id,
                    "startedAt": started_at if isinstance(started_at, str) else None,
                    "terminatedAt": terminated_at if isinstance(terminated_at, str) else None,
                    "reason": reason if isinstance(reason, str) else None,
                    "exitCode": int(exit_code) if exit_code is not None else None,
                    "restartCount": int(restart_count) if restart_count is not None else None,
                    "resources": resources_by_name.get(cname),
                }
                containers_out.append(entry)

        pods.append(
            {
                "namespace": namespace,
                "podUid": pod_uid,
                "owner": owner,
                "appRole": app_role,
                "containers": containers_out,
                "joinKey": {"namespace": namespace, "podUid": pod_uid},
            }
        )

    return pods


def parse_allowlisted_event(item: Mapping[str, Any]) -> Optional[dict[str, Any]]:
    """Allowlist reason/type/object UID/time/count only; never persist freeform message."""
    if not isinstance(item, Mapping):
        return None
    metadata = item.get("metadata")
    involved = item.get("involvedObject")
    if not isinstance(metadata, dict) or not isinstance(involved, dict):
        return None

    event_uid = metadata.get("uid")
    resource_version = metadata.get("resourceVersion")
    if not isinstance(event_uid, str) or not isinstance(resource_version, str):
        return None

    object_uid = involved.get("uid")
    if not isinstance(object_uid, str):
        return None

    event_type = item.get("type")
    reason = item.get("reason")
    if not isinstance(event_type, str) or not isinstance(reason, str):
        return None

    event_time = (
        item.get("lastTimestamp")
        or item.get("eventTime")
        or metadata.get("creationTimestamp")
    )
    if not isinstance(event_time, str):
        return None

    count_raw = item.get("count")
    count = int(count_raw) if count_raw is not None else 1

    return {
        "eventUid": event_uid,
        "resourceVersion": resource_version,
        "objectUid": object_uid,
        "type": event_type,
        "reason": reason,
        "time": event_time,
        "count": count,
    }


def _run_kubectl(
    config: RuntimeConfig,
    run: CommandRunner,
    args: list[str],
) -> CommandOutcome:
    assert_kubectl_read_only(args)
    full_args = kubectl_base_args(config) + args
    return run("kubectl", full_args, timeout_s=COMMAND_TIMEOUT_S)


def fetch_kubelet_summary(
    config: RuntimeConfig,
    run: CommandRunner,
    node_name: str,
) -> tuple[Optional[dict[str, Any]], KubeAccessState, str]:
    path = KUBELET_SUMMARY_PATH.format(node=node_name)
    outcome = _run_kubectl(config, run, ["get", "--raw", path])
    if outcome.missing:
        return None, KubeAccessState.UNREADABLE, "kubectl missing"
    if outcome.timed_out:
        return None, KubeAccessState.TIMEOUT, "kubelet summary timed out"
    if outcome.status == 403 or "forbidden" in (outcome.stderr or "").lower():
        return None, KubeAccessState.DENIED, "kubelet summary denied"
    if outcome.output_truncated or not outcome.ok:
        return None, KubeAccessState.UNREADABLE, "kubelet summary unreadable"
    try:
        body = json.loads(outcome.stdout)
    except json.JSONDecodeError:
        return None, KubeAccessState.UNREADABLE, "kubelet summary malformed"
    if not isinstance(body, dict):
        return None, KubeAccessState.UNREADABLE, "kubelet summary malformed"
    return body, KubeAccessState.OK, ""


def fetch_pod_list(
    config: RuntimeConfig,
    run: CommandRunner,
) -> tuple[Optional[dict[str, Any]], KubeAccessState, str]:
    outcome = _run_kubectl(config, run, ["get", "pods", "-A", "-o", "json"])
    if outcome.timed_out:
        return None, KubeAccessState.TIMEOUT, "pod list timed out"
    if outcome.status == 403:
        return None, KubeAccessState.DENIED, "pod list denied"
    if not outcome.ok:
        return None, KubeAccessState.UNREADABLE, "pod list unreadable"
    try:
        body = json.loads(outcome.stdout)
    except json.JSONDecodeError:
        return None, KubeAccessState.UNREADABLE, "pod list malformed"
    if not isinstance(body, dict):
        return None, KubeAccessState.UNREADABLE, "pod list malformed"
    return body, KubeAccessState.OK, ""


def list_events(
    config: RuntimeConfig,
    run: CommandRunner,
) -> tuple[Optional[dict[str, Any]], KubeAccessState, str, bool]:
    """Relist events; third bool is True when API returned 410 Gone."""
    outcome = _run_kubectl(config, run, ["get", "events", "-A", "-o", "json"])
    gone = outcome.status == 410 or "expired" in (outcome.stderr or "").lower()
    if outcome.timed_out:
        return None, KubeAccessState.TIMEOUT, "events list timed out", gone
    if gone:
        return None, KubeAccessState.UNREADABLE, "events resourceVersion expired", True
    if not outcome.ok:
        return None, KubeAccessState.UNREADABLE, "events list unreadable", gone
    try:
        body = json.loads(outcome.stdout)
    except json.JSONDecodeError:
        return None, KubeAccessState.UNREADABLE, "events list malformed", gone
    if not isinstance(body, dict):
        return None, KubeAccessState.UNREADABLE, "events list malformed", gone
    return body, KubeAccessState.OK, "", gone


def advance_event_watch(
    config: RuntimeConfig,
    run: CommandRunner,
    state: EventWatchState,
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Bounded events step: list (or relist after 410) and emit deduplicated allowlisted records.
    Returns parsed event dicts and any new coverage gap reasons.
    """
    body, access, reason, gone = list_events(config, run)
    gaps: list[str] = []
    if gone:
        gaps.append("events watch resourceVersion expired; relist required")
        state.coverage_gaps.extend(gaps)
    if body is None:
        if reason:
            gaps.append(reason)
        return [], gaps

    metadata = body.get("metadata")
    if isinstance(metadata, dict):
        version = metadata.get("resourceVersion")
        if isinstance(version, str):
            state.resource_version = version

    items = body.get("items")
    if not isinstance(items, list):
        return [], gaps

    emitted: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        parsed = parse_allowlisted_event(item)
        if parsed is None:
            continue
        if state.remember(parsed["eventUid"], parsed["resourceVersion"]):
            continue
        emitted.append(parsed)
    return emitted, gaps


def refuse_cross_target(config: RuntimeConfig, run: CommandRunner) -> tuple[bool, str]:
    """Refuse kube probes when pinned context conflicts with kubeconfig port profile."""
    if config.kube_context not in ALLOWED_KUBE_CONTEXTS:
        return False, "kube context not in allowlist"
    verified, _, gap = verify_kubeconfig_identity(config, run)
    if not verified:
        return False, gap or "kubeconfig identity mismatch"
    profile = config.profile()
    if profile is None:
        return False, "missing kind profile"
    return True, ""


def _entity_source_time(entity: Mapping[str, Any]) -> Optional[str]:
    for facet in ("cpu", "memory", "filesystem", "network"):
        section = entity.get(facet)
        if isinstance(section, dict) and section.get("sourceTime"):
            return str(section["sourceTime"])
        if isinstance(section, dict) and section.get("sourceTimeMeta"):
            return str(section["sourceTimeMeta"])
    return None


def _summary_records_for_entity(
    *,
    entity: Mapping[str, Any],
    node_name: str,
    clock: InjectableClock,
    collector_session: str,
    scope_id: str,
    sequence: int,
    source_times: KubeSourceTimes,
) -> tuple[dict[str, Any], int]:
    key_parts = [
        node_name,
        str(entity.get("namespace")),
        str(entity.get("podUid")),
        str(entity.get("containerName")),
        str(entity.get("metricsScope")),
    ]
    time_key = "|".join(key_parts)
    source_time = _entity_source_time(entity)
    stale = source_times.observe(time_key, source_time)

    record: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "pod_snapshot",
        "collectorSession": collector_session,
        "source": "runtime.kubelet",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {
            "cpuNanoCores": "nanocores",
            "cpuCoreNanoSeconds": "nanoseconds-cumulative",
            "memoryBytes": "bytes",
        },
        "target": {"nodeName": node_name},
        "pod": {
            "namespace": entity.get("namespace"),
            "podUid": entity.get("podUid"),
            "containerName": entity.get("containerName"),
            "joinKey": {
                "namespace": entity.get("namespace"),
                "podUid": entity.get("podUid"),
            },
        },
        "kubelet": {
            "metricsScope": entity.get("metricsScope"),
            "metricsAdditive": entity.get("metricsAdditive", False),
            "parentScope": entity.get("parentScope"),
            "sourceTime": source_time,
            "staleSourceTime": stale,
            "cpu": entity.get("cpu"),
            "memory": entity.get("memory"),
            "network": entity.get("network"),
            "filesystem": entity.get("filesystem"),
            "psi": entity.get("psi"),
        },
    }
    return record, sequence


@dataclass
class KubeCollector:
    config: RuntimeConfig
    run: CommandRunner = default_command_runner

    def collect_cycle(
        self,
        *,
        clock: InjectableClock,
        collector_session: str,
        kind_nodes: list[str],
        kube_probes_permitted: bool,
        state: KubeCollectionState,
        now_mono_s: float,
    ) -> tuple[list[dict[str, Any]], KubeAccessState]:
        if not kube_probes_permitted:
            return (
                [
                    _coverage_record(
                        clock=clock,
                        collector_session=collector_session,
                        scope_id=build_scope_id(
                            self.config.installation_id,
                            self.config.boot_id,
                            f"kube:{self.config.kube_context}",
                        ),
                        sequence=state.sequence + 1,
                        reason="kube probes not permitted",
                        access=KubeAccessState.REFUSED,
                    )
                ],
                KubeAccessState.REFUSED,
            )

        permitted, gap = refuse_cross_target(self.config, self.run)
        if not permitted:
            return (
                [
                    _coverage_record(
                        clock=clock,
                        collector_session=collector_session,
                        scope_id=build_scope_id(
                            self.config.installation_id,
                            self.config.boot_id,
                            f"kube:{self.config.kube_context}",
                        ),
                        sequence=state.sequence + 1,
                        reason=gap,
                        access=KubeAccessState.REFUSED,
                    )
                ],
                KubeAccessState.REFUSED,
            )

        scope_id = build_scope_id(
            self.config.installation_id,
            self.config.boot_id,
            f"kube:{self.config.kube_context}",
        )
        records: list[dict[str, Any]] = []
        sequence = state.sequence
        worst = KubeAccessState.OK

        for node_name in kind_nodes:
            last = state.last_summary_mono_s_by_node.get(node_name, 0.0)
            if now_mono_s - last < KUBELET_SUMMARY_INTERVAL_S:
                continue
            summary, access, reason = fetch_kubelet_summary(self.config, self.run, node_name)
            state.last_summary_mono_s_by_node[node_name] = now_mono_s
            if summary is None:
                worst = access
                sequence += 1
                records.append(
                    _coverage_record(
                        clock=clock,
                        collector_session=collector_session,
                        scope_id=scope_id,
                        sequence=sequence,
                        reason=reason or "kubelet summary unavailable",
                        access=access,
                        node_name=node_name,
                    )
                )
                continue
            for entity in parse_kubelet_summary(summary):
                sequence += 1
                record, sequence = _summary_records_for_entity(
                    entity=entity,
                    node_name=node_name,
                    clock=clock,
                    collector_session=collector_session,
                    scope_id=scope_id,
                    sequence=sequence,
                    source_times=state.source_times,
                )
                records.append(record)

        pod_body, pod_access, pod_reason = fetch_pod_list(self.config, self.run)
        if pod_body is None:
            worst = _worst_state(worst, pod_access)
            sequence += 1
            records.append(
                _coverage_record(
                    clock=clock,
                    collector_session=collector_session,
                    scope_id=scope_id,
                    sequence=sequence,
                    reason=pod_reason,
                    access=pod_access,
                )
            )
        else:
            for pod in parse_pod_list(pod_body):
                sequence += 1
                records.append(
                    {
                        "schemaVersion": SCHEMA_VERSION,
                        "kind": "pod_snapshot",
                        "collectorSession": collector_session,
                        "source": "runtime.kube.pods",
                        "scopeId": scope_id,
                        "observedAt": clock.observed_at_utc(),
                        "monotonicNs": str(clock.mono_ns()),
                        "sequence": sequence,
                        "units": {"restartCount": "count"},
                        "pod": pod,
                    }
                )

        events, event_gaps = advance_event_watch(self.config, self.run, state.events)
        for gap in event_gaps:
            worst = _worst_state(worst, KubeAccessState.UNREADABLE)
            sequence += 1
            records.append(
                _coverage_record(
                    clock=clock,
                    collector_session=collector_session,
                    scope_id=scope_id,
                    sequence=sequence,
                    reason=gap,
                    access=KubeAccessState.UNREADABLE,
                    kube_probe_state=KubeProbeState.GAP,
                )
            )
        for event in events:
            sequence += 1
            records.append(
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "kind": "operation",
                    "collectorSession": collector_session,
                    "source": "runtime.kube.events",
                    "scopeId": scope_id,
                    "observedAt": clock.observed_at_utc(),
                    "monotonicNs": str(clock.mono_ns()),
                    "sequence": sequence,
                    "units": {"count": "count"},
                    "event": {k: v for k, v in event.items() if k not in {"eventUid", "resourceVersion"}},
                    "eventDedup": {
                        "eventUid": event["eventUid"],
                        "resourceVersion": event["resourceVersion"],
                    },
                }
            )

        state.sequence = sequence
        return records, worst


class CgroupAccessState(str, Enum):
    OK = "ok"
    GAP = "gap"
    TIMEOUT = "timeout"
    DENIED = "denied"
    UNREADABLE = "unreadable"
    SKIPPED = "skipped"


class CgroupStdinRunner(Protocol):
    def __call__(
        self,
        command: str,
        args: list[str],
        *,
        timeout_s: float,
        stdin_text: str,
    ) -> CommandOutcome: ...


def is_valid_cgroup_container_id(container_id: str) -> bool:
    text = container_id.strip()
    return bool(_CGROUP_ID_RE.match(text))


def partition_cgroup_container_ids(
    raw_ids: list[str],
) -> tuple[list[str], list[dict[str, str]]]:
    """Validate lowercase 64-hex IDs; gaps for malicious or ambiguous input."""
    accepted: list[str] = []
    gaps: list[dict[str, str]] = []
    seen: set[str] = set()
    for raw in raw_ids:
        text = raw.strip()
        if not text:
            continue
        if not is_valid_cgroup_container_id(text):
            gaps.append(
                {
                    "containerId": "rejected",
                    "gapReason": "invalid container id",
                    "inputSample": text[:16],
                }
            )
            continue
        normalized = text.lower()
        if normalized in seen:
            gaps.append(
                {
                    "containerId": normalized,
                    "gapReason": "duplicate container id in batch",
                }
            )
            continue
        seen.add(normalized)
        accepted.append(normalized)
    return accepted, gaps


def cgroup_docker_exec_argv(config: RuntimeConfig, kind_node: str) -> list[str]:
    """Fixed argv for one bounded docker exec per Kind node; IDs never appear in args."""
    return [
        "--context",
        config.docker_context,
        "exec",
        "-i",
        kind_node,
        KIND_CGROUP_PROBE_PATH,
    ]


def default_cgroup_stdin_runner(
    command: str,
    args: list[str],
    *,
    timeout_s: float,
    stdin_text: str,
) -> CommandOutcome:
    try:
        completed = subprocess.run(
            [command, *args],
            input=stdin_text,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        stdout_text = (exc.stdout or b"").decode("utf-8", errors="replace")
        stderr_text = (exc.stderr or b"").decode("utf-8", errors="replace")
        return CommandOutcome(
            ok=False,
            status=None,
            stdout=stdout_text,
            stderr=stderr_text,
            timed_out=True,
        )
    except FileNotFoundError:
        return CommandOutcome(
            ok=False,
            status=None,
            stdout="",
            stderr="",
            missing=True,
        )
    return CommandOutcome(
        ok=completed.returncode == 0,
        status=completed.returncode,
        stdout=completed.stdout or "",
        stderr=completed.stderr or "",
    )


def fetch_cgroup_probe(
    config: RuntimeConfig,
    kind_node: str,
    container_ids: list[str],
    *,
    run_stdin: CgroupStdinRunner = default_cgroup_stdin_runner,
) -> tuple[Optional[str], CgroupAccessState, str]:
    accepted, _ = partition_cgroup_container_ids(container_ids)
    if not accepted:
        return None, CgroupAccessState.GAP, "no valid container ids"
    stdin_text = "\n".join(accepted) + "\n"
    argv = cgroup_docker_exec_argv(config, kind_node)
    outcome = run_stdin(
        "docker",
        argv,
        timeout_s=CGROUP_PROBE_TIMEOUT_S,
        stdin_text=stdin_text,
    )
    if outcome.missing:
        return None, CgroupAccessState.UNREADABLE, "docker CLI missing"
    if outcome.timed_out:
        return None, CgroupAccessState.TIMEOUT, "cgroup probe timed out"
    if "permission denied" in (outcome.stderr or "").lower():
        return None, CgroupAccessState.DENIED, "cgroup probe denied"
    if not outcome.stdout and not outcome.ok:
        return None, CgroupAccessState.UNREADABLE, "cgroup probe unreadable"
    return outcome.stdout, CgroupAccessState.OK, ""


def parse_cgroup_probe_stdout(stdout: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in stdout.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            payload = json.loads(stripped)
        except json.JSONDecodeError:
            rows.append(
                {
                    "state": "gap",
                    "gapReason": "malformed probe line",
                }
            )
            continue
        if isinstance(payload, dict):
            rows.append(payload)
    return rows


@dataclass
class CgroupCounterTrack:
    last_value: Optional[int] = None

    def observe(self, value: Optional[int]) -> tuple[Optional[int], bool]:
        """Return (delta, counter_reset) for monotonic event counters."""
        if value is None:
            return None, False
        if self.last_value is None:
            self.last_value = value
            return None, False
        if value < self.last_value:
            delta = value
            reset = True
        else:
            delta = value - self.last_value
            reset = False
        self.last_value = value
        return delta, reset


@dataclass
class CgroupLifetimeState:
    """Lifetime memory peak and cgroup event counters within one collector session."""

    memory_peak_bytes: Optional[int] = None
    swap_peak_bytes: Optional[int] = None
    oom_kill: CgroupCounterTrack = field(default_factory=CgroupCounterTrack)

    def merge_memory(self, sample: Mapping[str, Any]) -> dict[str, Any]:
        current = _optional_int(sample.get("current"))
        peak = _optional_int(sample.get("peak"))
        candidate = peak
        if candidate is None:
            candidate = current
        if current is not None and (candidate is None or current > candidate):
            candidate = current
        if candidate is not None:
            if self.memory_peak_bytes is None:
                self.memory_peak_bytes = candidate
            else:
                self.memory_peak_bytes = max(self.memory_peak_bytes, candidate)
        events = sample.get("events")
        oom_delta: Optional[int] = None
        oom_reset = False
        if isinstance(events, dict):
            oom_kill = _optional_int(events.get("oom_kill"))
            oom_delta, oom_reset = self.oom_kill.observe(oom_kill)
        swap_peak = _optional_int(sample.get("swapPeak"))
        if swap_peak is not None:
            if self.swap_peak_bytes is None:
                self.swap_peak_bytes = swap_peak
            else:
                self.swap_peak_bytes = max(self.swap_peak_bytes, swap_peak)
        out: dict[str, Any] = {
            "lifetimePeakBytes": self.memory_peak_bytes,
            "sampleCurrentBytes": current,
            "samplePeakBytes": peak,
            "gaugeBelowLifetimePeak": bool(
                current is not None
                and self.memory_peak_bytes is not None
                and current < self.memory_peak_bytes
            ),
        }
        if oom_delta is not None:
            out["oomKillDelta"] = oom_delta
        if oom_reset:
            out["oomKillCounterReset"] = True
        if self.swap_peak_bytes is not None:
            out["lifetimeSwapPeakBytes"] = self.swap_peak_bytes
        return out


def _optional_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def process_identity_key(node: str, proc: Mapping[str, Any]) -> Optional[tuple[str, int, int]]:
    pid_raw = proc.get("pid")
    start_raw = proc.get("starttimeTicks")
    if isinstance(pid_raw, str) and pid_raw.isdigit():
        pid = int(pid_raw)
    elif isinstance(pid_raw, int):
        pid = pid_raw
    else:
        return None
    if isinstance(start_raw, str) and start_raw.isdigit():
        start = int(start_raw)
    elif isinstance(start_raw, int):
        start = start_raw
    else:
        return None
    return (node, pid, start)


@dataclass
class CgroupCollectionState:
    last_probe_mono_s_by_node: dict[str, float] = field(default_factory=dict)
    lifetime_by_key: dict[str, CgroupLifetimeState] = field(default_factory=dict)
    sequence: int = 0


def _cgroup_lifetime_key(node: str, container_id: str) -> str:
    return f"{node}:{container_id}"


def cgroup_records_from_probe(
    *,
    clock: InjectableClock,
    collector_session: str,
    scope_id: str,
    node_name: str,
    probe_rows: list[dict[str, Any]],
    gap_rows: list[dict[str, str]],
    state: CgroupCollectionState,
    sequence_start: int,
) -> tuple[list[dict[str, Any]], int]:
    records: list[dict[str, Any]] = []
    sequence = sequence_start
    for gap in gap_rows:
        sequence += 1
        records.append(
            {
                "schemaVersion": SCHEMA_VERSION,
                "kind": "coverage",
                "collectorSession": collector_session,
                "source": "runtime.cgroup",
                "scopeId": scope_id,
                "observedAt": clock.observed_at_utc(),
                "monotonicNs": str(clock.mono_ns()),
                "sequence": sequence,
                "units": {"reason": "plain-text"},
                "coverage": {
                    "nodeName": node_name,
                    "cgroupAccessState": CgroupAccessState.GAP.value,
                    "containerId": gap.get("containerId"),
                    "reason": gap.get("gapReason", "invalid container id"),
                },
            }
        )

    for row in probe_rows:
        container_id = row.get("containerId")
        if not isinstance(container_id, str):
            continue
        if row.get("state") == "gap":
            sequence += 1
            records.append(
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "kind": "coverage",
                    "collectorSession": collector_session,
                    "source": "runtime.cgroup",
                    "scopeId": scope_id,
                    "observedAt": clock.observed_at_utc(),
                    "monotonicNs": str(clock.mono_ns()),
                    "sequence": sequence,
                    "units": {"reason": "plain-text"},
                    "coverage": {
                        "nodeName": node_name,
                        "containerId": container_id,
                        "cgroupAccessState": CgroupAccessState.GAP.value,
                        "reason": str(row.get("gapReason", "cgroup gap")),
                    },
                }
            )
            continue

        lifetime_key = _cgroup_lifetime_key(node_name, container_id)
        lifetime = state.lifetime_by_key.setdefault(lifetime_key, CgroupLifetimeState())
        memory = row.get("memory") if isinstance(row.get("memory"), dict) else {}
        lifetime_view = lifetime.merge_memory(memory)

        processes = row.get("processes")
        process_list: list[dict[str, Any]] = []
        if isinstance(processes, list):
            for proc in processes:
                if not isinstance(proc, dict):
                    continue
                if isinstance(proc.get("pid"), str) and str(proc["pid"]).isdigit():
                    proc = {**proc, "pid": int(proc["pid"])}
                identity = process_identity_key(node_name, proc)
                entry = dict(proc)
                if identity is not None:
                    entry["processKey"] = {
                        "nodeName": identity[0],
                        "pid": identity[1],
                        "starttimeTicks": identity[2],
                    }
                process_list.append(entry)

        truncated = bool(row.get("processTruncated"))
        sequence += 1
        records.append(
            {
                "schemaVersion": SCHEMA_VERSION,
                "kind": "cgroup_snapshot",
                "collectorSession": collector_session,
                "source": "runtime.cgroup",
                "scopeId": scope_id,
                "observedAt": clock.observed_at_utc(),
                "monotonicNs": str(clock.mono_ns()),
                "sequence": sequence,
                "units": {
                    "memoryBytes": "bytes",
                    "cpuStat": "cgroup-v2-cpu-stat",
                    "processCount": "count",
                },
                "target": {"nodeName": node_name, "containerId": container_id},
                "cgroup": {
                    "path": row.get("cgroupPath"),
                    "memory": memory,
                    "lifetime": lifetime_view,
                    "cpuStat": row.get("cpuStat"),
                    "ioStatPresent": row.get("ioStatPresent"),
                    "memoryPressure": row.get("memoryPressure"),
                    "cpuPressure": row.get("cpuPressure"),
                    "ioPressure": row.get("ioPressure"),
                    "processes": process_list,
                    "processTruncated": truncated,
                    "processCap": CGROUP_MAX_PROCESS_RECORDS,
                },
            }
        )
    state.sequence = sequence
    return records, sequence


@dataclass
class CgroupCollector:
    """10s cadence read-only nested cgroup peaks via bounded docker exec per Kind node."""

    config: RuntimeConfig
    run_stdin: CgroupStdinRunner = default_cgroup_stdin_runner

    def collect_cycle(
        self,
        *,
        clock: InjectableClock,
        collector_session: str,
        kind_nodes: list[str],
        container_ids_by_node: Mapping[str, list[str]],
        state: CgroupCollectionState,
        now_mono_s: float,
        kube_probes_permitted: bool,
    ) -> tuple[list[dict[str, Any]], CgroupAccessState]:
        scope_id = build_scope_id(
            self.config.installation_id,
            self.config.boot_id,
            f"cgroup:{self.config.kube_context}",
        )
        if not kube_probes_permitted:
            return (
                [
                    _cgroup_coverage_record(
                        clock=clock,
                        collector_session=collector_session,
                        scope_id=scope_id,
                        sequence=state.sequence + 1,
                        reason="kube probes not permitted",
                        access=CgroupAccessState.SKIPPED,
                    )
                ],
                CgroupAccessState.SKIPPED,
            )

        permitted, gap = refuse_cross_target(self.config, default_command_runner)
        if not permitted:
            return (
                [
                    _cgroup_coverage_record(
                        clock=clock,
                        collector_session=collector_session,
                        scope_id=scope_id,
                        sequence=state.sequence + 1,
                        reason=gap,
                        access=CgroupAccessState.SKIPPED,
                    )
                ],
                CgroupAccessState.SKIPPED,
            )

        records: list[dict[str, Any]] = []
        sequence = state.sequence
        worst = CgroupAccessState.OK

        for node_name in kind_nodes:
            last = state.last_probe_mono_s_by_node.get(node_name, 0.0)
            if now_mono_s - last < CGROUP_PROBE_INTERVAL_S:
                continue
            raw_ids = list(container_ids_by_node.get(node_name, []))
            accepted, input_gaps = partition_cgroup_container_ids(raw_ids)
            state.last_probe_mono_s_by_node[node_name] = now_mono_s
            if not accepted:
                worst = _worst_cgroup_state(worst, CgroupAccessState.GAP)
                node_records, sequence = cgroup_records_from_probe(
                    clock=clock,
                    collector_session=collector_session,
                    scope_id=scope_id,
                    node_name=node_name,
                    probe_rows=[],
                    gap_rows=input_gaps,
                    state=state,
                    sequence_start=sequence,
                )
                records.extend(node_records)
                continue

            stdout, access, reason = fetch_cgroup_probe(
                self.config,
                node_name,
                accepted,
                run_stdin=self.run_stdin,
            )
            if stdout is None:
                worst = _worst_cgroup_state(worst, access)
                sequence += 1
                records.append(
                    _cgroup_coverage_record(
                        clock=clock,
                        collector_session=collector_session,
                        scope_id=scope_id,
                        sequence=sequence,
                        reason=reason or "cgroup probe unavailable",
                        access=access,
                        node_name=node_name,
                    )
                )
                continue

            probe_rows = parse_cgroup_probe_stdout(stdout)
            node_records, sequence = cgroup_records_from_probe(
                clock=clock,
                collector_session=collector_session,
                scope_id=scope_id,
                node_name=node_name,
                probe_rows=probe_rows,
                gap_rows=input_gaps,
                state=state,
                sequence_start=sequence,
            )
            records.extend(node_records)
            if input_gaps:
                worst = _worst_cgroup_state(worst, CgroupAccessState.GAP)

        state.sequence = sequence
        return records, worst


def _worst_cgroup_state(
    current: CgroupAccessState, new: CgroupAccessState
) -> CgroupAccessState:
    order = {
        CgroupAccessState.OK: 0,
        CgroupAccessState.SKIPPED: 1,
        CgroupAccessState.GAP: 2,
        CgroupAccessState.TIMEOUT: 3,
        CgroupAccessState.DENIED: 4,
        CgroupAccessState.UNREADABLE: 5,
    }
    return new if order.get(new, 0) > order.get(current, 0) else current


def _cgroup_coverage_record(
    *,
    clock: InjectableClock,
    collector_session: str,
    scope_id: str,
    sequence: int,
    reason: str,
    access: CgroupAccessState,
    node_name: Optional[str] = None,
) -> dict[str, Any]:
    coverage: dict[str, Any] = {
        "cgroupAccessState": access.value,
        "reason": reason,
    }
    if node_name:
        coverage["nodeName"] = node_name
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "coverage",
        "collectorSession": collector_session,
        "source": "runtime.cgroup",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {"reason": "plain-text"},
        "coverage": coverage,
    }


def _worst_state(current: KubeAccessState, new: KubeAccessState) -> KubeAccessState:
    order = {
        KubeAccessState.OK: 0,
        KubeAccessState.SKIPPED: 1,
        KubeAccessState.TIMEOUT: 2,
        KubeAccessState.DENIED: 3,
        KubeAccessState.UNREADABLE: 4,
        KubeAccessState.REFUSED: 5,
    }
    return new if order.get(new, 0) > order.get(current, 0) else current


def _coverage_record(
    *,
    clock: InjectableClock,
    collector_session: str,
    scope_id: str,
    sequence: int,
    reason: str,
    access: KubeAccessState,
    node_name: Optional[str] = None,
    kube_probe_state: KubeProbeState = KubeProbeState.GAP,
) -> dict[str, Any]:
    coverage: dict[str, Any] = {
        "kubeAccessState": access.value,
        "kubeProbeState": kube_probe_state.value,
        "reason": reason,
    }
    if node_name:
        coverage["nodeName"] = node_name
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "coverage",
        "collectorSession": collector_session,
        "source": "runtime.kube",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {"reason": "plain-text"},
        "coverage": coverage,
    }