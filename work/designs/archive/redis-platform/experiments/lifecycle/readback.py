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
    parser.add_argument("--readback-only", action="store_true", required=True)
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
    # Read back only the known synthetic fixture. No Secret reads.
    print("=== HELM COMPUTED VALUES ===", flush=True)
    print(run(h("get", "values", "good", "--all", "-o", "json")).stdout, flush=True)
    print("=== HELM MANIFEST ===", flush=True)
    installed = run(h("get", "manifest", "good")).stdout
    rendered = run(["helm", "template", "good", str(CHART), "--namespace", ns]).stdout
    # Compare parsed YAML through the already-installed repository dependency.
    compare = """import {parseAllDocuments} from 'yaml';
import {isDeepStrictEqual} from 'node:util';
let s=''; for await(const c of process.stdin) s+=c;
const [a,b]=JSON.parse(s);
const parse=x=>parseAllDocuments(x).map(d=>{if(d.errors.length) throw Error('invalid YAML');return d.toJS()}).filter(Boolean).sort((x,y)=>(x.kind+'/'+x.metadata.name).localeCompare(y.kind+'/'+y.metadata.name));
const aa=parse(a),bb=parse(b);
if(aa.length!==3||!isDeepStrictEqual(aa,bb)) throw Error('manifest mismatch');
console.log('PASS installed manifest equals native render');"""
    print(installed, flush=True)
    print(run(["node","--input-type=module","-e",compare],data=json.dumps([installed,rendered])).stdout,flush=True)
    inv = inventory("good")
    ps = pods("good")
    assert len(ps) == 1
    pod = ps[0]
    slices = j(k("get","endpointslices","-l","kubernetes.io/service-name=good","-o","json"))["items"]
    # Only objects created by this known fixture; do not print unexpected
    # admission-injected values (e.g. credentials in env or annotations).
    for spec in (inv["deployment"]["spec"]["template"]["spec"],pod["spec"]):
        assert len(spec["containers"]) == 1 and not spec.get("initContainers") and not spec.get("ephemeralContainers")
        c = spec["containers"][0]
        assert not c.get("env") and not c.get("envFrom")
        assert {v["name"] for v in spec["volumes"]} == {"config","data"}
    def safe_spec(spec):
        result = dict(spec)
        result["containers"] = [{k:v for k,v in c.items() if k not in ("env","envFrom")} for c in spec["containers"]]
        return result
    print("=== DEFAULTED RESOURCE FIELDS ===", flush=True)
    dep = inv["deployment"]["spec"]
    print(json.dumps({"deployment": {**dep,"template":{"metadata":{"labels":dep["template"]["metadata"]["labels"]},"spec":safe_spec(dep["template"]["spec"])}},
        "podSpec":safe_spec(pod["spec"]), "serviceSpec":inv["service"]["spec"],
        "endpointSlices":[{"addressType":s["addressType"],"ownerReferences":s["metadata"].get("ownerReferences"),"ports":s["ports"],"endpoints":s["endpoints"]} for s in slices],
        "serviceUID":inv["service"]["metadata"]["uid"],"podUID":pod["metadata"]["uid"],
        "imageID":pod["status"]["containerStatuses"][0]["imageID"]},indent=2),flush=True)
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
        print("PASS readback specimen (not production acceptance)", flush=True)
