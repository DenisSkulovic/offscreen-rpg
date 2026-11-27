#!/usr/bin/env python3
"""Controlled R3 application admission experiment; no provider or application data."""
import copy
import json
import sys
import time
import urllib.request
import urllib.error

def attr(k, v):
    value = {"intValue": str(v)} if isinstance(v, int) else {"stringValue": v}
    return {"key": k, "value": value}

def envelope(signal, records, service="offscreen-developer-proof", env="development"):
    group, scopes, items = {
        "traces": ("resourceSpans", "scopeSpans", "spans"),
        "logs": ("resourceLogs", "scopeLogs", "logRecords"),
        "metrics": ("resourceMetrics", "scopeMetrics", "metrics"),
    }[signal]
    return {group: [{"resource": {"attributes": [
        attr("service.name", service), attr("service.namespace", "offscreen"),
        attr("deployment.environment.name", env),
        attr("service.instance.id", "drop_resource_canary"),
    ]}, scopes: [{"scope": {"name": "offscreen.operational.v1",
        "version": "drop_scope_canary"}, items: records}]}]}

now = time.time_ns()
trace = "1234567890abcdef1234567890abcdef"
parent, child = "1234567890abcdef", "abcdef1234567890"
def span(name, sid=parent, attrs=None):
    return {"traceId": trace, "spanId": sid, "name": name, "kind": 1,
        "startTimeUnixNano": str(now-100000000), "endTimeUnixNano": str(now),
        "attributes": attrs or [], "status": {"code": 1, "message": "drop_status_canary"}}
def log(name, attrs=None):
    return {"timeUnixNano": str(now), "observedTimeUnixNano": str(now),
        "severityNumber": 9, "severityText": "drop_severity_canary",
        "traceId": trace, "spanId": child, "body": {"stringValue": name},
        "attributes": attrs or []}
def metric(name, kind, value, extra=None):
    pt = {"timeUnixNano": str(now), "attributes": [
        attr("offscreen.candidate", "probe"), *(extra or [])]}
    if kind == "histogram":
        pt.update(startTimeUnixNano=str(now-1000000000), count="1", sum=0.2,
                  explicitBounds=[0.01,0.1,1,10,60], bucketCounts=["0","0","1","0","0","0"])
    else:
        pt["asInt"] = str(value)
        if kind == "sum":
            pt["startTimeUnixNano"] = str(now-1000000000)
    data = {"dataPoints": [pt]}
    if kind in ("sum", "histogram"):
        data["aggregationTemporality"] = 2
    if kind == "sum":
        data["isMonotonic"] = True
    return {"name": name, "description": "drop_description_canary",
            "unit": "s" if kind == "histogram" else "1", kind: data}

def send(signal, payload, port=4328, positive=False):
    req = urllib.request.Request(f"http://127.0.0.1:{port}/v1/{signal}",
        data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as response:
        body = json.loads(response.read())
        if positive:
            assert not any(int(body.get("partialSuccess", {}).get(k, 0))
                for k in ("rejectedSpans","rejectedLogRecords","rejectedDataPoints")), body
        print(signal, port, response.status, "positive" if positive else "negative", flush=True)

# Wait for actual OTLP HTTP endpoint. Empty requests exercise transport only.
for attempt in range(30):
    try:
        send("traces", {"resourceSpans":[]})
        break
    except (OSError, urllib.error.URLError):
        time.sleep(1)
else:
    raise SystemExit("receiver not ready")

attrs = [attr("offscreen.run","0123456789abcdef"), attr("offscreen.candidate","probe"),
         attr("offscreen.outcome","ok"), attr("offscreen.retry",2),
         attr("private.payload","drop_attribute_canary")]
a = span("developer.parent", attrs=attrs)
z = span("developer.child", child, attrs)
z["parentSpanId"] = parent
send("traces", envelope("traces",[a,z]), positive=True)
send("logs", envelope("logs",[log("developer.completed",attrs)]), positive=True)
send("metrics", envelope("metrics",[
    metric("offscreen.agent.runs","sum",17),
    metric("offscreen.agent.active","gauge",3),
    metric("offscreen.agent.duration","histogram",0),
]), positive=True)

send("traces", envelope("traces",[span("negative.unknown.service")],service="unknown"))
send("logs", envelope("logs",[log("negative.environment")],env="release"))
send("traces", envelope("traces",[span("negative.invalid.attribute",
    attrs=[attr("offscreen.retry",99)])]))
send("logs", envelope("logs",[log("negative.invalid.outcome",
    [attr("offscreen.outcome","secret")])]))
send("metrics", envelope("metrics",[metric("offscreen.agent.runs","sum",987654321,
    [attr("offscreen.run","0123456789abcdef")])]))
send("metrics", envelope("metrics",[metric("offscreen.forbidden.metric","gauge",987654322)]))
send("metrics", envelope("metrics",[metric("offscreen.agent.runs","gauge",987654323)]))
send("traces", envelope("traces",[span("negative.cross.lane")]),port=4318)
# positive after negatives to prove continued processing
send("logs", envelope("logs",[log("developer.final.control")]), positive=True)
print("OTLP SUBMISSION COMPLETE", flush=True)
