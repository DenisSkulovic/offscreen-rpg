"""Safe /proc process snapshots without persisting argv, cwd, or environment."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Mapping, Optional, Protocol

from records import (
    SCHEMA_VERSION,
    InjectableClock,
    ProcessKey,
    build_scope_id,
)

PROCESS_SNAPSHOT_INTERVAL_S = 5.0
PSS_SAMPLE_INTERVAL_S = 30.0
PSS_TOP_N = 10

# Executable basenames mapped to stable category labels (comm/exe only).
EXECUTABLE_CATEGORY_BASENAMES: dict[str, str] = {
    "node": "node",
    "nodejs": "node",
    "pnpm": "pnpm",
    "npm": "pnpm",
    "npx": "pnpm",
    "tsc": "tsc",
    "tilt": "tilt",
    "dockerd": "dockerd",
    "buildkitd": "buildkit",
    "containerd": "containerd",
    "kind": "kind",
    "kubectl": "kubectl",
    "python3": "python",
    "python": "python",
}

KNOWN_TOOL_ARGV_TOKENS = frozenset(
    {
        "node",
        "pnpm",
        "tilt",
        "docker",
        "kubectl",
        "kind",
        "buildkit",
        "tsc",
    }
)

FORBIDDEN_PERSISTENCE_KEYS = frozenset(
    {
        "cmdline",
        "argv",
        "environ",
        "environment",
        "cwd",
        "Cmdline",
        "Environ",
    }
)

SENSITIVE_CGROUP_MARKERS = (
    "kubepods",
    "docker",
    "cri-containerd",
)

_STAT_STARTTIME_INDEX = 18
_STAT_UTIME_INDEX = 10
_STAT_STIME_INDEX = 11
_STAT_STATE_INDEX = 0
_STAT_PPID_INDEX = 1

_STATUS_VM_RSS_RE = re.compile(r"^VmRSS:\s+(\d+)\s+kB\s*$", re.MULTILINE)
_STATUS_VM_HWM_RE = re.compile(r"^VmHWM:\s+(\d+)\s+kB\s*$", re.MULTILINE)
_STATUS_THREADS_RE = re.compile(r"^Threads:\s+(\d+)\s*$", re.MULTILINE)
_STATUS_VOL_CXT_RE = re.compile(r"^voluntary_ctxt_switches:\s+(\d+)\s*$", re.MULTILINE)
_STATUS_NONVOL_CXT_RE = re.compile(
    r"^nonvoluntary_ctxt_switches:\s+(\d+)\s*$", re.MULTILINE
)
_PSS_RE = re.compile(r"^Pss:\s+(\d+)\s+kB\s*$", re.MULTILINE)


class ProcessObservationState(str, Enum):
    OBSERVED = "observed"
    DENIED = "denied"
    EXITED = "exited"
    UNOBSERVED = "unobserved"


@dataclass(frozen=True)
class ParsedProcStat:
    pid: int
    comm: str
    state: str
    ppid: int
    utime: int
    stime: int
    starttime_ticks: int
    rss_pages: int


class ProcReadError(Exception):
    """Base error for fixture /proc reads."""


class ProcAccessDenied(ProcReadError):
    pass


class ProcNotFound(ProcReadError):
    pass


class ProcFixture(Protocol):
    def list_pids(self) -> list[int]: ...

    def read_file(self, pid: int, name: str) -> bytes: ...


@dataclass
class FakeProcRoot:
    """Injected /proc layout for tests; never used from live /proc in unit tests."""

    processes: dict[int, dict[str, bytes]] = field(default_factory=dict)
    listing_error: Optional[str] = None
    denied_pids: set[int] = field(default_factory=set)

    def list_pids(self) -> list[int]:
        if self.listing_error:
            raise ProcReadError(self.listing_error)
        return sorted(self.processes.keys())

    def read_file(self, pid: int, name: str) -> bytes:
        if pid in self.denied_pids:
            raise ProcAccessDenied(f"access denied for {pid}/{name}")
        proc = self.processes.get(pid)
        if proc is None:
            raise ProcNotFound(f"missing pid {pid}")
        if name not in proc:
            raise ProcNotFound(f"missing {pid}/{name}")
        return proc[name]


@dataclass
class LiveProcRoot:
    """Read-only adapter for the live host /proc tree."""

    root: Path = field(default_factory=lambda: Path("/proc"))

    def list_pids(self) -> list[int]:
        try:
            entries = self.root.iterdir()
        except OSError as exc:
            raise ProcReadError(str(exc)) from exc
        pids: list[int] = []
        for entry in entries:
            if entry.name.isdigit():
                pids.append(int(entry.name))
        return sorted(pids)

    def read_file(self, pid: int, name: str) -> bytes:
        path = self.root / str(pid) / name
        try:
            return path.read_bytes()
        except FileNotFoundError as exc:
            raise ProcNotFound(f"missing {pid}/{name}") from exc
        except PermissionError as exc:
            raise ProcAccessDenied(f"access denied for {pid}/{name}") from exc
        except OSError as exc:
            raise ProcReadError(str(exc)) from exc


def parse_proc_stat(text: str) -> ParsedProcStat:
    """Parse /proc/PID/stat using the final ')' before numeric fields."""
    text = text.strip()
    last_paren = text.rfind(")")
    if last_paren < 0:
        raise ValueError("stat line missing closing paren")
    rest = text[last_paren + 1 :].strip()
    first_open = text.find("(")
    if first_open < 0:
        raise ValueError("stat line missing comm")
    pid = int(text[:first_open].strip())
    comm = text[first_open + 1 : last_paren]
    fields = rest.split()
    if len(fields) <= _STAT_STARTTIME_INDEX:
        raise ValueError("stat line truncated")
    return ParsedProcStat(
        pid=pid,
        comm=comm,
        state=fields[_STAT_STATE_INDEX],
        ppid=int(fields[_STAT_PPID_INDEX]),
        utime=int(fields[_STAT_UTIME_INDEX]),
        stime=int(fields[_STAT_STIME_INDEX]),
        starttime_ticks=int(fields[_STAT_STARTTIME_INDEX]),
        rss_pages=int(fields[20]) if len(fields) > 20 else 0,
    )


def _optional_int(pattern: re.Pattern[str], text: str) -> Optional[int]:
    match = pattern.search(text)
    if match is None:
        return None
    return int(match.group(1))


def parse_status_allowlisted(text: str) -> dict[str, Optional[int]]:
    return {
        "vmRssBytes": _scale_kib(_optional_int(_STATUS_VM_RSS_RE, text)),
        "vmHwmBytes": _scale_kib(_optional_int(_STATUS_VM_HWM_RE, text)),
        "threads": _optional_int(_STATUS_THREADS_RE, text),
        "voluntaryCtxtSwitches": _optional_int(_STATUS_VOL_CXT_RE, text),
        "nonvoluntaryCtxtSwitches": _optional_int(_STATUS_NONVOL_CXT_RE, text),
    }


def parse_io_allowlisted(text: str) -> dict[str, Optional[int]]:
    counters: dict[str, int] = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        if value.isdigit():
            counters[key.strip()] = int(value)
    return {
        "readBytes": counters.get("read_bytes"),
        "writeBytes": counters.get("write_bytes"),
    }


def cgroup_path_if_safe(text: str) -> Optional[str]:
    """Return a cgroup path only when it is not considered sensitive."""
    for line in text.splitlines():
        if not line.startswith("0::"):
            continue
        path = line[3:].strip()
        if not path or path == "/":
            return path
        lowered = path.lower()
        for marker in SENSITIVE_CGROUP_MARKERS:
            if marker in lowered:
                return None
        return path
    return None


def parse_smaps_rollup_pss_bytes(text: str) -> Optional[int]:
    value_kib = _optional_int(_PSS_RE, text)
    return _scale_kib(value_kib)


def _scale_kib(value: Optional[int]) -> Optional[int]:
    if value is None:
        return None
    return value * 1024


def classify_process_category(
    comm: str,
    exe_basename: Optional[str],
    cmdline_bytes: Optional[bytes],
) -> Optional[str]:
  # Category uses allowlisted basenames and exact argv tokens in memory only.
    candidates: list[str] = []
    if exe_basename:
        candidates.append(os.path.basename(exe_basename))
    candidates.append(comm)
    for name in candidates:
        key = name.lower()
        if key in EXECUTABLE_CATEGORY_BASENAMES:
            return EXECUTABLE_CATEGORY_BASENAMES[key]
    if cmdline_bytes:
        for raw in cmdline_bytes.split(b"\0"):
            if not raw:
                continue
            token = raw.decode("utf-8", errors="replace")
            base = os.path.basename(token)
            if base in KNOWN_TOOL_ARGV_TOKENS:
                return EXECUTABLE_CATEGORY_BASENAMES.get(base, base)
    return None


def assert_safe_record_fields(payload: Mapping[str, Any]) -> None:
    for key in payload:
        if key in FORBIDDEN_PERSISTENCE_KEYS:
            raise ValueError(f"forbidden persistence field {key}")
        if isinstance(payload[key], dict):
            assert_safe_record_fields(payload[key])
        elif isinstance(payload[key], list):
            for item in payload[key]:
                if isinstance(item, dict):
                    assert_safe_record_fields(item)


@dataclass
class ProcessObservation:
    state: ProcessObservationState
    pid: int
    process_key: Optional[ProcessKey] = None
    identity: Optional[dict[str, Any]] = None
    metrics: Optional[dict[str, Any]] = None
    category: Optional[str] = None
    reason: str = ""

    def as_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "pid": self.pid,
            "observationState": self.state.value,
        }
        if self.process_key is not None:
            payload["processKey"] = self.process_key.as_dict()
        if self.identity:
            payload["identity"] = self.identity
        if self.metrics:
            payload["metrics"] = self.metrics
        if self.category:
            payload["category"] = self.category
        if self.reason:
            payload["reason"] = self.reason
        return payload


def observe_process(
    proc: ProcFixture,
    pid: int,
    scope_id: str,
    *,
    racetrack: Optional[dict[int, int]] = None,
) -> ProcessObservation:
    racetrack = racetrack if racetrack is not None else {}
    try:
        before = parse_proc_stat(proc.read_file(pid, "stat").decode("utf-8", errors="replace"))
    except ProcAccessDenied as exc:
        return ProcessObservation(
            state=ProcessObservationState.DENIED,
            pid=pid,
            reason=str(exc),
        )
    except ProcNotFound:
        prior_ticks = racetrack.get(pid)
        if prior_ticks is not None:
            return ProcessObservation(
                state=ProcessObservationState.EXITED,
                pid=pid,
                reason="stat unavailable after prior observation",
                process_key=ProcessKey(scope_id, pid, prior_ticks),
            )
        return ProcessObservation(
            state=ProcessObservationState.UNOBSERVED,
            pid=pid,
            reason="stat missing",
        )

    process_key = ProcessKey(scope_id, pid, before.starttime_ticks)
    racetrack[pid] = before.starttime_ticks

    try:
        status_text = proc.read_file(pid, "status").decode("utf-8", errors="replace")
        io_text = proc.read_file(pid, "io").decode("utf-8", errors="replace")
        cgroup_text = proc.read_file(pid, "cgroup").decode("utf-8", errors="replace")
        cmdline = proc.read_file(pid, "cmdline")
        exe_bytes = proc.read_file(pid, "exe")
        after = parse_proc_stat(proc.read_file(pid, "stat").decode("utf-8", errors="replace"))
    except ProcAccessDenied as exc:
        return ProcessObservation(
            state=ProcessObservationState.DENIED,
            pid=pid,
            process_key=process_key,
            reason=str(exc),
        )
    except ProcNotFound:
        return ProcessObservation(
            state=ProcessObservationState.EXITED,
            pid=pid,
            process_key=process_key,
            reason="auxiliary proc file disappeared",
        )

    if before.starttime_ticks != after.starttime_ticks:
        return ProcessObservation(
            state=ProcessObservationState.EXITED,
            pid=pid,
            reason="starttime_ticks changed during read",
            process_key=ProcessKey(scope_id, pid, before.starttime_ticks),
        )

    exe_name: Optional[str] = None
    if exe_bytes:
        exe_name = os.path.basename(exe_bytes.decode("utf-8", errors="replace"))

    category = classify_process_category(before.comm, exe_name, cmdline)

    identity = {
        "comm": before.comm,
        "ppid": before.ppid,
        "state": before.state,
        "starttimeTicks": before.starttime_ticks,
    }
    metrics = {
        "rssPages": before.rss_pages,
        **parse_status_allowlisted(status_text),
        **parse_io_allowlisted(io_text),
    }
    cgroup = cgroup_path_if_safe(cgroup_text)
    if cgroup is not None:
        metrics["cgroupPath"] = cgroup

    return ProcessObservation(
        state=ProcessObservationState.OBSERVED,
        pid=pid,
        process_key=process_key,
        identity=identity,
        metrics=metrics,
        category=category,
    )


def observe_all_processes(
    proc: ProcFixture,
    scope_id: str,
    *,
    prior_keys: Optional[dict[int, int]] = None,
) -> tuple[list[ProcessObservation], dict[str, Any]]:
    """Sample every visible PID and summarize denied/exited/unobserved coverage."""
    racetrack = dict(prior_keys or {})
    prior_pid_set = set(racetrack.keys())
    observations: list[ProcessObservation] = []
    accounting_unavailable = False

    try:
        visible = proc.list_pids()
    except ProcReadError as exc:
        accounting_unavailable = True
        return observations, _coverage_summary(
            observations,
            accounting_unavailable=True,
            listing_error=str(exc),
            atop_enabled=False,
        )

    current_pids = set(visible)
    for pid in visible:
        observations.append(observe_process(proc, pid, scope_id, racetrack=racetrack))

    for pid in sorted(prior_pid_set - current_pids):
        start_ticks = racetrack.get(pid)
        observations.append(
            ProcessObservation(
                state=ProcessObservationState.EXITED,
                pid=pid,
                process_key=ProcessKey(scope_id, pid, start_ticks) if start_ticks else None,
                reason="pid no longer listed",
            )
        )

    return observations, _coverage_summary(observations, accounting_unavailable=accounting_unavailable)


def _coverage_summary(
    observations: list[ProcessObservation],
    *,
    accounting_unavailable: bool = False,
    listing_error: str = "",
    atop_enabled: bool = False,
    atop_consent: bool = False,
    optional_pss_suspended: bool = False,
) -> dict[str, Any]:
    counts = {state.value: 0 for state in ProcessObservationState}
    for obs in observations:
        counts[obs.state.value] += 1
    atop_mode = "disabled"
    if atop_consent and atop_enabled:
        atop_mode = "enabled"
    elif atop_consent and not atop_enabled:
        atop_mode = "unavailable"
    else:
        atop_mode = "disabled_without_sensitive_argv_consent"
    return {
        "processAccountingUnavailable": accounting_unavailable,
        "listingError": listing_error or None,
        "counts": counts,
        "atopRawHistory": atop_mode,
        "optionalPssSuspended": optional_pss_suspended,
        "exitAccountingBlindSpot": True,
    }


def select_top_rss_for_pss(
    observations: list[ProcessObservation], *, limit: int = PSS_TOP_N
) -> list[ProcessObservation]:
    observed = [
        obs
        for obs in observations
        if obs.state == ProcessObservationState.OBSERVED and obs.metrics is not None
    ]

    def rss_key(item: ProcessObservation) -> int:
        metrics = item.metrics or {}
        rss_bytes = metrics.get("vmRssBytes")
        if rss_bytes is not None:
            return int(rss_bytes)
        return int(metrics.get("rssPages", 0))

    ranked = sorted(observed, key=rss_key, reverse=True)
    return ranked[:limit]


def attach_pss_samples(
    proc: ProcFixture,
    targets: list[ProcessObservation],
) -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    for obs in targets:
        if obs.process_key is None:
            continue
        try:
            rollup = proc.read_file(obs.pid, "smaps_rollup")
        except ProcAccessDenied:
            samples.append(
                {
                    "pid": obs.pid,
                    "processKey": obs.process_key.as_dict(),
                    "pssBytes": None,
                    "accessDenied": True,
                }
            )
            continue
        except ProcNotFound:
            samples.append(
                {
                    "pid": obs.pid,
                    "processKey": obs.process_key.as_dict(),
                    "pssBytes": None,
                    "exited": True,
                }
            )
            continue
        pss = parse_smaps_rollup_pss_bytes(rollup.decode("utf-8", errors="replace"))
        samples.append(
            {
                "pid": obs.pid,
                "processKey": obs.process_key.as_dict(),
                "pssBytes": pss,
            }
        )
    return samples


def build_process_entity_record(
    observation: ProcessObservation,
    *,
    clock: InjectableClock,
    scope_id: str,
    collector_session: str,
    sequence: int,
    source: str = "process-sampler",
) -> dict[str, Any]:
    record: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "process_snapshot",
        "collectorSession": collector_session,
        "source": source,
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {
            "memory": "bytes",
            "cpu": "ticks",
            "io": "bytes",
            "switches": "count",
        },
        "process": observation.as_dict(),
    }
    assert_safe_record_fields(record)
    return record


def build_process_coverage_record(
    coverage: Mapping[str, Any],
    *,
    clock: InjectableClock,
    scope_id: str,
    collector_session: str,
    sequence: int,
) -> dict[str, Any]:
    record: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "coverage",
        "collectorSession": collector_session,
        "source": "process-sampler",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {"reason": "plain-text"},
        "coverage": dict(coverage),
    }
    return record


def build_pss_record(
    samples: list[Mapping[str, Any]],
    *,
    clock: InjectableClock,
    scope_id: str,
    collector_session: str,
    sequence: int,
) -> dict[str, Any]:
    record: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "process_snapshot",
        "collectorSession": collector_session,
        "source": "process-pss-top",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {"pss": "bytes"},
        "pssTop": list(samples),
    }
    assert_safe_record_fields(record)
    return record


def collect_process_cycle_records(
    proc: ProcFixture,
    *,
    clock: InjectableClock,
    installation_id: str,
    collector_session: str,
    sequence_start: int,
    prior_keys: Optional[dict[int, int]] = None,
    atop_consent: bool = False,
    atop_enabled: bool = False,
    include_pss: bool = False,
) -> tuple[list[dict[str, Any]], int, dict[int, int]]:
    scope_id = build_scope_id(installation_id, clock.boot_id, "host")
    sequence = sequence_start
    observations, coverage = observe_all_processes(proc, scope_id, prior_keys=prior_keys)
    if atop_consent and atop_enabled:
        coverage["atopRawHistory"] = "enabled"
    elif atop_consent:
        coverage["atopRawHistory"] = "unavailable"
    else:
        coverage["atopRawHistory"] = "disabled_without_sensitive_argv_consent"
    records: list[dict[str, Any]] = []
    for obs in observations:
        if obs.state != ProcessObservationState.OBSERVED:
            continue
        sequence += 1
        records.append(
            build_process_entity_record(
                obs,
                clock=clock,
                scope_id=scope_id,
                collector_session=collector_session,
                sequence=sequence,
            )
        )
    sequence += 1
    records.append(
        build_process_coverage_record(
            coverage,
            clock=clock,
            scope_id=scope_id,
            collector_session=collector_session,
            sequence=sequence,
        )
    )
    locked_keys = {
        obs.pid: obs.process_key.starttime_ticks
        for obs in observations
        if obs.process_key is not None
    }
    if include_pss:
        targets = select_top_rss_for_pss(observations)
        samples = attach_pss_samples(proc, targets)
        sequence += 1
        records.append(
            build_pss_record(
                samples,
                clock=clock,
                scope_id=scope_id,
                collector_session=collector_session,
                sequence=sequence,
            )
        )
    return records, sequence, locked_keys


def read_boot_id(read_text: Callable[[], str]) -> str:
    try:
        value = read_text().strip()
    except OSError:
        return "unknown-boot"
    return value or "unknown-boot"