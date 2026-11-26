"""Read-only sampling of kubelet statistics and Prometheus scrape evidence."""
import json, pathlib, subprocess, sys, time, statistics, urllib.request, urllib.parse
out=pathlib.Path(sys.argv[1])
kubeconfig,ctx,node,port=sys.argv[2:]
ns="offscreen-dev-observability"
K=["kubectl","--kubeconfig",kubeconfig,"--context",ctx]
def kub(*args):
    return json.loads(subprocess.check_output(K+list(args),timeout=25,text=True))
def pods():
    return kub("-n",ns,"get","pods","-o","json")["items"]
def inventory():
    result={}
    for p in pods():
        m=p["metadata"]
        if m.get("deletionTimestamp") or p["status"]["phase"]!="Running":
            raise RuntimeError("unexpected non-running or terminating pod "+m["name"])
        cs=p["status"]["containerStatuses"]
        assert len(cs)==1 and cs[0]["ready"]
        role=m["labels"]["app.kubernetes.io/instance"]
        assert role not in result
        result[role]={"name":m["name"],"uid":m["uid"],"container":cs[0]["name"],"restarts":cs[0]["restartCount"],"resources":p["spec"]["containers"][0]["resources"]}
    assert set(result)=={"obs-collector","obs-prometheus","obs-loki","obs-tempo","obs-grafana"}
    return result
before=inventory()
(out/"inventory-before.json").write_text(json.dumps(before,indent=2))
samples={r:[] for r in before}
for i in range(12):
    d=kub("get","--raw","/api/v1/nodes/"+node+"/proxy/stats/summary")
    (out/f"summary-{i:02}.json").write_text(json.dumps(d))
    for p in d.get("pods",[]):
        ref=p["podRef"]
        if ref["namespace"]!=ns: continue
        roles=[r for r,v in before.items() if v["uid"]==ref["uid"]]
        if len(roles)!=1: continue
        r=roles[0]
        c=next(x for x in p["containers"] if x["name"]==before[r]["container"])
        memory=c["memory"]
        cpu=c.get("cpu",{})
        samples[r].append({"workingSetBytes":memory["workingSetBytes"],"memoryTime":memory["time"],"cpuNanoCores":cpu.get("usageNanoCores"),"cpuTime":cpu.get("time")})
    print("Sample",i+1,"/ 12",flush=True)
    if i<11: time.sleep(10)
after=inventory()
(out/"inventory-after.json").write_text(json.dumps(after,indent=2))
assert before==after,"Pod identity, resources or restart count changed during sampling"
def mib(v): return round(v/1048576,1)
print("ROLE | MEM MIN / MEAN / MAX MiB | CPU MEAN / MAX mCPU | DISTINCT MEMORY TIMESTAMPS")
for r,a in samples.items():
    assert len(a)==12,r
    assert len({v["memoryTime"] for v in a})>=3, "stale memory stats: "+r
    mem=[v["workingSetBytes"] for v in a]
    cpu=[v["cpuNanoCores"]/1e6 for v in a if v["cpuNanoCores"] is not None]
    print(r, mib(min(mem)),mib(statistics.mean(mem)),mib(max(mem)),round(statistics.mean(cpu),1) if cpu else "NA",round(max(cpu),1) if cpu else "NA",len({v["memoryTime"] for v in a}))
(out/"samples.json").write_text(json.dumps(samples,indent=2))
totals=[sum(samples[r][i]["workingSetBytes"] for r in samples) for i in range(12)]
print("Combined container working set MiB:",mib(min(totals)),mib(statistics.mean(totals)),mib(max(totals)))
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def api(path,params=None):
    url="http://127.0.0.1:"+port+path+("?" + urllib.parse.urlencode(params) if params else "")
    with opener.open(url,timeout=15) as res: return json.load(res)
targets=api("/api/v1/targets",{"state":"active"})
(out/"targets.json").write_text(json.dumps(targets,indent=2))
assert targets["status"]=="success"
selected=[t for t in targets["data"]["activeTargets"] if t["scrapeUrl"]=="http://obs-collector:8888/metrics"]
assert len(selected)==1, "expected exactly one Collector scrape target"
t=selected[0]
print("Collector scrape:",t["health"],t["lastError"],"job",t["labels"].get("job"))
assert t["health"]=="up"
names=api("/api/v1/label/__name__/values",{"match[]":'{__name__=~"otelcol_.*"}'})
(out/"collector-metric-names.json").write_text(json.dumps(names,indent=2))
assert names["status"]=="success" and names["data"],"no Collector metric families"
# Discover actual names rather than assume suffixes across Collector versions.
interesting=[n for n in names["data"] if any(s in n for s in ("accepted","refused","sent","failed","queue","enqueue","memory","uptime"))]
assert interesting
query='{__name__=~"'+ "|".join(interesting)+'",job="'+t["labels"]["job"]+'",instance="'+t["labels"]["instance"]+'"}'
d=api("/api/v1/query",{"query":query})
(out/"collector-metrics.json").write_text(json.dumps(d,indent=2))
assert d["status"]=="success" and d["data"]["result"]
print("Current Collector self-metric samples:")
for v in d["data"]["result"]:
    print(json.dumps({"labels":v["metric"],"value":v["value"]}))
print("E04-D1 OBSERVATION COMPLETE (not a capacity or loss-accounting verdict)")
