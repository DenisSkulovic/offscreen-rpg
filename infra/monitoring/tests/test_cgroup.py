#!/usr/bin/env python3
"""Unit tests for read-only nested cgroup peaks (INF45 T03)."""

from __future__ import annotations

import json
import os
import subprocess
import unittest.mock
import sys
import tempfile
import time
import unittest
from pathlib import Path

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from records import InjectableClock, new_collector_session  # noqa: E402
from runtime import CommandOutcome, RuntimeConfig  # noqa: E402
from kube import (  # noqa: E402
    CGROUP_PROBE_SCRIPT,
    CgroupCollectionState,
    CgroupCollector,
    CgroupCounterTrack,
    CgroupLifetimeState,
    cgroup_docker_exec_argv,
    cgroup_records_from_probe,
    fetch_cgroup_probe,
    is_valid_cgroup_container_id,
    parse_cgroup_probe_stdout,
    partition_cgroup_container_ids,
    process_identity_key,
)

CONTAINER_ID = "a" * 64
CONTAINER_ID_B = "b" * 64
NODE = "offscreen-dev-control-plane"


def _run_probe(
    cgroup_root: Path,
    proc_root: Path,
    ids: list[str],
    *,
    extra_env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["CGROUP_ROOT"] = str(cgroup_root)
    env["PROC_ROOT"] = str(proc_root)
    if extra_env:
        env.update(extra_env)
    return subprocess.run(
        ["bash", str(CGROUP_PROBE_SCRIPT)],
        input="\n".join(ids) + ("\n" if ids else ""),
        capture_output=True,
        text=True,
        timeout=10,
        env=env,
        check=False,
    )


def _seed_cgroup_v2_root(root: Path) -> None:
    root.mkdir(parents=True, exist_ok=True)
    (root / "cgroup.controllers").write_text("memory pids\n", encoding="utf-8")


def _seed_container_cgroup(
    root: Path,
    container_id: str,
    *,
    current: int = 100,
    peak: int = 500,
    oom_kill: int = 2,
    procs: list[int] | None = None,
) -> Path:
    cgroup_dir = root / "kubepods.slice" / f"cri-containerd-{container_id}.scope"
    cgroup_dir.mkdir(parents=True, exist_ok=True)
    (cgroup_dir / "memory.current").write_text(f"{current}\n", encoding="utf-8")
    (cgroup_dir / "memory.peak").write_text(f"{peak}\n", encoding="utf-8")
    (cgroup_dir / "memory.events").write_text(
        f"oom_kill {oom_kill}\nlow 0\n", encoding="utf-8"
    )
    (cgroup_dir / "cpu.stat").write_text("usage_usec 12345\n", encoding="utf-8")
    proc_lines = "\n".join(str(pid) for pid in (procs or [])) + ("\n" if procs else "")
    (cgroup_dir / "cgroup.procs").write_text(proc_lines, encoding="utf-8")
    return cgroup_dir


def _seed_proc(proc_root: Path, pid: int, *, starttime: int = 1000, comm: str = "node") -> None:
    proc_root.mkdir(parents=True, exist_ok=True)
    stat_line = (
        f"{pid} ({comm}) S 1 0 0 0 0 0 0 0 0 "
        f"10 20 0 0 0 0 0 0 {starttime} 0 512\n"
    )
    status = "Name:\tnode\nState:\tS (sleeping)\nVmRSS:\t1024 kB\nThreads:\t2\n"
    proc_dir = proc_root / str(pid)
    proc_dir.mkdir(parents=True, exist_ok=True)
    (proc_dir / "stat").write_text(stat_line, encoding="utf-8")
    (proc_dir / "status").write_text(status, encoding="utf-8")


class CgroupProbeScriptTest(unittest.TestCase):
    def test_peak_file_retained_when_current_drops(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "cgroup"
            proc = Path(tmp) / "proc"
            _seed_cgroup_v2_root(root)
            cg = _seed_container_cgroup(root, CONTAINER_ID, current=80, peak=900)
            completed = _run_probe(root, proc, [CONTAINER_ID])
            self.assertEqual(completed.returncode, 0)
            row = json.loads(completed.stdout.strip().splitlines()[0])
            self.assertEqual(row["memory"]["current"], 80)
            self.assertEqual(row["memory"]["peak"], 900)
            # Simulate gauge drop without rewriting kernel peak file.
            (cg / "memory.current").write_text("40\n", encoding="utf-8")
            self.assertEqual((cg / "memory.peak").read_text(encoding="utf-8").strip(), "900")

    def test_oom_kill_counter_visible(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "cgroup"
            proc = Path(tmp) / "proc"
            _seed_cgroup_v2_root(root)
            _seed_container_cgroup(root, CONTAINER_ID, oom_kill=3)
            completed = _run_probe(root, proc, [CONTAINER_ID])
            row = json.loads(completed.stdout.strip())
            self.assertEqual(row["memory"]["events"]["oom_kill"], 3)

    def test_process_start_ticks_identity(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "cgroup"
            proc = Path(tmp) / "proc"
            _seed_cgroup_v2_root(root)
            _seed_container_cgroup(root, CONTAINER_ID, procs=[42])
            _seed_proc(proc, 42, starttime=5555, comm="node")
            completed = _run_probe(root, proc, [CONTAINER_ID])
            row = json.loads(completed.stdout.strip())
            proc_row = row["processes"][0]
            self.assertEqual(proc_row["pid"], 42)
            self.assertEqual(proc_row["starttimeTicks"], 5555)

    def test_ambiguous_cgroup_refused(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "cgroup"
            proc = Path(tmp) / "proc"
            _seed_cgroup_v2_root(root)
            (root / "a" / f"cri-containerd-{CONTAINER_ID}.scope").mkdir(parents=True)
            (root / "b" / f"cri-containerd-{CONTAINER_ID}.scope").mkdir(parents=True)
            completed = _run_probe(root, proc, [CONTAINER_ID])
            row = json.loads(completed.stdout.strip())
            self.assertEqual(row["state"], "gap")
            self.assertIn("ambiguous", row["gapReason"])

    def test_malicious_input_refused(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "cgroup"
            proc = Path(tmp) / "proc"
            _seed_cgroup_v2_root(root)
            completed = _run_probe(
                root,
                proc,
                ["$(rm -rf /)", "not-hex", "A" * 64, f"../{CONTAINER_ID}"],
            )
            lines = [json.loads(line) for line in completed.stdout.splitlines() if line.strip()]
            self.assertEqual(len(lines), 4)
            for row in lines:
                self.assertEqual(row["state"], "gap")

    def test_no_cgroup_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "cgroup"
            proc = Path(tmp) / "proc"
            _seed_cgroup_v2_root(root)
            cg = _seed_container_cgroup(root, CONTAINER_ID)
            before_peak = (cg / "memory.peak").read_text(encoding="utf-8")
            before_mtime = (cg / "memory.peak").stat().st_mtime_ns
            marker = cg / "probe_marker"
            marker.write_text("must-stay\n", encoding="utf-8")
            _run_probe(root, proc, [CONTAINER_ID])
            self.assertEqual((cg / "memory.peak").read_text(encoding="utf-8"), before_peak)
            self.assertEqual((cg / "memory.peak").stat().st_mtime_ns, before_mtime)
            self.assertEqual(marker.read_text(encoding="utf-8"), "must-stay\n")

    def test_probe_deadline_timeout_gap(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "cgroup"
            proc = Path(tmp) / "proc"
            _seed_cgroup_v2_root(root)
            _seed_container_cgroup(root, CONTAINER_ID, procs=list(range(1, 120)))
            for pid in range(1, 120):
                _seed_proc(proc, pid, starttime=pid)
            completed = _run_probe(
                root,
                proc,
                [CONTAINER_ID],
                extra_env={
                    "PROBE_DEADLINE_S": "0",
                    "PROBE_START_EPOCH": str(int(time.time()) - 10),
                    "MAX_PROCS": "100",
                },
            )
            row = json.loads(completed.stdout.strip())
            self.assertTrue(row.get("processTruncated") or row.get("state") == "gap")


class CgroupPythonTest(unittest.TestCase):
    def test_lifetime_peak_survives_gauge_drop(self) -> None:
        state = CgroupLifetimeState()
        first = state.merge_memory({"current": 500, "peak": 800})
        self.assertEqual(first["lifetimePeakBytes"], 800)
        second = state.merge_memory({"current": 100, "peak": 150})
        self.assertEqual(second["lifetimePeakBytes"], 800)
        self.assertTrue(second["gaugeBelowLifetimePeak"])

    def test_oom_kill_delta_and_reset(self) -> None:
        track = CgroupCounterTrack()
        delta, reset = track.observe(2)
        self.assertIsNone(delta)
        self.assertFalse(reset)
        delta, reset = track.observe(5)
        self.assertEqual(delta, 3)
        self.assertFalse(reset)
        delta, reset = track.observe(1)
        self.assertEqual(delta, 1)
        self.assertTrue(reset)

    def test_pid_reuse_distinct_identity(self) -> None:
        first = process_identity_key(NODE, {"pid": 99, "starttimeTicks": 111})
        second = process_identity_key(NODE, {"pid": 99, "starttimeTicks": 222})
        self.assertNotEqual(first, second)

    def test_partition_rejects_invalid_ids(self) -> None:
        accepted, gaps = partition_cgroup_container_ids(
            [CONTAINER_ID, "evil;rm", CONTAINER_ID]
        )
        self.assertEqual(accepted, [CONTAINER_ID])
        self.assertEqual(len(gaps), 2)

    def test_docker_exec_argv_never_embeds_ids(self) -> None:
        config = RuntimeConfig(
            docker_context="default",
            kubeconfig_path="/tmp/kube.json",
            kube_context="kind-offscreen-dev",
            installation_id="install",
        )
        argv = cgroup_docker_exec_argv(config, NODE)
        joined = " ".join(argv)
        self.assertNotIn(CONTAINER_ID, joined)
        self.assertIn("exec", argv)
        self.assertIn("-i", argv)

    def test_fetch_cgroup_probe_stdin_only_ids(self) -> None:
        captured: dict[str, str] = {}

        def fake_stdin(
            command: str,
            args: list[str],
            *,
            timeout_s: float,
            stdin_text: str,
        ) -> CommandOutcome:
            captured["stdin"] = stdin_text
            captured["args"] = " ".join(args)
            return CommandOutcome(
                ok=True,
                status=0,
                stdout=json.dumps({"containerId": CONTAINER_ID, "state": "ok", "memory": {}})
                + "\n",
                stderr="",
            )

        config = RuntimeConfig(
            docker_context="default",
            kubeconfig_path="/tmp/kube.json",
            kube_context="kind-offscreen-dev",
            installation_id="install",
        )
        stdout, access, _ = fetch_cgroup_probe(
            config,
            NODE,
            [CONTAINER_ID],
            run_stdin=fake_stdin,
        )
        self.assertEqual(access.value, "ok")
        self.assertIn(CONTAINER_ID, captured["stdin"])
        self.assertNotIn(CONTAINER_ID, captured["args"])
        self.assertIsNotNone(stdout)

    @unittest.mock.patch("kube.refuse_cross_target", return_value=(True, ""))
    def test_collector_emits_cgroup_snapshot(self, _mock_refuse: object) -> None:
        clock = InjectableClock(boot_id="boot-cgroup", monotonic_ns=lambda: 1_000_000)
        config = RuntimeConfig(
            docker_context="default",
            kubeconfig_path="/tmp/kube.json",
            kube_context="kind-offscreen-dev",
            installation_id="install",
        )

        probe_line = json.dumps(
            {
                "containerId": CONTAINER_ID,
                "state": "ok",
                "cgroupPath": f"/kubepods/cri-containerd-{CONTAINER_ID}.scope",
                "memory": {"current": 10, "peak": 50},
                "processes": [{"pid": 1, "starttimeTicks": 9, "state": "S"}],
                "processTruncated": False,
            }
        )

        def fake_stdin(
            command: str,
            args: list[str],
            *,
            timeout_s: float,
            stdin_text: str,
        ) -> CommandOutcome:
            return CommandOutcome(ok=True, status=0, stdout=probe_line + "\n", stderr="")

        collector = CgroupCollector(config, run_stdin=fake_stdin)
        state = CgroupCollectionState()
        records, access = collector.collect_cycle(
            clock=clock,
            collector_session=new_collector_session(),
            kind_nodes=[NODE],
            container_ids_by_node={NODE: [CONTAINER_ID]},
            state=state,
            now_mono_s=100.0,
            kube_probes_permitted=True,
        )
        self.assertEqual(access.value, "ok")
        kinds = [row["kind"] for row in records]
        self.assertIn("cgroup_snapshot", kinds)

    def test_is_valid_cgroup_container_id(self) -> None:
        self.assertTrue(is_valid_cgroup_container_id(CONTAINER_ID))
        self.assertFalse(is_valid_cgroup_container_id("ABC"))
        self.assertFalse(is_valid_cgroup_container_id(CONTAINER_ID.upper()))


class ParseProbeTest(unittest.TestCase):
    def test_parse_malformed_line_gap(self) -> None:
        rows = parse_cgroup_probe_stdout('{"ok":true}\nnot-json\n')
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1]["state"], "gap")


if __name__ == "__main__":
    unittest.main()