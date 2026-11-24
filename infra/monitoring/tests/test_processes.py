#!/usr/bin/env python3
"""Unit tests for safe process snapshots (INF44 T04)."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from processes import (  # noqa: E402
    FakeProcRoot,
    ProcessObservationState,
    assert_safe_record_fields,
    classify_process_category,
    collect_process_cycle_records,
    observe_all_processes,
    observe_process,
    parse_proc_stat,
    parse_smaps_rollup_pss_bytes,
    select_top_rss_for_pss,
)
from records import (  # noqa: E402
    InjectableClock,
    ProcessKey,
    build_scope_id,
    encode_record,
    new_collector_session,
)

INSTALLATION_ID = "install-offscreen-test"
SECRET_TOKEN = "super-secret-token-xyz"


def _clock() -> InjectableClock:
    return InjectableClock(boot_id="boot-process-test", monotonic_ns=lambda: 5_000_000_000)


def _stat_line(
    pid: int,
    comm: str,
    *,
    starttime: int = 42_000,
    ppid: int = 1,
    rss: int = 512,
    utime: int = 100,
    stime: int = 50,
) -> bytes:
    tail = (
        f"S {ppid} 0 0 0 0 0 0 0 0 {utime} {stime} 0 0 0 0 0 0 {starttime} 0 {rss}"
    )
    return f"{pid} ({comm}) {tail}\n".encode("utf-8")


def _status_line(rss_kib: int = 1000) -> bytes:
    return (
        f"VmRSS:\t{rss_kib} kB\n"
        f"VmHWM:\t{rss_kib + 10} kB\n"
        f"Threads:\t2\n"
        f"voluntary_ctxt_switches:\t3\n"
        f"nonvoluntary_ctxt_switches:\t1\n"
    ).encode("utf-8")


def _proc_bundle(
    pid: int,
    comm: str,
    *,
    starttime: int = 42_000,
    cmdline: bytes = b"node\x00",
    rss_kib: int = 1000,
) -> dict[str, bytes]:
    return {
        "stat": _stat_line(pid, comm, starttime=starttime),
        "status": _status_line(rss_kib=rss_kib),
        "io": b"read_bytes:\t1000\nwrite_bytes:\t2000\n",
        "cgroup": b"0::/user.slice/user-1000.slice\n",
        "cmdline": cmdline,
        "exe": b"/usr/bin/node\n",
        "smaps_rollup": b"Pss:\t123 kB\n",
    }


class ParseProcStatTest(unittest.TestCase):
    def test_final_paren_parsing_with_nested_comm(self) -> None:
        line = _stat_line(4242, "foo (bar)", starttime=99, rss=111).decode("utf-8").strip()
        parsed = parse_proc_stat(line)
        self.assertEqual(parsed.pid, 4242)
        self.assertEqual(parsed.comm, "foo (bar)")
        self.assertEqual(parsed.starttime_ticks, 99)

    def test_starttime_validation_observed(self) -> None:
        proc = FakeProcRoot({100: _proc_bundle(100, "node")})
        scope = build_scope_id(INSTALLATION_ID, _clock().boot_id, "host")
        observation = observe_process(proc, 100, scope)
        self.assertEqual(observation.state, ProcessObservationState.OBSERVED)
        self.assertIsNotNone(observation.process_key)


class ProcessSafetyTest(unittest.TestCase):
    def test_secret_argv_used_for_category_never_persisted(self) -> None:
        cmdline = f"node\x00--token={SECRET_TOKEN}\x00".encode("utf-8")
        proc = FakeProcRoot({200: _proc_bundle(200, "node", cmdline=cmdline)})
        scope = build_scope_id(INSTALLATION_ID, _clock().boot_id, "host")
        session = new_collector_session()
        records, _, _ = collect_process_cycle_records(
            proc,
            clock=_clock(),
            installation_id=INSTALLATION_ID,
            collector_session=session,
            sequence_start=0,
        )
        serialized = json.dumps(records)
        self.assertNotIn(SECRET_TOKEN, serialized)
        for record in records:
            assert_safe_record_fields(record)
            if record.get("kind") == "process_snapshot" and "process" in record:
                self.assertEqual(record["process"].get("category"), "node")

    def test_category_from_exact_tool_token(self) -> None:
        category = classify_process_category(
            "bash",
            "bash",
            b"/usr/bin/bash\x00pnpm\x00run\x00dev\x00",
        )
        self.assertEqual(category, "pnpm")


class ProcessRaceTest(unittest.TestCase):
    def test_exited_when_start_ticks_change(self) -> None:
        proc = FakeProcRoot()
        proc.processes[300] = _proc_bundle(300, "worker", starttime=10)
        proc.processes[300]["stat"] = _stat_line(300, "worker", starttime=10)
        scope = build_scope_id(INSTALLATION_ID, _clock().boot_id, "host")

        class RacyProc(FakeProcRoot):
            def __init__(self) -> None:
                super().__init__(proc.processes)
                self._stat_reads = 0

            def read_file(self, pid: int, name: str) -> bytes:
                if name == "stat":
                    self._stat_reads += 1
                    if self._stat_reads <= 1:
                        return _stat_line(pid, "worker", starttime=10)
                    return _stat_line(pid, "worker", starttime=11)
                return super().read_file(pid, name)

        observation = observe_process(RacyProc(), 300, scope)
        self.assertEqual(observation.state, ProcessObservationState.EXITED)

    def test_reused_pid_detected_between_cycles(self) -> None:
        proc = FakeProcRoot({400: _proc_bundle(400, "node", starttime=50)})
        scope = build_scope_id(INSTALLATION_ID, _clock().boot_id, "host")
        _, _, prior_keys = collect_process_cycle_records(
            proc,
            clock=_clock(),
            installation_id=INSTALLATION_ID,
            collector_session=new_collector_session(),
            sequence_start=0,
        )
        proc.processes[400] = _proc_bundle(400, "node", starttime=99)
        observations, coverage = observe_all_processes(
            proc, scope, prior_keys={400: prior_keys[400]}
        )
        states = {item.pid: item.state for item in observations if item.pid == 400}
        self.assertIn(ProcessObservationState.OBSERVED, states.values())
        self.assertGreaterEqual(coverage["counts"]["observed"], 1)

    def test_child_removed_reported_exited(self) -> None:
        proc = FakeProcRoot({401: _proc_bundle(401, "child", starttime=12)})
        scope = build_scope_id(INSTALLATION_ID, _clock().boot_id, "host")
        first, _ = observe_all_processes(proc, scope)
        del proc.processes[401]
        second, coverage = observe_all_processes(
            proc, scope, prior_keys={401: 12}
        )
        exited = [obs for obs in second if obs.pid == 401]
        self.assertTrue(exited)
        self.assertEqual(exited[0].state, ProcessObservationState.EXITED)
        self.assertEqual(coverage["counts"]["exited"], 1)


class PssSelectionTest(unittest.TestCase):
    def test_top10_by_rss(self) -> None:
        proc = FakeProcRoot(
            {
                index: _proc_bundle(index, "node", starttime=index, rss_kib=index * 10)
                for index in range(1, 15)
            }
        )
        scope = build_scope_id(INSTALLATION_ID, _clock().boot_id, "host")
        observations, _ = observe_all_processes(proc, scope)
        top = select_top_rss_for_pss(observations, limit=10)
        self.assertEqual(len(top), 10)
        rss_values = [item.metrics["vmRssBytes"] for item in top if item.metrics]
        self.assertEqual(rss_values, sorted(rss_values, reverse=True))


class RecordEncodingTest(unittest.TestCase):
    def test_process_records_encode_under_limit(self) -> None:
        proc = FakeProcRoot({500: _proc_bundle(500, "tilt")})
        records, _, _ = collect_process_cycle_records(
            proc,
            clock=_clock(),
            installation_id=INSTALLATION_ID,
            collector_session=new_collector_session(),
            sequence_start=0,
        )
        for record in records:
            payload = encode_record(record)
            self.assertLessEqual(len(payload.strip()), 64 * 1024)

    def test_pss_parse(self) -> None:
        self.assertEqual(parse_smaps_rollup_pss_bytes("Pss:\t64 kB\n"), 64 * 1024)


class DeniedAccountingTest(unittest.TestCase):
    def test_denied_pid_reported(self) -> None:
        proc = FakeProcRoot({600: _proc_bundle(600, "secret")}, denied_pids={600})
        scope = build_scope_id(INSTALLATION_ID, _clock().boot_id, "host")
        observation = observe_process(proc, 600, scope)
        self.assertEqual(observation.state, ProcessObservationState.DENIED)

    def test_listing_unavailable_sets_accounting_flag(self) -> None:
        proc = FakeProcRoot(listing_error="permission denied on /proc")
        scope = build_scope_id(INSTALLATION_ID, _clock().boot_id, "host")
        _, coverage = observe_all_processes(proc, scope)
        self.assertTrue(coverage["processAccountingUnavailable"])


if __name__ == "__main__":
    unittest.main()