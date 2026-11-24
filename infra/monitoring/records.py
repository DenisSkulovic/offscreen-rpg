"""Supplemental observability record schema, identity, and clock semantics (v1)."""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Iterable, Iterator, Mapping, Optional

SCHEMA_VERSION = 1
MAX_RECORD_BYTES = 64 * 1024

RECORD_KINDS = frozenset(
    {
        "host_window",
        "host_rollup",
        "process_snapshot",
        "docker_snapshot",
        "pod_snapshot",
        "cgroup_snapshot",
        "coverage",
        "operation",
        "health",
    }
)

REQUIRED_RECORD_FIELDS = (
    "schemaVersion",
    "kind",
    "collectorSession",
    "source",
    "scopeId",
    "observedAt",
    "monotonicNs",
    "sequence",
)

# Allowlisted /proc/meminfo fields collected on the fast path (KiB in source, bytes in records).
MEMINFO_FIELDS: tuple[str, ...] = (
    "MemTotal",
    "MemAvailable",
    "MemFree",
    "AnonPages",
    "Cached",
    "SReclaimable",
    "Shmem",
    "SwapTotal",
    "SwapFree",
    "Dirty",
    "Writeback",
)

KIB_TO_BYTES = 1024

FAST_TICK_NS = 200_000_000
FAST_WINDOW_NS = 1_000_000_000
FAST_TICKS_PER_WINDOW = FAST_WINDOW_NS // FAST_TICK_NS

ROLLUP_MINUTE_NS = 60 * FAST_WINDOW_NS
ROLLUP_HOUR_NS = 3600 * FAST_WINDOW_NS


class RecordValidationError(ValueError):
    """Raised when a record violates the v1 contract."""


class RecordLineState(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    CORRUPT = "corrupt"
    EMPTY = "empty"


@dataclass(frozen=True)
class RecordLine:
    state: RecordLineState
    record: Optional[dict[str, Any]]
    raw: bytes
    offset: int
    message: str = ""


@dataclass(frozen=True)
class ProcessKey:
    scope_id: str
    pid: int
    starttime_ticks: int

    def as_dict(self) -> dict[str, Any]:
        return {
            "scopeId": self.scope_id,
            "pid": self.pid,
            "starttimeTicks": self.starttime_ticks,
        }

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "ProcessKey":
        for key in ("scopeId", "pid", "starttimeTicks"):
            if key not in data:
                raise RecordValidationError(f"process key missing {key}")
        return cls(
            scope_id=str(data["scopeId"]),
            pid=int(data["pid"]),
            starttime_ticks=int(data["starttimeTicks"]),
        )


@dataclass(frozen=True)
class MetricStats:
    """Per-gauge aggregation using sum/count; mean is derived, not mean-of-means."""

    min: Optional[int]
    max: Optional[int]
    sum: int
    count: int

    @property
    def mean(self) -> Optional[float]:
        if self.count == 0:
            return None
        return self.sum / self.count

    def as_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "min": self.min,
            "max": self.max,
            "sum": self.sum,
            "count": self.count,
            "mean": self.mean,
        }
        return payload

    @classmethod
    def from_values(cls, values: Iterable[Optional[int]]) -> "MetricStats":
        observed = [value for value in values if value is not None]
        if not observed:
            return cls(min=None, max=None, sum=0, count=0)
        return cls(
            min=min(observed),
            max=max(observed),
            sum=sum(observed),
            count=len(observed),
        )

    @classmethod
    def merge(cls, left: "MetricStats", right: "MetricStats") -> "MetricStats":
        """Combine stats using min/max and sum/count only (no mean-of-means)."""
        if left.count == 0:
            return right
        if right.count == 0:
            return left
        combined_min: Optional[int]
        if left.min is None:
            combined_min = right.min
        elif right.min is None:
            combined_min = left.min
        else:
            combined_min = min(left.min, right.min)

        combined_max: Optional[int]
        if left.max is None:
            combined_max = right.max
        elif right.max is None:
            combined_max = left.max
        else:
            combined_max = max(left.max, right.max)

        return cls(
            min=combined_min,
            max=combined_max,
            sum=left.sum + right.sum,
            count=left.count + right.count,
        )


def new_collector_session() -> str:
    return str(uuid.uuid4())


def build_scope_id(
    installation_id: str,
    boot_id: str,
    runtime_boundary: str = "host",
) -> str:
    parts = (installation_id.strip(), boot_id.strip(), runtime_boundary.strip())
    if not all(parts):
        raise RecordValidationError("scope identity components must be non-empty")
    return ":".join(parts)


@dataclass
class InjectableClock:
    """Wall and monotonic sources for tests and production."""

    boot_id: str = "unknown-boot"
    wall_seconds: Optional[Callable[[], float]] = None
    monotonic_ns: Optional[Callable[[], int]] = None

    def wall_time(self) -> float:
        import time

        if self.wall_seconds is not None:
            return self.wall_seconds()
        return time.time()

    def mono_ns(self) -> int:
        import time

        if self.monotonic_ns is not None:
            return self.monotonic_ns()
        return time.monotonic_ns()

    def observed_at_utc(self) -> str:
        instant = datetime.fromtimestamp(self.wall_time(), tz=timezone.utc)
        text = instant.isoformat(timespec="milliseconds")
        return text.replace("+00:00", "Z")


@dataclass
class ClockJumpDetector:
    """Detect wall-clock discontinuities via wall-minus-monotonic offset."""

    jump_threshold_s: float = 1.0
    _offset_s: Optional[float] = None
    last_jump_s: float = 0.0

    def observe(self, wall_s: float, mono_ns: int) -> tuple[bool, float]:
        mono_s = mono_ns / 1_000_000_000
        offset = wall_s - mono_s
        if self._offset_s is not None:
            delta = offset - self._offset_s
            if abs(delta) > self.jump_threshold_s:
                self.last_jump_s = delta
                self._offset_s = offset
                return True, delta
        self._offset_s = offset
        return False, 0.0


def validate_record(record: Mapping[str, Any]) -> None:
    if not isinstance(record, Mapping):
        raise RecordValidationError("record must be a mapping")
    for field in REQUIRED_RECORD_FIELDS:
        if field not in record:
            raise RecordValidationError(f"missing required field {field}")
    version = record["schemaVersion"]
    if version != SCHEMA_VERSION:
        raise RecordValidationError(f"unsupported schemaVersion {version}")
    kind = record["kind"]
    if kind not in RECORD_KINDS:
        raise RecordValidationError(f"unsupported kind {kind}")
    if not isinstance(record["collectorSession"], str) or not record["collectorSession"]:
        raise RecordValidationError("collectorSession must be a non-empty string")
    if not isinstance(record["scopeId"], str) or not record["scopeId"]:
        raise RecordValidationError("scopeId must be a non-empty string")
    if not isinstance(record["observedAt"], str) or not record["observedAt"]:
        raise RecordValidationError("observedAt must be a non-empty UTC ISO-8601 string")
    if not isinstance(record["monotonicNs"], str) or not record["monotonicNs"].isdigit():
        raise RecordValidationError("monotonicNs must be a decimal string")
    sequence = record["sequence"]
    if not isinstance(sequence, int) or sequence < 0:
        raise RecordValidationError("sequence must be a non-negative integer")


def encode_record(record: Mapping[str, Any]) -> bytes:
    validate_record(record)
    payload = json.dumps(record, separators=(",", ":"), sort_keys=True).encode("utf-8")
    if len(payload) > MAX_RECORD_BYTES:
        raise RecordValidationError(
            f"record exceeds {MAX_RECORD_BYTES} bytes ({len(payload)} encoded)"
        )
    return payload + b"\n"


def parse_record_line(raw: bytes, offset: int, *, partial_eof: bool = False) -> RecordLine:
    stripped = raw.strip(b"\r\n")
    if not stripped:
        return RecordLine(RecordLineState.EMPTY, None, raw, offset)
    try:
        text = stripped.decode("utf-8")
    except UnicodeDecodeError as exc:
        return RecordLine(
            RecordLineState.CORRUPT,
            None,
            raw,
            offset,
            message=f"utf-8 decode failed: {exc}",
        )
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        state = RecordLineState.PARTIAL if partial_eof else RecordLineState.CORRUPT
        return RecordLine(state, None, raw, offset, message=str(exc))
    if not isinstance(value, dict):
        return RecordLine(
            RecordLineState.CORRUPT,
            None,
            raw,
            offset,
            message="JSON value is not an object",
        )
    try:
        validate_record(value)
    except RecordValidationError as exc:
        return RecordLine(RecordLineState.CORRUPT, None, raw, offset, message=str(exc))
    return RecordLine(RecordLineState.COMPLETE, value, raw, offset)


def iter_jsonl_lines(
    lines: Iterable[bytes],
    *,
    tail_may_be_partial: bool = False,
) -> Iterator[RecordLine]:
    buffered = list(lines)
    for index, raw in enumerate(buffered):
        is_last = index == len(buffered) - 1
        yield parse_record_line(raw, index, partial_eof=tail_may_be_partial and is_last)


def coverage_partial_line(
    *,
    scope_id: str,
    collector_session: str,
    source: str,
    clock: InjectableClock,
    sequence: int,
    reason: str,
) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "coverage",
        "collectorSession": collector_session,
        "source": source,
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {"reason": "plain-text"},
        "coverage": {
            "partialLine": True,
            "crashTailUncertainty": True,
            "reason": reason,
        },
    }


_SEGMENT_PREFIXES = (
    "fast-raw",
    "fast-minute",
    "fast-hour",
    "process",
    "runtime",
    "events",
    "health",
)
SEGMENT_NAME_RE = re.compile(
    r"^(?P<prefix>"
    + "|".join(re.escape(prefix) for prefix in _SEGMENT_PREFIXES)
    + r")-(?P<hour>\d{10})(?:-(?P<seq>\d{3}))?\.jsonl$"
)