#!/usr/bin/env python3
"""Unit tests for monitoring collector scheduling (INF44 T04)."""

from __future__ import annotations

import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Callable

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from collector import (  # noqa: E402
    CollectorConfig,
    HEARTBEAT_INTERVAL_S,
    MonotonicWorker,
    MonitoringCollector,
    RuntimeExtensionStatus,
    try_import_runtime_module,
)
from host import build_meminfo_text  # noqa: E402
from processes import FakeProcRoot  # noqa: E402
from records import InjectableClock, build_scope_id  # noqa: E402
from storage import PRIVATE_DIR_MODE, read_all_complete_records  # noqa: E402

INSTALLATION_ID = "install-offscreen-test"


def _stat_line(pid: int, comm: str, *, starttime: int = 42_000, rss: int = 512) -> bytes:
    tail = f"S 1 0 0 0 0 0 0 0 0 100 50 0 0 0 0 0 0 {starttime} 0 {rss}"
    return f"{pid} ({comm}) {tail}\n".encode("utf-8")


def _proc_bundle(pid: int, comm: str, **kwargs: object) -> dict[str, bytes]:
    starttime = int(kwargs.get("starttime", 42_000))
    rss_kib = int(kwargs.get("rss_kib", 1000))
    cmdline = kwargs.get("cmdline", b"node\x00")
    if not isinstance(cmdline, (bytes, bytearray)):
        cmdline = b"node\x00"
    return {
        "stat": _stat_line(pid, comm, starttime=starttime),
        "status": f"VmRSS:\t{rss_kib} kB\nVmHWM:\t{rss_kib} kB\nThreads:\t1\n".encode(),
        "io": b"read_bytes:\t1\nwrite_bytes:\t2\n",
        "cgroup": b"0::/user.slice\n",
        "cmdline": bytes(cmdline),
        "exe": b"/usr/bin/node\n",
        "smaps_rollup": b"Pss:\t64 kB\n",
    }


def _private_dir() -> Path:
    path = Path(tempfile.mkdtemp(prefix="offscreen-collector-state-"))
    path.chmod(PRIVATE_DIR_MODE)
    return path


class FakeClock:
    def __init__(self) -> None:
        self._mono_ns = 0
        self.boot_id = "boot-collector-test"

    def advance(self, seconds: float) -> None:
        self._mono_ns += int(seconds * 1_000_000_000)

    def clock(self) -> InjectableClock:
        return InjectableClock(
            boot_id=self.boot_id,
            wall_seconds=lambda: 1_764_000_000.0 + self._mono_ns / 1e9,
            monotonic_ns=lambda: self._mono_ns,
        )


def _collector(
    *,
    proc: FakeProcRoot | None = None,
    mem_kib: int = 8_000_000,
    max_ticks: int = 50,
    clock: FakeClock | None = None,
    sleep: Callable[[float], None] | None = None,
) -> tuple[MonitoringCollector, FakeClock, Path]:
    state_root = _private_dir()
    config = CollectorConfig(
        installation_id=INSTALLATION_ID,
        state_root=str(state_root),
        enable_optional_pss=True,
        mem_available_suspend_bytes=4 * 1024 * 1024 * 1024,
    )
    fake_clock = clock or FakeClock()
    proc_fixture = proc or FakeProcRoot({1000: _proc_bundle(1000, "node")})

    def advance_sleep(_duration: float) -> None:
        fake_clock.advance(1.0)

    collector = MonitoringCollector(
        config,
        clock=fake_clock.clock(),
        proc=proc_fixture,
        store=__import__("storage").RecordStore(
            state_root,
            build_scope_id(INSTALLATION_ID, fake_clock.boot_id),
            fake_clock.clock(),
            create_root=True,
        ),
        read_meminfo=lambda: build_meminfo_text({"MemAvailable": mem_kib}),
        read_self_status=lambda: "VmRSS:\t2048 kB\n",
        read_boot_text=lambda: "boot-collector-test\n",
        sleep=sleep or advance_sleep,
        mono=lambda: fake_clock._mono_ns / 1e9,
    )
    collector.run_until(max_ticks=max_ticks)
    return collector, fake_clock, state_root


class MonotonicWorkerTest(unittest.TestCase):
    def test_no_overlapping_in_flight(self) -> None:
        inflight = {"active": False}

        def work() -> None:
            self.assertFalse(inflight["active"])
            inflight["active"] = True

        worker = MonotonicWorker("demo", 1.0, work)
        worker.schedule_start(0.0)
        worker.begin(0.0)
        self.assertTrue(worker.overlapped())
        worker.run()
        worker.complete()
        self.assertFalse(worker.overlapped())

    def test_overrun_skips_catch_up(self) -> None:
        calls: list[float] = []

        worker = MonotonicWorker("demo", 5.0, lambda: calls.append(worker._next_deadline_s))
        worker.schedule_start(0.0)
        worker.begin(0.0)
        worker.run()
        worker.complete()
        worker.begin(20.0)
        self.assertEqual(worker._skipped_overruns, 1)
        self.assertGreaterEqual(worker._next_deadline_s, 20.0)


class CollectorSchedulingTest(unittest.TestCase):
    def test_heartbeat_every_five_seconds(self) -> None:
        collector, _, _ = _collector(max_ticks=300)
        self.assertGreaterEqual(collector.state.heartbeats, 2)

    def test_worker_exception_records_gap(self) -> None:
        state_root = _private_dir()
        config = CollectorConfig(
            installation_id=INSTALLATION_ID,
            state_root=str(state_root),
        )
        fake_clock = FakeClock()

        def failing_snapshot() -> None:
            raise RuntimeError("injected snapshot failure")

        collector = MonitoringCollector(
            config,
            clock=fake_clock.clock(),
            proc=FakeProcRoot({1001: _proc_bundle(1001, "node")}),
            store=__import__("storage").RecordStore(
                state_root,
                build_scope_id(INSTALLATION_ID, fake_clock.boot_id),
                fake_clock.clock(),
                create_root=True,
            ),
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": 8_000_000}),
            read_self_status=lambda: "VmRSS:\t1024 kB\n",
            sleep=lambda _: fake_clock.advance(5.0),
            mono=lambda: fake_clock._mono_ns / 1e9,
        )
        collector._workers[0].callback = failing_snapshot  # type: ignore[method-assign]
        collector.run_until(max_ticks=40)
        self.assertTrue(any("process-fast" in gap for gap in collector.state.worker_gaps))

    def test_stop_flush_persists_records(self) -> None:
        collector, _, state_root = _collector(max_ticks=80)
        paths = list(state_root.glob("process-*.jsonl"))
        self.assertTrue(paths)
        records = list(read_all_complete_records(paths[0]))
        self.assertGreater(len(records), 0)

    def test_low_memory_suspends_optional_pss(self) -> None:
        low_mem_kib = 1_000_000  # below 4GiB threshold
        collector, _, state_root = _collector(mem_kib=low_mem_kib, max_ticks=600)
        self.assertTrue(collector.state.heartbeats >= 1)
        event_paths = list(state_root.glob("events-*.jsonl"))
        suspended = False
        for path in event_paths:
            for record in read_all_complete_records(path):
                coverage = record.get("coverage", {})
                if coverage.get("optionalPssSuspended"):
                    suspended = True
        self.assertTrue(suspended or collector._optional_pss_suspended)

    def test_runtime_extension_missing_is_unsupported_not_fatal(self) -> None:
        module, status = try_import_runtime_module()
        if module is None:
            self.assertEqual(status, RuntimeExtensionStatus.UNSUPPORTED)
        collector, _, _ = _collector(max_ticks=20)
        self.assertIn(
            collector.state.runtime_status,
            {RuntimeExtensionStatus.UNSUPPORTED, RuntimeExtensionStatus.SUPPORTED},
        )

    def test_config_read_once(self) -> None:
        state_root = _private_dir()
        config_path = state_root / "collector.json"
        config_path.write_text(
            json.dumps(
                {
                    "installationId": INSTALLATION_ID,
                    "stateRoot": str(state_root),
                    "enableOptionalPss": False,
                }
            ),
            encoding="utf-8",
        )
        first = CollectorConfig.load_once(config_path)
        config_path.write_text(
            json.dumps(
                {
                    "installationId": "mutated",
                    "stateRoot": str(state_root),
                }
            ),
            encoding="utf-8",
        )
        self.assertEqual(first.installation_id, INSTALLATION_ID)
        self.assertFalse(first.enable_optional_pss)


class CollectorCoverageTest(unittest.TestCase):
    def test_status_record_includes_storage_and_rss(self) -> None:
        _, _, state_root = _collector(max_ticks=1200)
        health_paths = list(state_root.glob("health-*.jsonl"))
        self.assertTrue(health_paths)
        found = False
        for record in read_all_complete_records(health_paths[0]):
            if record.get("kind") == "health":
                self.assertIn("storage", record)
                self.assertIsNotNone(record["collector"].get("rssBytes"))
                found = True
        self.assertTrue(found)

    def test_no_secret_argv_in_persisted_streams(self) -> None:
        secret = "collector-secret-abc"
        proc = FakeProcRoot(
            {
                2000: {
                    **_proc_bundle(2000, "node", cmdline=f"node\x00{secret}\x00".encode("utf-8")),
                }
            }
        )
        _, _, state_root = _collector(proc=proc, max_ticks=200)
        for path in state_root.glob("*.jsonl"):
            text = path.read_text(encoding="utf-8")
            self.assertNotIn(secret, text)


if __name__ == "__main__":
    unittest.main()