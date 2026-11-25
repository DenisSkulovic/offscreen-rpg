"""Historical status and report readers for workstation observability (INF47 T01)."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator, Mapping, Optional, Sequence

from records import (
    InjectableClock,
    MetricStats,
    SCHEMA_VERSION,
)
from storage import (
    OWNED_PREFIXES,
    RETENTION_LIMITS,
    RecordStore,
    SegmentIdentity,
    StateRoot,
    StateRootError,
    StreamStats,
    segment_sort_key,
)

REPORT_OUTPUT_SCHEMA_VERSION = 1
MAX_QUERY_SPAN_S = 90 * 24 * 3600
DEFAULT_NETDATA_URL = "http://127.0.0.1:19999"
HEARTBEAT_INTERVAL_S = 5.0
HEARTBEAT_GAP_FACTOR = 3.0

_LAST_RE = re.compile(r"^(\d+)([mhd])$", re.IGNORECASE)
_ISO_Z_RE = re.compile(r"Z$")

# Substrings used only after charts API response is parsed (no hardcoded chart ids).
_MEMORY_CHART_HINTS = ("mem", "ram", "available")
_CPU_CHART_HINTS = ("cpu", "load")


class ReportError(ValueError):
    """Invalid CLI input or query bounds."""


class QueryWindow:
    def __init__(self, start_s: float, end_s: float) -> None:
        if end_s <= start_s:
            raise ReportError("query end must be after start")
        span = end_s - start_s
        if span > MAX_QUERY_SPAN_S:
            raise ReportError(f"query span exceeds {MAX_QUERY_SPAN_S // 86400}d maximum")
        self.start_s = start_s
        self.end_s = end_s
        self.span_s = span

    @property
    def start_iso(self) -> str:
        return _ts_to_iso(self.start_s)

    @property
    def end_iso(self) -> str:
        return _ts_to_iso(self.end_s)


def _ts_to_iso(epoch_s: float) -> str:
    instant = datetime.fromtimestamp(epoch_s, tz=timezone.utc)
    text = instant.isoformat(timespec="milliseconds")
    return text.replace("+00:00", "Z")


def parse_observed_at(text: str) -> Optional[float]:
    if not text:
        return None
    normalized = _ISO_Z_RE.sub("+00:00", text.strip())
    try:
        return datetime.fromisoformat(normalized).timestamp()
    except ValueError:
        return None


def parse_last_duration(raw: str) -> timedelta:
    match = _LAST_RE.match(raw.strip())
    if match is None:
        raise ReportError(f"invalid --last duration {raw!r}; use e.g. 30m, 2h, 7d")
    amount = int(match.group(1))
    unit = match.group(2).lower()
    if unit == "m":
        return timedelta(minutes=amount)
    if unit == "h":
        return timedelta(hours=amount)
    return timedelta(days=amount)


def resolve_state_root(explicit: Optional[str] = None) -> Path:
    if explicit:
        return Path(explicit).expanduser()
    env = os.environ.get("OFFSCREEN_MONITOR_STATE_ROOT", "").strip()
    if env:
        return Path(env)
    home = Path(os.environ.get("HOME", os.path.expanduser("~")))
    return home / ".local" / "state" / "offscreen-monitor"


def resolve_query_window(
    *,
    last: Optional[str],
    from_iso: Optional[str],
    to_iso: Optional[str],
    clock: InjectableClock,
) -> QueryWindow:
    now = clock.wall_time()
    if last is not None:
        if from_iso is not None or to_iso is not None:
            raise ReportError("use either --last or --from/--to, not both")
        delta = parse_last_duration(last)
        return QueryWindow(now - delta.total_seconds(), now)
    if from_iso is None or to_iso is None:
        raise ReportError("--from and --to UTC ISO timestamps are required without --last")
    start = parse_observed_at(from_iso)
    end = parse_observed_at(to_iso)
    if start is None or end is None:
        raise ReportError("invalid --from/--to UTC ISO timestamp")
    return QueryWindow(start, end)


def iter_segment_hours(window: QueryWindow) -> Iterator[str]:
    cur = datetime.fromtimestamp(window.start_s, tz=timezone.utc).replace(
        minute=0, second=0, microsecond=0
    )
    end = datetime.fromtimestamp(window.end_s, tz=timezone.utc)
    while cur <= end:
        yield cur.strftime("%Y%m%d%H")
        cur += timedelta(hours=1)


def list_owned_segments(root: Path, window: QueryWindow) -> list[Path]:
    if not root.is_dir():
        return []
    hours = set(iter_segment_hours(window))
    found: list[Path] = []
    for entry in root.iterdir():
        if entry.name.startswith(".") or entry.is_symlink() or not entry.is_file():
            continue
        identity = SegmentIdentity.parse(entry.name)
        if identity is None or identity.hour_utc not in hours:
            continue
        found.append(entry)
    return sorted(found, key=segment_sort_key)


def load_records_in_window(
    root: Path,
    window: QueryWindow,
    *,
    clock: InjectableClock,
    prefixes: Optional[Iterable[str]] = None,
    slot: Optional[str] = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Bounded read of owned supplemental segments intersecting the window."""
    allowed = set(prefixes) if prefixes is not None else set(OWNED_PREFIXES)
    store = RecordStore(root, "read-only", clock, create_root=False)
    gaps: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []
    for path in list_owned_segments(root, window):
        identity = SegmentIdentity.parse(path.name)
        if identity is None or identity.prefix not in allowed:
            continue
        for line in store.read_segment_lines(path):
            if line.record is None:
                continue
            observed = parse_observed_at(str(line.record.get("observedAt", "")))
            if observed is None:
                gaps.append({"reason": "unparseable_observedAt", "segment": path.name})
                continue
            if observed < window.start_s or observed > window.end_s:
                continue
            if slot is not None and not _record_matches_slot(line.record, slot):
                continue
            records.append(line.record)
    records.sort(key=lambda item: (parse_observed_at(str(item.get("observedAt", ""))) or 0.0, item.get("sequence", 0)))
    return records, gaps


def _record_matches_slot(record: Mapping[str, Any], slot: str) -> bool:
    operation = record.get("operation")
    if isinstance(operation, Mapping):
        if operation.get("devSlot") == slot or operation.get("slot") == slot:
            return True
    coverage = record.get("coverage")
    if isinstance(coverage, Mapping) and coverage.get("devSlot") == slot:
        return True
    scope = str(record.get("scopeId", ""))
    return slot in scope


def metric_stats_from_block(block: Mapping[str, Any]) -> MetricStats:
    return MetricStats(
        min=block.get("min"),
        max=block.get("max"),
        sum=int(block.get("sum", 0)),
        count=int(block.get("count", 0)),
    )


def merge_host_metric_stats(records: Sequence[Mapping[str, Any]], metric: str) -> dict[str, Any]:
    """Weighted merge via sum/count; preserves spike max across windows."""
    merged = MetricStats(min=None, max=None, sum=0, count=0)
    for record in records:
        kind = record.get("kind")
        if kind not in ("host_window", "host_rollup"):
            continue
        block = record.get("metrics", {}).get(metric)
        if not isinstance(block, Mapping):
            continue
        merged = MetricStats.merge(merged, metric_stats_from_block(block))
    result = merged.as_dict()
    result["coverage"] = {
        "sampleCount": merged.count,
        "absentIsNull": True,
    }
    return result


def aggregate_fast_spike_max(
    records: Sequence[Mapping[str, Any]], metric: str = "MemAvailable"
) -> Optional[int]:
    """Return retained observed max across fast windows (spike between samples may be missed)."""
    peak: Optional[int] = None
    for record in records:
        if record.get("kind") != "host_window":
            continue
        block = record.get("metrics", {}).get(metric)
        if not isinstance(block, Mapping):
            continue
        maximum = block.get("max")
        if maximum is None:
            continue
        value = int(maximum)
        if peak is None or value > peak:
            peak = value
    return peak


def counter_deltas_same_identity(
    records: Sequence[Mapping[str, Any]],
    *,
    identity_field: str = "scopeId",
) -> list[dict[str, Any]]:
    """Cumulative counter deltas only for same identity; emits reset rows."""
    grouped: dict[str, dict[str, int]] = {}
    resets: list[dict[str, Any]] = []
    deltas: list[dict[str, Any]] = []
    for record in records:
        counters = record.get("counters")
        if not isinstance(counters, Mapping):
            continue
        identity = str(record.get(identity_field, "unknown"))
        prior = grouped.setdefault(identity, {})
        for name, value in counters.items():
            if not isinstance(value, int):
                continue
            previous = prior.get(name)
            if previous is None:
                prior[name] = value
                continue
            if value < previous:
                resets.append(
                    {
                        "identity": identity,
                        "name": name,
                        "previous": previous,
                        "current": value,
                        "observedAt": record.get("observedAt"),
                    }
                )
                prior[name] = value
                continue
            if value > previous:
                deltas.append(
                    {
                        "identity": identity,
                        "name": name,
                        "delta": value - previous,
                        "start": previous,
                        "end": value,
                        "observedAt": record.get("observedAt"),
                    }
                )
                prior[name] = value
    return deltas + [{"kind": "reset", **item} for item in resets]


def detect_pid_reuse_events(
    records: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    """Flag PID reuse when starttime ticks change for the same pid in one scope."""
    seen: dict[tuple[str, int], int] = {}
    events: list[dict[str, Any]] = []
    for record in records:
        if record.get("kind") != "process_snapshot":
            continue
        process = record.get("process")
        if not isinstance(process, Mapping):
            continue
        pid = process.get("pid")
        key_block = process.get("processKey")
        if pid is None or not isinstance(key_block, Mapping):
            continue
        scope = str(key_block.get("scopeId", record.get("scopeId", "")))
        start_ticks = int(key_block.get("starttimeTicks", -1))
        token = (scope, int(pid))
        prior_ticks = seen.get(token)
        if prior_ticks is not None and prior_ticks != start_ticks:
            events.append(
                {
                    "scopeId": scope,
                    "pid": pid,
                    "priorStarttimeTicks": prior_ticks,
                    "newStarttimeTicks": start_ticks,
                    "observedAt": record.get("observedAt"),
                }
            )
        seen[token] = start_ticks
    return events


def collect_operation_spans(records: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Overlapping operation phases; incomplete spans and rollback without causal claims."""
    open_phases: dict[str, dict[str, Any]] = {}
    completed: list[dict[str, Any]] = []
    incomplete: list[dict[str, Any]] = []
    rollbacks: list[dict[str, Any]] = []
    for record in records:
        if record.get("kind") != "operation":
            continue
        operation = record.get("operation")
        if not isinstance(operation, Mapping):
            continue
        event = str(operation.get("event", ""))
        phase_id = str(operation.get("phaseId", operation.get("attemptId", "")))
        if event in ("phase-start", "start"):
            open_phases[phase_id] = {
                "phaseId": phase_id,
                "phaseName": operation.get("phaseName"),
                "startObservedAt": record.get("observedAt"),
                "parentPhaseId": operation.get("parentPhaseId"),
            }
        elif event in ("phase-end", "end"):
            start = open_phases.pop(phase_id, None)
            if start is None:
                incomplete.append(
                    {
                        "phaseId": phase_id,
                        "reason": "end_without_start",
                        "endObservedAt": record.get("observedAt"),
                    }
                )
            else:
                completed.append(
                    {
                        **start,
                        "endObservedAt": record.get("observedAt"),
                        "resultCode": operation.get("resultCode"),
                    }
                )
        elif event == "rollback":
            rollbacks.append(
                {
                    "phaseId": phase_id or None,
                    "observedAt": record.get("observedAt"),
                    "resultCode": operation.get("resultCode"),
                }
            )
    for phase_id, start in open_phases.items():
        incomplete.append({**start, "reason": "incomplete_span"})
    return {
        "completed": completed,
        "incomplete": incomplete,
        "rollbacks": rollbacks,
        "correlationNote": "temporal overlap only; no automatic causality",
    }


def collect_clock_jumps(records: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    jumps: list[dict[str, Any]] = []
    for record in records:
        jump = record.get("clockJump")
        if isinstance(jump, Mapping) and jump.get("detected"):
            jumps.append(
                {
                    "observedAt": record.get("observedAt"),
                    "deltaSeconds": jump.get("deltaSeconds"),
                    "kind": record.get("kind"),
                }
            )
    return jumps


def top_process_peaks(
    records: Sequence[Mapping[str, Any]], *, limit: int = 10
) -> dict[str, Any]:
    """RSS and CPU peaks are non-additive; PSS reported separately from pssTop records."""
    rss_by_key: dict[str, dict[str, Any]] = {}
    cpu_by_key: dict[str, dict[str, Any]] = {}
    pss_samples: list[dict[str, Any]] = []
    for record in records:
        kind = record.get("kind")
        if kind == "process_snapshot" and record.get("source") == "process-pss-top":
            block = record.get("pssTop")
            if isinstance(block, list):
                pss_samples.extend(item for item in block if isinstance(item, Mapping))
            continue
        if kind != "process_snapshot":
            continue
        process = record.get("process")
        if not isinstance(process, Mapping):
            continue
        metrics = process.get("metrics")
        if not isinstance(metrics, Mapping):
            continue
        key_block = process.get("processKey")
        identity = json.dumps(key_block, sort_keys=True) if isinstance(key_block, Mapping) else str(process.get("pid"))
        rss = metrics.get("rssBytes")
        if isinstance(rss, int):
            current = rss_by_key.get(identity)
            if current is None or rss > int(current["peakRssBytes"]):
                rss_by_key[identity] = {
                    "processKey": key_block,
                    "peakRssBytes": rss,
                    "observedAt": record.get("observedAt"),
                    "peakScope": "observed_sample",
                }
        cpu_ticks = metrics.get("cpuTicks")
        if isinstance(cpu_ticks, Mapping):
            total = int(cpu_ticks.get("total", 0))
            current = cpu_by_key.get(identity)
            if current is None or total > int(current["peakCpuTicks"]):
                cpu_by_key[identity] = {
                    "processKey": key_block,
                    "peakCpuTicks": total,
                    "observedAt": record.get("observedAt"),
                    "peakScope": "observed_sample",
                }
    rss_top = sorted(rss_by_key.values(), key=lambda item: int(item["peakRssBytes"]), reverse=True)[:limit]
    cpu_top = sorted(cpu_by_key.values(), key=lambda item: int(item["peakCpuTicks"]), reverse=True)[:limit]
    pss_top = sorted(
        (item for item in pss_samples if isinstance(item.get("pssBytes"), int)),
        key=lambda item: int(item["pssBytes"]),
        reverse=True,
    )[:limit]
    return {
        "rssTop": rss_top,
        "cpuTop": cpu_top,
        "pssTop": pss_top,
        "attributionNote": "RSS/CPU peaks are per-process non-additive; PSS is separate",
    }


def nested_runtime_attribution(records: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Separate pod/container/host layers; flag risky double-count if identical bytes in two layers."""
    host_bytes: Optional[int] = None
    docker: list[dict[str, Any]] = []
    pods: list[dict[str, Any]] = []
    cgroups: list[dict[str, Any]] = []
    for record in records:
        kind = record.get("kind")
        if kind == "host_window":
            block = record.get("metrics", {}).get("MemAvailable")
            if isinstance(block, Mapping) and block.get("min") is not None:
                host_bytes = int(block["min"])
        elif kind == "docker_snapshot":
            container = record.get("container")
            if isinstance(container, Mapping):
                mem = container.get("memoryBytes")
                if isinstance(mem, int):
                    docker.append({"layer": "docker", "memoryBytes": mem, "observedAt": record.get("observedAt")})
        elif kind == "pod_snapshot":
            pod = record.get("pod")
            if isinstance(pod, Mapping):
                mem = pod.get("memoryBytes")
                if isinstance(mem, int):
                    pods.append({"layer": "pod", "memoryBytes": mem, "observedAt": record.get("observedAt")})
        elif kind == "cgroup_snapshot":
            memory = record.get("memory")
            if isinstance(memory, Mapping):
                current = memory.get("current")
                if isinstance(current, int):
                    cgroups.append({"layer": "cgroup", "memoryBytes": current, "observedAt": record.get("observedAt")})
    double_count_risk = False
    if host_bytes is not None:
        for layer in docker + pods + cgroups:
            if layer.get("memoryBytes") == host_bytes:
                double_count_risk = True
                break
    return {
        "hostMemAvailableMinBytes": host_bytes,
        "docker": docker,
        "pods": pods,
        "cgroups": cgroups,
        "doubleCountRisk": double_count_risk,
        "attributionNote": "layers are separate; do not sum parent and descendant",
    }


def detect_stale_summaries(records: Sequence[Mapping[str, Any]], *, stale_s: float = 30.0) -> list[dict[str, Any]]:
    stale: list[dict[str, Any]] = []
    last_by_source: dict[str, float] = {}
    for record in records:
        source = str(record.get("source", ""))
        observed = parse_observed_at(str(record.get("observedAt", "")))
        if observed is None:
            continue
        source_ts = record.get("sourceObservedAt") or record.get("kubeletTimestamp")
        if isinstance(source_ts, str):
            source_observed = parse_observed_at(source_ts)
            if source_observed is not None and observed - source_observed > stale_s:
                stale.append(
                    {
                        "source": source,
                        "collectorObservedAt": record.get("observedAt"),
                        "sourceObservedAt": source_ts,
                        "staleSeconds": observed - source_observed,
                    }
                )
        if source in last_by_source and observed < last_by_source[source]:
            stale.append({"source": source, "reason": "time_regression", "observedAt": record.get("observedAt")})
        last_by_source[source] = observed
    return stale


@dataclass
class NetdataQueryResult:
    available: bool
    error: str = ""
    charts: list[dict[str, Any]] = field(default_factory=list)
    series: list[dict[str, Any]] = field(default_factory=list)
    tier: Optional[int] = None
    tierAmbiguous: bool = False
    coverageUnavailable: bool = False
    candidates: list[int] = field(default_factory=list)


class NetdataClient:
    def __init__(
        self,
        base_url: str = DEFAULT_NETDATA_URL,
        *,
        fetch_json: Optional[Callable[[str], dict[str, Any]]] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._fetch_json = fetch_json or self._default_fetch

    def _default_fetch(self, url: str) -> dict[str, Any]:
        request = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(request, timeout=3) as response:
            payload = response.read()
        parsed = json.loads(payload.decode("utf-8"))
        if not isinstance(parsed, dict):
            raise ValueError("netdata response is not an object")
        return parsed

    def discover_memory_cpu_charts(self) -> tuple[list[str], str]:
        try:
            body = self._fetch_json(f"{self.base_url}/api/v1/charts")
        except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError, OSError) as exc:
            return [], str(exc)
        charts = body.get("charts")
        if not isinstance(charts, Mapping):
            return [], "charts missing"
        ids: list[str] = []
        for chart_id, meta in charts.items():
            if not isinstance(meta, Mapping):
                continue
            title = str(meta.get("title", "")).lower()
            name = str(chart_id).lower()
            if any(hint in name or hint in title for hint in _MEMORY_CHART_HINTS):
                ids.append(str(chart_id))
            elif any(hint in name or hint in title for hint in _CPU_CHART_HINTS):
                ids.append(str(chart_id))
        return ids, ""

    @staticmethod
    def pick_tier(span_s: float) -> tuple[Optional[int], bool, list[int]]:
        # Align with documented dbengine tiers: ~72h tier0, 30d tier1, 90d tier2.
        candidates: list[int] = []
        if span_s <= 72 * 3600:
            candidates.append(0)
        if span_s <= 30 * 24 * 3600:
            candidates.append(1)
        candidates.append(2)
        unique = sorted(set(candidates))
        ambiguous = len(unique) > 1 and (unique[-1] - unique[0]) > 0
        return unique[-1], ambiguous, unique

    def query_window(self, window: QueryWindow, *, points: int = 120) -> NetdataQueryResult:
        chart_ids, error = self.discover_memory_cpu_charts()
        if error:
            return NetdataQueryResult(available=False, error=error)
        if not chart_ids:
            return NetdataQueryResult(available=False, error="no matching charts in response")
        tier, ambiguous, candidates = self.pick_tier(window.span_s)
        series: list[dict[str, Any]] = []
        coverage_unavailable = False
        for chart in chart_ids[:6]:
            query = urllib.parse.urlencode(
                {
                    "chart": chart,
                    "after": int(window.start_s),
                    "before": int(window.end_s),
                    "points": points,
                    "group": "min,max,average",
                    "options": "absolute",
                    "tier": tier if tier is not None else 0,
                }
            )
            url = f"{self.base_url}/api/v1/data?{query}"
            try:
                body = self._fetch_json(url)
            except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError, OSError) as exc:
                series.append({"chart": chart, "error": str(exc)})
                continue
            labels = body.get("labels")
            data = body.get("data")
            if not isinstance(labels, list) or not isinstance(data, list):
                series.append({"chart": chart, "error": "unexpected data shape"})
                continue
            sample_count = len(data)
            if body.get("view") is None and sample_count > 0:
                coverage_unavailable = True
            series.append(
                {
                    "chart": chart,
                    "tier": tier,
                    "units": body.get("units"),
                    "pointsReturned": sample_count,
                    "coverageUnavailable": body.get("view") is None,
                    "firstTimestamp": data[-1][0] if data else None,
                    "lastTimestamp": data[0][0] if data else None,
                }
            )
        return NetdataQueryResult(
            available=True,
            charts=[{"id": chart_id} for chart_id in chart_ids[:6]],
            series=series,
            tier=tier,
            tierAmbiguous=ambiguous,
            candidates=candidates,
            coverageUnavailable=coverage_unavailable,
        )


def _disabled_streams(report: Mapping[str, StreamStats]) -> list[str]:
    disabled: list[str] = []
    for prefix in OWNED_PREFIXES:
        stats = report.get(prefix)
        if stats is None or stats.segment_count == 0:
            disabled.append(prefix)
    return disabled


def companion_service_state(
    root: Path,
    *,
    clock: InjectableClock,
    records: Optional[Sequence[Mapping[str, Any]]] = None,
) -> dict[str, Any]:
    if not root.exists():
        return {"state": "not_installed", "reason": "state root missing"}
    try:
        StateRoot(root).validate(create=False)
    except StateRootError as exc:
        return {"state": "not_installed", "reason": str(exc)}

    now = clock.wall_time()
    latest_heartbeat: Optional[float] = None
    latest_health: Optional[float] = None
    if records:
        for record in records:
            if record.get("kind") == "coverage" and record.get("source") == "collector.heartbeat":
                observed = parse_observed_at(str(record.get("observedAt", "")))
                if observed is not None:
                    latest_heartbeat = max(latest_heartbeat or observed, observed)
            if record.get("kind") == "health":
                observed = parse_observed_at(str(record.get("observedAt", "")))
                if observed is not None:
                    latest_health = max(latest_health or observed, observed)
    else:
        for path in sorted(root.glob("health-*.jsonl"), key=segment_sort_key):
            for record in _read_complete_records(path):
                if record.get("kind") == "health":
                    observed = parse_observed_at(str(record.get("observedAt", "")))
                    if observed is not None:
                        latest_health = max(latest_health or observed, observed)
        for path in sorted(root.glob("events-*.jsonl"), key=segment_sort_key):
            for record in _read_complete_records(path):
                if record.get("source") == "collector.heartbeat":
                    observed = parse_observed_at(str(record.get("observedAt", "")))
                    if observed is not None:
                        latest_heartbeat = max(latest_heartbeat or observed, observed)

    heartbeat_age = None if latest_heartbeat is None else now - latest_heartbeat
    if latest_heartbeat is None and latest_health is None:
        locks = list(root.glob(".writer-*.lock"))
        if locks:
            return {"state": "gap", "reason": "writer lock without readable heartbeat", "heartbeatAgeSeconds": None}
        return {"state": "stopped", "reason": "no heartbeat or health records", "heartbeatAgeSeconds": None}
    if heartbeat_age is not None and heartbeat_age > HEARTBEAT_INTERVAL_S * HEARTBEAT_GAP_FACTOR:
        return {
            "state": "gap",
            "heartbeatAgeSeconds": heartbeat_age,
            "reason": "heartbeat older than expected cadence",
        }
    return {
        "state": "running",
        "heartbeatAgeSeconds": heartbeat_age,
        "latestHealthObservedAt": _ts_to_iso(latest_health) if latest_health else None,
    }


def _read_complete_records(path: Path) -> Iterator[dict[str, Any]]:
    from storage import read_all_complete_records

    yield from read_all_complete_records(path)


def build_storage_status(root: Path, clock: InjectableClock) -> dict[str, Any]:
    try:
        store = RecordStore(root, "read-only", clock, create_root=False)
        report = store.enforce_retention(force=True)
    except StateRootError as exc:
        return {"state": "not_installed", "error": str(exc)}
    streams: dict[str, Any] = {}
    total_bytes = 0
    for prefix, stats in report.streams.items():
        streams[prefix] = {
            "oldest": stats.oldest,
            "newest": stats.newest,
            "segmentCount": stats.segment_count,
            "byteTotal": stats.byte_total,
            "droppedSegments": stats.dropped_segments,
            "retentionBytes": RETENTION_LIMITS.get(prefix, (0, 0))[0],
            "retentionAgeSeconds": RETENTION_LIMITS.get(prefix, (0, 0))[1],
        }
        total_bytes += stats.byte_total
    return {
        "streams": streams,
        "totalBytes": total_bytes,
        "storageLimited": report.storage_limited,
        "disabledStreams": _disabled_streams(report.streams),
        "eventsBudgetBytes": report.events_budget_bytes,
        "eventsUsedBytes": report.events_used_bytes,
    }


def build_status_payload(
    *,
    state_root: Path,
    clock: InjectableClock,
    netdata: Optional[NetdataClient] = None,
) -> dict[str, Any]:
    netdata = netdata or NetdataClient()
    charts, netdata_error = netdata.discover_memory_cpu_charts()
    companion = companion_service_state(state_root, clock=clock)
    storage = build_storage_status(state_root, clock)
    return {
        "reportSchemaVersion": REPORT_OUTPUT_SCHEMA_VERSION,
        "schemaVersion": SCHEMA_VERSION,
        "command": "status",
        "generatedAt": clock.observed_at_utc(),
        "stateRoot": str(state_root),
        "companion": companion,
        "storage": storage,
        "netdata": {
            "available": not bool(netdata_error),
            "error": netdata_error or None,
            "discoveredCharts": len(charts),
        },
        "versions": {
            "supplementalSchema": SCHEMA_VERSION,
            "reportSchema": REPORT_OUTPUT_SCHEMA_VERSION,
        },
    }


def build_report_payload(
    *,
    window: QueryWindow,
    state_root: Path,
    clock: InjectableClock,
    slot: Optional[str] = None,
    netdata: Optional[NetdataClient] = None,
) -> dict[str, Any]:
    records, segment_gaps = load_records_in_window(state_root, window, clock=clock, slot=slot)
    companion = companion_service_state(state_root, clock=clock, records=records)
    host_records = [record for record in records if record.get("kind") in ("host_window", "host_rollup")]
    mem_available = merge_host_metric_stats(host_records, "MemAvailable")
    spike_max = aggregate_fast_spike_max(host_records)
    if spike_max is not None:
        mem_available["spikeMaxRetained"] = spike_max
    counters = counter_deltas_same_identity(records)
    process = top_process_peaks(records)
    nested = nested_runtime_attribution(records)
    operations = collect_operation_spans(
        [record for record in records if record.get("kind") == "operation" or record.get("source", "").startswith("operation")]
    )
    # Include operation records stored under events stream with operation field
    for record in records:
        if record.get("kind") == "operation":
            continue
        operation = record.get("operation")
        if isinstance(operation, Mapping) and record.get("kind") in ("coverage", "health"):
            operations["incomplete"].append(
                {"reason": "unexpected_operation_kind", "observedAt": record.get("observedAt")}
            )
    payload: dict[str, Any] = {
        "reportSchemaVersion": REPORT_OUTPUT_SCHEMA_VERSION,
        "schemaVersion": SCHEMA_VERSION,
        "command": "report",
        "generatedAt": clock.observed_at_utc(),
        "window": {
            "from": window.start_iso,
            "to": window.end_iso,
            "spanSeconds": window.span_s,
        },
        "stateRoot": str(state_root),
        "slot": slot,
        "companion": companion,
        "recordCount": len(records),
        "gaps": segment_gaps,
        "host": {
            "MemAvailable": mem_available,
        },
        "counters": counters,
        "process": process,
        "runtime": nested,
        "operations": operations,
        "pidReuse": detect_pid_reuse_events(records),
        "clockJumps": collect_clock_jumps(records),
        "staleSources": detect_stale_summaries(records),
        "partialRange": len(records) == 0 or bool(segment_gaps),
        "correlationNote": "temporal evidence only; no automatic causality",
    }
    netdata = netdata or NetdataClient()
    payload["netdata"] = netdata.query_window(window).__dict__
    payload["storage"] = build_storage_status(state_root, clock)
    return payload


def format_status_table(payload: Mapping[str, Any]) -> str:
    lines = [
        f"companion: {payload.get('companion', {}).get('state', 'unknown')}",
        f"heartbeatAge: {payload.get('companion', {}).get('heartbeatAgeSeconds')}",
        f"netdata: {'up' if payload.get('netdata', {}).get('available') else 'down'}",
        f"storageBytes: {payload.get('storage', {}).get('totalBytes')}",
        f"disabledStreams: {','.join(payload.get('storage', {}).get('disabledStreams', [])) or 'none'}",
    ]
    return "\n".join(lines)


def format_report_table(payload: Mapping[str, Any]) -> str:
    host = payload.get("host", {}).get("MemAvailable", {})
    lines = [
        f"window: {payload.get('window', {}).get('from')} .. {payload.get('window', {}).get('to')}",
        f"records: {payload.get('recordCount', 0)} companion: {payload.get('companion', {}).get('state')}",
        f"MemAvailable mean: {host.get('mean')} count: {host.get('count')} max: {host.get('max')}",
        f"spikeMaxRetained: {host.get('spikeMaxRetained')}",
        f"netdata tier: {payload.get('netdata', {}).get('tier')} ambiguous: {payload.get('netdata', {}).get('tierAmbiguous')}",
        f"operations incomplete: {len(payload.get('operations', {}).get('incomplete', []))}",
    ]
    return "\n".join(lines)


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Offscreen workstation monitoring status/report reader")
    parser.add_argument("--state-root", help="Override supplemental state root")
    parser.add_argument("--json", action="store_true", help="Emit versioned JSON only")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("status", help="Service heartbeat and storage coverage")

    report = sub.add_parser("report", help="Historical evidence for a time window")
    report.add_argument("--last", help="Relative window, e.g. 30m, 2h, 7d")
    report.add_argument("--from", dest="from_iso", help="UTC ISO start")
    report.add_argument("--to", dest="to_iso", help="UTC ISO end")
    report.add_argument("--slot", help="Optional dev slot filter, e.g. dev-1")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = _build_arg_parser()
    args = parser.parse_args(argv)
    clock = InjectableClock()
    state_root = resolve_state_root(args.state_root)
    try:
        if args.command == "status":
            payload = build_status_payload(state_root=state_root, clock=clock)
        else:
            window = resolve_query_window(
                last=args.last,
                from_iso=args.from_iso,
                to_iso=args.to_iso,
                clock=clock,
            )
            payload = build_report_payload(
                window=window,
                state_root=state_root,
                clock=clock,
                slot=args.slot,
            )
    except ReportError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        text = format_status_table(payload) if args.command == "status" else format_report_table(payload)
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())