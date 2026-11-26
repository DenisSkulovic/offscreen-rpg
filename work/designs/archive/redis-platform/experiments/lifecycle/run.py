#!/usr/bin/env python3
"""Owner-operated isolated lifecycle specimen; not production ensure."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import uuid

CTX = "kind-offscreen-release"
CHART = Path(__file__).resolve().parent / "chart"
LABEL = "offscreen.rpg/redis-proof"
PIN = "sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232"
K = ["kubectl", "--context", CTX, "--request-timeout=15s"]
H = ["helm", "--kube-context", CTX]
ns = ""
uid = ""
token = uuid.uuid4().hex
passed = False

def run(args, *, data=None, seconds=25, check=True):
    p = subprocess.run(args, input=data, text=True, capture_output=True, timeout=seconds)
    if check and p.returncode:
        raise RuntimeError(f"{args[0]} {args[1:4]} failed: {p.stderr.strip()}")
    return p

def j(args, **kwargs):
    return json.loads(run(args, **kwargs).stdout)

def k(*args):
    return K + ["-n", ns, *args]

def h(*args):
    return H + ["-n", ns, *args]

def assert_owned():
    obj = j(K + ["get", "namespace", ns, "-o", "json"])
    if obj["metadata"]["uid"] != uid or obj["metadata"].get("labels", {}).get(LABEL) != token or obj["metadata"].get("deletionTimestamp"):
        raise RuntimeError("proof namespace custody lost")
    return obj

def create(obj):
    assert_owned()
    return j(k("create", "-f", "-", "-o", "json"), data=json.dumps(obj))

def get_optional(kind, name):
    out = run(k("get", kind, name, "-o", "json", "--ignore-not-found")).stdout
    return json.loads(out) if out.strip() else None

def inventory(name):
    return {kind: get_optional(kind, name + suffix) for kind, suffix in
            [("configmap", "-config"), ("deployment", ""), ("service", "")]}

def releases():
    return {x["name"]: x for x in j(h("list", "--all", "-o", "json"))}

def pods(name):
    return j(k("get", "pods", "-l", f"app.kubernetes.io/instance={name}", "-o", "json"))["items"]

def identities(name):
    return {kind: obj["metadata"]["uid"] for kind, obj in inventory(name).items() if obj}

def ensure(name, chart=CHART, wait=90):
    # Specimen guard only: intentionally not a full production compatibility observer.
    assert_owned()
    rs, inv = releases(), inventory(name)
    if name in rs:
        if rs[name]["status"] != "deployed" or not all(inv.values()):
            return "REFUSED_PARTIAL"
        if chart != CHART:
            return "REFUSED_DRIFT"
        # For this fixed specimen verify release values, resource identity/config,
        # and runtime before returning no-op; full field comparison remains design work.
        if j(h("get", "values", name, "-o", "json")) not in ({}, None):
            return "REFUSED_DRIFT"
        verify(name)
        return "NOOP"
    if any(inv.values()) or pods(name):
        return "REFUSED_PRESENT"
    assert_owned()
    p = run(h("install", name, str(chart), "--wait", "--timeout", f"{wait}s"),
            seconds=wait + 25, check=False)
    print(f"helm install {name}: exit={p.returncode}", flush=True)
    if p.returncode:
        print(p.stderr.strip(), flush=True)
        return "INSTALL_FAILED"
    verify(name)
    return "INSTALLED"

def verify(name):
    inv = inventory(name)
    assert all(inv.values()), "missing resource"
    conf = inv["configmap"]["data"]["redis.conf"]
    expected = '\n'.join(["bind 0.0.0.0", "protected-mode no", "port 6379", 'save ""',
                          "appendonly no", "dir /data", "maxmemory 32mb", "maxmemory-policy allkeys-lru"])
    assert conf == expected, "unexpected config"
    d = inv["deployment"]
    selector = {"app.kubernetes.io/name": "redis", "app.kubernetes.io/instance": name}
    assert d["spec"]["replicas"] == 1 and d["spec"]["selector"]["matchLabels"] == selector
    assert d["status"].get("readyReplicas") == 1
    assert d["spec"]["template"]["metadata"]["annotations"]["offscreen.rpg/redis-config-sha256"] == hashlib.sha256(conf.encode()).hexdigest()
    assert inv["service"]["spec"]["type"] == "ClusterIP" and inv["service"]["spec"]["selector"] == selector
    for obj in inv.values():
        assert obj["metadata"]["annotations"]["meta.helm.sh/release-name"] == name
        assert obj["metadata"]["annotations"]["meta.helm.sh/release-namespace"] == ns
    ps = pods(name)
    assert len(ps) == 1
    pod = ps[0]
    assert not pod["metadata"].get("deletionTimestamp")
    # Establish Deployment -> ReplicaSet -> Pod UID chain.
    owners = [x for x in pod["metadata"]["ownerReferences"] if x.get("controller")]
    assert len(owners) == 1 and owners[0]["kind"] == "ReplicaSet"
    rs = get_optional("replicaset", owners[0]["name"])
    assert rs and rs["metadata"]["uid"] == owners[0]["uid"]
    assert any(x.get("controller") and x["kind"] == "Deployment" and x["uid"] == d["metadata"]["uid"] for x in rs["metadata"]["ownerReferences"])
    assert pod["status"]["containerStatuses"][0]["imageID"].endswith(PIN)
    slices = j(k("get", "endpointslices", "-l", f"kubernetes.io/service-name={name}", "-o", "json"))["items"]
    endpoints = [e for s in slices for e in s.get("endpoints", [])]
    assert len(endpoints) == 1 and endpoints[0]["conditions"].get("ready") is True
    assert endpoints[0]["targetRef"]["uid"] == pod["metadata"]["uid"]
    pong = run(k("exec", pod["metadata"]["name"], "--", "redis-cli", "-h", name, "--raw", "PING")).stdout.strip()
    assert pong == "PONG"
    raw = run(k("exec", pod["metadata"]["name"], "--", "redis-cli", "--raw", "CONFIG", "GET", "maxmemory", "maxmemory-policy", "save", "appendonly")).stdout.splitlines()
    assert dict(zip(raw[::2], raw[1::2])) == {"maxmemory":"33554432","maxmemory-policy":"allkeys-lru","save":"","appendonly":"no"}
    print(f"OBSERVED {name}: release={releases()[name]['revision']} pod={pod['metadata']['uid']} endpoint={endpoints[0]['targetRef']['uid']} PONG", flush=True)

def baseline():
    return {f"{kind}/{name}": j(K + ["-n", "lab-a", "get", kind, name, "-o", "json"])["metadata"]["uid"] for kind, name in
            [("deployment","redis"),("service","redis"),("configmap","redis-config")]}

def main():
    global ns, uid, passed
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirm-disposable", required=True, choices=[CTX])
    args = parser.parse_args()
    if not __debug__:
        raise RuntimeError("Python optimized mode disables assertions")
    if any(k.startswith("HELM_") or k.startswith("KUBE") for k in os.environ):
        raise RuntimeError("unset Helm/Kubernetes environment overrides before proof")
    # Reuse the current repository's authoritative target guard, invoked from repo root.
    run(["node", "--input-type=module", "-e", "import {assertPlatformTarget} from './infra/platform/common/commands.mjs'; assertPlatformTarget('release');"])
    version = run(["helm", "version", "--short"]).stdout.strip()
    if not version.startswith("v3.22.1+"):
        raise RuntimeError(f"unreviewed Helm version {version}")
    available = next(int(l.split()[1]) for l in Path("/proc/meminfo").read_text().splitlines() if l.startswith("MemAvailable:"))
    if available < 512 * 1024:
        raise RuntimeError("proof host memory floor (512MiB) not met")
    before = baseline()
    # Local render/lint before any live mutation.
    run(["helm", "lint", str(CHART), "--namespace", "offscreen-redis-proof-render"])
    run(["helm", "template", "good", str(CHART), "--namespace", "offscreen-redis-proof-render"])
    print("PASS render/lint", flush=True)
    ns = "offscreen-redis-proof-" + token[:12]
    obj = {"apiVersion":"v1","kind":"Namespace","metadata":{"name":ns,"labels":{LABEL:token}}}
    created = j(K + ["create", "-f", "-", "-o", "json"], data=json.dumps(obj))
    uid = created["metadata"]["uid"]
    assert_owned()
    print(f"OWNED namespace={ns} uid={uid}", flush=True)
    assert ensure("good") == "INSTALLED"
    ids = identities("good")
    revision = releases()["good"]["revision"]
    assert ensure("good") == "NOOP"
    assert identities("good") == ids and releases()["good"]["revision"] == revision
    print("PASS fresh and repeat no-op (same object UIDs and revision)", flush=True)
    # Deliberately create an orphan with matching Helm ownership metadata.
    orphan = create({"apiVersion":"v1","kind":"ConfigMap","metadata":{"name":"collision-config",
        "namespace":ns,"labels":{"app.kubernetes.io/managed-by":"Helm"},
        "annotations":{"meta.helm.sh/release-name":"collision","meta.helm.sh/release-namespace":ns}},
        "data":{"sentinel":"preserve"}})
    assert ensure("collision") == "REFUSED_PRESENT"
    current = get_optional("configmap", "collision-config")
    assert current["metadata"]["uid"] == orphan["metadata"]["uid"] and current["metadata"]["resourceVersion"] == orphan["metadata"]["resourceVersion"] and current["data"] == {"sentinel":"preserve"}
    assert "collision" not in releases()
    assert not get_optional("deployment","collision") and not get_optional("service","collision")
    print("PASS matching-metadata orphan refusal (no Helm invocation)", flush=True)
    # Fixture-only readiness fault; never add a production fault knob.
    with tempfile.TemporaryDirectory(prefix="redis-fault-chart-") as tmp:
        bad = Path(tmp) / "chart"
        shutil.copytree(CHART, bad)
        p = bad / "templates/deployment.yaml"
        s = p.read_text()
        marker = 'command: ["redis-cli", "ping"]'
        assert s.count(marker) == 2
        p.write_text(s.replace(marker, 'command: ["redis-cli", "-p", "1", "ping"]', 1))
        assert ensure("fault", bad, wait=35) == "INSTALL_FAILED"
        failed = releases()["fault"]
        assert failed["status"] == "failed"
        fault_ids = identities("fault")
        assert len(fault_ids) == 3
        assert ensure("fault") == "REFUSED_PARTIAL"
        assert identities("fault") == fault_ids and releases()["fault"]["revision"] == failed["revision"]
        verify("good")
        print("PASS failed release retained and repeat refused; good pool remains healthy", flush=True)
    assert baseline() == before
    print("PASS legacy resource UIDs unchanged", flush=True)
    passed = True

if __name__ == "__main__":
    try:
        main()
    finally:
        if uid:
            # Authorized namespace-exclusive fixture cleanup; API-enforced UID/RV
            # preconditions, not a label-only check or Helm uninstall.
            live = assert_owned()
            opts = {"apiVersion":"v1","kind":"DeleteOptions","preconditions":{"uid":uid,"resourceVersion":live["metadata"]["resourceVersion"]}}
            run(K + ["delete","--raw",f"/api/v1/namespaces/{ns}","-f","-"], data=json.dumps(opts))
            print(f"CLEANUP requested for owned {ns}; namespace termination not yet proven", flush=True)
            run(K + ["wait","--for=delete",f"namespace/{ns}","--timeout=90s"], seconds=105)
            print("PASS namespace gone", flush=True)
        elif ns:
            print(f"Namespace create outcome unknown; no deletion attempted: {ns}", flush=True)
    if passed:
        print("PASS lifecycle specimen (not production acceptance)", flush=True)
