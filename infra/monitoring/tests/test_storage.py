#!/usr/bin/env python3
"""Unit tests for bounded monitoring record storage (INF44 T02)."""

from __future__ import annotations

import errno
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from records import (  # noqa: E402
    ClockJumpDetector,
    InjectableClock,
    ProcessKey,
    RecordLineState,
    RecordValidationError,
    build_scope_id,
    encode_record,
    new_collector_session,
    parse_record_line,
)
from storage import (  # noqa: E402
    PRIVATE_DIR_MODE,
    PRIVATE_FILE_MODE,
    ConcurrentWriterError,
    RecordStore,
    RetentionManager,
    SegmentIdentity,
    SegmentReader,
    StateRoot,
    StateRootError,
    StorageLimitedError,
    StreamWriter,
    read_all_complete_records,
)

INSTALLATION_ID = "install-offscreen-test"


def _private_dir() -> Path:
    path = Path(tempfile.mkdtemp(prefix="offscreen-monitor-state-"))
    path.chmod(PRIVATE_DIR_MODE)
    return path


def _base_record(**extra: object) -> dict[str, object]:
    record = {
        "schemaVersion": 1,
        "kind": "coverage",
        "collectorSession": new_collector_session(),
        "source": "test",
        "scopeId": "scope",
        "observedAt": "2026-11-24T20:00:00.000Z",
        "monotonicNs": "1000",
        "sequence": 1,
        "units": {"note": "plain-text"},
    }
    record.update(extra)
    return record


class InjectableClockTest(unittest.TestCase):
    def test_scope_and_process_key_use_injected_boot(self) -> None:
        clock = InjectableClock(boot_id="boot-abc")
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        self.assertIn("boot-abc", scope)
        key = ProcessKey(scope, 4242, 123456)
        self.assertEqual(key.as_dict()["pid"], 4242)

    def test_clock_jump_detected(self) -> None:
        detector = ClockJumpDetector()
        jumped, _ = detector.observe(1_000.0, 0)
        self.assertFalse(jumped)
        jumped, delta = detector.observe(1_010.0, 0)
        self.assertTrue(jumped)
        self.assertGreater(abs(delta), 1.0)


class StateRootTest(unittest.TestCase):
    def test_rejects_non_absolute(self) -> None:
        with self.assertRaises(StateRootError):
            StateRoot("relative/path").validate()

    def test_rejects_symlink_root(self) -> None:
        base = _private_dir()
        target = base / "real"
        target.mkdir()
        link = base / "link"
        link.symlink_to(target)
        with self.assertRaises(StateRootError):
            StateRoot(link).validate()


class WriterAndReaderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root_dir = _private_dir()
        self.wall = 1_764_000_000.0
        self.clock = InjectableClock(
            boot_id="boot-writer",
            wall_seconds=lambda: self.wall,
            monotonic_ns=lambda: int(self.wall * 1_000_000_000),
        )
        self.scope = build_scope_id(INSTALLATION_ID, self.clock.boot_id, "host")
        self.store = RecordStore(self.root_dir, self.scope, self.clock, create_root=True)

    def tearDown(self) -> None:
        self.store.shutdown()

    def test_unique_process_start_writer_lock(self) -> None:
        writer = self.store.open_stream("events", process_start_key="4242-999")
        lock_name = ".writer-events-4242-999.lock"
        lock_path = self.root_dir / lock_name
        self.assertTrue(lock_path.exists())
        self.assertIn(writer.collector_session, lock_path.read_text(encoding="utf-8"))

    def test_concurrent_writer_refused(self) -> None:
        first = self.store.open_stream("fast-raw")
        with self.assertRaises(ConcurrentWriterError):
            StreamWriter(
                self.store.state_root,
                "fast-raw",
                self.scope,
                self.clock,
                retention=self.store._retention,
            )
        first.flush_and_close()

    def test_partial_terminal_line_coverage(self) -> None:
        segment = self.root_dir / "fast-raw-2026112420.jsonl"
        segment.write_bytes(encode_record(_base_record(sequence=1)) + b'{"schemaVersion":1,"kind":"cov')
        lines, coverage, _ = SegmentReader.read_segment(
            segment,
            scope_id=self.scope,
            collector_session="reader",
            clock=self.clock,
        )
        self.assertEqual(lines[-1].state, RecordLineState.PARTIAL)
        self.assertEqual(len(coverage), 1)
        self.assertTrue(coverage[0]["coverage"]["crashTailUncertainty"])

    def test_segment_rotation_on_size(self) -> None:
        writer = self.store.open_stream("fast-raw", segment_max_bytes=180)
        for idx in range(3):
            writer.append(_base_record(kind="host_window", sequence=idx))
        names = sorted(path.name for path in self.root_dir.glob("fast-raw-*.jsonl"))
        self.assertGreaterEqual(len(names), 2)
        self.assertTrue(any("-" in name and name.endswith(".jsonl") for name in names[1:]))

    def test_fsync_on_shutdown(self) -> None:
        writer = self.store.open_stream("process")
        with mock.patch("os.fsync") as fsync_mock:
            writer.append(_base_record())
            writer.flush_and_close()
        self.assertTrue(fsync_mock.called)


class RetentionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root_dir = _private_dir()
        self.wall = 1_764_000_000.0
        self.clock = InjectableClock(
            boot_id="boot-retention",
            wall_seconds=lambda: self.wall,
            monotonic_ns=lambda: int(self.wall * 1_000_000_000),
        )
        self.scope = build_scope_id(INSTALLATION_ID, self.clock.boot_id, "host")
        self.store = RecordStore(self.root_dir, self.scope, self.clock, create_root=True)

    def tearDown(self) -> None:
        self.store.shutdown()

    def _write_closed_segment(self, name: str, body: bytes) -> Path:
        path = self.root_dir / name
        path.write_bytes(body)
        path.chmod(PRIVATE_FILE_MODE)
        return path

    def test_retention_drops_oldest_by_size(self) -> None:
        tiny_limits = {"fast-raw": (300, 72 * 3600)}
        retention = RetentionManager(
            self.store.state_root,
            self.clock,
            active_paths=lambda: set(),
            limits=tiny_limits,
        )
        old = self._write_closed_segment("fast-raw-2026110100.jsonl", b"x" * 120)
        mid = self._write_closed_segment("fast-raw-2026110200.jsonl", b"y" * 120)
        new = self._write_closed_segment("fast-raw-2026110300.jsonl", b"z" * 120)
        report = retention.maybe_enforce(force=True)
        self.assertFalse(old.exists())
        self.assertTrue(mid.exists() or new.exists())
        self.assertGreaterEqual(report.streams["fast-raw"].dropped_segments, 1)

    def test_retention_drops_by_age(self) -> None:
        tiny_limits = {"process": (1024 * 1024, 3600)}
        retention = RetentionManager(
            self.store.state_root,
            self.clock,
            active_paths=lambda: set(),
            limits=tiny_limits,
        )
        stale = self._write_closed_segment("process-2025110100.jsonl", b"old")
        fresh = self._write_closed_segment(
            "process-2026112320.jsonl",
            b"fresh",
        )
        report = retention.maybe_enforce(force=True)
        self.assertFalse(stale.exists())
        self.assertTrue(fresh.exists())
        stats = report.streams["process"]
        self.assertIsNotNone(stats.oldest)
        self.assertIsNotNone(stats.newest)

    def test_active_segment_protected(self) -> None:
        writer = self.store.open_stream("runtime", segment_max_bytes=10_000)
        writer.append(_base_record())
        active_path = writer.active_path
        assert active_path is not None
        self._write_closed_segment("runtime-2026110100.jsonl", b"a" * 500)
        tiny_limits = {"runtime": (200, 72 * 3600)}
        retention = RetentionManager(
            self.store.state_root,
            self.clock,
            active_paths=writer.active_paths,
            limits=tiny_limits,
        )
        retention.maybe_enforce(force=True)
        self.assertTrue(active_path.exists())

    def test_foreign_and_unknown_prefix_not_deleted(self) -> None:
        foreign = self.root_dir / "foreign.txt"
        foreign.write_text("leave", encoding="utf-8")
        unknown = self._write_closed_segment("unknown-2026110100.jsonl", b"nope")
        self.store._retention.maybe_enforce(force=True)
        self.assertTrue(foreign.exists())
        self.assertTrue(unknown.exists())

    def test_health_counts_toward_events_budget(self) -> None:
        self._write_closed_segment("events-2026110100.jsonl", b"a" * 200)
        self._write_closed_segment("health-2026110200.jsonl", b"b" * 200)
        report = self.store._retention.maybe_enforce(force=True)
        self.assertGreaterEqual(report.events_used_bytes, 400)
        self.assertGreaterEqual(report.health_used_bytes, 200)


class DiskFullTest(unittest.TestCase):
    def test_disk_full_sets_limited_without_busy_loop(self) -> None:
        root_dir = _private_dir()
        clock = InjectableClock(boot_id="boot-disk")
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        store = RecordStore(root_dir, scope, clock, create_root=True)
        writer = store.open_stream("events")
        call_count = {"n": 0}

        def failing_write(fd: int, data: bytes) -> int:
            call_count["n"] += 1
            raise OSError(errno.ENOSPC, "No space left on device")

        with mock.patch("os.write", side_effect=failing_write):
            with self.assertRaises(StorageLimitedError):
                writer.append(_base_record())
            with self.assertRaises(StorageLimitedError):
                writer.append(_base_record())
        self.assertEqual(call_count["n"], 1)
        self.assertTrue(writer.storage_limited())
        store.shutdown()


class RecordValidationTest(unittest.TestCase):
    def test_record_size_cap(self) -> None:
        huge = _base_record(payload="x" * 70_000)
        with self.assertRaises(RecordValidationError):
            encode_record(huge)

    def test_complete_round_trip(self) -> None:
        root_dir = _private_dir()
        clock = InjectableClock(boot_id="boot-read")
        scope = build_scope_id(INSTALLATION_ID, clock.boot_id, "host")
        store = RecordStore(root_dir, scope, clock, create_root=True)
        writer = store.open_stream("events")
        writer.append(_base_record(kind="operation", marker="ok"))
        path = writer.active_path
        assert path is not None
        records = list(read_all_complete_records(path))
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["kind"], "operation")
        store.shutdown()


if __name__ == "__main__":
    unittest.main()