"""Host memory fast windows, rollups, and selective slow-counter evidence."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Mapping, Optional

from records import (
    FAST_TICK_NS,
    FAST_TICKS_PER_WINDOW,
    FAST_WINDOW_NS,
    InjectableClock,
    KIB_TO_BYTES,
    MEMINFO_FIELDS,
    MetricStats,
    ROLLUP_HOUR_NS,
    ROLLUP_MINUTE_NS,
    SCHEMA_VERSION,
)

# Missed-tick grace: if actual sample time is this far past the scheduled tick, skip it.
TICK_MISS_GRACE_NS = FAST_TICK_NS // 2

_MEMINFO_LINE_RE = re.compile(r"^([A-Za-z][A-Za-z0-9()]*):\s+(\d+)\s+kB\s*$")

# Selective slow-path counters for reset/OOM evidence only; Netdata owns broad charts.
VMSTAT_OOM_FIELDS = ("oom_kill",)
PRESSURE_STALL_FIELDS = ("some", "full")
PRESSURE_KINDS = ("cpu", "memory", "io")


def parse_meminfo(text: str) -> dict[str, Optional[int]]:
    """Parse allowlisted /proc/meminfo fields to bytes; absent keys are null."""
    raw: dict[str, int] = {}
    for line in text.splitlines():
        match = _MEMINFO_LINE_RE.match(line.strip())
        if not match:
            continue
        name, kib_text = match.group(1), match.group(2)
        if name in MEMINFO_FIELDS:
            raw[name] = int(kib_text) * KIB_TO_BYTES

    return {name: raw.get(name) for name in MEMINFO_FIELDS}


def _metric_block(stats: Mapping[str, MetricStats]) -> dict[str, Any]:
    return {name: stats[name].as_dict() for name in MEMINFO_FIELDS if name in stats}


@dataclass(frozen=True)
class FastSample:
    scheduled_mono_ns: int
    actual_mono_ns: Optional[int]
    values: Optional[dict[str, Optional[int]]]
    missed: bool = False

    def as_dict(self) -> dict[str, Any]:
        offset: Optional[str] = None
        if self.actual_mono_ns is not None:
            offset = str(self.actual_mono_ns - self.scheduled_mono_ns)
        return {
            "scheduledMonotonicNs": str(self.scheduled_mono_ns),
            "actualMonotonicNs": (
                None if self.actual_mono_ns is None else str(self.actual_mono_ns)
            ),
            "offsetNs": offset,
            "missed": self.missed,
            "values": self.values,
        }


@dataclass
class ObservedPeakTracker:
    """Session observed gauge maxima vs optional kernel lifetime peaks (labeled separately)."""

    observed: dict[str, int] = field(default_factory=dict)
    lifetime: dict[str, int] = field(default_factory=dict)

    def observe_sample(self, values: Mapping[str, Optional[int]]) -> None:
        for name, value in values.items():
            if value is None:
                continue
            current = self.observed.get(name)
            if current is None or value > current:
                self.observed[name] = value

    def observe_window(self, window: Mapping[str, Any]) -> None:
        metrics = window.get("metrics", {})
        for name, block in metrics.items():
            if not isinstance(block, dict):
                continue
            maximum = block.get("max")
            if maximum is None:
                continue
            current = self.observed.get(name)
            if current is None or int(maximum) > current:
                self.observed[name] = int(maximum)

    def note_lifetime_peak(self, field_name: str, value: Optional[int]) -> None:
        if value is None:
            return
        current = self.lifetime.get(field_name)
        if current is None or value > current:
            self.lifetime[field_name] = value

    def peaks_dict(self) -> dict[str, Any]:
        return {
            "observed": dict(self.observed),
            "lifetime": dict(self.lifetime),
        }


def _intersample_gap_ns(samples: list[FastSample]) -> int:
    actual_times = [sample.actual_mono_ns for sample in samples if sample.actual_mono_ns is not None]
    if len(actual_times) < 2:
        return 0
    return max(b - a for a, b in zip(actual_times, actual_times[1:]))


def _stats_for_samples(samples: list[FastSample]) -> dict[str, MetricStats]:
    by_field: dict[str, list[Optional[int]]] = {name: [] for name in MEMINFO_FIELDS}
    for sample in samples:
        if sample.missed or sample.values is None:
            continue
        for name in MEMINFO_FIELDS:
            by_field[name].append(sample.values.get(name))
    return {name: MetricStats.from_values(by_field[name]) for name in MEMINFO_FIELDS}


def observe_fast_window(
    *,
    window_start_mono_ns: int,
    clock: InjectableClock,
    scope_id: str,
    collector_session: str,
    sequence: int,
    read_meminfo: Callable[[], str],
    tick_times_ns: Optional[list[int]] = None,
    clock_jump: Optional[tuple[bool, float]] = None,
) -> dict[str, Any]:
    """
    Collect one 1s fast window using 200ms scheduled monotonic ticks.

    When tick_times_ns is supplied (tests), each entry is the actual monotonic time at
  that tick; a tick is missed when actual exceeds scheduled plus grace or is omitted.
    """
    if tick_times_ns is None:
        tick_times_ns = []

    scheduled = [
        window_start_mono_ns + index * FAST_TICK_NS for index in range(FAST_TICKS_PER_WINDOW)
    ]
    samples: list[FastSample] = []
    last_actual: Optional[int] = None

    for index, scheduled_ns in enumerate(scheduled):
        actual_ns: Optional[int]
        if index < len(tick_times_ns):
            actual_ns = tick_times_ns[index]
        else:
            actual_ns = clock.mono_ns()

        missed = False
        values: Optional[dict[str, Optional[int]]] = None

        if actual_ns is None:
            missed = True
        elif actual_ns > scheduled_ns + TICK_MISS_GRACE_NS:
            # Collector fell behind: skip this deadline without manufacturing catch-up samples.
            missed = True
        else:
            values = parse_meminfo(read_meminfo())
            last_actual = actual_ns
            samples.append(
                FastSample(
                    scheduled_mono_ns=scheduled_ns,
                    actual_mono_ns=actual_ns,
                    values=values,
                    missed=False,
                )
            )
            continue

        samples.append(
            FastSample(
                scheduled_mono_ns=scheduled_ns,
                actual_mono_ns=actual_ns if not missed else None,
                values=values,
                missed=missed,
            )
        )

    observed_count = sum(1 for sample in samples if not sample.missed)
    partial = observed_count < FAST_TICKS_PER_WINDOW
    partial_reason: Optional[str] = None
    if partial:
        partial_reason = "missed_ticks" if observed_count < FAST_TICKS_PER_WINDOW else "incomplete"

    end_mono_ns = last_actual if last_actual is not None else window_start_mono_ns
    metrics = _stats_for_samples(samples)

    envelope_mono = last_actual if last_actual is not None else window_start_mono_ns

    record: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "host_window",
        "collectorSession": collector_session,
        "source": "host-fast-meminfo",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(envelope_mono),
        "sequence": sequence,
        "units": {"memory": "bytes"},
        "window": {
            "startMonotonicNs": str(window_start_mono_ns),
            "endMonotonicNs": str(end_mono_ns),
            "scheduledCount": FAST_TICKS_PER_WINDOW,
            "observedCount": observed_count,
            "maxIntersampleGapNs": str(_intersample_gap_ns(samples)),
            "partial": partial,
            "partialReason": partial_reason,
        },
        "metrics": _metric_block(metrics),
        "samples": [sample.as_dict() for sample in samples],
    }
    if clock_jump is not None and clock_jump[0]:
        record["clockJump"] = {"detected": True, "deltaSeconds": clock_jump[1]}
    return record


def rollup_host_windows(
    windows: list[Mapping[str, Any]],
    *,
    bucket_start_mono_ns: int,
    bucket_width_ns: int,
    rollup_label: str,
    clock: InjectableClock,
    scope_id: str,
    collector_session: str,
    sequence: int,
    peak_tracker: Optional[ObservedPeakTracker] = None,
) -> dict[str, Any]:
    """Aggregate fixed monotonic buckets using min/max/sum/count and explicit coverage."""
    expected_windows = bucket_width_ns // FAST_WINDOW_NS
    in_bucket = [
        window
        for window in windows
        if _window_start_ns(window) is not None
        and bucket_start_mono_ns <= _window_start_ns(window) < bucket_start_mono_ns + bucket_width_ns
    ]
    observed_windows = len(in_bucket)
    partial = observed_windows < expected_windows or any(
        bool(window.get("window", {}).get("partial")) for window in in_bucket
    )

    merged: dict[str, MetricStats] = {name: MetricStats(min=None, max=None, sum=0, count=0) for name in MEMINFO_FIELDS}
    for window in in_bucket:
        block = window.get("metrics", {})
        for name in MEMINFO_FIELDS:
            if name not in block:
                continue
            piece = block[name]
            merged[name] = MetricStats.merge(
                merged[name],
                MetricStats(
                    min=piece.get("min"),
                    max=piece.get("max"),
                    sum=int(piece.get("sum", 0)),
                    count=int(piece.get("count", 0)),
                ),
            )
        if peak_tracker is not None:
            peak_tracker.observe_window(window)

    coverage = observed_windows / expected_windows if expected_windows else 0.0
    end_mono = bucket_start_mono_ns + bucket_width_ns

    record: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "host_rollup",
        "collectorSession": collector_session,
        "source": f"host-rollup-{rollup_label}",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(end_mono),
        "sequence": sequence,
        "units": {"memory": "bytes"},
        "rollup": {
            "widthNs": str(bucket_width_ns),
            "startMonotonicNs": str(bucket_start_mono_ns),
            "label": rollup_label,
            "expectedWindows": expected_windows,
            "observedWindows": observed_windows,
            "coverage": coverage,
            "partial": partial,
        },
        "metrics": _metric_block(merged),
    }
    if peak_tracker is not None:
        record["peaks"] = peak_tracker.peaks_dict()
    return record


def rollup_minute(
    windows: list[Mapping[str, Any]],
    bucket_start_mono_ns: int,
    **kwargs: Any,
) -> dict[str, Any]:
    return rollup_host_windows(
        windows,
        bucket_start_mono_ns=bucket_start_mono_ns,
        bucket_width_ns=ROLLUP_MINUTE_NS,
        rollup_label="minute",
        **kwargs,
    )


def rollup_hour(
    windows: list[Mapping[str, Any]],
    bucket_start_mono_ns: int,
    **kwargs: Any,
) -> dict[str, Any]:
    return rollup_host_windows(
        windows,
        bucket_start_mono_ns=bucket_start_mono_ns,
        bucket_width_ns=ROLLUP_HOUR_NS,
        rollup_label="hour",
        **kwargs,
    )


def _window_start_ns(window: Mapping[str, Any]) -> Optional[int]:
    raw = window.get("window", {}).get("startMonotonicNs")
    if raw is None:
        return None
    return int(raw)


def _parse_kv_counters(text: str) -> dict[str, int]:
    counters: dict[str, int] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) == 2 and parts[1].isdigit():
            counters[parts[0]] = int(parts[1])
    return counters


def parse_vmstat_oom(text: str) -> dict[str, Optional[int]]:
    counters = _parse_kv_counters(text)
    return {name: counters.get(name) for name in VMSTAT_OOM_FIELDS}


def parse_pressure_some_full(text: str) -> dict[str, Optional[float]]:
    """Parse pressure stall lines: some avg10=... full avg10=..."""
    result: dict[str, Optional[float]] = {key: None for key in PRESSURE_STALL_FIELDS}
    for key in PRESSURE_STALL_FIELDS:
        match = re.search(rf"{key}\s+avg10=([\d.]+)", text)
        if match:
            result[key] = float(match.group(1))
    return result


def parse_proc_stat_cpu_line(text: str) -> Optional[int]:
    for line in text.splitlines():
        if line.startswith("cpu "):
            parts = line.split()
            if len(parts) >= 5:
                return sum(int(part) for part in parts[1:5])
    return None


@dataclass(frozen=True)
class CounterSample:
    name: str
    value: int
    source: str


@dataclass(frozen=True)
class CounterReset:
    name: str
    previous: int
    current: int
    source: str


def detect_counter_resets(
    previous: Mapping[str, int],
    current: Mapping[str, int],
    *,
    source: str,
) -> list[CounterReset]:
    resets: list[CounterReset] = []
    for name, value in current.items():
        prior = previous.get(name)
        if prior is not None and value < prior:
            resets.append(CounterReset(name=name, previous=prior, current=value, source=source))
    return resets


def observe_slow_counters(
    *,
    clock: InjectableClock,
    scope_id: str,
    collector_session: str,
    sequence: int,
    vmstat_text: str = "",
    stat_text: str = "",
    pressure: Optional[Mapping[str, str]] = None,
    previous_counters: Optional[Mapping[str, int]] = None,
) -> dict[str, Any]:
    """
    1s selective host counters for OOM/reset evidence; does not duplicate Netdata charts.
    """
    counters: dict[str, int] = {}
    for name, value in parse_vmstat_oom(vmstat_text).items():
        if value is not None:
            counters[f"vmstat.{name}"] = value

    cpu_total = parse_proc_stat_cpu_line(stat_text)
    if cpu_total is not None:
        counters["cpu.jiffies"] = cpu_total

    pressure = pressure or {}
    for kind in PRESSURE_KINDS:
        body = pressure.get(kind, "")
        if body:
            for stall, avg10 in parse_pressure_some_full(body).items():
                if avg10 is not None:
                    counters[f"pressure.{kind}.{stall}.avg10_milli"] = int(avg10 * 1000)

    resets = (
        detect_counter_resets(previous_counters, counters, source="host-slow-counters")
        if previous_counters
        else []
    )

    record: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": "host_window",
        "collectorSession": collector_session,
        "source": "host-slow-counters",
        "scopeId": scope_id,
        "observedAt": clock.observed_at_utc(),
        "monotonicNs": str(clock.mono_ns()),
        "sequence": sequence,
        "units": {"counters": "absolute", "pressure": "milli-avg10"},
        "counters": {name: value for name, value in counters.items()},
        "counterResets": [
            {
                "name": reset.name,
                "previous": reset.previous,
                "current": reset.current,
                "source": reset.source,
            }
            for reset in resets
        ],
    }
    return record


def build_meminfo_text(values_kib: Mapping[str, Optional[int]]) -> str:
    """Test helper: build minimal meminfo text from KiB values (null omits the line)."""
    lines: list[str] = []
    for name in MEMINFO_FIELDS:
        value = values_kib.get(name)
        if value is None:
            continue
        lines.append(f"{name}:\t{value} kB")
    return "\n".join(lines) + ("\n" if lines else "")