"""Explicit local Kind/Docker runtime discovery and bounded docker snapshots (INF45 T01)."""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Mapping, Optional, Protocol

from records import SCHEMA_VERSION, InjectableClock, build_scope_id

LOOPBACK_API_ADDRESS = "127.0.0.1"
RELEASE_API_PORT = 6443
DEV_API_PORT_RANGE = (24_443, 24_543)
KIND_CLUSTER_LABEL = "io.x-k8s.kind.cluster"

ALLOWED_KUBE_CONTEXTS = frozenset({"kind-offscreen-dev", "kind-offscreen-lab"})

COMMAND_TIMEOUT_S = 2.5
STATS_COMMAND_TIMEOUT_S = 2.0
MAX_COMMAND_OUTPUT_BYTES = 4 * 1024 * 1024
DOCKER_SNAPSHOT_INTERVAL_S = 5.0

DOCKER_PS_FORMAT = "{{.ID}}\t{{.Names}}\t{{.State}}"
DOCKER_INSPECT_FORMAT = (
    "{{.Id}}\t{{.Name}}\t{{.State.StartedAt}}\t{{.State.Status}}\t{{.Config.Image}}"
)
DOCKER_STATS_FORMAT = "{{json .}}"

FORBIDDEN_PERSISTENCE_KEYS = frozenset(
    {
        "Env",
        "env",
        "Labels",
        "labels",
        "Mounts",
        "Config",
        "NetworkSettings",
        "HostConfig",
        "cmdline",
        "Cmd",
        "cmd",
    }
)

_BYTE_UNIT_RE = re.compile(
    r"^(-?\d+(?:\.\d+)?)\s*([KMGTPEkmgtpe]?i?B?|B)?$"
)
_DOCKER_ID_RE = re.compile(r"^[a-f0-9]{64}$")
_DOCKER_SHORT_ID_RE = re.compile(r"^[a-f0-9]{12,64}$")


class DockerAccessState(str, Enum):
    OK = "ok"
    DAEMON_ABSENT = "daemon_absent"
    TIMEOUT = "timeout"
    DENIED = "denied"
    NO_CONTAINERS = "no_containers"
    STALE = "stale"
    UNREADABLE = "unreadable"


class KubeProbeState(str, Enum):
    VERIFIED = "verified"
    SKIPPED = "skipped"
    GAP = "gap"


@dataclass(frozen=True)
class KindProfile:
    profile_id: str
    cluster_name: str
    context_name: str
    node_roles: tuple[str, ...]
    node_count: int

    def expected_node_names(self) -> tuple[str, ...]:
        return tuple(f"{self.cluster_name}-{role}" for role in self.node_roles)

    def kubeconfig_cluster_name(self) -> str:
        return f"kind-{self.cluster_name}"


KIND_PROFILE_BY_CONTEXT: dict[str, KindProfile] = {
    "kind-offscreen-dev": KindProfile(
        profile_id="dev",
        cluster_name="offscreen-dev",
        context_name="kind-offscreen-dev",
        node_roles=("control-plane", "worker"),
        node_count=2,
    ),
    "kind-offscreen-lab": KindProfile(
        profile_id="release",
        cluster_name="offscreen-lab",
        context_name="kind-offscreen-lab",
        node_roles=("control-plane", "worker"),
        node_count=2,
    ),
}


@dataclass(frozen=True)
class RuntimeConfig:
    """Pinned Docker context and kubeconfig path; never consult ambient CLI context."""

    docker_context: str
    kubeconfig_path: str
    kube_context: str
    installation_id: str
    boot_id: str = "unknown-boot"

    def profile(self) -> Optional[KindProfile]:
        return KIND_PROFILE_BY_CONTEXT.get(self.kube_context)


@dataclass(frozen=True)
class CommandOutcome:
    ok: bool
    status: Optional[int]
    stdout: str
    stderr: str
    timed_out: bool = False
    missing: bool = False
    output_truncated: bool = False


class CommandRunner(Protocol):
    def __call__(
        self,
        command: str,
        args: list[str],
        *,
        timeout_s: float = COMMAND_TIMEOUT_S,
    ) -> CommandOutcome: ...


def default_command_runner(
    command: str,
    args: list[str],
    *,
    timeout_s: float = COMMAND_TIMEOUT_S,
) -> CommandOutcome:
    try:
        completed = subprocess.run(
            [command, *args],
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

    stdout = completed.stdout or ""
    stderr = completed.stderr or ""
    truncated = False
    if len(stdout.encode("utf-8")) > MAX_COMMAND_OUTPUT_BYTES:
        stdout = stdout.encode("utf-8")[:MAX_COMMAND_OUTPUT_BYTES].decode(
            "utf-8", errors="replace"
        )
        truncated = True
    ok = completed.returncode == 0 and not truncated
    return CommandOutcome(
        ok=ok,
        status=completed.returncode,
        stdout=stdout,
        stderr=stderr,
        output_truncated=truncated,
    )


def parse_byte_quantity(text: str) -> Optional[int]:
    """Parse Docker-style byte quantities with SI (kB, MB) or IEC (KiB, MiB) units."""
    stripped = text.strip()
    if not stripped or stripped == "--":
        return None
    match = _BYTE_UNIT_RE.match(stripped)
    if not match:
        return None
    number_text, unit = match.group(1), match.group(2) or "B"
    try:
        value = float(number_text)
    except ValueError:
        return None

    unit_norm = unit
    if unit_norm == "B":
        multiplier = 1.0
    elif unit_norm.endswith("iB"):
        base = 1024.0
        order = {"KiB": 1, "MiB": 2, "GiB": 3, "TiB": 4, "PiB": 5, "EiB": 6}
        power = order.get(unit_norm)
        if power is None:
            return None
        multiplier = base**power
    elif unit_norm.endswith("B") and len(unit_norm) >= 2:
        base = 1000.0
        order = {"kB": 1, "KB": 1, "MB": 2, "GB": 3, "TB": 4, "PB": 5, "EB": 6}
        power = order.get(unit_norm)
        if power is None:
            return None
        multiplier = base**power
    else:
        return None

    return int(value * multiplier)


def parse_docker_mem_usage_pair(
    mem_usage: str,
) -> tuple[Optional[int], Optional[int]]:
    """Parse stats MemUsage 'used / limit' into byte counts."""
    parts = [part.strip() for part in mem_usage.split("/", 1)]
    if len(parts) != 2:
        return None, None
    return parse_byte_quantity(parts[0]), parse_byte_quantity(parts[1])


def parse_docker_stats_json(
    payload: Mapping[str, Any],
) -> dict[str, Any]:
    """
    Extract allowlisted memory metrics; separate cache-subtracted working set when cache is known.
    """
    mem_usage = str(payload.get("MemUsage", ""))
    used_bytes, limit_bytes = parse_docker_mem_usage_pair(mem_usage)
    cache_bytes: Optional[int] = None
    for cache_key in ("Cache", "MemCache", "cache"):
        if cache_key in payload:
            parsed = parse_byte_quantity(str(payload[cache_key]))
            if parsed is not None:
                cache_bytes = parsed
                break

    working_set_bytes: Optional[int] = None
    if used_bytes is not None and cache_bytes is not None:
        working_set_bytes = max(0, used_bytes - cache_bytes)

    return {
        "memUsageUsedBytes": used_bytes,
        "memUsageLimitBytes": limit_bytes,
        "memCacheBytes": cache_bytes,
        "memWorkingSetBytes": working_set_bytes,
        "cpuPercent": str(payload.get("CPUPerc", "")).strip() or None,
        "pids": int(payload["PIDs"]) if str(payload.get("PIDs", "")).isdigit() else None,
    }


def _normalize_container_id(value: str) -> Optional[str]:
    text = value.strip().lower()
    if text.startswith("sha256:"):
        text = text.removeprefix("sha256:")
    if _DOCKER_ID_RE.match(text):
        return text
    if _DOCKER_SHORT_ID_RE.match(text):
        return text
    return None


def _assert_no_forbidden_keys(value: Any, *, path: str = "") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if key in FORBIDDEN_PERSISTENCE_KEYS:
                raise ValueError(f"forbidden persistence key {key}")
            _assert_no_forbidden_keys(child, path=f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _assert_no_forbidden_keys(child, path=f"{path}[{index}]")


def read_kubeconfig_minified(
    config: RuntimeConfig,
    run: CommandRunner,
) -> tuple[Optional[dict[str, Any]], str]:
    kubeconfig = str(Path(config.kubeconfig_path).resolve())
    outcome = run(
        "kubectl",
        [
            "--kubeconfig",
            kubeconfig,
            "--context",
            config.kube_context,
            "config",
            "view",
            "--minify",
            "-o",
            "json",
        ],
    )
    if outcome.missing:
        return None, "kubectl missing"
    if outcome.timed_out:
        return None, "kubectl config view timed out"
    if outcome.output_truncated or not outcome.ok:
        return None, "kubectl config view unreadable"
    try:
        body = json.loads(outcome.stdout)
    except json.JSONDecodeError:
        return None, "kubectl config view malformed"
    if not isinstance(body, dict):
        return None, "kubectl config view malformed"
    return body, ""


def verify_kubeconfig_identity(
    config: RuntimeConfig,
    run: CommandRunner,
) -> tuple[bool, Optional[int], str]:
    """
    Verify named context/cluster and loopback API port before any cluster probes.
    Returns (verified, port, gap_reason).
    """
    profile = config.profile()
    if profile is None:
        return False, None, "kube context not in allowlist"

    if config.kube_context not in ALLOWED_KUBE_CONTEXTS:
        return False, None, "kube context not in allowlist"

    kubeconfig_path = Path(config.kubeconfig_path)
    if not kubeconfig_path.is_file():
        return False, None, "kubeconfig path unreadable"

    body, gap = read_kubeconfig_minified(config, run)
    if body is None:
        return False, None, gap

    contexts = body.get("contexts")
    if not isinstance(contexts, list) or len(contexts) != 1:
        return False, None, "kubeconfig minify must select exactly one context"

    selected = contexts[0].get("context") if isinstance(contexts[0], dict) else None
    if not isinstance(selected, dict):
        return False, None, "kubeconfig selected context malformed"

    context_name = selected.get("name") or contexts[0].get("name")
    if context_name != config.kube_context:
        return False, None, "kubeconfig context mismatch"

    cluster_ref = selected.get("cluster")
    expected_cluster = profile.kubeconfig_cluster_name()
    if cluster_ref != expected_cluster:
        return False, None, "kubeconfig cluster reference mismatch"

    clusters = body.get("clusters")
    if not isinstance(clusters, list):
        return False, None, "kubeconfig clusters missing"

    cluster_entry = next(
        (entry for entry in clusters if isinstance(entry, dict) and entry.get("name") == cluster_ref),
        None,
    )
    if cluster_entry is None:
        return False, None, "kubeconfig cluster entry missing"

    server = cluster_entry.get("cluster", {}).get("server")
    if not isinstance(server, str):
        return False, None, "kubeconfig cluster server missing"

    match = re.match(r"^https://([^:]+):(\d+)$", server)
    if not match:
        return False, None, "kubeconfig server is not explicit loopback https"
    host, port_text = match.group(1), match.group(2)
    if host != LOOPBACK_API_ADDRESS:
        return False, None, "kubeconfig server must use loopback address"
    port = int(port_text)

    if profile.profile_id == "release":
        if port != RELEASE_API_PORT:
            return False, None, f"release profile requires loopback port {RELEASE_API_PORT}"
    else:
        if port == RELEASE_API_PORT:
            return False, None, "dev profile must not use release loopback port"
        if port < DEV_API_PORT_RANGE[0] or port > DEV_API_PORT_RANGE[1]:
            return False, None, "dev loopback port outside allowed range"

    current_name = body.get("current-context")
    if isinstance(current_name, str) and current_name and current_name != config.kube_context:
        return False, None, "kubeconfig current-context does not match pinned context"

    return True, port, ""


def discover_kind_inventory(
    profile: KindProfile,
    run: CommandRunner,
    *,
    docker_context: str,
) -> tuple[Optional[list[str]], str]:
    """Verify kind cluster exists, node inventory, and Docker node cluster labels."""
    list_outcome = run("kind", ["get", "clusters"])
    if list_outcome.missing:
        return None, "kind CLI missing"
    if list_outcome.timed_out:
        return None, "kind get clusters timed out"
    if not list_outcome.ok:
        return None, "kind cluster list unreadable"

    names = [line.strip() for line in list_outcome.stdout.splitlines() if line.strip()]
    if profile.cluster_name not in names:
        return None, f"kind cluster {profile.cluster_name} not found"

    nodes_outcome = run("kind", ["get", "nodes", "--name", profile.cluster_name])
    if nodes_outcome.timed_out:
        return None, "kind get nodes timed out"
    if not nodes_outcome.ok:
        return None, "kind node inventory unreadable"

    node_names = [
        line.strip().removeprefix("node/")
        for line in nodes_outcome.stdout.splitlines()
        if line.strip()
    ]
    if not node_names:
        return None, "kind node inventory empty"
    if len(node_names) != profile.node_count:
        return None, "kind node count mismatch"
    if len(set(node_names)) != len(node_names):
        return None, "duplicate kind node names"

    expected = set(profile.expected_node_names())
    for name in profile.expected_node_names():
        if name not in node_names:
            return None, f"missing expected kind node {name}"
    for name in node_names:
        if name not in expected:
            return None, f"foreign kind node {name}"

    sorted_nodes = sorted(
        node_names,
        key=lambda item: (0 if item.endswith("control-plane") else 1, item),
    )

    for node in sorted_nodes:
        label_outcome = run(
            "docker",
            [
                "--context",
                docker_context,
                "inspect",
                "--format",
                f'{{{{index .Config.Labels "{KIND_CLUSTER_LABEL}"}}}}',
                node,
            ],
        )
        if label_outcome.timed_out:
            return None, f"docker inspect timed out for node {node}"
        if label_outcome.missing:
            return None, "docker CLI missing"
        if not label_outcome.ok:
            return None, f"docker inspect failed for node {node}"
        if label_outcome.stdout.strip() != profile.cluster_name:
            return None, f"kind node {node} has foreign cluster label"

    return sorted_nodes, ""


@dataclass
class DockerSnapshotCollector:
    """5s Docker snapshot cadence with at most one stats command in flight."""

    config: RuntimeConfig
    run: CommandRunner = default_command_runner
    _stats_in_flight: bool = field(default=False, init=False)
    _last_stats_mono_ns: Optional[int] = field(default=None, init=False)

    def _run_docker(self, args: list[str], *, timeout_s: float = COMMAND_TIMEOUT_S) -> CommandOutcome:
        return self.run("docker", ["--context", self.config.docker_context, *args], timeout_s=timeout_s)

    def collect_snapshots(
        self,
        *,
        clock: InjectableClock,
        collector_session: str,
        sequence_start: int,
        kube_verified: bool,
        prior_container_started_at: Optional[Mapping[str, str]] = None,
    ) -> tuple[list[dict[str, Any]], int, DockerAccessState, KubeProbeState]:
        prior_started = dict(prior_container_started_at or {})
        records: list[dict[str, Any]] = []
        sequence = sequence_start
        scope_id = build_scope_id(
            self.config.installation_id,
            self.config.boot_id,
            f"docker:{self.config.docker_context}",
        )

        ps_outcome = self._run_docker(
            ["ps", "--no-trunc", "--format", DOCKER_PS_FORMAT]
        )
        if ps_outcome.missing:
            coverage = _coverage_record(
                clock=clock,
                scope_id=scope_id,
                collector_session=collector_session,
                sequence=sequence + 1,
                reason="docker daemon absent",
                docker_state=DockerAccessState.DAEMON_ABSENT,
                kube_state=KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.GAP,
            )
            return [coverage], sequence + 1, DockerAccessState.DAEMON_ABSENT, (
                KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.GAP
            )
        if ps_outcome.timed_out:
            coverage = _coverage_record(
                clock=clock,
                scope_id=scope_id,
                collector_session=collector_session,
                sequence=sequence + 1,
                reason="docker ps timed out",
                docker_state=DockerAccessState.TIMEOUT,
                kube_state=KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.GAP,
            )
            return [coverage], sequence + 1, DockerAccessState.TIMEOUT, (
                KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.GAP
            )
        if ps_outcome.output_truncated:
            coverage = _coverage_record(
                clock=clock,
                scope_id=scope_id,
                collector_session=collector_session,
                sequence=sequence + 1,
                reason="docker ps output truncated",
                docker_state=DockerAccessState.UNREADABLE,
                kube_state=KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.GAP,
            )
            return [coverage], sequence + 1, DockerAccessState.UNREADABLE, (
                KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.GAP
            )
        if not ps_outcome.ok:
            denied = "permission denied" in (ps_outcome.stderr or "").lower()
            state = DockerAccessState.DENIED if denied else DockerAccessState.UNREADABLE
            coverage = _coverage_record(
                clock=clock,
                scope_id=scope_id,
                collector_session=collector_session,
                sequence=sequence + 1,
                reason="docker ps denied" if denied else "docker ps failed",
                docker_state=state,
                kube_state=KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.GAP,
            )
            return [coverage], sequence + 1, state, (
                KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.GAP
            )

        rows = _parse_ps_rows(ps_outcome.stdout)
        if not rows:
            sequence += 1
            records.append(
                _docker_coverage_empty(
                    clock=clock,
                    scope_id=scope_id,
                    collector_session=collector_session,
                    sequence=sequence,
                    config=self.config,
                    kube_verified=kube_verified,
                )
            )
            return records, sequence, DockerAccessState.NO_CONTAINERS, (
                KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.VERIFIED
            )

        name_counts: dict[str, int] = {}
        for _, name, _ in rows:
            name_counts[name] = name_counts.get(name, 0) + 1

        stats_allowed = not self._stats_in_flight
        if stats_allowed:
            self._stats_in_flight = True
        stats_partial = False

        for short_id, name, state in rows:
            inspect = _safe_inspect(self, short_id)
            if inspect is None:
                stats_partial = True
                continue

            full_id = inspect.get("id") or short_id
            id_resolved = bool(inspect.get("id") and _DOCKER_ID_RE.match(str(inspect.get("id"))))
            started_at = inspect.get("startedAt")
            stale = False
            prior = prior_started.get(full_id) or prior_started.get(short_id)
            if prior is not None and started_at is not None and prior != started_at:
                stale = True

            stats_metrics: Optional[dict[str, Any]] = None
            if stats_allowed:
                stats_metrics, stats_error = _fetch_stats(self, full_id)
                if stats_error:
                    stats_partial = True

            duplicate_name = name_counts.get(name, 0) > 1
            sequence += 1
            record: dict[str, Any] = {
                "schemaVersion": SCHEMA_VERSION,
                "kind": "docker_snapshot",
                "collectorSession": collector_session,
                "source": "runtime.docker",
                "scopeId": scope_id,
                "observedAt": clock.observed_at_utc(),
                "monotonicNs": str(clock.mono_ns()),
                "sequence": sequence,
                "units": {
                    "memory": "bytes",
                    "cpuPercent": "percent-string",
                },
                "docker": {
                    "context": self.config.docker_context,
                    "containerId": full_id,
                    "idResolved": id_resolved,
                    "name": name,
                    "duplicateName": duplicate_name,
                    "state": state,
                    "startedAt": started_at,
                    "imageRef": inspect.get("imageRef"),
                    "staleIdentity": stale,
                },
                "target": {
                    "kubeContext": self.config.kube_context,
                    "kubeProbesSkipped": not kube_verified,
                },
            }
            if stats_metrics is not None:
                record["stats"] = stats_metrics
            elif stats_allowed:
                record["stats"] = None
                record["coverage"] = {"statsUnreadable": True}

            _assert_no_forbidden_keys(record)
            records.append(record)

        if stats_allowed:
            self._stats_in_flight = False
            self._last_stats_mono_ns = clock.mono_ns()

        if stats_partial:
            sequence += 1
            records.append(
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "kind": "coverage",
                    "collectorSession": collector_session,
                    "source": "runtime.docker",
                    "scopeId": scope_id,
                    "observedAt": clock.observed_at_utc(),
                    "monotonicNs": str(clock.mono_ns()),
                    "sequence": sequence,
                    "units": {"reason": "plain-text"},
                    "coverage": {
                        "partialDockerSnapshot": True,
                        "reason": "partial container response",
                    },
                }
            )

        kube_state = KubeProbeState.SKIPPED if not kube_verified else KubeProbeState.VERIFIED
        return records, sequence, DockerAccessState.OK, kube_state


def verify_local_runtime(
    config: RuntimeConfig,
    run: CommandRunner = default_command_runner,
) -> dict[str, Any]:
    """
    Discover kind inventory and kubeconfig identity; record gaps without raising.
    Context mismatch or allowlist violation implies zero future kube probes.
    """
    profile = config.profile()
    gaps: list[str] = []
    kube_verified = False
    api_port: Optional[int] = None
    kind_nodes: list[str] = []

    if profile is None or config.kube_context not in ALLOWED_KUBE_CONTEXTS:
        gaps.append("kube context not in allowlist")
    else:
        kube_verified, api_port, kube_gap = verify_kubeconfig_identity(config, run)
        if not kube_verified:
            gaps.append(kube_gap or "kubeconfig identity verification failed")
            kube_verified = False
        else:
            nodes, kind_gap = discover_kind_inventory(
                profile, run, docker_context=config.docker_context
            )
            if nodes is None:
                gaps.append(kind_gap)
                kube_verified = False
            else:
                kind_nodes = nodes

    return {
        "dockerContext": config.docker_context,
        "kubeContext": config.kube_context,
        "kubeconfigPath": str(Path(config.kubeconfig_path)),
        "kubeVerified": kube_verified,
        "kubeProbesPermitted": kube_verified,
        "apiServerPort": api_port,
        "kindNodes": kind_nodes,
        "gaps": gaps,
    }


def _parse_ps_rows(text: str) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for line in text.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) != 3:
            continue
        cid, name, state = parts
        if not _DOCKER_SHORT_ID_RE.match(cid.strip().lower()):
            continue
        rows.append((cid.strip().lower(), name.strip(), state.strip()))
    return rows


def _safe_inspect(collector: DockerSnapshotCollector, container_ref: str) -> Optional[dict[str, str]]:
    outcome = collector._run_docker(
        ["inspect", "--format", DOCKER_INSPECT_FORMAT, container_ref]
    )
    if not outcome.ok or outcome.timed_out:
        return None
    line = outcome.stdout.strip().splitlines()[0] if outcome.stdout.strip() else ""
    parts = line.split("\t")
    if len(parts) != 5:
        return None
    full_id = _normalize_container_id(parts[0])
    name = parts[1].lstrip("/")
    return {
        "id": full_id or parts[0],
        "name": name,
        "startedAt": parts[2],
        "state": parts[3],
        "imageRef": parts[4],
    }


def _fetch_stats(
    collector: DockerSnapshotCollector,
    container_ref: str,
) -> tuple[Optional[dict[str, Any]], bool]:
    outcome = collector._run_docker(
        [
            "stats",
            "--no-stream",
            "--format",
            DOCKER_STATS_FORMAT,
            container_ref,
        ],
        timeout_s=STATS_COMMAND_TIMEOUT_S,
    )
    if not outcome.ok or outcome.timed_out:
        return None, True
    line = outcome.stdout.strip().splitlines()[0] if outcome.stdout.strip() else ""
    try:
        payload = json.loads(line)
    except json.JSONDecodeError:
        return None, True
    if not isinstance(payload, dict):
        return None, True
    metrics = parse_docker_stats_json(payload)
    metrics["sourceTimestamp"] = None
    return metrics, False


def _coverage_record(
    *,
    clock: InjectableClock,
    scope_id: str,
    collector_session: str,
    sequence: int,
    reason: str,
    docker_state: DockerAccessState,
    kube_state: KubeProbeState,
) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "coverage",
        "collectorSession": collector_session,
        "source": "runtime.docker",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {"reason": "plain-text"},
        "coverage": {
            "dockerAccessState": docker_state.value,
            "kubeProbeState": kube_state.value,
            "reason": reason,
        },
    }


def _docker_coverage_empty(
    *,
    clock: InjectableClock,
    scope_id: str,
    collector_session: str,
    sequence: int,
    config: RuntimeConfig,
    kube_verified: bool,
) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "coverage",
        "collectorSession": collector_session,
        "source": "runtime.docker",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {"reason": "plain-text"},
        "coverage": {
            "dockerAccessState": DockerAccessState.NO_CONTAINERS.value,
            "kubeProbeState": (
                KubeProbeState.VERIFIED.value
                if kube_verified
                else KubeProbeState.SKIPPED.value
            ),
            "reason": "no containers listed",
            "dockerContext": config.docker_context,
        },
    }


def count_kubectl_probes(calls: list[tuple[str, ...]]) -> int:
    """Test helper: count kubectl cluster probes (not config view verification)."""
    count = 0
    for entry in calls:
        command = entry[0]
        args = entry[1] if len(entry) > 1 else []
        if command != "kubectl":
            continue
        if "get" in args or "--request-timeout" in args:
            count += 1
    return count