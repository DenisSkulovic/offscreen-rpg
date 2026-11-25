"""Collector service entrypoint: scheduled workers, heartbeat, graceful stop."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import signal
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Mapping, Optional

from host import (
    ObservedPeakTracker,
    TICK_MISS_GRACE_NS,
    observe_fast_window,
    observe_slow_counters,
    parse_meminfo,
    rollup_hour,
    rollup_minute,
)
from processes import (
    PROCESS_SNAPSHOT_INTERVAL_S,
    PSS_SAMPLE_INTERVAL_S,
    FakeProcRoot,
    LiveProcRoot,
    ProcFixture,
    collect_process_cycle_records,
    read_boot_id,
)
from records import (
    FAST_TICKS_PER_WINDOW,
    FAST_TICK_NS,
    FAST_WINDOW_NS,
    ROLLUP_HOUR_NS,
    ROLLUP_MINUTE_NS,
    SCHEMA_VERSION,
    ClockJumpDetector,
    InjectableClock,
    build_scope_id,
    new_collector_session,
)
from storage import FSYNC_INTERVAL_S, RecordStore, StorageLimitedError

HEARTBEAT_INTERVAL_S = 5.0
STATUS_INTERVAL_S = 60.0
FAST_TICK_S = FAST_TICK_NS / 1_000_000_000.0
SLOW_COUNTER_INTERVAL_S = 1.0
WINDOWS_PER_MINUTE_ROLLUP = ROLLUP_MINUTE_NS // FAST_WINDOW_NS
WINDOWS_PER_HOUR_ROLLUP = ROLLUP_HOUR_NS // FAST_WINDOW_NS

WORKER_ERROR_IO = "io"
WORKER_ERROR_PARSE = "parse"
WORKER_ERROR_RUNTIME = "runtime"
WORKER_ERROR_STORAGE = "storage"
WORKER_ERROR_UNKNOWN = "unknown"

PRESSURE_KINDS = ("cpu", "memory", "io")
LOW_MEMORY_SUSPEND_BYTES_DEFAULT = 4 * 1024 * 1024 * 1024
RUNTIME_MODULE_NAME = "runtime"
KUBE_MODULE_NAME = "kube"


@dataclass(frozen=True)
class CollectorConfig:
    installation_id: str
    state_root: str
    username: str = ""
    mem_available_suspend_bytes: int = LOW_MEMORY_SUSPEND_BYTES_DEFAULT
    atop_sensitive_argv_consent: bool = False
    atop_installed: bool = False
    enable_optional_pss: bool = True
    enable_runtime_extension: bool = True
    docker_context: str = ""
    kubeconfig_path: str = ""

    @classmethod
    def load_once(cls, path: os.PathLike[str] | str) -> "CollectorConfig":
        text = Path(path).read_text(encoding="utf-8")
        payload = json.loads(text)
        return cls(
            installation_id=str(payload["installationId"]),
            state_root=str(payload["stateRoot"]),
            username=str(payload.get("username", "")),
            mem_available_suspend_bytes=int(
                payload.get("memAvailableSuspendBytes", LOW_MEMORY_SUSPEND_BYTES_DEFAULT)
            ),
            atop_sensitive_argv_consent=bool(payload.get("atopSensitiveArgvConsent", False)),
            atop_installed=bool(payload.get("atopInstalled", False)),
            enable_optional_pss=bool(payload.get("enableOptionalPss", True)),
            enable_runtime_extension=bool(payload.get("enableRuntimeExtension", True)),
            docker_context=str(payload.get("dockerContext", "")),
            kubeconfig_path=str(payload.get("kubeconfigPath", "")),
        )


class RuntimeExtensionStatus:
    SUPPORTED = "supported"
    UNSUPPORTED = "unsupported"
    ERROR = "error"


def sanitize_worker_error(exc: BaseException) -> str:
    if isinstance(exc, StorageLimitedError):
        return WORKER_ERROR_STORAGE
    if isinstance(exc, (OSError, IOError)):
        return WORKER_ERROR_IO
    if isinstance(exc, (ValueError, KeyError, TypeError, json.JSONDecodeError)):
        return WORKER_ERROR_PARSE
    if isinstance(exc, RuntimeError):
        return WORKER_ERROR_RUNTIME
    return WORKER_ERROR_UNKNOWN


def try_import_runtime_module() -> tuple[Optional[Any], str]:
    """Optional runtime seam; missing package must not stop the collector."""
    if importlib.util.find_spec(RUNTIME_MODULE_NAME) is None:
        return None, RuntimeExtensionStatus.UNSUPPORTED
    if importlib.util.find_spec(KUBE_MODULE_NAME) is None:
        return None, RuntimeExtensionStatus.UNSUPPORTED
    try:
        runtime_module = importlib.import_module(RUNTIME_MODULE_NAME)
        importlib.import_module(KUBE_MODULE_NAME)
    except Exception:
        return None, RuntimeExtensionStatus.ERROR
    return runtime_module, RuntimeExtensionStatus.SUPPORTED


@dataclass
class RuntimeProfileState:
    kube_context: str
    docker_context: str
    kubeconfig_path: str
    kube_probes_permitted: bool
    kind_nodes: list[str]
    verification_gaps: list[str]
    kube_state: Any
    cgroup_state: Any
    prior_container_started_at: dict[str, str] = field(default_factory=dict)
    last_pods: list[dict[str, Any]] = field(default_factory=list)
    kube_collector: Any = None
    cgroup_collector: Any = None


def map_pod_containers_to_kind_nodes(
  kind_nodes: list[str],
  pods: list[Mapping[str, Any]],
) -> tuple[dict[str, list[str]], list[dict[str, str]]]:
    """Map verified pod container IDs to Kind node names; gaps when mapping is stale or missing."""
    mapping: dict[str, list[str]] = {node: [] for node in kind_nodes}
    gaps: list[dict[str, str]] = []
    seen: dict[str, set[str]] = {node: set() for node in kind_nodes}
    for pod in pods:
        if not isinstance(pod, Mapping):
            continue
        node = pod.get("nodeName")
        pod_uid = pod.get("podUid")
        if not isinstance(node, str) or node not in mapping:
            gaps.append(
                {
                    "gapReason": "pod node mapping missing or foreign",
                    "podUid": str(pod_uid) if pod_uid is not None else "unknown",
                }
            )
            continue
        containers = pod.get("containers")
        if not isinstance(containers, list):
            gaps.append({"gapReason": "pod containers missing", "podUid": str(pod_uid)})
            continue
        for container in containers:
            if not isinstance(container, Mapping):
                continue
            container_id = container.get("containerId")
            if not isinstance(container_id, str) or not container_id:
                gaps.append(
                    {
                        "gapReason": "container id missing from pod snapshot",
                        "podUid": str(pod_uid),
                        "nodeName": node,
                    }
                )
                continue
            if container_id in seen[node]:
                continue
            seen[node].add(container_id)
            mapping[node].append(container_id)
    return mapping, gaps


@dataclass
class MonotonicWorker:
    """Single-stream scheduler with at most one in-flight task and no catch-up."""

    name: str
    interval_s: float
    callback: Callable[[], None]
    _next_deadline_s: float = field(default=0.0)
    _in_flight: bool = field(default=False)
    _last_error: str = field(default="")
    _last_completed_s: Optional[float] = field(default=None)
    _skipped_overruns: int = field(default=0)

    def schedule_start(self, start_mono_s: float) -> None:
        self._next_deadline_s = start_mono_s + self.interval_s

    def due(self, now_mono_s: float) -> bool:
        return not self._in_flight and now_mono_s >= self._next_deadline_s

    def begin(self, now_mono_s: float) -> None:
        if now_mono_s > self._next_deadline_s:
            self._skipped_overruns += 1
            self._next_deadline_s = now_mono_s + self.interval_s
        else:
            self._next_deadline_s += self.interval_s
        self._in_flight = True

    def run(self) -> None:
        try:
            self.callback()
            self._last_error = ""
        except Exception as exc:  # noqa: BLE001 - gap must be recorded, not crash loop
            self._last_error = sanitize_worker_error(exc)
            raise
        finally:
            self._last_completed_s = time.monotonic()

    def complete(self) -> None:
        self._in_flight = False

    def overlapped(self) -> bool:
        return self._in_flight


@dataclass
class CollectorRunState:
    sequence: int = 0
    process_keys: dict[int, int] = field(default_factory=dict)
    heartbeats: int = 0
    worker_gaps: list[str] = field(default_factory=list)
    collector_restarts: int = 0
    boot_id: str = "unknown-boot"
    runtime_status: str = RuntimeExtensionStatus.UNSUPPORTED


class MonitoringCollector:
    def __init__(
        self,
        config: CollectorConfig,
        *,
        clock: InjectableClock,
        proc: ProcFixture,
        store: RecordStore,
        read_meminfo: Callable[[], str],
        read_self_status: Callable[[], str],
        read_boot_text: Callable[[], str] = lambda: "boot-fixture",
        read_vmstat: Callable[[], str] = lambda: "",
        read_stat: Callable[[], str] = lambda: "",
        read_pressure: Optional[Callable[[str], str]] = None,
        runtime_command_runner: Optional[Callable[..., Any]] = None,
        runtime_cgroup_runner: Optional[Callable[..., Any]] = None,
        sleep: Callable[[float], None] = time.sleep,
        mono: Callable[[], float] = time.monotonic,
        collector_pid: Optional[int] = None,
    ) -> None:
        self._config = config
        self._clock = clock
        self._proc = proc
        self._store = store
        self._read_meminfo = read_meminfo
        self._read_self_status = read_self_status
        self._read_boot_text = read_boot_text
        self._read_vmstat = read_vmstat
        self._read_stat = read_stat
        self._read_pressure = read_pressure or (lambda _kind: "")
        self._sleep = sleep
        self._mono = mono
        self._collector_pid = collector_pid if collector_pid is not None else os.getpid()
        self._stop_requested = False
        self._session = new_collector_session()
        self._state = CollectorRunState()
        self._clock_jump = ClockJumpDetector()
        self._scope_id = build_scope_id(
            config.installation_id, read_boot_id(read_boot_text), "host"
        )
        self._fast_raw_writer = store.open_stream("fast-raw", collector_session=self._session)
        self._fast_minute_writer = store.open_stream(
            "fast-minute", collector_session=self._session
        )
        self._fast_hour_writer = store.open_stream("fast-hour", collector_session=self._session)
        self._process_writer = store.open_stream("process", collector_session=self._session)
        self._health_writer = store.open_stream("health", collector_session=self._session)
        self._events_writer = store.open_stream("events", collector_session=self._session)
        self._runtime_writer = store.open_stream("runtime", collector_session=self._session)
        self._optional_pss_suspended = False
        self._runtime_cgroup_suspended = False
        self._runtime_module: Optional[Any] = None
        self._runtime_command_runner = runtime_command_runner
        self._runtime_cgroup_runner = runtime_cgroup_runner
        self._runtime_profiles: list[RuntimeProfileState] = []
        self._docker_collector: Optional[Any] = None
        self._docker_kube_verified = False
        self._configure_runtime_extension()

        self._host_peak = ObservedPeakTracker()
        self._host_windows_minute: list[dict[str, Any]] = []
        self._host_windows_hour: list[dict[str, Any]] = []
        self._minute_bucket_start_ns: Optional[int] = None
        self._hour_bucket_start_ns: Optional[int] = None
        self._fast_window_start_ns: Optional[int] = None
        self._fast_tick_slot = 0
        self._fast_tick_times_ns: list[int] = []
        self._fast_meminfo_texts: list[str] = []
        self._fast_next_tick_deadline_s = 0.0
        self._fast_skipped_ticks = 0
        self._slow_counter_state: dict[str, int] = {}

        runtime_docker_interval_s = 5.0
        runtime_kube_interval_s = 10.0
        runtime_cgroup_interval_s = 10.0
        if self._runtime_module is not None:
            from kube import CGROUP_PROBE_INTERVAL_S, KUBELET_SUMMARY_INTERVAL_S
            from runtime import DOCKER_SNAPSHOT_INTERVAL_S

            runtime_docker_interval_s = DOCKER_SNAPSHOT_INTERVAL_S
            runtime_kube_interval_s = KUBELET_SUMMARY_INTERVAL_S
            runtime_cgroup_interval_s = CGROUP_PROBE_INTERVAL_S

        self._workers = [
            MonotonicWorker("process-fast", PROCESS_SNAPSHOT_INTERVAL_S, self._run_process_snapshot),
            MonotonicWorker("process-pss", PSS_SAMPLE_INTERVAL_S, self._run_optional_pss),
            MonotonicWorker(
                "runtime-docker", runtime_docker_interval_s, self._run_runtime_docker
            ),
            MonotonicWorker("runtime-kube", runtime_kube_interval_s, self._run_runtime_kube),
            MonotonicWorker(
                "runtime-cgroup", runtime_cgroup_interval_s, self._run_runtime_cgroup
            ),
            MonotonicWorker("host-slow", SLOW_COUNTER_INTERVAL_S, self._run_slow_counters),
            MonotonicWorker("status", STATUS_INTERVAL_S, self._run_status),
            MonotonicWorker("heartbeat", HEARTBEAT_INTERVAL_S, self._run_heartbeat),
        ]
        start = self._mono()
        for worker in self._workers:
            worker.schedule_start(start)

    @property
    def session(self) -> str:
        return self._session

    @property
    def state(self) -> CollectorRunState:
        return self._state

    def request_stop(self) -> None:
        self._stop_requested = True

    def install_signal_handlers(self) -> None:
        def _handle_stop(signum: int, _frame: object) -> None:
            self.request_stop()

        signal.signal(signal.SIGTERM, _handle_stop)
        signal.signal(signal.SIGINT, _handle_stop)

    def _configure_runtime_extension(self) -> None:
        if not self._config.enable_runtime_extension:
            self._state.runtime_status = RuntimeExtensionStatus.UNSUPPORTED
            return
        module, status = try_import_runtime_module()
        self._runtime_module = module
        self._state.runtime_status = status
        if module is None or status != RuntimeExtensionStatus.SUPPORTED:
            return

        docker_context = self._config.docker_context.strip()
        kubeconfig_path = self._config.kubeconfig_path.strip()
        if not docker_context or not kubeconfig_path:
            self._state.runtime_status = RuntimeExtensionStatus.UNSUPPORTED
            return

        from kube import CgroupCollectionState, CgroupCollector, KubeCollectionState, KubeCollector
        from runtime import (
            ALLOWED_KUBE_CONTEXTS,
            DockerSnapshotCollector,
            RuntimeConfig,
            default_command_runner,
            verify_local_runtime,
        )

        runner = self._runtime_command_runner or default_command_runner
        boot_id = read_boot_id(self._read_boot_text)
        profiles: list[RuntimeProfileState] = []
        for kube_context in sorted(ALLOWED_KUBE_CONTEXTS):
            runtime_config = RuntimeConfig(
                docker_context=docker_context,
                kubeconfig_path=kubeconfig_path,
                kube_context=kube_context,
                installation_id=self._config.installation_id,
                boot_id=boot_id,
            )
            verification = verify_local_runtime(runtime_config, run=runner)
            profiles.append(
                RuntimeProfileState(
                    kube_context=kube_context,
                    docker_context=docker_context,
                    kubeconfig_path=kubeconfig_path,
                    kube_probes_permitted=bool(verification.get("kubeProbesPermitted")),
                    kind_nodes=list(verification.get("kindNodes") or []),
                    verification_gaps=list(verification.get("gaps") or []),
                    kube_state=KubeCollectionState(),
                    cgroup_state=CgroupCollectionState(),
                    kube_collector=KubeCollector(runtime_config, run=runner),
                    cgroup_collector=CgroupCollector(
                        runtime_config,
                        run=runner,
                        run_stdin=self._runtime_cgroup_runner
                        or __import__("kube").default_cgroup_stdin_runner,
                    ),
                )
            )

        self._runtime_profiles = profiles
        self._docker_kube_verified = any(profile.kube_probes_permitted for profile in profiles)
        primary_config = RuntimeConfig(
            docker_context=docker_context,
            kubeconfig_path=kubeconfig_path,
            kube_context=profiles[0].kube_context if profiles else "kind-offscreen-dev",
            installation_id=self._config.installation_id,
            boot_id=boot_id,
        )
        self._docker_collector = DockerSnapshotCollector(primary_config, run=runner)

    def _runtime_config_for(self, profile: RuntimeProfileState) -> Any:
        from runtime import RuntimeConfig

        return RuntimeConfig(
            docker_context=profile.docker_context,
            kubeconfig_path=profile.kubeconfig_path,
            kube_context=profile.kube_context,
            installation_id=self._config.installation_id,
            boot_id=self._state.boot_id,
        )

    def _sync_runtime_profile_collectors(self) -> None:
        from kube import CgroupCollector, KubeCollector
        from runtime import default_command_runner

        runner = self._runtime_command_runner or default_command_runner
        for profile in self._runtime_profiles:
            runtime_config = self._runtime_config_for(profile)
            profile.kube_collector = KubeCollector(runtime_config, run=runner)
            profile.cgroup_collector = CgroupCollector(
                runtime_config,
                run=runner,
                run_stdin=self._runtime_cgroup_runner
                or __import__("kube").default_cgroup_stdin_runner,
            )
        if self._docker_collector is not None and self._runtime_profiles:
            from runtime import DockerSnapshotCollector

            self._docker_collector = DockerSnapshotCollector(
                self._runtime_config_for(self._runtime_profiles[0]),
                run=runner,
            )

    def _append_runtime_records(self, records: list[dict[str, Any]]) -> None:
        for record in records:
            self._append("runtime", record)

    def _run_runtime_docker(self) -> None:
        if self._docker_collector is None or not self._runtime_profiles:
            return
        self._docker_kube_verified = any(
            profile.kube_probes_permitted for profile in self._runtime_profiles
        )
        prior: dict[str, str] = {}
        for profile in self._runtime_profiles:
            prior.update(profile.prior_container_started_at)
        records, sequence, _, _ = self._docker_collector.collect_snapshots(
            clock=self._clock,
            collector_session=self._session,
            sequence_start=self._state.sequence,
            kube_verified=self._docker_kube_verified,
            prior_container_started_at=prior,
        )
        self._state.sequence = sequence
        started_at: dict[str, str] = dict(prior)
        for record in records:
            if record.get("kind") == "docker_snapshot":
                docker = record.get("docker") or {}
                container_id = docker.get("containerId")
                started = docker.get("startedAt")
                if isinstance(container_id, str) and isinstance(started, str):
                    started_at[container_id] = started
        for profile in self._runtime_profiles:
            profile.prior_container_started_at = dict(started_at)
        self._append_runtime_records(records)

    def _run_runtime_kube(self) -> None:
        if not self._runtime_profiles:
            return
        now_mono_s = self._mono()
        for profile in self._runtime_profiles:
            profile.kube_state.sequence = self._state.sequence
            records, _ = profile.kube_collector.collect_cycle(
                clock=self._clock,
                collector_session=self._session,
                kind_nodes=profile.kind_nodes,
                kube_probes_permitted=profile.kube_probes_permitted,
                state=profile.kube_state,
                now_mono_s=now_mono_s,
            )
            self._state.sequence = profile.kube_state.sequence
            pod_snapshots = [
                record["pod"]
                for record in records
                if record.get("kind") == "pod_snapshot"
                and record.get("source") == "runtime.kube.pods"
                and isinstance(record.get("pod"), dict)
            ]
            if pod_snapshots:
                profile.last_pods = pod_snapshots
            self._append_runtime_records(records)

    def _run_runtime_cgroup(self) -> None:
        if not self._runtime_profiles:
            return
        self._update_low_memory_suspend()
        if self._runtime_cgroup_suspended:
            coverage = {
                "runtimeCgroupSuspended": True,
                "reason": "low_memory_suspend",
            }
            self._append(
                "events",
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "kind": "coverage",
                    "collectorSession": self._session,
                    "source": "collector.runtime.cgroup",
                    "scopeId": self._scope_id,
                    "observedAt": self._clock.observed_at_utc(),
                    "monotonicNs": str(self._clock.mono_ns()),
                    "sequence": self._state.sequence + 1,
                    "units": {"reason": "plain-text"},
                    "coverage": coverage,
                },
            )
            return

        now_mono_s = self._mono()
        for profile in self._runtime_profiles:
            if profile.kube_probes_permitted and not profile.last_pods:
                cgroup_scope_id = build_scope_id(
                    self._config.installation_id,
                    self._state.boot_id,
                    f"cgroup:{profile.kube_context}",
                )
                self._state.sequence += 1
                self._append_runtime_records(
                    [
                        {
                            "schemaVersion": SCHEMA_VERSION,
                            "kind": "coverage",
                            "collectorSession": self._session,
                            "source": "runtime.cgroup",
                            "scopeId": cgroup_scope_id,
                            "observedAt": self._clock.observed_at_utc(),
                            "monotonicNs": str(self._clock.mono_ns()),
                            "sequence": self._state.sequence,
                            "units": {"reason": "plain-text"},
                            "coverage": {
                                "cgroupMappingGap": True,
                                "gapReason": "pod snapshot unavailable",
                            },
                        }
                    ]
                )
            container_map, mapping_gaps = map_pod_containers_to_kind_nodes(
                profile.kind_nodes,
                profile.last_pods,
            )
            cgroup_scope_id = build_scope_id(
                self._config.installation_id,
                self._state.boot_id,
                f"cgroup:{profile.kube_context}",
            )
            for gap in mapping_gaps:
                self._state.sequence += 1
                self._append_runtime_records(
                    [
                        {
                            "schemaVersion": SCHEMA_VERSION,
                            "kind": "coverage",
                            "collectorSession": self._session,
                            "source": "runtime.cgroup",
                            "scopeId": cgroup_scope_id,
                            "observedAt": self._clock.observed_at_utc(),
                            "monotonicNs": str(self._clock.mono_ns()),
                            "sequence": self._state.sequence,
                            "units": {"reason": "plain-text"},
                            "coverage": {
                                "cgroupMappingGap": True,
                                **gap,
                            },
                        }
                    ]
                )

            profile.cgroup_state.sequence = self._state.sequence
            records, _ = profile.cgroup_collector.collect_cycle(
                clock=self._clock,
                collector_session=self._session,
                kind_nodes=profile.kind_nodes,
                container_ids_by_node=container_map,
                state=profile.cgroup_state,
                now_mono_s=now_mono_s,
                kube_probes_permitted=profile.kube_probes_permitted,
            )
            self._state.sequence = profile.cgroup_state.sequence
            self._append_runtime_records(records)

    def _append(self, writer_name: str, record: dict[str, Any]) -> None:
        writers: dict[str, Any] = {
            "fast-raw": self._fast_raw_writer,
            "fast-minute": self._fast_minute_writer,
            "fast-hour": self._fast_hour_writer,
            "process": self._process_writer,
            "health": self._health_writer,
            "events": self._events_writer,
            "runtime": self._runtime_writer,
        }
        writer = writers.get(writer_name, self._events_writer)
        try:
            self._state.sequence = self._store.append_locked(writer, record)
        except StorageLimitedError:
            self._record_storage_drop(writer_name)

    def _record_storage_drop(self, stream: str) -> None:
        self._state.worker_gaps.append(f"storage-limited:{stream}")
        try:
            self._append(
                "events",
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "kind": "coverage",
                    "collectorSession": self._session,
                    "source": "collector.storage",
                    "scopeId": self._scope_id,
                    "observedAt": self._clock.observed_at_utc(),
                    "monotonicNs": str(self._clock.mono_ns()),
                    "sequence": self._state.sequence + 1,
                    "units": {"reason": "plain-text"},
                    "coverage": {
                        "storageLimited": True,
                        "stream": stream,
                        "droppedCoverage": self._store.dropped_append_coverage,
                    },
                },
            )
        except StorageLimitedError:
            pass

    def _start_fast_cadence(self) -> None:
        start_ns = self._clock.mono_ns()
        start_mono_s = self._mono()
        self._fast_window_start_ns = start_ns
        self._fast_tick_slot = 0
        self._fast_next_tick_deadline_s = start_mono_s + FAST_TICK_S
        self._minute_bucket_start_ns = (start_ns // ROLLUP_MINUTE_NS) * ROLLUP_MINUTE_NS
        self._hour_bucket_start_ns = (start_ns // ROLLUP_HOUR_NS) * ROLLUP_HOUR_NS
        self._host_windows_minute.clear()
        self._host_windows_hour.clear()

    def _maybe_fast_tick(self, now_mono_s: float) -> None:
        if self._fast_window_start_ns is None:
            return
        if self._fast_tick_slot >= FAST_TICKS_PER_WINDOW:
            self._flush_fast_window()
        if now_mono_s < self._fast_next_tick_deadline_s:
            return
        window_start = self._fast_window_start_ns
        scheduled_ns = window_start + self._fast_tick_slot * FAST_TICK_NS
        now_ns = self._clock.mono_ns()
        missed = now_ns > scheduled_ns + TICK_MISS_GRACE_NS
        if not missed:
            try:
                self._fast_meminfo_texts.append(self._read_meminfo())
                self._fast_tick_times_ns.append(now_ns)
            except OSError:
                missed = True
                self._fast_skipped_ticks += 1
        else:
            self._fast_skipped_ticks += 1
        self._fast_tick_slot += 1
        self._fast_next_tick_deadline_s += FAST_TICK_S
        if self._fast_tick_slot >= FAST_TICKS_PER_WINDOW:
            self._flush_fast_window()

    def _flush_fast_window(self, *, force_partial: bool = False) -> None:
        if self._fast_window_start_ns is None:
            return
        if not self._fast_tick_times_ns and not force_partial and self._fast_tick_slot == 0:
            return
        mem_queue = list(self._fast_meminfo_texts)

        def read_meminfo() -> str:
            if mem_queue:
                return mem_queue.pop(0)
            return ""

        jumped, delta = self._clock_jump.observe(
            self._clock.wall_time(), self._clock.mono_ns()
        )
        record = observe_fast_window(
            window_start_mono_ns=self._fast_window_start_ns,
            clock=self._clock,
            scope_id=self._scope_id,
            collector_session=self._session,
            sequence=self._state.sequence + 1,
            read_meminfo=read_meminfo,
            tick_times_ns=list(self._fast_tick_times_ns),
            clock_jump=(jumped, delta) if jumped else None,
        )
        self._append("fast-raw", record)
        self._host_peak.observe_window(record)
        self._accumulate_rollups(record)
        next_start = self._fast_window_start_ns + FAST_WINDOW_NS
        self._fast_window_start_ns = next_start
        self._fast_tick_slot = 0
        self._fast_tick_times_ns.clear()
        self._fast_meminfo_texts.clear()
        self._fast_next_tick_deadline_s = (next_start / 1_000_000_000.0) + FAST_TICK_S

    def _accumulate_rollups(self, window: dict[str, Any]) -> None:
        self._host_windows_minute.append(window)
        self._host_windows_hour.append(window)
        if len(self._host_windows_minute) >= WINDOWS_PER_MINUTE_ROLLUP:
            self._flush_minute_rollup()
        if len(self._host_windows_hour) >= WINDOWS_PER_HOUR_ROLLUP:
            self._flush_hour_rollup()

    def _flush_minute_rollup(self, *, force: bool = False) -> None:
        if not self._host_windows_minute or self._minute_bucket_start_ns is None:
            return
        record = rollup_minute(
            list(self._host_windows_minute),
            bucket_start_mono_ns=self._minute_bucket_start_ns,
            clock=self._clock,
            scope_id=self._scope_id,
            collector_session=self._session,
            sequence=self._state.sequence + 1,
            peak_tracker=self._host_peak,
        )
        self._append("fast-minute", record)
        self._host_windows_minute.clear()
        self._minute_bucket_start_ns += ROLLUP_MINUTE_NS

    def _flush_hour_rollup(self, *, force: bool = False) -> None:
        if not self._host_windows_hour or self._hour_bucket_start_ns is None:
            return
        record = rollup_hour(
            list(self._host_windows_hour),
            bucket_start_mono_ns=self._hour_bucket_start_ns,
            clock=self._clock,
            scope_id=self._scope_id,
            collector_session=self._session,
            sequence=self._state.sequence + 1,
            peak_tracker=self._host_peak,
        )
        self._append("fast-hour", record)
        self._host_windows_hour.clear()
        self._hour_bucket_start_ns += ROLLUP_HOUR_NS

    def _run_slow_counters(self) -> None:
        pressure = {kind: self._read_pressure(kind) for kind in PRESSURE_KINDS}
        record = observe_slow_counters(
            clock=self._clock,
            scope_id=self._scope_id,
            collector_session=self._session,
            sequence=self._state.sequence + 1,
            vmstat_text=self._read_vmstat(),
            stat_text=self._read_stat(),
            pressure=pressure,
            previous_counters=self._slow_counter_state or None,
        )
        self._slow_counter_state = dict(record.get("counters", {}))
        self._append("fast-raw", record)

    def _mem_available_bytes(self) -> Optional[int]:
        if self._fast_meminfo_texts:
            return parse_meminfo(self._fast_meminfo_texts[-1]).get("MemAvailable")
        return parse_meminfo(self._read_meminfo()).get("MemAvailable")

    def _update_low_memory_suspend(self) -> None:
        available = self._mem_available_bytes()
        if available is None:
            self._optional_pss_suspended = False
            self._runtime_cgroup_suspended = False
            return
        under_limit = available < self._config.mem_available_suspend_bytes
        self._optional_pss_suspended = under_limit
        self._runtime_cgroup_suspended = under_limit

    def _run_process_snapshot(self) -> None:
        self._update_low_memory_suspend()
        records, sequence, keys = collect_process_cycle_records(
            self._proc,
            clock=self._clock,
            installation_id=self._config.installation_id,
            collector_session=self._session,
            sequence_start=self._state.sequence,
            prior_keys=self._state.process_keys,
            atop_consent=self._config.atop_sensitive_argv_consent,
            atop_enabled=self._config.atop_installed,
            include_pss=False,
        )
        self._state.sequence = sequence
        self._state.process_keys = keys
        for record in records:
            self._append("process", record)

    def _run_optional_pss(self) -> None:
        if not self._config.enable_optional_pss or self._optional_pss_suspended:
            coverage = {
                "optionalPssSuspended": self._optional_pss_suspended,
                "reason": "low_memory_suspend" if self._optional_pss_suspended else None,
            }
            self._append(
                "events",
                {
                    "schemaVersion": SCHEMA_VERSION,
                    "kind": "coverage",
                    "collectorSession": self._session,
                    "source": "collector.pss",
                    "scopeId": self._scope_id,
                    "observedAt": self._clock.observed_at_utc(),
                    "monotonicNs": str(self._clock.mono_ns()),
                    "sequence": self._state.sequence + 1,
                    "units": {"reason": "plain-text"},
                    "coverage": coverage,
                },
            )
            return
        records, sequence, keys = collect_process_cycle_records(
            self._proc,
            clock=self._clock,
            installation_id=self._config.installation_id,
            collector_session=self._session,
            sequence_start=self._state.sequence,
            prior_keys=keys if (keys := self._state.process_keys) else None,
            atop_consent=self._config.atop_sensitive_argv_consent,
            atop_enabled=self._config.atop_installed,
            include_pss=True,
        )
        self._state.sequence = sequence
        self._state.process_keys = keys
        for record in records:
            if record.get("source") == "process-pss-top":
                self._append("process", record)

    def _parse_self_rss_bytes(self) -> Optional[int]:
        import re

        match = re.search(r"^VmRSS:\s+(\d+)\s+kB\s*$", self._read_self_status(), re.MULTILINE)
        if match is None:
            return None
        return int(match.group(1)) * 1024

    def _run_status(self) -> None:
        storage_report = self._store.enforce_retention(force=True)
        record = {
            "schemaVersion": SCHEMA_VERSION,
            "kind": "health",
            "collectorSession": self._session,
            "source": "collector.status",
            "scopeId": self._scope_id,
            "observedAt": self._clock.observed_at_utc(),
            "monotonicNs": str(self._clock.mono_ns()),
            "sequence": self._state.sequence + 1,
            "units": {"memory": "bytes", "storage": "bytes"},
            "collector": {
                "pid": self._collector_pid,
                "rssBytes": self._parse_self_rss_bytes(),
                "runtimeExtension": self._state.runtime_status,
                "heartbeats": self._state.heartbeats,
                "workerGaps": list(self._state.worker_gaps),
                "optionalPssSuspended": self._optional_pss_suspended,
                "runtimeCgroupSuspended": self._runtime_cgroup_suspended,
                "runtimeProfiles": len(self._runtime_profiles),
            },
            "storage": {
                "streams": {
                    name: {
                        "byteTotal": stats.byte_total,
                        "segmentCount": stats.segment_count,
                        "droppedSegments": stats.dropped_segments,
                    }
                    for name, stats in storage_report.streams.items()
                },
                "storageLimited": storage_report.storage_limited,
            },
        }
        self._append("health", record)

    def _run_heartbeat(self) -> None:
        jumped, delta = self._clock_jump.observe(
            self._clock.wall_time(), self._clock.mono_ns()
        )
        self._state.heartbeats += 1
        record = {
            "schemaVersion": SCHEMA_VERSION,
            "kind": "coverage",
            "collectorSession": self._session,
            "source": "collector.heartbeat",
            "scopeId": self._scope_id,
            "observedAt": self._clock.observed_at_utc(),
            "monotonicNs": str(self._clock.mono_ns()),
            "sequence": self._state.sequence + 1,
            "units": {"intervalSeconds": "seconds"},
            "coverage": {
                "heartbeat": True,
                "intervalSeconds": HEARTBEAT_INTERVAL_S,
                "bootId": self._state.boot_id,
                "collectorSessionRestarts": self._state.collector_restarts,
            },
        }
        if jumped:
            record["clockJump"] = {"detected": True, "deltaSeconds": delta}
        self._append("events", record)

    def _dispatch_due_workers(self, now_mono_s: float) -> None:
        for worker in self._workers:
            if not worker.due(now_mono_s):
                continue
            worker.begin(now_mono_s)
            try:
                worker.run()
            except Exception as exc:
                code = sanitize_worker_error(exc)
                self._state.worker_gaps.append(f"{worker.name}:{code}")
                gap_record = {
                    "schemaVersion": SCHEMA_VERSION,
                    "kind": "coverage",
                    "collectorSession": self._session,
                    "source": "collector.worker",
                    "scopeId": self._scope_id,
                    "observedAt": self._clock.observed_at_utc(),
                    "monotonicNs": str(self._clock.mono_ns()),
                    "sequence": self._state.sequence + 1,
                    "units": {"reason": "plain-text"},
                    "coverage": {
                        "workerGap": True,
                        "worker": worker.name,
                        "errorCode": code,
                    },
                }
                self._append("events", gap_record)
            finally:
                worker.complete()

    def run_until(
        self,
        *,
        max_ticks: int = 0,
        idle_sleep_s: float = 0.01,
    ) -> None:
        self._state.boot_id = read_boot_id(self._read_boot_text)
        self._scope_id = build_scope_id(
            self._config.installation_id, self._state.boot_id, "host"
        )
        self._sync_runtime_profile_collectors()
        self._start_fast_cadence()
        ticks = 0
        while not self._stop_requested:
            now = self._mono()
            self._maybe_fast_tick(now)
            self._dispatch_due_workers(now)
            ticks += 1
            if max_ticks and ticks >= max_ticks:
                break
            self._sleep(idle_sleep_s)
        self.shutdown()

    def shutdown(self, *, flush_deadline_s: float = FSYNC_INTERVAL_S) -> None:
        if self._fast_tick_times_ns or (
            self._fast_tick_slot > 0 and self._fast_window_start_ns is not None
        ):
            self._flush_fast_window(force_partial=True)
        if self._host_windows_minute:
            self._flush_minute_rollup(force=True)
        if self._host_windows_hour:
            self._flush_hour_rollup(force=True)
        started = self._mono()
        self._store.shutdown()
        elapsed = self._mono() - started
        if elapsed > flush_deadline_s:
            self._state.worker_gaps.append(f"flush_slow:{elapsed:.3f}s")

    def record_session_restart(self) -> None:
        self._state.collector_restarts += 1
        self._session = new_collector_session()
        for writer in (
            self._fast_raw_writer,
            self._fast_minute_writer,
            self._fast_hour_writer,
            self._process_writer,
            self._health_writer,
            self._events_writer,
            self._runtime_writer,
        ):
            writer._collector_session = self._session  # narrow session rollover for tests


def _production_clock(read_boot_text: Callable[[], str]) -> InjectableClock:
    boot_id = read_boot_id(read_boot_text)
    return InjectableClock(boot_id=boot_id)


def build_collector_from_config(
    config: CollectorConfig,
    *,
    clock: Optional[InjectableClock] = None,
    proc: Optional[ProcFixture] = None,
    read_meminfo: Optional[Callable[[], str]] = None,
    read_self_status: Optional[Callable[[], str]] = None,
    read_boot_text: Optional[Callable[[], str]] = None,
    fixture: bool = False,
) -> MonitoringCollector:
    meminfo_path = Path("/proc/meminfo")
    status_path = Path("/proc/self/status")
    boot_path = Path("/proc/sys/kernel/random/boot_id")
    vmstat_path = Path("/proc/vmstat")
    stat_path = Path("/proc/stat")
    pressure_dir = Path("/proc/pressure")

    def read_pressure(kind: str) -> str:
        path = pressure_dir / kind
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return ""

    if fixture:
        read_boot = read_boot_text or (lambda: "boot-fixture")
        clock = clock or InjectableClock(boot_id=read_boot_id(read_boot))
        proc_fixture = proc or FakeProcRoot()
        meminfo_reader = read_meminfo or (lambda: "")
        status_reader = read_self_status or (lambda: "VmRSS:\t12345 kB\n")
        vmstat_reader = lambda: ""
        stat_reader = lambda: ""
        pressure_reader = lambda _kind: ""
    else:
        read_boot = read_boot_text or (
            lambda: boot_path.read_text(encoding="utf-8", errors="replace")
        )
        clock = clock or _production_clock(read_boot)
        proc_fixture = proc or LiveProcRoot()
        meminfo_reader = read_meminfo or (
            lambda: meminfo_path.read_text(encoding="utf-8", errors="replace")
        )
        status_reader = read_self_status or (
            lambda: status_path.read_text(encoding="utf-8", errors="replace")
        )
        vmstat_reader = lambda: vmstat_path.read_text(encoding="utf-8", errors="replace")
        stat_reader = lambda: stat_path.read_text(encoding="utf-8", errors="replace")
        pressure_reader = read_pressure

    scope_boot = read_boot_id(read_boot)
    if clock.boot_id == "unknown-boot" and scope_boot != "unknown-boot":
        clock = InjectableClock(
            boot_id=scope_boot,
            wall_seconds=clock.wall_seconds,
            monotonic_ns=clock.monotonic_ns,
        )

    return MonitoringCollector(
        config,
        clock=clock,
        proc=proc_fixture,
        store=RecordStore(
            config.state_root,
            build_scope_id(config.installation_id, scope_boot, "host"),
            clock,
            create_root=True,
        ),
        read_meminfo=meminfo_reader,
        read_self_status=status_reader,
        read_boot_text=read_boot,
        read_vmstat=vmstat_reader,
        read_stat=stat_reader,
        read_pressure=pressure_reader,
        collector_pid=0 if fixture else None,
    )


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(prog="offscreen-monitor-collector")
    parser.add_argument(
        "--config",
        required=True,
        help="Path to installed user JSON config",
    )
    parser.add_argument(
        "--fixture",
        action="store_true",
        help="Use injected fake proc/meminfo (explicit test mode only)",
    )
    parser.add_argument(
        "--max-ticks",
        type=int,
        default=0,
        help="Exit after N scheduler ticks (0 = run until signal)",
    )
    args = parser.parse_args(argv)

    install_root = Path(__file__).resolve().parent
    if str(install_root) not in sys.path:
        sys.path.insert(0, str(install_root))

    try:
        config = CollectorConfig.load_once(args.config)
    except (OSError, KeyError, ValueError, json.JSONDecodeError) as exc:
        print(f"offscreen-monitor: invalid config: {exc}", file=sys.stderr)
        return 2

    collector = build_collector_from_config(config, fixture=args.fixture)
    collector.install_signal_handlers()
    try:
        collector.run_until(max_ticks=args.max_ticks)
    except KeyboardInterrupt:
        collector.request_stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

