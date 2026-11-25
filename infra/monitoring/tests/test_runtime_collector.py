#!/usr/bin/env python3
"""Fixture tests for collector runtime wiring (INF49 T03)."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from collector import (  # noqa: E402
    CollectorConfig,
    FAST_TICK_S,
    MonitoringCollector,
    RuntimeExtensionStatus,
)
from host import build_meminfo_text  # noqa: E402
from processes import FakeProcRoot  # noqa: E402
from records import InjectableClock, build_scope_id  # noqa: E402
from runtime import (  # noqa: E402
    DEV_API_PORT_RANGE,
    RELEASE_API_PORT,
    CommandOutcome,
)
from storage import PRIVATE_DIR_MODE, read_all_complete_records  # noqa: E402

INSTALLATION_ID = "install-runtime-collector"
CONTAINER_ID = "a" * 64


def _pod_item(node_name: str, *, context_marker: str) -> dict[str, Any]:
    return {
        "metadata": {
            "uid": f"pod-{context_marker}",
            "namespace": "default",
        },
        "status": {
            "nodeName": node_name,
            "containerStatuses": [
                {
                    "name": "app",
                    "containerID": f"cri-containerd://{CONTAINER_ID}",
                    "restartCount": 0,
                    "state": {"running": {"startedAt": "2026-01-01T00:00:00Z"}},
                }
            ],
        },
        "spec": {"containers": [{"name": "app"}]},
    }


class RecordingRunner:
    def __init__(self, responses: dict[tuple[str, tuple[str, ...]], CommandOutcome]) -> None:
        self.responses = responses
        self.calls: list[tuple[str, list[str], float]] = []

    def __call__(
        self,
        command: str,
        args: list[str],
        *,
        timeout_s: float = 2.5,
    ) -> CommandOutcome:
        self.calls.append((command, list(args), timeout_s))
        key = (command, tuple(args))
        if key in self.responses:
            return self.responses[key]
        for (cmd, pattern), outcome in self.responses.items():
            if cmd != command:
                continue
            if len(pattern) <= len(args) and args[: len(pattern)] == list(pattern):
                return outcome
        return CommandOutcome(ok=False, status=1, stdout="", stderr="unmocked")


def _stat_line(pid: int, comm: str, *, starttime: int = 42_000, rss: int = 512) -> bytes:
    tail = f"S 1 0 0 0 0 0 0 0 0 100 50 0 0 0 0 0 0 {starttime} 0 {rss}"
    return f"{pid} ({comm}) {tail}\n".encode("utf-8")


def _proc_bundle(pid: int, comm: str) -> dict[str, bytes]:
    return {
        "stat": _stat_line(pid, comm),
        "status": f"VmRSS:\t1000 kB\nVmHWM:\t1000 kB\nThreads:\t1\n".encode(),
        "io": b"read_bytes:\t1\nwrite_bytes:\t2\n",
        "cgroup": b"0::/user.slice\n",
        "cmdline": b"node\x00",
        "exe": b"/usr/bin/node\n",
        "smaps_rollup": b"Pss:\t64 kB\n",
    }


def _kubeconfig_view(context: str, cluster: str, port: int) -> str:
    return json.dumps(
        {
            "current-context": context,
            "contexts": [
                {
                    "name": context,
                    "context": {
                        "cluster": cluster,
                        "user": f"kind-{cluster}",
                        "name": context,
                    },
                }
            ],
            "clusters": [
                {
                    "name": cluster,
                    "cluster": {"server": f"https://127.0.0.1:{port}"},
                }
            ],
        }
    )


def _bootstrap_runner(kube_path: Path) -> RecordingRunner:
    return RecordingRunner(
        {
            ("kind", ("get", "clusters")): CommandOutcome(
                ok=True, status=0, stdout="offscreen-dev\noffscreen-release\n", stderr=""
            ),
            ("kind", ("get", "nodes", "--name", "offscreen-dev")): CommandOutcome(
                ok=True,
                status=0,
                stdout="offscreen-dev-control-plane\noffscreen-dev-worker\n",
                stderr="",
            ),
            ("kind", ("get", "nodes", "--name", "offscreen-release")): CommandOutcome(
                ok=True,
                status=0,
                stdout="offscreen-release-control-plane\noffscreen-release-worker\n",
                stderr="",
            ),
            (
                "docker",
                ("--context", "fixture", "inspect", "--format", "{{.Id}}", "offscreen-dev-control-plane"),
            ): CommandOutcome(
                ok=False, status=1, stdout="", stderr="not used in verify"
            ),
        }
        | {
            (
                "docker",
                (
                    "--context",
                    "fixture",
                    "inspect",
                    "--format",
                    '{{index .Config.Labels "io.x-k8s.kind.cluster"}}',
                    node,
                ),
            ): CommandOutcome(
                ok=True,
                status=0,
                stdout="offscreen-dev\n" if "offscreen-dev" in node else "offscreen-release\n",
                stderr="",
            )
            for node in (
                "offscreen-dev-control-plane",
                "offscreen-dev-worker",
                "offscreen-release-control-plane",
                "offscreen-release-worker",
            )
        }
        | {
            (
                "kubectl",
                (
                    "--kubeconfig",
                    str(kube_path.resolve()),
                    "--context",
                    context,
                    "config",
                    "view",
                    "--minify",
                    "-o",
                    "json",
                ),
            ): CommandOutcome(
                ok=True,
                status=0,
                stdout=_kubeconfig_view(
                    context,
                    f"kind-offscreen-{profile}",
                    DEV_API_PORT_RANGE[0] if profile == "dev" else RELEASE_API_PORT,
                ),
                stderr="",
            )
            for context, profile in (
                ("kind-offscreen-dev", "dev"),
                ("kind-offscreen-release", "release"),
            )
        }
        | {
            (
                "kubectl",
                (
                    "--kubeconfig",
                    str(kube_path.resolve()),
                    "--context",
                    context,
                    "--request-timeout",
                    "3s",
                    "get",
                    "--raw",
                    path,
                ),
            ): CommandOutcome(
                ok=True,
                status=0,
                stdout=json.dumps({"pods": [], "node": {"nodeName": node.split("-control")[0]}}),
                stderr="",
            )
            for context, node in (
                ("kind-offscreen-dev", "offscreen-dev-control-plane"),
                ("kind-offscreen-dev", "offscreen-dev-worker"),
                ("kind-offscreen-release", "offscreen-release-control-plane"),
                ("kind-offscreen-release", "offscreen-release-worker"),
            )
            for path in (
                f"/api/v1/nodes/{node}/proxy/stats/summary",
            )
        }
        | {
            (
                "kubectl",
                (
                    "--kubeconfig",
                    str(kube_path.resolve()),
                    "--context",
                    context,
                    "--request-timeout",
                    "3s",
                    "get",
                    "pods",
                    "-A",
                    "-o",
                    "json",
                ),
            ): CommandOutcome(
                ok=True,
                status=0,
                stdout=json.dumps(
                    {
                        "items": [
                            _pod_item(
                                "offscreen-dev-control-plane",
                                context_marker="dev",
                            )
                        ]
                    }
                    if context == "kind-offscreen-dev"
                    else {
                        "items": [
                            _pod_item(
                                "offscreen-release-control-plane",
                                context_marker="release",
                            )
                        ]
                    }
                ),
                stderr="",
            )
            for context in ("kind-offscreen-dev", "kind-offscreen-release")
        }
        | {
            (
                "kubectl",
                (
                    "--kubeconfig",
                    str(kube_path.resolve()),
                    "--context",
                    context,
                    "--request-timeout",
                    "3s",
                    "get",
                    "events",
                    "-A",
                    "-o",
                    "json",
                ),
            ): CommandOutcome(
                ok=True,
                status=0,
                stdout=json.dumps({"items": [], "metadata": {"resourceVersion": "1"}}),
                stderr="",
            )
            for context in ("kind-offscreen-dev", "kind-offscreen-release")
        }
        | {
            (
                "docker",
                ("--context", "fixture", "ps", "--no-trunc", "--format", "{{.ID}}\t{{.Names}}\t{{.State}}"),
            ): CommandOutcome(ok=True, status=0, stdout="", stderr=""),
        }
    )


class RuntimeCollectorFixtureTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.mkdtemp(prefix="offscreen-runtime-collector-")
        self.state_root = Path(self._tmpdir)
        self.state_root.chmod(PRIVATE_DIR_MODE)
        self.kube_path = self.state_root / "kubeconfig.json"
        self.kube_path.write_text("{}", encoding="utf-8")

    def _collector(
        self,
        *,
        runner: RecordingRunner | None = None,
        mem_kib: int = 8_000_000,
        max_ticks: int = 800,
        mono_step_s: float = FAST_TICK_S,
    ) -> tuple[MonitoringCollector, Path]:
        fake_clock = _FakeClock()
        runner = runner or _bootstrap_runner(self.kube_path)
        config = CollectorConfig(
            installation_id=INSTALLATION_ID,
            state_root=str(self.state_root),
            docker_context="fixture",
            kubeconfig_path=str(self.kube_path),
        )
        collector = MonitoringCollector(
            config,
            clock=fake_clock.clock(),
            proc=FakeProcRoot({1000: _proc_bundle(1000, "node")}),
            store=__import__("storage").RecordStore(
                str(self.state_root),
                build_scope_id(INSTALLATION_ID, fake_clock.boot_id),
                fake_clock.clock(),
                create_root=True,
            ),
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": mem_kib}),
            read_self_status=lambda: "VmRSS:\t2048 kB\n",
            read_boot_text=lambda: "boot-runtime-collector\n",
            sleep=lambda _: fake_clock.advance(mono_step_s),
            mono=lambda: fake_clock._mono_ns / 1e9,
            collector_pid=4242,
            runtime_command_runner=runner,
        )
        collector.run_until(max_ticks=max_ticks)
        return collector, self.state_root

    def test_empty_runtime_paths_unsupported(self) -> None:
        config = CollectorConfig(
            installation_id=INSTALLATION_ID,
            state_root=str(self.state_root),
            docker_context="",
            kubeconfig_path="",
        )
        fake_clock = _FakeClock()
        collector = MonitoringCollector(
            config,
            clock=fake_clock.clock(),
            proc=FakeProcRoot({}),
            store=__import__("storage").RecordStore(
                str(self.state_root),
                build_scope_id(INSTALLATION_ID, fake_clock.boot_id),
                fake_clock.clock(),
                create_root=True,
            ),
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": 8_000_000}),
            read_self_status=lambda: "VmRSS:\t2048 kB\n",
            read_boot_text=lambda: "boot\n",
            sleep=lambda _: fake_clock.advance(FAST_TICK_S),
            mono=lambda: fake_clock._mono_ns / 1e9,
            collector_pid=1,
        )
        self.assertEqual(collector.state.runtime_status, RuntimeExtensionStatus.UNSUPPORTED)
        self.assertFalse(list(self.state_root.glob("runtime-*.jsonl")))

    def test_fixture_emits_runtime_records_across_contexts(self) -> None:
        _, state_root = self._collector()
        runtime_paths = list(state_root.glob("runtime-*.jsonl"))
        self.assertTrue(runtime_paths)
        records = [
            record
            for path in runtime_paths
            for record in read_all_complete_records(path)
        ]
        scope_ids = {record.get("scopeId") for record in records}
        self.assertTrue(
            any("kind-offscreen-dev" in sid for sid in scope_ids if isinstance(sid, str))
        )
        self.assertTrue(
            any("kind-offscreen-release" in sid for sid in scope_ids if isinstance(sid, str))
        )
        kinds = {record.get("kind") for record in records}
        self.assertIn("coverage", kinds)
        sources = {record.get("source") for record in records}
        self.assertTrue(any(str(source).startswith("runtime.") for source in sources))

    def test_invalid_kube_identity_refuses_probes(self) -> None:
        bad_path = self.state_root / "kube-bad.json"
        bad_path.write_text("{}", encoding="utf-8")
        runner = _bootstrap_runner(bad_path)
        # Release context on wrong loopback port for dev profile verification path.
        runner.responses[
            (
                "kubectl",
                (
                    "--kubeconfig",
                    str(bad_path.resolve()),
                    "--context",
                    "kind-offscreen-dev",
                    "config",
                    "view",
                    "--minify",
                    "-o",
                    "json",
                ),
            )
        ] = CommandOutcome(
            ok=True,
            status=0,
            stdout=_kubeconfig_view(
                "kind-offscreen-dev", "kind-offscreen-dev", RELEASE_API_PORT
            ),
            stderr="",
        )
        _, state_root = self._collector(runner=runner, max_ticks=400)
        runtime_paths = list(state_root.glob("runtime-*.jsonl"))
        records = [
            record
            for path in runtime_paths
            for record in read_all_complete_records(path)
        ]
        refused = [
            record
            for record in records
            if record.get("kind") == "coverage"
            and record.get("coverage", {}).get("kubeAccessState") == "refused"
        ]
        self.assertTrue(refused)

    def test_low_memory_suspends_runtime_cgroup(self) -> None:
        _, state_root = self._collector(mem_kib=500_000, max_ticks=1200)
        event_paths = list(state_root.glob("events-*.jsonl"))
        suspended = False
        for path in event_paths:
            for record in read_all_complete_records(path):
                coverage = record.get("coverage", {})
                if coverage.get("runtimeCgroupSuspended"):
                    suspended = True
        self.assertTrue(suspended)

    def test_slow_runtime_does_not_stall_fast_sampler(self) -> None:
        fake_clock = _FakeClock()
        config = CollectorConfig(
            installation_id=INSTALLATION_ID,
            state_root=str(self.state_root),
            docker_context="fixture",
            kubeconfig_path=str(self.kube_path),
        )
        runner = _bootstrap_runner(self.kube_path)
        collector = MonitoringCollector(
            config,
            clock=fake_clock.clock(),
            proc=FakeProcRoot({1001: _proc_bundle(1001, "node")}),
            store=__import__("storage").RecordStore(
                str(self.state_root),
                build_scope_id(INSTALLATION_ID, fake_clock.boot_id),
                fake_clock.clock(),
                create_root=True,
            ),
            read_meminfo=lambda: build_meminfo_text({"MemAvailable": 8_000_000}),
            read_self_status=lambda: "VmRSS:\t1024 kB\n",
            read_boot_text=lambda: "boot-runtime-collector\n",
            sleep=lambda _: fake_clock.advance(FAST_TICK_S),
            mono=lambda: fake_clock._mono_ns / 1e9,
            collector_pid=9001,
            runtime_command_runner=runner,
        )

        def slow_docker() -> None:
            fake_clock.advance(2.0)
            collector._run_runtime_docker()

        for worker in collector._workers:
            if worker.name == "runtime-docker":
                worker.callback = slow_docker  # type: ignore[method-assign]
        collector.run_until(max_ticks=400)
        fast_paths = list(self.state_root.glob("fast-raw-*.jsonl"))
        self.assertTrue(fast_paths)
        host_windows = [
            record
            for path in fast_paths
            for record in read_all_complete_records(path)
            if record.get("source") == "host-fast-meminfo"
        ]
        self.assertGreater(len(host_windows), 2)


class _FakeClock:
    def __init__(self) -> None:
        self._mono_ns = 0
        self.boot_id = "boot-runtime-collector"

    def advance(self, seconds: float) -> None:
        self._mono_ns += int(seconds * 1_000_000_000)

    def clock(self) -> InjectableClock:
        return InjectableClock(
            boot_id=self.boot_id,
            wall_seconds=lambda: 1_764_000_000.0 + self._mono_ns / 1e9,
            monotonic_ns=lambda: self._mono_ns,
        )


if __name__ == "__main__":
    unittest.main()