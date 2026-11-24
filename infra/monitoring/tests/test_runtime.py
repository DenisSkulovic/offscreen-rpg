#!/usr/bin/env python3
"""Unit tests for explicit local runtime discovery and docker snapshots (INF45 T01)."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

MONITORING_ROOT = Path(__file__).resolve().parents[1]
if str(MONITORING_ROOT) not in sys.path:
    sys.path.insert(0, str(MONITORING_ROOT))

from records import InjectableClock, encode_record, new_collector_session  # noqa: E402
from runtime import (  # noqa: E402
    ALLOWED_KUBE_CONTEXTS,
    DEV_API_PORT_RANGE,
    DockerAccessState,
    DockerSnapshotCollector,
    KubeProbeState,
    RELEASE_API_PORT,
    RuntimeConfig,
    CommandOutcome,
    count_kubectl_probes,
    discover_kind_inventory,
    parse_byte_quantity,
    parse_docker_mem_usage_pair,
    parse_docker_stats_json,
    verify_kubeconfig_identity,
    verify_local_runtime,
    FORBIDDEN_PERSISTENCE_KEYS,
)

INSTALLATION_ID = "install-runtime-test"
FULL_ID_A = "a" * 64
FULL_ID_B = "b" * 64
SHORT_A = FULL_ID_A[:12]
SHORT_B = FULL_ID_B[:12]


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


def _kubeconfig_view(context: str, cluster: str, port: int) -> str:
    return json.dumps(
        {
            "current-context": context,
            "contexts": [
                {
                    "name": context,
                    "context": {"cluster": cluster, "user": f"kind-{cluster}", "name": context},
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


def _dev_config(kube_path: Path, *, context: str = "kind-offscreen-dev") -> RuntimeConfig:
    return RuntimeConfig(
        docker_context="default",
        kubeconfig_path=str(kube_path),
        kube_context=context,
        installation_id=INSTALLATION_ID,
        boot_id="boot-runtime",
    )


def _kind_bootstrap_runner(
    kube_path: Path,
    *,
    port: int = DEV_API_PORT_RANGE[0],
    context: str = "kind-offscreen-dev",
    cluster_name: str = "offscreen-dev",
    docker_label: str = "offscreen-dev",
) -> RecordingRunner:
    kube_cluster = f"kind-{cluster_name}"
    nodes = f"{cluster_name}-control-plane\n{cluster_name}-worker\n"
    return RecordingRunner(
        {
            ("kind", ("get", "clusters")): CommandOutcome(
                ok=True, status=0, stdout=f"{cluster_name}\n", stderr=""
            ),
            ("kind", ("get", "nodes", "--name", cluster_name)): CommandOutcome(
                ok=True, status=0, stdout=nodes, stderr=""
            ),
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
                stdout=_kubeconfig_view(context, kube_cluster, port),
                stderr="",
            ),
        }
    )


class ParseUnitsTest(unittest.TestCase):
    def test_iec_kib_mib_gib(self) -> None:
        self.assertEqual(parse_byte_quantity("512 KiB"), 512 * 1024)
        self.assertEqual(parse_byte_quantity("1.5 MiB"), int(1.5 * 1024 * 1024))
        self.assertEqual(parse_byte_quantity("2 GiB"), 2 * 1024**3)

    def test_si_kb_mb(self) -> None:
        self.assertEqual(parse_byte_quantity("100 kB"), 100_000)
        self.assertEqual(parse_byte_quantity("1 MB"), 1_000_000)

    def test_mem_usage_pair(self) -> None:
        used, limit = parse_docker_mem_usage_pair("100 MiB / 1 GiB")
        self.assertEqual(used, 100 * 1024 * 1024)
        self.assertEqual(limit, 1024 * 1024 * 1024)

    def test_cache_subtracted_working_set(self) -> None:
        metrics = parse_docker_stats_json(
            {"MemUsage": "300 MiB / 1 GiB", "Cache": "50 MiB", "PIDs": "3"}
        )
        self.assertEqual(metrics["memUsageUsedBytes"], 300 * 1024 * 1024)
        self.assertEqual(metrics["memCacheBytes"], 50 * 1024 * 1024)
        self.assertEqual(metrics["memWorkingSetBytes"], 250 * 1024 * 1024)


class VerifyKubeconfigTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(__file__).resolve().parent / "_fixture_kubeconfig_dev.json"
        self.tmp.write_text("{}", encoding="utf-8")

    def tearDown(self) -> None:
        if self.tmp.exists():
            self.tmp.unlink()

    def test_exact_context_and_dev_port(self) -> None:
        runner = _kind_bootstrap_runner(self.tmp, port=24_500)
        config = _dev_config(self.tmp)
        ok, port, gap = verify_kubeconfig_identity(config, runner)
        self.assertTrue(ok)
        self.assertEqual(port, 24_500)
        self.assertEqual(gap, "")
        joined = " ".join(arg for _, args, _ in runner.calls for arg in args)
        self.assertIn(str(self.tmp.resolve()), joined)
        self.assertIn("kind-offscreen-dev", joined)

    def test_context_mismatch_blocks_kube_verification(self) -> None:
        runner = _kind_bootstrap_runner(self.tmp, port=24_500)
        config = _dev_config(self.tmp, context="kind-wrong")
        ok, _, gap = verify_kubeconfig_identity(config, runner)
        self.assertFalse(ok)
        self.assertIn("allowlist", gap)

    def test_release_port_enforced(self) -> None:
        runner = _kind_bootstrap_runner(
            self.tmp,
            port=RELEASE_API_PORT,
            context="kind-offscreen-release",
            cluster_name="offscreen-release",
        )
        config = RuntimeConfig(
            docker_context="default",
            kubeconfig_path=str(self.tmp),
            kube_context="kind-offscreen-release",
            installation_id=INSTALLATION_ID,
        )
        ok, port, _ = verify_kubeconfig_identity(config, runner)
        self.assertTrue(ok)
        self.assertEqual(port, RELEASE_API_PORT)

    def test_dev_refuses_release_port(self) -> None:
        runner = _kind_bootstrap_runner(self.tmp, port=RELEASE_API_PORT)
        config = _dev_config(self.tmp)
        ok, _, gap = verify_kubeconfig_identity(config, runner)
        self.assertFalse(ok)
        self.assertIn("release loopback port", gap)


class DiscoverKindTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(__file__).resolve().parent / "_fixture_kubeconfig_dev.json"
        self.tmp.write_text("{}", encoding="utf-8")

    def tearDown(self) -> None:
        if self.tmp.exists():
            self.tmp.unlink()

    def test_kind_nodes_and_docker_label(self) -> None:
        from runtime import KIND_PROFILE_BY_CONTEXT

        profile = KIND_PROFILE_BY_CONTEXT["kind-offscreen-dev"]
        runner = _kind_bootstrap_runner(self.tmp)

        def combined_runner(
            command: str,
            args: list[str],
            *,
            timeout_s: float = 2.5,
        ) -> CommandOutcome:
            if command == "docker" and "inspect" in args:
                runner.calls.append((command, list(args), timeout_s))
                return CommandOutcome(ok=True, status=0, stdout="offscreen-dev\n", stderr="")
            return runner(command, args, timeout_s=timeout_s)

        nodes, gap = discover_kind_inventory(profile, combined_runner, docker_context="default")
        self.assertEqual(gap, "")
        self.assertEqual(
            nodes,
            ["offscreen-dev-control-plane", "offscreen-dev-worker"],
        )


class DockerSnapshotTest(unittest.TestCase):
    def setUp(self) -> None:
        self.clock = InjectableClock(boot_id="boot-runtime", monotonic_ns=lambda: 9_000_000)

    def _inspect_line(self, full_id: str, name: str) -> str:
        return f"{full_id}\t/{name}\t2026-01-01T00:00:00.000000000Z\trunning\timg:tag\n"

    def _stats_line(self, used: str, cache: str = "") -> str:
        payload = {"MemUsage": f"{used} / 2 GiB", "CPUPerc": "1.23%", "PIDs": "2"}
        if cache:
            payload["Cache"] = cache
        return json.dumps(payload)

    def test_happy_path_records_without_secrets(self) -> None:
        responses: dict[tuple[str, tuple[str, ...]], CommandOutcome] = {}
        responses[("docker", ("--context", "default", "ps", "--no-trunc", "--format"))] = (
            CommandOutcome(
                ok=True,
                status=0,
                stdout=f"{SHORT_A}\tfoo\trunning\n",
                stderr="",
            )
        )

        def runner(command: str, args: list[str], *, timeout_s: float = 2.5) -> CommandOutcome:
            if command == "docker" and args[:3] == ["--context", "default", "ps"]:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=f"{SHORT_A}\tfoo\trunning\n",
                    stderr="",
                )
            if command == "docker" and "inspect" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=self._inspect_line(FULL_ID_A, "foo"),
                    stderr="",
                )
            if command == "docker" and "stats" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=self._stats_line("100 MiB", "10 MiB") + "\n",
                    stderr="",
                )
            return CommandOutcome(ok=False, status=1, stdout="", stderr="")

        config = RuntimeConfig(
            docker_context="default",
            kubeconfig_path="/tmp/unused-kubeconfig",
            kube_context="kind-offscreen-dev",
            installation_id=INSTALLATION_ID,
        )
        collector = DockerSnapshotCollector(config, run=runner)
        records, _, state, kube_state = collector.collect_snapshots(
            clock=self.clock,
            collector_session=new_collector_session(),
            sequence_start=0,
            kube_verified=True,
        )
        self.assertEqual(state, DockerAccessState.OK)
        self.assertEqual(kube_state, KubeProbeState.VERIFIED)
        snapshot = next(r for r in records if r["kind"] == "docker_snapshot")
        self.assertEqual(snapshot["docker"]["containerId"], FULL_ID_A)
        self.assertEqual(snapshot["stats"]["memWorkingSetBytes"], 90 * 1024 * 1024)
        encode_record(snapshot)
        for forbidden in FORBIDDEN_PERSISTENCE_KEYS:
            self.assertNotIn(forbidden, json.dumps(snapshot))

    def test_docker_absent(self) -> None:
        def runner(command: str, args: list[str], *, timeout_s: float = 2.5) -> CommandOutcome:
            return CommandOutcome(ok=False, status=None, stdout="", stderr="", missing=True)

        config = _dev_config(Path("/tmp/kubeconfig-missing"))
        collector = DockerSnapshotCollector(config, run=runner)
        records, _, state, _ = collector.collect_snapshots(
            clock=self.clock,
            collector_session=new_collector_session(),
            sequence_start=0,
            kube_verified=False,
        )
        self.assertEqual(state, DockerAccessState.DAEMON_ABSENT)
        self.assertEqual(records[0]["coverage"]["dockerAccessState"], "daemon_absent")

    def test_malformed_ps_row_partial_coverage(self) -> None:
        def runner(command: str, args: list[str], *, timeout_s: float = 2.5) -> CommandOutcome:
            if "ps" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=f"not-an-id\tfoo\trunning\n",
                    stderr="",
                )
            return CommandOutcome(ok=False, status=1, stdout="", stderr="")

        collector = DockerSnapshotCollector(_dev_config(Path("/tmp/k")), run=runner)
        records, _, state, _ = collector.collect_snapshots(
            clock=self.clock,
            collector_session=new_collector_session(),
            sequence_start=0,
            kube_verified=True,
        )
        self.assertEqual(state, DockerAccessState.NO_CONTAINERS)

    def test_missing_inspect_partial_response(self) -> None:
        def runner(command: str, args: list[str], *, timeout_s: float = 2.5) -> CommandOutcome:
            if "ps" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=f"{SHORT_A}\tfoo\trunning\n",
                    stderr="",
                )
            if "inspect" in args:
                return CommandOutcome(ok=False, status=1, stdout="", stderr="denied")
            return CommandOutcome(ok=False, status=1, stdout="", stderr="")

        collector = DockerSnapshotCollector(_dev_config(Path("/tmp/k")), run=runner)
        records, _, state, _ = collector.collect_snapshots(
            clock=self.clock,
            collector_session=new_collector_session(),
            sequence_start=0,
            kube_verified=True,
        )
        self.assertEqual(state, DockerAccessState.OK)
        self.assertTrue(any(r.get("coverage", {}).get("partialDockerSnapshot") for r in records))

    def test_duplicate_names_flagged(self) -> None:
        def runner(command: str, args: list[str], *, timeout_s: float = 2.5) -> CommandOutcome:
            if "ps" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=f"{SHORT_A}\tsame\trunning\n{SHORT_B}\tsame\trunning\n",
                    stderr="",
                )
            if "inspect" in args and SHORT_A in args[-1]:
                return CommandOutcome(
                    ok=True, status=0, stdout=self._inspect_line(FULL_ID_A, "same"), stderr=""
                )
            if "inspect" in args:
                return CommandOutcome(
                    ok=True, status=0, stdout=self._inspect_line(FULL_ID_B, "same"), stderr=""
                )
            if "stats" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=self._stats_line("10 MiB") + "\n",
                    stderr="",
                )
            return CommandOutcome(ok=False, status=1, stdout="", stderr="")

        collector = DockerSnapshotCollector(_dev_config(Path("/tmp/k")), run=runner)
        records, _, _, _ = collector.collect_snapshots(
            clock=self.clock,
            collector_session=new_collector_session(),
            sequence_start=0,
            kube_verified=True,
        )
        snapshots = [r for r in records if r["kind"] == "docker_snapshot"]
        self.assertEqual(len(snapshots), 2)
        self.assertTrue(all(s["docker"]["duplicateName"] for s in snapshots))

    def test_stale_identity_when_started_at_changes(self) -> None:
        def runner(command: str, args: list[str], *, timeout_s: float = 2.5) -> CommandOutcome:
            if "ps" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=f"{SHORT_A}\tfoo\trunning\n",
                    stderr="",
                )
            if "inspect" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=self._inspect_line(FULL_ID_A, "foo"),
                    stderr="",
                )
            if "stats" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=self._stats_line("10 MiB") + "\n",
                    stderr="",
                )
            return CommandOutcome(ok=False, status=1, stdout="", stderr="")

        collector = DockerSnapshotCollector(_dev_config(Path("/tmp/k")), run=runner)
        records, _, _, _ = collector.collect_snapshots(
            clock=self.clock,
            collector_session=new_collector_session(),
            sequence_start=0,
            kube_verified=True,
            prior_container_started_at={FULL_ID_A: "2025-01-01T00:00:00Z"},
        )
        snapshot = next(r for r in records if r["kind"] == "docker_snapshot")
        self.assertTrue(snapshot["docker"]["staleIdentity"])


class VerifyLocalRuntimeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(__file__).resolve().parent / "_fixture_kubeconfig_verify.json"
        self.tmp.write_text("{}", encoding="utf-8")

    def tearDown(self) -> None:
        if self.tmp.exists():
            self.tmp.unlink()

    def test_context_mismatch_zero_kube_probes(self) -> None:
        runner = RecordingRunner({})
        config = _dev_config(self.tmp, context="kind-foreign-context")
        report = verify_local_runtime(config, runner)
        self.assertFalse(report["kubeProbesPermitted"])
        self.assertIn("allowlist", report["gaps"][0])
        self.assertEqual(count_kubectl_probes(runner.calls), 0)

    def test_verified_runtime_permits_kube(self) -> None:
        runner = _kind_bootstrap_runner(self.tmp, port=24_444)

        def combined_runner(
            command: str,
            args: list[str],
            *,
            timeout_s: float = 2.5,
        ) -> CommandOutcome:
            if command == "docker" and "inspect" in args:
                runner.calls.append((command, list(args), timeout_s))
                return CommandOutcome(ok=True, status=0, stdout="offscreen-dev\n", stderr="")
            return runner(command, args, timeout_s=timeout_s)

        config = _dev_config(self.tmp)
        report = verify_local_runtime(config, combined_runner)
        self.assertTrue(report["kubeProbesPermitted"])
        self.assertEqual(report["apiServerPort"], 24_444)
        self.assertEqual(count_kubectl_probes(runner.calls), 0)

    def test_allowlist_exact_contexts(self) -> None:
        self.assertEqual(
            ALLOWED_KUBE_CONTEXTS,
            frozenset({"kind-offscreen-dev", "kind-offscreen-release"}),
        )


if __name__ == "__main__":
    unittest.main()