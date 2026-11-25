#!/usr/bin/env python3
"""Unit tests for INF47 historical status/report readers."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from host import (  # noqa: E402
    FAST_TICK_NS,
    FAST_WINDOW_NS,
    build_meminfo_text,
    observe_fast_window,
    rollup_minute,
)
from records import (  # noqa: E402
    InjectableClock,
    MetricStats,
    SCHEMA_VERSION,
    build_scope_id,
    encode_record,
    new_collector_session,
)
from report import (  # noqa: E402
    MAX_QUERY_SPAN_S,
    NetdataClient,
    QueryWindow,
    ReportError,
    aggregate_fast_spike_max,
    build_report_payload,
    build_status_payload,
    collect_clock_jumps,
    collect_operation_spans,
    companion_service_state,
    counter_deltas_same_identity,
    detect_pid_reuse_events,
    detect_stale_summaries,
    merge_host_metric_stats,
    nested_runtime_attribution,
    resolve_query_window,
    top_process_peaks,
)
from storage import (  # noqa: E402
    PRIVATE_DIR_MODE,
    PRIVATE_FILE_MODE,
    RecordStore,
    hour_utc_from_wall,
)

INSTALLATION_ID = "install-offscreen-test"


def _private_dir() -> Path:
    path = Path(tempfile.mkdtemp(prefix="offscreen-monitor-report-"))
    path.chmod(PRIVATE_DIR_MODE)
    return path


def _clock_at(wall_s: float) -> InjectableClock:
    return InjectableClock(
        boot_id="boot-report",
        wall_seconds=lambda: wall_s,
        monotonic_ns=lambda: int(wall_s * 1_000_000_000),
    )


def _host_window(wall_s: float, mem_kib: int, *, sequence: int = 1) -> dict:
    clock = _clock_at(wall_s)
    scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
    start = int(wall_s) * 1_000_000_000
    return observe_fast_window(
        window_start_mono_ns=start,
        clock=clock,
        scope_id=scope,
        collector_session=new_collector_session(),
        sequence=sequence,
        read_meminfo=lambda: build_meminfo_text({"MemAvailable": mem_kib}),
        tick_times_ns=[start + index * FAST_TICK_NS for index in range(5)],
    )


def _raise_netdata_refused() -> dict:
    raise OSError("refused")


def _append_record(store: RecordStore, prefix: str, record: dict) -> None:
    writer = store.open_stream(prefix)
    try:
        writer.append(record)
    finally:
        writer.flush_and_close()


class ReportAggregationTest(unittest.TestCase):
    def test_spike_max_retained_across_windows(self) -> None:
        low = _host_window(1_764_000_000.0, 4_000_000)
        pulse = _host_window(1_764_000_001.0, 500_000)
        peak = aggregate_fast_spike_max([low, pulse])
        self.assertEqual(peak, 4_000_000 * 1024)
        self.assertEqual(pulse["metrics"]["MemAvailable"]["min"], 500_000 * 1024)

    def test_weighted_count_merge_not_mean_of_means(self) -> None:
        sparse = observe_fast_window(
            window_start_mono_ns=0,
            clock=_clock_at(10.0),
            scope_id=build_scope_id(INSTALLATION_ID, "boot", "host"),
            collector_session=new_collector_session(),
            sequence=1,
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": 1000}),
            tick_times_ns=[0, FAST_TICK_NS, 10 * FAST_TICK_NS, 11 * FAST_TICK_NS, 12 * FAST_TICK_NS],
        )
        dense = _host_window(20.0, 2000, sequence=2)
        merged = merge_host_metric_stats([sparse, dense], "MemAvailable")
        expected_count = sparse["metrics"]["MemAvailable"]["count"] + dense["metrics"]["MemAvailable"]["count"]
        self.assertEqual(merged["count"], expected_count)
        wrong = (sparse["metrics"]["MemAvailable"]["mean"] + dense["metrics"]["MemAvailable"]["mean"]) / 2
        self.assertNotAlmostEqual(merged["mean"], wrong)

    def test_absent_metric_stays_null_not_zero(self) -> None:
        clock = _clock_at(30.0)
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        minute = rollup_minute(
            [_host_window(30.0, 1000)],
            bucket_start_mono_ns=0,
            clock=clock,
            scope_id=scope,
            collector_session=new_collector_session(),
            sequence=3,
        )
        merged = merge_host_metric_stats([minute], "MemFree")
        self.assertIsNone(merged["min"])
        self.assertEqual(merged["count"], 0)

    def test_counter_reset_emits_reset_not_negative_delta(self) -> None:
        scope = "install:boot:host"
        records = [
            {
                "scopeId": scope,
                "counters": {"vmstat.oom_kill": 3},
                "observedAt": "2026-11-24T20:00:00.000Z",
            },
            {
                "scopeId": scope,
                "counters": {"vmstat.oom_kill": 1},
                "observedAt": "2026-11-24T20:00:01.000Z",
            },
        ]
        deltas = counter_deltas_same_identity(records)
        self.assertTrue(any(item.get("kind") == "reset" for item in deltas))
        self.assertFalse(any(item.get("delta", 0) < 0 for item in deltas if item.get("kind") != "reset"))

    def test_pid_reuse_detected(self) -> None:
        scope = build_scope_id(INSTALLATION_ID, "boot", "host")
        records = [
            {
                "kind": "process_snapshot",
                "process": {
                    "pid": 99,
                    "processKey": {"scopeId": scope, "pid": 99, "starttimeTicks": 100},
                    "metrics": {"rssBytes": 1000},
                },
            },
            {
                "kind": "process_snapshot",
                "process": {
                    "pid": 99,
                    "processKey": {"scopeId": scope, "pid": 99, "starttimeTicks": 500},
                    "metrics": {"rssBytes": 2000},
                },
            },
        ]
        events = detect_pid_reuse_events(records)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["newStarttimeTicks"], 500)

    def test_stale_summary_detected(self) -> None:
        records = [
            {
                "source": "runtime.kube.summary",
                "observedAt": "2026-11-24T20:01:00.000Z",
                "sourceObservedAt": "2026-11-24T19:00:00.000Z",
            }
        ]
        stale = detect_stale_summaries(records, stale_s=30.0)
        self.assertEqual(len(stale), 1)

    def test_nested_double_count_flag(self) -> None:
        value = 42_000
        records = [
            {"kind": "host_window", "metrics": {"MemAvailable": {"min": value}}},
            {"kind": "docker_snapshot", "container": {"memoryBytes": value}},
        ]
        nested = nested_runtime_attribution(records)
        self.assertTrue(nested["doubleCountRisk"])

    def test_incomplete_operation_span(self) -> None:
        records = [
            {
                "kind": "operation",
                "operation": {"event": "phase-end", "phaseId": "p1", "resultCode": "success"},
            }
        ]
        spans = collect_operation_spans(records)
        self.assertEqual(len(spans["incomplete"]), 1)
        self.assertEqual(spans["correlationNote"], "temporal overlap only; no automatic causality")

    def test_clock_jump_collected(self) -> None:
        records = [{"kind": "host_window", "clockJump": {"detected": True, "deltaSeconds": 20.0}}]
        jumps = collect_clock_jumps(records)
        self.assertEqual(len(jumps), 1)

    def test_process_rss_and_pss_separate(self) -> None:
        records = [
            {
                "kind": "process_snapshot",
                "process": {
                    "pid": 1,
                    "processKey": {"scopeId": "s", "pid": 1, "starttimeTicks": 1},
                    "metrics": {"rssBytes": 100, "cpuTicks": {"total": 5}},
                },
            },
            {
                "kind": "process_snapshot",
                "source": "process-pss-top",
                "pssTop": [{"pid": 1, "pssBytes": 80}],
            },
        ]
        peaks = top_process_peaks(records, limit=5)
        self.assertEqual(peaks["rssTop"][0]["peakRssBytes"], 100)
        self.assertEqual(peaks["pssTop"][0]["pssBytes"], 80)


class ReportIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root = _private_dir()
        self.wall = 1_764_000_000.0
        self.clock = _clock_at(self.wall)
        self.scope = build_scope_id(INSTALLATION_ID, self.clock.boot_id, "host")
        self.store = RecordStore(self.root, self.scope, self.clock, create_root=True)

    def tearDown(self) -> None:
        self.store.shutdown()

    def _write_host_segment(self, wall: float, mem_kib: int) -> None:
        window = _host_window(wall, mem_kib)
        encode_record(window)
        hour = hour_utc_from_wall(wall)
        segment = self.root / f"fast-raw-{hour}.jsonl"
        payload = encode_record(window)
        if segment.exists():
            with open(segment, "ab") as handle:
                handle.write(payload)
        else:
            segment.write_bytes(payload)
            segment.chmod(PRIVATE_FILE_MODE)

    def test_empty_range_partial(self) -> None:
        window = QueryWindow(self.wall - 60, self.wall - 30)
        payload = build_report_payload(
            window=window,
            state_root=self.root,
            clock=self.clock,
            netdata=NetdataClient(fetch_json=lambda _url: {"charts": {}}),
        )
        self.assertTrue(payload["partialRange"])
        self.assertEqual(payload["recordCount"], 0)

    def test_status_not_installed(self) -> None:
        missing = self.root / "does-not-exist"
        def _netdata_down(_url: str) -> dict:
            raise OSError("down")

        payload = build_status_payload(
            state_root=missing,
            clock=self.clock,
            netdata=NetdataClient(fetch_json=_netdata_down),
        )
        self.assertEqual(payload["companion"]["state"], "not_installed")

    def test_companion_stopped_without_heartbeat(self) -> None:
        state = companion_service_state(self.root, clock=self.clock)
        self.assertEqual(state["state"], "stopped")

    def test_companion_running_with_recent_heartbeat(self) -> None:
        heartbeat = {
            "schemaVersion": SCHEMA_VERSION,
            "kind": "coverage",
            "collectorSession": new_collector_session(),
            "source": "collector.heartbeat",
            "scopeId": self.scope,
            "observedAt": self.clock.observed_at_utc(),
            "monotonicNs": str(self.clock.mono_ns()),
            "sequence": 1,
            "units": {"intervalSeconds": "seconds"},
            "coverage": {"heartbeat": True},
        }
        _append_record(self.store, "events", heartbeat)
        state = companion_service_state(self.root, clock=self.clock, records=[heartbeat])
        self.assertEqual(state["state"], "running")

    def test_report_reads_bounded_segments(self) -> None:
        self._write_host_segment(self.wall, 2_000_000)
        window = QueryWindow(self.wall - 10, self.wall + 10)
        payload = build_report_payload(
            window=window,
            state_root=self.root,
            clock=self.clock,
            netdata=NetdataClient(fetch_json=self._fake_netdata),
        )
        self.assertGreaterEqual(payload["recordCount"], 1)
        self.assertIn("spikeMaxRetained", payload["host"]["MemAvailable"])

    def test_netdata_unavailable_reported(self) -> None:
        window = QueryWindow(self.wall - 300, self.wall)
        payload = build_report_payload(
            window=window,
            state_root=self.root,
            clock=self.clock,
            netdata=NetdataClient(fetch_json=lambda _url: _raise_netdata_refused()),
        )
        self.assertFalse(payload["netdata"]["available"])

    def test_query_span_limit_negative(self) -> None:
        clock = _clock_at(1_000_000_000.0)
        with self.assertRaises(ReportError):
            resolve_query_window(
                last=None,
                from_iso="2020-01-01T00:00:00.000Z",
                to_iso="2021-06-01T00:00:00.000Z",
                clock=clock,
            )
        with self.assertRaises(ReportError):
            resolve_query_window(last="91d", from_iso=None, to_iso=None, clock=clock)
        window = resolve_query_window(last="30d", from_iso=None, to_iso=None, clock=clock)
        self.assertLessEqual(window.span_s, MAX_QUERY_SPAN_S)

    def test_historical_tier_ambiguity(self) -> None:
        tier, ambiguous, candidates = NetdataClient.pick_tier(3600)
        self.assertTrue(ambiguous)
        self.assertIn(0, candidates)
        self.assertIn(1, candidates)

    def _fake_netdata(self, url: str) -> dict:
        if url.endswith("/charts"):
            return {
                "charts": {
                    "system.memavailable": {"title": "Memory Available"},
                    "system.cpu": {"title": "Total CPU"},
                }
            }
        return {
            "labels": ["time", "average"],
            "data": [[int(self.wall), 1.0]],
            "units": "MiB",
            "view": None,
        }


class MetricStatsMergeRegression(unittest.TestCase):
    def test_merge_preserves_max_spike(self) -> None:
        a = MetricStats(min=10, max=50, sum=100, count=4)
        b = MetricStats(min=5, max=200, sum=50, count=2)
        merged = MetricStats.merge(a, b)
        self.assertEqual(merged.max, 200)


if __name__ == "__main__":
    unittest.main()