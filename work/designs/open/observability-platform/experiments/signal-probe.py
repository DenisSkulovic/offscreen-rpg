"""Synthetic OTLP HTTP probe. No credentials or application payloads."""
import json, pathlib, secrets, sys, time, urllib.request, urllib.parse, urllib.error
out=pathlib.Path(sys.argv[1])
collector,prom,loki,tempo=sys.argv[2:6]
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
replay=json.loads(sys.argv[6]) if len(sys.argv)>=7 and sys.argv[6] else None
mode=sys.argv[7] if len(sys.argv)==8 else "normal"
assert mode in ("normal","tempo-outage")
assert not (replay and mode!="normal")
run=secrets.token_hex(8)
trace=secrets.token_hex(16)
parent=secrets.token_hex(8)
child=secrets.token_hex(8)
now=time.time_ns()
service="obs-e04-probe"
marker="obs-e04-"+run
if replay:
    run,trace,parent,child,marker,now=(replay[k] for k in ("run","trace","parent","child","marker","now"))
def attr(k,v): return {"key":k,"value":{"stringValue":v}}
resource={"attributes":[attr("service.name",service),attr("service.instance.id",run),attr("deployment.environment.name","synthetic")]}
scope={"name":"offscreen.synthetic"}
def call(base,path,params=None,data=None):
    url=base+path+("?" + urllib.parse.urlencode(params) if params else "")
    req=urllib.request.Request(url,data=json.dumps(data).encode() if data is not None else None,headers={"Content-Type":"application/json"} if data is not None else {})
    try:
        with opener.open(req,timeout=8) as r:
            raw=r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        body=e.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {e.code} {path}: {body[:2000]}") from e
def span(sid,name,start,end,**kw):
    return dict(traceId=trace,spanId=sid,name=name,kind=1,startTimeUnixNano=str(start),endTimeUnixNano=str(end),attributes=[attr("probe.run",run)],**kw)
payloads={
"traces":{"resourceSpans":[{"resource":resource,"scopeSpans":[{"scope":scope,"spans":[span(parent,"probe-parent",now-20000000,now),span(child,"probe-child",now-15000000,now-5000000,parentSpanId=parent)]}]}]},
"logs":{"resourceLogs":[{"resource":resource,"scopeLogs":[{"scope":scope,"logRecords":[{"timeUnixNano":str(now),"observedTimeUnixNano":str(now),"severityNumber":9,"severityText":"INFO","body":{"stringValue":marker},"traceId":trace,"spanId":child,"attributes":[attr("probe.run",run)]}]}]}]},
"metrics":{"resourceMetrics":[{"resource":resource,"scopeMetrics":[{"scope":scope,"metrics":[{"name":"offscreen_probe_events","sum":{"aggregationTemporality":2,"isMonotonic":True,"dataPoints":[{"startTimeUnixNano":str(now-1000000000),"timeUnixNano":str(now),"asInt":"7","attributes":[attr("probe_run",run)]}]}}]}]}]}
}
(out/"identity.json").write_text(json.dumps(dict(run=run,trace=trace,parent=parent,child=child,marker=marker,now=now),indent=2))
for signal,payload in (() if replay else payloads.items()):
    response=call(collector,"/v1/"+signal,data=payload)
    (out/f"{signal}.receipt.json").write_text(json.dumps(response))
    partial=response.get("partialSuccess",{})
    assert not any(int(partial.get(k,0)) for k in ("rejectedSpans","rejectedLogRecords","rejectedDataPoints")),partial
    print("OTLP accepted",signal,flush=True)
def trace_check(d):
    spans=[s for b in d.get("batches",d.get("resourceSpans",[])) for sc in b.get("scopeSpans",[]) for s in sc.get("spans",[])]
    # OTLP protobuf JSON encodes bytes as base64 in some backend responses.
    import base64
    def norm(v):
        if v in (trace,parent,child): return v
        try: return base64.b64decode(v,validate=True).hex()
        except Exception: return v
    ss={norm(s.get("spanId","")):s for s in spans}
    return parent in ss and child in ss and norm(ss[child].get("parentSpanId",""))==parent and all(norm(ss[s].get("traceId",""))==trace for s in (parent,child))
def logs_check(d):
    for stream in d.get("data",{}).get("result",[]):
        for value in stream.get("values",[]):
            if value[1]!=marker: continue
            meta=dict(stream.get("stream",{}))
            if len(value)>2 and isinstance(value[2],dict): meta.update(value[2])
            if meta.get("trace_id")==trace and meta.get("span_id")==child: return True
    return False
def metrics_check(d):
    return any(float(v["value"][1])==7 and v["metric"].get("probe_run")==run for v in d.get("data",{}).get("result",[]))
checks={
"trace":(tempo,"/api/traces/"+trace,None,trace_check),
"log":(loki,"/loki/api/v1/query_range",{"query":'{service_name="'+service+'"} |= "'+marker+'"',"start":str(now-60000000000),"end":str(now+60000000000)},logs_check),
"metric":(prom,"/api/v1/query",{"query":'offscreen_probe_events_total{probe_run="'+run+'"}', **({"time":str(now/1e9+2)} if replay else {})},metrics_check)}
deadline=time.monotonic()+90
pending=set(checks) if mode=="normal" else {"log","metric"}
while pending and time.monotonic()<deadline:
    for name in sorted(pending):
        base,path,params,check=checks[name]
        try:
            d=call(base,path,params)
            (out/f"{name}.query.json").write_text(json.dumps(d,indent=2))
            if check(d):
                print("PASS",name,flush=True)
                pending.remove(name)
        except (OSError,ValueError,RuntimeError,urllib.error.URLError) as e:
            (out/f"{name}.error.txt").write_text(str(e))
    if pending: time.sleep(2)
print("E04-C ISOLATION" if mode=="tempo-outage" else ("E04-B QUERY" if replay else "E04-A"), "PASS" if not pending else "FAIL: "+",".join(sorted(pending)))
sys.exit(bool(pending))
