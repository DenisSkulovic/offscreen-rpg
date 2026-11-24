#!/usr/bin/env python3
"""Unit tests for host fast memory windows and rollups (INF44 T03)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from host import (  # noqa: E402
    ObservedPeakTracker,
    build_meminfo_text,
    detect_counter_resets,
    observe_fast_window,
    observe_slow_counters,
    parse_meminfo,
    rollup_hour,
    rollup_minute,
)
from records import (  # noqa: E402
    FAST_TICKS_PER_WINDOW,
    FAST_TICK_NS,
    FAST_WINDOW_NS,
    ClockJumpDetector,
    InjectableClock,
    MetricStats,
    build_scope_id,
    encode_record,
    new_collector_session,
)

INSTALLATION_ID = "install-offscreen-test"


def _clock_at_mono_ns(mono_ns: int, wall_s: float = 1_764_000_000.0) -> InjectableClock:
    return InjectableClock(
        boot_id="boot-host-test",
        wall_seconds=lambda: wall_s,
        monotonic_ns=lambda: mono_ns,
    )


def _base_window(window_start: int, mem_kib_sequence: list[dict[str, int]], **kwargs: object) -> dict:
    clock = kwargs.pop("clock", _clock_at_mono_ns(window_start + FAST_WINDOW_NS))
    scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
    session = new_collector_session()
    tick_times = [window_start + index * FAST_TICK_NS for index in range(FAST_TICKS_PER_WINDOW)]
    queue = list(mem_kib_sequence)

    def read_meminfo() -> str:
        if not queue:
            return build_meminfo_text({"MemAvailable": mem_kib_sequence[-1]["MemAvailable"]})
        return build_meminfo_text(queue.pop(0))

    return observe_fast_window(
        window_start_mono_ns=window_start,
        clock=clock,
        scope_id=scope,
        collector_session=session,
        sequence=1,
        read_meminfo=read_meminfo,
        tick_times_ns=tick_times,
        **kwargs,
    )


class ParseMeminfoTest(unittest.TestCase):
    def test_allowlisted_bytes_and_null_absent(self) -> None:
        text = build_meminfo_text(
            {
                "MemTotal": 16_384_000,
                "MemAvailable": 8_000_000,
                "SwapTotal": 0,
            }
        )
        parsed = parse_meminfo(text)
        self.assertEqual(parsed["MemAvailable"], 8_000_000 * 1024)
        self.assertEqual(parsed["SwapTotal"], 0)
        self.assertIsNone(parsed["MemFree"])
        self.assertIsNone(parsed["Dirty"])

    def test_zero_distinct_from_null(self) -> None:
        text = build_meminfo_text({"MemFree": 0, "MemAvailable": 1})
        parsed = parse_meminfo(text)
        self.assertEqual(parsed["MemFree"], 0)
        self.assertIsNone(parsed["Cached"])


class FastWindowTest(unittest.TestCase):
    def test_five_hundred_ms_pulse_captured_by_two_hundred_ms_samples(self) -> None:
        start = 0
        baseline = 4_000_000
        pulse = 1_000_000
        # Ticks at 0,200,400,600,800ms — pulse present at 500ms affects 600ms sample.
        sequence = [
            {"MemAvailable": baseline},
            {"MemAvailable": baseline},
            {"MemAvailable": baseline},
            {"MemAvailable": pulse},
            {"MemAvailable": baseline},
        ]
        window = _base_window(start, sequence)
        stats = window["metrics"]["MemAvailable"]
        self.assertEqual(stats["min"], pulse * 1024)
        self.assertEqual(stats["max"], baseline * 1024)
        self.assertEqual(window["window"]["observedCount"], FAST_TICKS_PER_WINDOW)

    def test_short_intersample_pulse_missed_between_samples(self) -> None:
        start = 0
        baseline = 4_000_000
        # Spike only between 220ms and 280ms — samples at 200ms and 400ms see baseline only.
        sequence = [
            {"MemAvailable": baseline},
            {"MemAvailable": baseline},
            {"MemAvailable": baseline},
            {"MemAvailable": baseline},
            {"MemAvailable": baseline},
        ]
        window = _base_window(start, sequence)
        stats = window["metrics"]["MemAvailable"]
        self.assertEqual(stats["min"], stats["max"])
        self.assertEqual(stats["max"], baseline * 1024)

    def test_missing_tick_marks_partial_window(self) -> None:
        start = 0
        clock = _clock_at_mono_ns(start)
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        # Second tick arrives too late — skipped by grace policy.
        tick_times = [
            start,
            start + FAST_TICK_NS + FAST_TICK_NS,  # missed (scheduled +200ms, actual +400ms ok)
            start + 2 * FAST_TICK_NS + FAST_TICK_NS * 2,  # too late for tick 2
            start + 3 * FAST_TICK_NS,
            start + 4 * FAST_TICK_NS,
        ]
        calls = {"n": 0}

        def read_meminfo() -> str:
            calls["n"] += 1
            return build_meminfo_text({"MemAvailable": 1_000_000})

        window = observe_fast_window(
            window_start_mono_ns=start,
            clock=clock,
            scope_id=scope,
            collector_session=new_collector_session(),
            sequence=2,
            read_meminfo=read_meminfo,
            tick_times_ns=tick_times,
        )
        self.assertTrue(window["window"]["partial"])
        self.assertLess(window["window"]["observedCount"], FAST_TICKS_PER_WINDOW)
        self.assertEqual(window["window"]["partialReason"], "missed_ticks")

    def test_max_intersample_gap_recorded(self) -> None:
        start = 10_000_000
        tick_times = [
            start,
            start + FAST_TICK_NS,
            start + 3 * FAST_TICK_NS,  # gap skips one scheduled tick
            start + 4 * FAST_TICK_NS,
            start + 5 * FAST_TICK_NS,
        ]
        window = _base_window(
            start,
            [{"MemAvailable": 100}] * 5,
            clock=_clock_at_mono_ns(start + FAST_WINDOW_NS),
        )
        window = observe_fast_window(
            window_start_mono_ns=start,
            clock=_clock_at_mono_ns(start + FAST_WINDOW_NS),
            scope_id=build_scope_id(INSTALLATION_ID, "boot", "host"),
            collector_session=new_collector_session(),
            sequence=3,
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": 100}),
            tick_times_ns=tick_times,
        )
        gap = int(window["window"]["maxIntersampleGapNs"])
        self.assertGreaterEqual(gap, FAST_TICK_NS)

    def test_wall_clock_jump_metadata_on_window(self) -> None:
        start = 0
        wall = 1_000.0
        mono = start
        clock = InjectableClock(
            boot_id="boot-jump",
            wall_seconds=lambda: wall,
            monotonic_ns=lambda: mono,
        )
        detector = ClockJumpDetector()
        jumped, delta = detector.observe(wall, mono)
        wall = 1_020.0  # 20s jump with mono unchanged
        jumped, delta = detector.observe(wall, mono)
        self.assertTrue(jumped)

        window = observe_fast_window(
            window_start_mono_ns=start,
            clock=clock,
            scope_id=build_scope_id(INSTALLATION_ID, clock.boot_id, "host"),
            collector_session=new_collector_session(),
            sequence=4,
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": 100}),
            tick_times_ns=[start + index * FAST_TICK_NS for index in range(5)],
            clock_jump=(jumped, delta),
        )
        self.assertTrue(window.get("clockJump", {}).get("detected"))
        encode_record(window)


class RollupTest(unittest.TestCase):
    def _make_windows(
        self,
        start: int,
        count: int,
        available_kib: list[int],
    ) -> list[dict]:
        windows: list[dict] = []
        for index in range(count):
            window_start = start + index * FAST_WINDOW_NS
            clock = _clock_at_mono_ns(window_start + FAST_WINDOW_NS)
            value = available_kib[index % len(available_kib)]
            window = _base_window(window_start, [{"MemAvailable": value}] * 5)
            windows.append(window)
        return windows

    def test_minute_rollup_uses_sum_count_not_mean_of_means(self) -> None:
        start = 0
        # One window with only 2 samples and one with 5 — unweighted mean-of-means must differ.
        scope_one = build_scope_id(INSTALLATION_ID, "boot-sparse", "host")
        sparse = observe_fast_window(
            window_start_mono_ns=start,
            clock=_clock_at_mono_ns(start + FAST_WINDOW_NS),
            scope_id=scope_one,
            collector_session=new_collector_session(),
            sequence=0,
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": 1000}),
            tick_times_ns=[
                start,
                start + FAST_TICK_NS,
                start + 10 * FAST_TICK_NS,
                start + 11 * FAST_TICK_NS,
                start + 12 * FAST_TICK_NS,
            ],
        )
        dense = _base_window(FAST_WINDOW_NS, [{"MemAvailable": 2000}] * 5)
        windows = [sparse, dense]
        clock = _clock_at_mono_ns(start + 60 * FAST_WINDOW_NS)
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        tracker = ObservedPeakTracker()
        rollup = rollup_minute(
            windows,
            bucket_start_mono_ns=start,
            clock=clock,
            scope_id=scope,
            collector_session=new_collector_session(),
            sequence=10,
            peak_tracker=tracker,
        )
        stats = rollup["metrics"]["MemAvailable"]
        expected_sum = sparse["metrics"]["MemAvailable"]["sum"] + dense["metrics"]["MemAvailable"]["sum"]
        expected_count = sparse["metrics"]["MemAvailable"]["count"] + dense["metrics"]["MemAvailable"]["count"]
        self.assertEqual(stats["sum"], expected_sum)
        self.assertEqual(stats["count"], expected_count)
        mean_of_means = (
            sparse["metrics"]["MemAvailable"]["mean"] + dense["metrics"]["MemAvailable"]["mean"]
        ) / 2
        self.assertNotAlmostEqual(stats["mean"], mean_of_means)
        self.assertAlmostEqual(stats["mean"], expected_sum / expected_count)
        self.assertEqual(rollup["rollup"]["observedWindows"], 2)
        self.assertTrue(rollup["rollup"]["partial"])
        encode_record(rollup)

    def test_hour_rollup_preserves_extrema(self) -> None:
        start = 0
        pattern = [100, 500, 100, 50]
        windows = self._make_windows(start, 120, pattern)
        clock = _clock_at_mono_ns(start + 3600 * FAST_WINDOW_NS)
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        tracker = ObservedPeakTracker()
        for window in windows:
            tracker.observe_window(window)
        minute = rollup_minute(
            windows[:60],
            bucket_start_mono_ns=start,
            clock=clock,
            scope_id=scope,
            collector_session=new_collector_session(),
            sequence=11,
            peak_tracker=tracker,
        )
        hour = rollup_hour(
            windows,
            bucket_start_mono_ns=start,
            clock=clock,
            scope_id=scope,
            collector_session=new_collector_session(),
            sequence=12,
            peak_tracker=tracker,
        )
        self.assertEqual(minute["metrics"]["MemAvailable"]["max"], 500 * 1024)
        self.assertEqual(hour["metrics"]["MemAvailable"]["max"], 500 * 1024)
        self.assertEqual(hour["metrics"]["MemAvailable"]["min"], 50 * 1024)
        self.assertIn("observed", hour["peaks"])
        self.assertEqual(hour["peaks"]["observed"]["MemAvailable"], 500 * 1024)

    def test_unequal_sample_counts_preserve_partial_and_coverage(self) -> None:
        start = 0
        full = _base_window(start, [{"MemAvailable": 100}] * 5)
        partial_start = FAST_WINDOW_NS
        clock = _clock_at_mono_ns(partial_start)
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        late_ticks = [
            partial_start,
            partial_start + FAST_TICK_NS * 3,
            partial_start + FAST_TICK_NS * 4,
            partial_start + FAST_TICK_NS * 5,
            partial_start + FAST_TICK_NS * 6,
        ]
        partial = observe_fast_window(
            window_start_mono_ns=partial_start,
            clock=clock,
            scope_id=scope,
            collector_session=new_collector_session(),
            sequence=5,
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": 100}),
            tick_times_ns=late_ticks,
        )
        windows = [full, partial]
        rollup = rollup_minute(
            windows,
            bucket_start_mono_ns=0,
            clock=_clock_at_mono_ns(60 * FAST_WINDOW_NS),
            scope_id=scope,
            collector_session=new_collector_session(),
            sequence=13,
        )
        self.assertTrue(rollup["rollup"]["partial"])
        self.assertLess(rollup["rollup"]["coverage"], 1.0)
        self.assertEqual(
            rollup["metrics"]["MemAvailable"]["count"],
            full["metrics"]["MemAvailable"]["count"] + partial["metrics"]["MemAvailable"]["count"],
        )


class SlowCountersTest(unittest.TestCase):
    def test_counter_reset_detected_on_reboot_smaller_value(self) -> None:
        previous = {"vmstat.oom_kill": 3, "cpu.jiffies": 1_000_000}
        clock = _clock_at_mono_ns(5_000_000_000)
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        record = observe_slow_counters(
            clock=clock,
            scope_id=scope,
            collector_session=new_collector_session(),
            sequence=20,
            vmstat_text="oom_kill 1\n",
            stat_text="cpu  10 0 5 2 0 0 0 0 0 0\n",
            previous_counters=previous,
        )
        self.assertEqual(len(record["counterResets"]), 2)
        names = {entry["name"] for entry in record["counterResets"]}
        self.assertIn("vmstat.oom_kill", names)
        self.assertIn("cpu.jiffies", names)
        encode_record(record)

    def test_detect_counter_resets_negative_guard(self) -> None:
        resets = detect_counter_resets(
            {"a": 10},
            {"a": 12},
            source="test",
        )
        self.assertEqual(resets, [])


class MetricStatsMergeTest(unittest.TestCase):
    def test_merge_never_averages_means(self) -> None:
        a = MetricStats(min=10, max=20, sum=60, count=4)
        b = MetricStats(min=100, max=200, sum=600, count=2)
        merged = MetricStats.merge(a, b)
        self.assertEqual(merged.mean, (60 + 600) / 6)
        wrong_mean_of_means = (a.mean + b.mean) / 2
        self.assertNotAlmostEqual(merged.mean, wrong_mean_of_means)


if __name__ == "__main__":
    unittest.main()