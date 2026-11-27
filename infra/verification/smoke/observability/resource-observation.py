"""Read-only sampling of kubelet statistics and Prometheus scrape evidence."""
from __future__ import annotations

import json
import pathlib
import statistics
import subprocess
import sys
import time
import urllib.parse
import urllib.request

NS = "offscreen-dev-observability"
EXPECTED_ROLES = frozenset(
    {"obs-collector", "obs-prometheus", "obs-loki", "obs-tempo", "obs-grafana"}
)
SAMPLE_COUNT = 12
SAMPLE_INTERVAL_S = 10.0


def kub(kubeconfig: str, ctx: str, *args: str, timeout: int = 25) -> object:
    command = ["kubectl", "--kubeconfig", kubeconfig, "--context", ctx, *args]
    return json.loads(subprocess.check_output(command, timeout=timeout, text=True))


def inventory(kubeconfig: str, ctx: str) -> dict:
    items = kub(kubeconfig, ctx, "-n", NS, "get", "pods", "-o", "json")["items"]
    result: dict[str, dict] = {}
    for pod in items:
        meta = pod["metadata"]
        if meta.get("deletionTimestamp") or pod["status"]["phase"] != "Running":
            raise RuntimeError("unexpected non-running or terminating pod " + meta["name"])
        statuses = pod["status"]["containerStatuses"]
        assert len(statuses) == 1 and statuses[0]["ready"]
        role = meta["labels"]["app.kubernetes.io/instance"]
        assert role not in result
        result[role] = {
            "name": meta["name"],
            "uid": meta["uid"],
            "node": pod["spec"]["nodeName"],
            "container": statuses[0]["name"],
            "restarts": statuses[0]["restartCount"],
            "resources": pod["spec"]["containers"][0]["resources"],
        }
    assert set(result) == EXPECTED_ROLES
    return result


def mib(value: int | float) -> float:
    return round(value / 1_048_576, 1)


def summarize(samples: dict[str, list[dict]]) -> dict:
    report: dict[str, object] = {}
    for role, points in samples.items():
        assert len(points) == SAMPLE_COUNT, role
        mem = [p["workingSetBytes"] for p in points]
        cpu = [p["cpuNanoCores"] / 1e6 for p in points if p.get("cpuNanoCores") is not None]
        report[role] = {
            "memoryMiB": {
                "min": mib(min(mem)),
                "mean": mib(statistics.mean(mem)),
                "max": mib(max(mem)),
            },
            "cpuMilli": (
                {"mean": round(statistics.mean(cpu), 1), "max": round(max(cpu), 1)}
                if cpu
                else "not-observed"
            ),
            "distinctMemoryTimestamps": len({p["memoryTime"] for p in points}),
        }
    return report


def cycle_sample_from_nodes(
    kubeconfig: str,
    ctx: str,
    nodes: list[str],
    inventory_map: dict,
    index: int,
    out: pathlib.Path,
) -> dict[str, dict]:
    uid_to_role = {meta["uid"]: role for role, meta in inventory_map.items()}
    cycle: dict[str, dict] = {}
    for node in nodes:
        summary = kub(
            kubeconfig,
            ctx,
            "get",
            "--raw",
            f"/api/v1/nodes/{node}/proxy/stats/summary",
        )
        for pod in summary.get("pods", []):
            ref = pod["podRef"]
            if ref.get("namespace") != NS:
                continue
            role = uid_to_role.get(ref.get("uid"))
            if role is None:
                continue
            if role in cycle:
                raise RuntimeError("duplicate platform pod sample: " + role)
            container_name = inventory_map[role]["container"]
            container = next(
                (c for c in pod.get("containers", []) if c["name"] == container_name),
                None,
            )
            if container is None:
                continue
            memory = container["memory"]
            cpu = container.get("cpu", {})
            cycle[role] = {
                "workingSetBytes": memory["workingSetBytes"],
                "memoryTime": memory["time"],
                "cpuNanoCores": cpu.get("usageNanoCores"),
                "cpuTime": cpu.get("time"),
            }
    return cycle


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv
    out = pathlib.Path(argv[1])
    out.mkdir(parents=True, exist_ok=True)
    kubeconfig, ctx, prom_port = argv[2], argv[3], argv[4]
    if prom_port in ("", "0"):
        raise RuntimeError("prometheus port is required")
    if len(argv) != 9:
        raise RuntimeError("expected exactly two admitted nodes")
    nodes = [argv[5], argv[7]]
    node_uids = {argv[5]: argv[6], argv[7]: argv[8]}
    if len(set(nodes)) != 2 or len(set(node_uids.values())) != 2:
        raise RuntimeError("admitted node set is not exact")

    before = inventory(kubeconfig, ctx)
    (out / "inventory-before.json").write_text(json.dumps(before, indent=2))
    samples: dict[str, list[dict]] = {role: [] for role in before}

    started = time.monotonic()
    previous = started
    for index in range(SAMPLE_COUNT):
        now = time.monotonic()
        if index > 0 and now - previous < SAMPLE_INTERVAL_S:
            raise RuntimeError("sample cadence collapsed")
        previous = now
        cycle = cycle_sample_from_nodes(kubeconfig, ctx, nodes, before, index, out)
        for role in before:
            assert role in cycle, "missing platform pod sample: " + role
            point = cycle[role]
            if before[role]["node"] not in node_uids:
                raise RuntimeError("sample arrived from a foreign node")
            samples[role].append(
                {
                    "workingSetBytes": point["workingSetBytes"],
                    "memoryTime": point["memoryTime"],
                    "cpuNanoCores": point["cpuNanoCores"],
                    "cpuTime": point["cpuTime"],
                }
            )
        print(f"Sample {index + 1} / {SAMPLE_COUNT}", flush=True)
        if index < SAMPLE_COUNT - 1:
            time.sleep(SAMPLE_INTERVAL_S)

    after = inventory(kubeconfig, ctx)
    (out / "inventory-after.json").write_text(json.dumps(after, indent=2))
    assert before == after, "Pod identity, resources or restart count changed during sampling"

    for role, points in samples.items():
        assert len(points) == SAMPLE_COUNT, role
        assert len({p["memoryTime"] for p in points}) >= 3, "stale memory stats: " + role

    report = summarize(samples)
    (out / "samples.json").write_text(json.dumps(samples, indent=2))
    (out / "resource-report.json").write_text(json.dumps(report, indent=2))

    print(
        "ROLE | MEM MIN / MEAN / MAX MiB | CPU MEAN / MAX mCPU | DISTINCT MEMORY TIMESTAMPS"
    )
    for role, points in samples.items():
        mem = [p["workingSetBytes"] for p in points]
        cpu = [p["cpuNanoCores"] / 1e6 for p in points if p.get("cpuNanoCores") is not None]
        print(
            role,
            mib(min(mem)),
            mib(statistics.mean(mem)),
            mib(max(mem)),
            round(statistics.mean(cpu), 1) if cpu else "not-observed",
            round(max(cpu), 1) if cpu else "not-observed",
            len({p["memoryTime"] for p in points}),
        )

    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def api(path: str, params: dict | None = None) -> object:
        query = "?" + urllib.parse.urlencode(params) if params else ""
        url = f"http://127.0.0.1:{prom_port}{path}{query}"
        with opener.open(url, timeout=15) as response:
            return json.load(response)

    elapsed_ms = int((time.monotonic() - started) * 1000)
    targets = api("/api/v1/targets", {"state": "active"})
    selected = [
        target
        for target in targets["data"]["activeTargets"]
        if target["scrapeUrl"] == "http://obs-collector:8888/metrics"
    ]
    assert targets["status"] == "success"
    assert len(selected) == 1, "expected exactly one Collector scrape target"
    target = selected[0]
    assert target["health"] == "up"
    names = api("/api/v1/label/__name__/values", {"match[]": '{__name__=~"otelcol_.*"}'})
    assert names["status"] == "success" and names["data"]
    family_tokens = (
        "accepted",
        "refused",
        "sent",
        "failed",
        "queue",
        "enqueue",
        "memory",
        "uptime",
    )
    interesting = [
        name
        for name in names["data"]
        if any(token in name for token in family_tokens)
    ]
    missing = [
        token
        for token in family_tokens
        if not any(token in name for name in interesting)
    ]
    observed_families = sorted({token for token in family_tokens if token not in missing})
    if not interesting:
        raise RuntimeError("collector self-metrics were not observed")
    query = (
        '{__name__=~"'
        + "|".join(interesting)
        + '",job="'
        + target["labels"]["job"]
        + '",instance="'
        + target["labels"]["instance"]
        + '"}'
    )
    metrics = api("/api/v1/query", {"query": query})
    assert metrics["status"] == "success" and metrics["data"]["result"]
    result = {
        "schema": 1,
        "ok": True,
        "roles": sorted(before),
        "sampleCount": SAMPLE_COUNT,
        "elapsedMs": elapsed_ms,
        "collectorTargetUp": True,
        "observedFamilies": observed_families,
        "missingFamilies": missing,
    }
    (out / "result.json").write_text(json.dumps(result, indent=2))
    print("OBSERVABILITY RESOURCE OBSERVATION COMPLETE (not a capacity verdict)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())