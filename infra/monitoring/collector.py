"""Collector service entrypoint: scheduled workers, heartbeat, graceful stop."""

from __future__ import annotations

import importlib.util
import json
import os
import signal
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

from host import parse_meminfo
from processes import (
    PROCESS_SNAPSHOT_INTERVAL_S,
    PSS_SAMPLE_INTERVAL_S,
    FakeProcRoot,
    ProcFixture,
    collect_process_cycle_records,
    read_boot_id,
)
from records import (
    SCHEMA_VERSION,
    ClockJumpDetector,
    InjectableClock,
    build_scope_id,
    new_collector_session,
)
from storage import FSYNC_INTERVAL_S, RecordStore

HEARTBEAT_INTERVAL_S = 5.0
STATUS_INTERVAL_S = 60.0
LOW_MEMORY_SUSPEND_BYTES_DEFAULT = 4 * 1024 * 1024 * 1024
RUNTIME_MODULE_NAME = "runtime"


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
        )


class RuntimeExtensionStatus:
    SUPPORTED = "supported"
    UNSUPPORTED = "unsupported"
    ERROR = "error"


def try_import_runtime_module() -> tuple[Optional[Any], str]:
    """Optional runtime seam; missing package must not stop the collector."""
    if importlib.util.find_spec(RUNTIME_MODULE_NAME) is None:
        return None, RuntimeExtensionStatus.UNSUPPORTED
    try:
        module = importlib.import_module(RUNTIME_MODULE_NAME)
    except Exception:
        return None, RuntimeExtensionStatus.ERROR
    return module, RuntimeExtensionStatus.SUPPORTED


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
            self._last_error = str(exc)
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
        sleep: Callable[[float], None] = time.sleep,
        mono: Callable[[], float] = time.monotonic,
    ) -> None:
        self._config = config
        self._clock = clock
        self._proc = proc
        self._store = store
        self._read_meminfo = read_meminfo
        self._read_self_status = read_self_status
        self._read_boot_text = read_boot_text
        self._sleep = sleep
        self._mono = mono
        self._stop_requested = False
        self._session = new_collector_session()
        self._state = CollectorRunState()
        self._clock_jump = ClockJumpDetector()
        self._scope_id = build_scope_id(
            config.installation_id, read_boot_id(read_boot_text), "host"
        )
        self._process_writer = store.open_stream("process")
        self._health_writer = store.open_stream("health")
        self._events_writer = store.open_stream("events")
        self._optional_pss_suspended = False
        self._runtime_module: Optional[Any] = None
        self._configure_runtime_extension()

        self._workers = [
            MonotonicWorker("process-fast", PROCESS_SNAPSHOT_INTERVAL_S, self._run_process_snapshot),
            MonotonicWorker("process-pss", PSS_SAMPLE_INTERVAL_S, self._run_optional_pss),
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

    def _append(self, writer_name: str, record: dict[str, Any]) -> None:
        if writer_name == "process":
            writer = self._process_writer
        elif writer_name == "health":
            writer = self._health_writer
        else:
            writer = self._events_writer
        self._state.sequence = writer.append(record)

    def _mem_available_bytes(self) -> Optional[int]:
        return parse_meminfo(self._read_meminfo()).get("MemAvailable")

    def _update_low_memory_suspend(self) -> None:
        available = self._mem_available_bytes()
        if available is None:
            self._optional_pss_suspended = False
            return
        self._optional_pss_suspended = available < self._config.mem_available_suspend_bytes

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
                "pid": 0,
                "rssBytes": self._parse_self_rss_bytes(),
                "runtimeExtension": self._state.runtime_status,
                "heartbeats": self._state.heartbeats,
                "workerGaps": list(self._state.worker_gaps),
                "optionalPssSuspended": self._optional_pss_suspended,
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
                self._state.worker_gaps.append(f"{worker.name}:{exc}")
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
                        "error": str(exc),
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
        ticks = 0
        while not self._stop_requested:
            self._dispatch_due_workers(self._mono())
            ticks += 1
            if max_ticks and ticks >= max_ticks:
                break
            self._sleep(idle_sleep_s)
        self.shutdown()

    def shutdown(self, *, flush_deadline_s: float = FSYNC_INTERVAL_S) -> None:
        started = self._mono()
        self._store.shutdown()
        elapsed = self._mono() - started
        if elapsed > flush_deadline_s:
            self._state.worker_gaps.append(f"flush_slow:{elapsed:.3f}s")

    def record_session_restart(self) -> None:
        self._state.collector_restarts += 1
        self._session = new_collector_session()


def build_collector_from_config(
    config: CollectorConfig,
    *,
    clock: InjectableClock,
    proc: Optional[ProcFixture] = None,
    read_meminfo: Optional[Callable[[], str]] = None,
    read_self_status: Optional[Callable[[], str]] = None,
) -> MonitoringCollector:
    proc_fixture = proc or FakeProcRoot()
    return MonitoringCollector(
        config,
        clock=clock,
        proc=proc_fixture,
        store=RecordStore(config.state_root, build_scope_id(config.installation_id, clock.boot_id), clock, create_root=True),
        read_meminfo=read_meminfo or (lambda: ""),
        read_self_status=read_self_status or (lambda: "VmRSS:\t12345 kB\n"),
    )

