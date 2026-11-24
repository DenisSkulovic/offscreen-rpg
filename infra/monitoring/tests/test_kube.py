#!/usr/bin/env python3
"""Unit tests for kubelet summaries, pod identity, and bounded events (INF45 T02)."""

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
    DEV_API_PORT_RANGE,
    RELEASE_API_PORT,
    CommandOutcome,
    RuntimeConfig,
)
from kube import (  # noqa: E402
    EventWatchState,
    KubeAccessState,
    KubeCollectionState,
    KubeCollector,
    assert_kubectl_read_only,
    fetch_kubelet_summary,
    parse_allowlisted_event,
    parse_kubelet_summary,
    parse_pod_list,
    advance_event_watch,
    refuse_cross_target,
)

INSTALLATION_ID = "install-kube-test"
POD_UID_A = "11111111-2222-3333-4444-555555555555"
POD_UID_B = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
CONTAINER_ID = "c" * 64


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
        boot_id="boot-kube",
    )


def _summary_payload(*, cpu_time: str, pod_uid: str = POD_UID_A) -> str:
    return json.dumps(
        {
            "node": {
                "nodeName": "offscreen-dev-control-plane",
                "cpu": {
                    "time": cpu_time,
                    "usageNanoCores": 1000,
                    "usageCoreNanoSeconds": 999,
                },
                "memory": {
                    "time": cpu_time,
                    "usageBytes": 100,
                    "workingSetBytes": 80,
                    "rssBytes": 70,
                },
                "psi": {
                    "memory": {"some": {"avg10": 0.1, "total": 5}},
                },
            },
            "pods": [
                {
                    "podRef": {"name": "web", "namespace": "offscreen-dev-1", "uid": pod_uid},
                    "cpu": {"time": cpu_time, "usageNanoCores": 50},
                    "memory": {"time": cpu_time, "usageBytes": 10, "workingSetBytes": 8},
                    "ephemeral-storage": {"time": cpu_time, "usedBytes": 1},
                    "psi": {"cpu": {"some": {"avg10": 0.01}}},
                    "unknownField": {"ignore": True},
                    "containers": [
                        {
                            "name": "app",
                            "cpu": {"time": cpu_time, "usageCoreNanoSeconds": 12},
                            "memory": {"time": cpu_time, "rssBytes": 4},
                            "rootfs": {"time": cpu_time, "usedBytes": 2},
                            "network": {"eth0": {"rxBytes": 3, "txBytes": 4}},
                        }
                    ],
                }
            ],
        }
    )


def _pod_list_payload(uid: str = POD_UID_A, *, restart: int = 0) -> str:
    return json.dumps(
        {
            "items": [
                {
                    "metadata": {
                        "namespace": "offscreen-dev-1",
                        "uid": uid,
                        "labels": {"app": "game-web", "noise": "ignored"},
                        "ownerReferences": [
                            {
                                "apiVersion": "apps/v1",
                                "kind": "ReplicaSet",
                                "name": "web-rs",
                                "uid": "owner-uid-1",
                            }
                        ],
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": "app",
                                "resources": {
                                    "requests": {"cpu": "100m", "memory": "128Mi"},
                                    "limits": {"cpu": "500m", "memory": "512Mi"},
                                },
                            }
                        ]
                    },
                    "status": {
                        "containerStatuses": [
                            {
                                "name": "app",
                                "containerID": f"cri-containerd://{CONTAINER_ID}",
                                "restartCount": restart,
                                "state": {
                                    "running": {"startedAt": "2026-01-02T00:00:00Z"},
                                },
                            }
                        ]
                    },
                    "extraTopLevel": "dropped",
                }
            ]
        }
    )


def _config_view_args(kube_path: str, context: str = "kind-offscreen-dev") -> tuple[str, tuple[str, ...]]:
    return (
        "kubectl",
        (
            "--kubeconfig",
            kube_path,
            "--context",
            context,
            "config",
            "view",
            "--minify",
            "-o",
            "json",
        ),
    )


def _events_payload(*, resource_version: str = "100", uid: str = "evt-1") -> str:
    return json.dumps(
        {
            "metadata": {"resourceVersion": resource_version},
            "items": [
                {
                    "metadata": {
                        "uid": uid,
                        "resourceVersion": resource_version,
                        "creationTimestamp": "2026-01-01T00:00:00Z",
                    },
                    "involvedObject": {
                        "kind": "Pod",
                        "namespace": "offscreen-dev-1",
                        "name": "web",
                        "uid": POD_UID_A,
                    },
                    "reason": "Started",
                    "message": "should never persist",
                    "type": "Normal",
                    "count": 2,
                    "lastTimestamp": "2026-01-01T00:00:01Z",
                }
            ],
        }
    )


class ParseKubeletTest(unittest.TestCase):
    def test_unknown_fields_ignored(self) -> None:
        body = json.loads(_summary_payload(cpu_time="2026-01-01T00:00:05Z"))
        entities = parse_kubelet_summary(body)
        self.assertTrue(any(e["metricsScope"] == "container" for e in entities))
        self.assertTrue(all("unknownField" not in json.dumps(e) for e in entities))

    def test_parent_child_not_additive(self) -> None:
        body = json.loads(_summary_payload(cpu_time="2026-01-01T00:00:05Z"))
        entities = parse_kubelet_summary(body)
        pod = next(e for e in entities if e["metricsScope"] == "pod")
        container = next(e for e in entities if e["metricsScope"] == "container")
        self.assertFalse(pod.get("metricsAdditive", True))
        self.assertFalse(container.get("metricsAdditive", True))


class StaleSourceTimeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(__file__).resolve().parent / "_fixture_kube_kubeconfig.json"
        self.tmp.write_text("{}", encoding="utf-8")
        self.clock = InjectableClock(boot_id="boot-kube", monotonic_ns=lambda: 50_000_000)

    def tearDown(self) -> None:
        if self.tmp.exists():
            self.tmp.unlink()

    def test_repeated_kubelet_timestamp_marked_stale(self) -> None:
        kube_path = str(self.tmp.resolve())
        summary_time = "2026-01-01T00:00:05Z"
        summary_args = (
            "kubectl",
            (
                "--kubeconfig",
                kube_path,
                "--context",
                "kind-offscreen-dev",
                "--request-timeout",
                "3s",
                "get",
                "--raw",
                "/api/v1/nodes/offscreen-dev-control-plane/proxy/stats/summary",
            ),
        )
        pods_args = (
            "kubectl",
            (
                "--kubeconfig",
                kube_path,
                "--context",
                "kind-offscreen-dev",
                "--request-timeout",
                "3s",
                "get",
                "pods",
                "-A",
                "-o",
                "json",
            ),
        )
        events_args = (
            "kubectl",
            (
                "--kubeconfig",
                kube_path,
                "--context",
                "kind-offscreen-dev",
                "--request-timeout",
                "3s",
                "get",
                "events",
                "-A",
                "-o",
                "json",
            ),
        )
        runner = RecordingRunner(
            {
                summary_args: CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=_summary_payload(cpu_time=summary_time),
                    stderr="",
                ),
                pods_args: CommandOutcome(
                    ok=True, status=0, stdout=_pod_list_payload(), stderr=""
                ),
                events_args: CommandOutcome(
                    ok=True, status=0, stdout=_events_payload(), stderr=""
                ),
                _config_view_args(kube_path): CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=_kubeconfig_view(
                        "kind-offscreen-dev", "kind-offscreen-dev", DEV_API_PORT_RANGE[0]
                    ),
                    stderr="",
                ),
            }
        )
        config = _dev_config(self.tmp)
        collector = KubeCollector(config, run=runner)
        state = KubeCollectionState()
        records1, _ = collector.collect_cycle(
            clock=self.clock,
            collector_session=new_collector_session(),
            kind_nodes=["offscreen-dev-control-plane"],
            kube_probes_permitted=True,
            state=state,
            now_mono_s=100.0,
        )
        records2, _ = collector.collect_cycle(
            clock=self.clock,
            collector_session=new_collector_session(),
            kind_nodes=["offscreen-dev-control-plane"],
            kube_probes_permitted=True,
            state=state,
            now_mono_s=200.0,
        )
        kubelet1 = next(
            r for r in records1 if r.get("source") == "runtime.kubelet" and r["kubelet"].get("metricsScope") == "container"
        )
        kubelet2 = next(
            r for r in records2 if r.get("source") == "runtime.kubelet" and r["kubelet"].get("metricsScope") == "container"
        )
        self.assertFalse(kubelet1["kubelet"]["staleSourceTime"])
        self.assertTrue(kubelet2["kubelet"]["staleSourceTime"])
        self.assertEqual(kubelet1["kubelet"]["sourceTime"], summary_time)


class PodIdentityTest(unittest.TestCase):
    def test_restart_count_and_known_role(self) -> None:
        body = json.loads(_pod_list_payload(restart=3))
        pods = parse_pod_list(body)
        self.assertEqual(len(pods), 1)
        self.assertEqual(pods[0]["appRole"], "game-web")
        self.assertEqual(pods[0]["containers"][0]["restartCount"], 3)
        self.assertEqual(pods[0]["containers"][0]["containerId"], CONTAINER_ID)
        self.assertEqual(pods[0]["joinKey"]["podUid"], POD_UID_A)

    def test_new_uid_after_restart(self) -> None:
        first = parse_pod_list(json.loads(_pod_list_payload(POD_UID_A)))[0]
        second = parse_pod_list(json.loads(_pod_list_payload(POD_UID_B, restart=0)))[0]
        self.assertNotEqual(first["podUid"], second["podUid"])
        self.assertEqual(first["owner"]["uid"], second["owner"]["uid"])


class EventTest(unittest.TestCase):
    def test_allowlisted_fields_only(self) -> None:
        item = json.loads(_events_payload())["items"][0]
        parsed = parse_allowlisted_event(item)
        assert parsed is not None
        self.assertNotIn("message", parsed)
        encode_record(
            {
                "schemaVersion": 1,
                "kind": "operation",
                "collectorSession": new_collector_session(),
                "source": "runtime.kube.events",
                "scopeId": "scope",
                "observedAt": "2026-01-01T00:00:00Z",
                "monotonicNs": "1",
                "sequence": 1,
                "units": {"count": "count"},
                "event": {
                    "objectUid": parsed["objectUid"],
                    "type": parsed["type"],
                    "reason": parsed["reason"],
                    "time": parsed["time"],
                    "count": parsed["count"],
                },
            }
        )

    def test_dedup_uid_and_resource_version(self) -> None:
        self.tmp = Path(__file__).resolve().parent / "_fixture_kube_events.json"
        self.tmp.write_text("{}", encoding="utf-8")
        kube_path = str(self.tmp.resolve())
        list_args = (
            "kubectl",
            (
                "--kubeconfig",
                kube_path,
                "--context",
                "kind-offscreen-dev",
                "--request-timeout",
                "3s",
                "get",
                "events",
                "-A",
                "-o",
                "json",
            ),
        )
        runner = RecordingRunner(
            {
                list_args: CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=_events_payload(resource_version="200"),
                    stderr="",
                ),
            }
        )
        config = _dev_config(self.tmp)
        state = EventWatchState()
        first, _ = advance_event_watch(config, runner, state)
        second, _ = advance_event_watch(config, runner, state)
        self.assertEqual(len(first), 1)
        self.assertEqual(len(second), 0)

    def tearDown(self) -> None:
        path = Path(__file__).resolve().parent / "_fixture_kube_events.json"
        if path.exists():
            path.unlink()


class FailurePathTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(__file__).resolve().parent / "_fixture_kube_fail.json"
        self.tmp.write_text("{}", encoding="utf-8")
        self.clock = InjectableClock(boot_id="boot-kube", monotonic_ns=lambda: 1)

    def tearDown(self) -> None:
        if self.tmp.exists():
            self.tmp.unlink()

    def test_kubelet_403_coverage(self) -> None:
        kube_path = str(self.tmp.resolve())
        key = (
            "kubectl",
            (
                "--kubeconfig",
                kube_path,
                "--context",
                "kind-offscreen-dev",
                "--request-timeout",
                "3s",
                "get",
                "--raw",
                "/api/v1/nodes/offscreen-dev-control-plane/proxy/stats/summary",
            ),
        )
        runner = RecordingRunner(
            {
                key: CommandOutcome(ok=False, status=403, stdout="", stderr="forbidden"),
                (
                    "kubectl",
                    (
                        "--kubeconfig",
                        kube_path,
                        "--context",
                        "kind-offscreen-dev",
                        "--request-timeout",
                        "3s",
                        "get",
                        "pods",
                        "-A",
                        "-o",
                        "json",
                    ),
                ): CommandOutcome(ok=True, status=0, stdout=_pod_list_payload(), stderr=""),
                (
                    "kubectl",
                    (
                        "--kubeconfig",
                        kube_path,
                        "--context",
                        "kind-offscreen-dev",
                        "--request-timeout",
                        "3s",
                        "get",
                        "events",
                        "-A",
                        "-o",
                        "json",
                    ),
                ): CommandOutcome(ok=True, status=0, stdout=_events_payload(), stderr=""),
                _config_view_args(kube_path): CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=_kubeconfig_view(
                        "kind-offscreen-dev", "kind-offscreen-dev", DEV_API_PORT_RANGE[0]
                    ),
                    stderr="",
                ),
            }
        )
        config = _dev_config(self.tmp)
        collector = KubeCollector(config, run=runner)
        records, access = collector.collect_cycle(
            clock=self.clock,
            collector_session=new_collector_session(),
            kind_nodes=["offscreen-dev-control-plane"],
            kube_probes_permitted=True,
            state=KubeCollectionState(),
            now_mono_s=500.0,
        )
        self.assertEqual(access, KubeAccessState.DENIED)
        self.assertTrue(any(r["kind"] == "coverage" for r in records))

    def test_events_410_relist_gap(self) -> None:
        kube_path = str(self.tmp.resolve())
        events_key = (
            "kubectl",
            (
                "--kubeconfig",
                kube_path,
                "--context",
                "kind-offscreen-dev",
                "--request-timeout",
                "3s",
                "get",
                "events",
                "-A",
                "-o",
                "json",
            ),
        )
        runner = RecordingRunner(
            {
                events_key: CommandOutcome(
                    ok=False,
                    status=410,
                    stdout="",
                    stderr="too old resource version: expired",
                ),
            }
        )
        config = _dev_config(self.tmp)
        state = EventWatchState()
        events, gaps = advance_event_watch(config, runner, state)
        self.assertEqual(events, [])
        self.assertTrue(any("expired" in g.lower() or "relist" in g.lower() for g in gaps))

    def test_timeout_on_summary(self) -> None:
        config = _dev_config(self.tmp)

        def runner(command: str, args: list[str], *, timeout_s: float = 2.5) -> CommandOutcome:
            if "--raw" in args:
                return CommandOutcome(
                    ok=False,
                    status=None,
                    stdout="",
                    stderr="",
                    timed_out=True,
                )
            if "pods" in args:
                return CommandOutcome(ok=True, status=0, stdout=_pod_list_payload(), stderr="")
            if "events" in args:
                return CommandOutcome(ok=True, status=0, stdout=_events_payload(), stderr="")
            if "config" in args:
                return CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=_kubeconfig_view(
                        "kind-offscreen-dev", "kind-offscreen-dev", DEV_API_PORT_RANGE[0]
                    ),
                    stderr="",
                )
            return CommandOutcome(ok=False, status=1, stdout="", stderr="")

        collector = KubeCollector(config, run=runner)
        _, access = collector.collect_cycle(
            clock=self.clock,
            collector_session=new_collector_session(),
            kind_nodes=["offscreen-dev-control-plane"],
            kube_probes_permitted=True,
            state=KubeCollectionState(),
            now_mono_s=10.0,
        )
        self.assertEqual(access, KubeAccessState.TIMEOUT)


class UnavailableFieldsTest(unittest.TestCase):
    def test_missing_psi_and_network(self) -> None:
        body = {
            "pods": [
                {
                    "podRef": {"name": "x", "namespace": "ns", "uid": POD_UID_A},
                    "cpu": {"time": "2026-01-01T00:00:00Z", "usageNanoCores": 1},
                    "containers": [{"name": "app", "cpu": {"time": "2026-01-01T00:00:00Z"}}],
                }
            ]
        }
        entities = parse_kubelet_summary(body)
        container = next(e for e in entities if e["metricsScope"] == "container")
        self.assertIsNone(container.get("psi"))
        self.assertIsNone(container.get("network"))


class CrossTargetRefusalTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(__file__).resolve().parent / "_fixture_kube_cross.json"
        self.tmp.write_text("{}", encoding="utf-8")

    def tearDown(self) -> None:
        if self.tmp.exists():
            self.tmp.unlink()

    def test_dev_context_refuses_release_port(self) -> None:
        kube_path = str(self.tmp.resolve())
        runner = RecordingRunner(
            {
                _config_view_args(kube_path): CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=_kubeconfig_view(
                        "kind-offscreen-dev", "kind-offscreen-dev", RELEASE_API_PORT
                    ),
                    stderr="",
                ),
            }
        )
        config = _dev_config(self.tmp)
        ok, gap = refuse_cross_target(config, runner)
        self.assertFalse(ok)
        self.assertIn("release", gap.lower())

    def test_lab_context_refuses_dev_port(self) -> None:
        kube_path = str(self.tmp.resolve())
        runner = RecordingRunner(
            {
                _config_view_args(kube_path, "kind-offscreen-lab"): CommandOutcome(
                    ok=True,
                    status=0,
                    stdout=_kubeconfig_view(
                        "kind-offscreen-lab", "kind-offscreen-lab", DEV_API_PORT_RANGE[0]
                    ),
                    stderr="",
                ),
            }
        )
        config = RuntimeConfig(
            docker_context="default",
            kubeconfig_path=str(self.tmp),
            kube_context="kind-offscreen-lab",
            installation_id=INSTALLATION_ID,
        )
        ok, gap = refuse_cross_target(config, runner)
        self.assertFalse(ok)


class ReadOnlyGuardTest(unittest.TestCase):
    def test_secret_and_logs_refused(self) -> None:
        with self.assertRaises(ValueError):
            assert_kubectl_read_only(["get", "secret", "x"])
        with self.assertRaises(ValueError):
            assert_kubectl_read_only(["logs", "pod/foo"])


if __name__ == "__main__":
    unittest.main()