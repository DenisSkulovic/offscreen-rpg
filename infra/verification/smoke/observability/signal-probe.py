"""Synthetic OTLP HTTP probe. No credentials or application payloads."""
from __future__ import annotations

import base64
import copy
import json
import pathlib
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SERVICE = "obs-e04-probe"
INVALID_INSTANCE = "not-a-valid-hex-instance"
INVALID_ENV = "forbidden-environment"
NEGATIVE_MIN_S = 60
NEGATIVE_MAX_S = 120
POSITIVE_QUERY_S = 90
HTTP_MAX_S = 8


def attr(key: str, value: str) -> dict:
    return {"key": key, "value": {"stringValue": value}}


def base_resource(run: str) -> dict:
    return {
        "attributes": [
            attr("service.name", SERVICE),
            attr("service.instance.id", run),
            attr("deployment.environment.name", "synthetic"),
        ]
    }


def base_scope() -> dict:
    return {"name": "offscreen.synthetic"}


def build_payloads(
    *,
    run: str,
    trace: str,
    parent: str,
    child: str,
    marker: str,
    now: int,
    resource: dict | None = None,
    scope: dict | None = None,
) -> dict:
    resource = copy.deepcopy(resource or base_resource(run))
    scope = copy.deepcopy(scope or base_scope())

    def span(sid, name, start, end, **kw):
        return dict(
            traceId=trace,
            spanId=sid,
            name=name,
            kind=1,
            startTimeUnixNano=str(start),
            endTimeUnixNano=str(end),
            attributes=[attr("probe.run", run)],
            **kw,
        )

    return {
        "traces": {
            "resourceSpans": [
                {
                    "resource": resource,
                    "scopeSpans": [
                        {
                            "scope": scope,
                            "spans": [
                                span(parent, "probe-parent", now - 20_000_000, now),
                                span(
                                    child,
                                    "probe-child",
                                    now - 15_000_000,
                                    now - 5_000_000,
                                    parentSpanId=parent,
                                ),
                            ],
                        }
                    ],
                }
            ]
        },
        "logs": {
            "resourceLogs": [
                {
                    "resource": resource,
                    "scopeLogs": [
                        {
                            "scope": scope,
                            "logRecords": [
                                {
                                    "timeUnixNano": str(now),
                                    "observedTimeUnixNano": str(now),
                                    "severityNumber": 9,
                                    "severityText": "INFO",
                                    "body": {"stringValue": marker},
                                    "traceId": trace,
                                    "spanId": child,
                                    "attributes": [attr("probe.run", run)],
                                }
                            ],
                        }
                    ],
                }
            ]
        },
        "metrics": {
            "resourceMetrics": [
                {
                    "resource": resource,
                    "scopeMetrics": [
                        {
                            "scope": scope,
                            "metrics": [
                                {
                                    "name": "offscreen_probe_events",
                                    "sum": {
                                        "aggregationTemporality": 2,
                                        "isMonotonic": True,
                                        "dataPoints": [
                                            {
                                                "startTimeUnixNano": str(
                                                    now - 1_000_000_000
                                                ),
                                                "timeUnixNano": str(now),
                                                "asInt": "7",
                                                "attributes": [attr("probe_run", run)],
                                            }
                                        ],
                                    },
                                }
                            ],
                        }
                    ],
                }
            ]
        },
    }


def default_http_call(base: str, path: str, params=None, data=None, *, timeout_s: float):
    url = base + path + ("?" + urllib.parse.urlencode(params) if params else "")
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data is not None else None,
        headers=headers,
    )
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=timeout_s) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        body = error.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {error.code} {path}: {body[:2000]}") from error


def trace_check(trace: str, parent: str, child: str, payload: dict) -> bool:
    spans = [
        span
        for batch in payload.get("batches", payload.get("resourceSpans", []))
        for scope_span in batch.get("scopeSpans", [])
        for span in scope_span.get("spans", [])
    ]

    def norm(value: str) -> str:
        if value in (trace, parent, child):
            return value
        try:
            return base64.b64decode(value, validate=True).hex()
        except Exception:
            return value

    by_id = {norm(span.get("spanId", "")): span for span in spans}
    return (
        parent in by_id
        and child in by_id
        and norm(by_id[child].get("parentSpanId", "")) == parent
        and all(norm(by_id[sid].get("traceId", "")) == trace for sid in (parent, child))
    )


def logs_check(trace: str, child: str, marker: str, payload: dict) -> bool:
    for stream in payload.get("data", {}).get("result", []):
        for value in stream.get("values", []):
            if value[1] != marker:
                continue
            meta = dict(stream.get("stream", {}))
            if len(value) > 2 and isinstance(value[2], dict):
                meta.update(value[2])
            if meta.get("trace_id") == trace and meta.get("span_id") == child:
                return True
    return False


def metrics_check(run: str, payload: dict) -> bool:
    return any(
        float(entry["value"][1]) == 7 and entry["metric"].get("probe_run") == run
        for entry in payload.get("data", {}).get("result", [])
    )


def query_timeout_s(remaining_s: float) -> float:
    return min(HTTP_MAX_S, max(0.1, remaining_s))


def observe_positive_queries(
    *,
    checks: dict,
    out: pathlib.Path,
    http_call,
    monotonic,
    deadline: float,
    sleep=time.sleep,
) -> set[str]:
    pending = set(checks)
    while pending and monotonic() < deadline:
        for name in sorted(pending):
            base, path, params, check, ctx = checks[name]
            remaining = deadline - monotonic()
            if remaining <= 0:
                break
            try:
                payload = http_call(
                    base,
                    path,
                    params=params,
                    timeout_s=query_timeout_s(remaining),
                )
                (out / f"{name}.query.json").write_text(json.dumps(payload, indent=2))
                if check(payload, **ctx):
                    print(f"PASS {name}", flush=True)
                    pending.remove(name)
            except (OSError, ValueError, RuntimeError, urllib.error.URLError) as error:
                (out / f"{name}.error.txt").write_text(str(error))
        if pending:
            sleep(0)
    return pending


def tempo_absent(http_call, tempo: str, trace_id: str, *, timeout_s: float) -> bool:
    try:
        payload = http_call(tempo, f"/api/traces/{trace_id}", timeout_s=timeout_s)
    except RuntimeError as error:
        if str(error).startswith("HTTP 404 "):
            return True
        raise
    return not payload.get("batches", payload.get("resourceSpans", []))


def observe_negative_queries(
    *,
    queries: list,
    http_call,
    monotonic,
    sleep,
    min_window_s: float = NEGATIVE_MIN_S,
    max_window_s: float = NEGATIVE_MAX_S,
) -> None:
    started = monotonic()
    deadline = started + max_window_s
    min_complete = started + min_window_s
    completed_min_window = False
    while monotonic() < deadline:
        for query in queries:
            remaining = deadline - monotonic()
            if remaining <= 0:
                break
            timeout_s = query_timeout_s(remaining)
            if query["kind"] == "tempo":
                absent = tempo_absent(
                    http_call,
                    query["base"],
                    query["trace_id"],
                    timeout_s=timeout_s,
                )
                if not absent:
                    raise AssertionError(query["label"])
            else:
                payload = http_call(
                    query["base"],
                    query["path"],
                    query.get("params"),
                    timeout_s=timeout_s,
                )
                if payload.get("status") != "success" or payload.get("data", {}).get(
                    "result"
                ):
                    raise AssertionError(query["label"])
        if monotonic() >= min_complete:
            completed_min_window = True
            break
        sleep(min(1.0, max(0.0, min_complete - monotonic())))
    if not completed_min_window:
        raise RuntimeError("negative-window-incomplete")


def inject_privacy_canary(payloads: dict, *, canary: str, now: int) -> None:
    for payload in payloads.values():
        group = next(iter(payload.values()))[0]
        group["resource"]["attributes"].append(attr("private.payload", canary))
        scope_group = next(value for key, value in group.items() if key.startswith("scope"))[
            0
        ]
        scope_group["scope"]["version"] = canary
        scope_group["scope"]["attributes"] = [attr("private.scope", canary)]
    spans = payloads["traces"]["resourceSpans"][0]["scopeSpans"][0]["spans"]
    spans[0]["attributes"].append(attr("private.payload", canary))
    spans[0]["status"] = {"code": 2, "message": canary}
    spans[0]["events"] = [
        {"name": canary, "timeUnixNano": str(now), "attributes": [attr("secret", canary)]}
    ]
    spans[0]["links"] = [
        {
            "traceId": secrets.token_hex(16),
            "spanId": secrets.token_hex(8),
            "attributes": [attr("secret", canary)],
        }
    ]
    spans[0]["traceState"] = "secret=" + canary
    log = payloads["logs"]["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    log["attributes"].append(attr("private.payload", canary))
    log["severityText"] = canary
    log["eventName"] = canary
    metric = payloads["metrics"]["resourceMetrics"][0]["scopeMetrics"][0]["metrics"][0]
    metric["description"] = canary
    metric["unit"] = canary
    metric["metadata"] = [attr("private.metadata", canary)]
    datapoint = metric["sum"]["dataPoints"][0]
    datapoint["attributes"].append(attr("private.payload", canary))
    datapoint["exemplars"] = [
        {"timeUnixNano": str(now), "asInt": "7", "filteredAttributes": [attr("secret", canary)]}
    ]


def build_invalid_instance_submission(signal: str, run: str) -> tuple[str, dict]:
    trace = secrets.token_hex(16)
    parent = secrets.token_hex(8)
    child = secrets.token_hex(8)
    marker = "obs-e04-" + run
    now = time.time_ns()
    resource = base_resource(run)
    resource["attributes"][1] = attr("service.instance.id", INVALID_INSTANCE)
    payload = build_payloads(
        run=run,
        trace=trace,
        parent=parent,
        child=child,
        marker=marker,
        now=now,
        resource=resource,
    )
    return trace, payload[signal]


def build_invalid_allowed_key_submission(run: str) -> tuple[str, dict]:
    trace = secrets.token_hex(16)
    parent = secrets.token_hex(8)
    child = secrets.token_hex(8)
    marker = "obs-e04-" + run
    now = time.time_ns()
    resource = base_resource(run)
    resource["attributes"][2] = attr("deployment.environment.name", INVALID_ENV)
    payloads = build_payloads(
        run=run,
        trace=trace,
        parent=parent,
        child=child,
        marker=marker,
        now=now,
        resource=resource,
    )
    return trace, payloads


def run_probe(
    out: pathlib.Path,
    collector: str,
    prom: str,
    loki: str,
    tempo: str,
    *,
    replay: dict | None = None,
    mode: str = "normal",
    monotonic=time.monotonic,
    time_ns=time.time_ns,
    http_call=None,
    sleep=time.sleep,
) -> int:
    assert mode in ("normal", "tempo-outage", "privacy")
    assert not (replay and mode != "normal")

    if http_call is None:

        def http_call(base, path, params=None, data=None, *, timeout_s: float):
            return default_http_call(base, path, params, data, timeout_s=timeout_s)

    run = secrets.token_hex(8)
    trace = secrets.token_hex(16)
    parent = secrets.token_hex(8)
    child = secrets.token_hex(8)
    now = time_ns()
    marker = "obs-e04-" + run
    if replay:
        run, trace, parent, child, marker, now = (
            replay[k] for k in ("run", "trace", "parent", "child", "marker", "now")
        )

    payloads = build_payloads(
        run=run, trace=trace, parent=parent, child=child, marker=marker, now=now
    )

    if mode == "privacy":
        canary = "PRIVACY_CANARY_" + run
        positive = {}
        control_runs = {}
        control_traces = {}
        control_markers = {}
        control_parents = {}
        control_children = {}
        for signal in ("traces", "logs", "metrics"):
            control_run = secrets.token_hex(8)
            control_trace = secrets.token_hex(16)
            control_parent = secrets.token_hex(8)
            control_child = secrets.token_hex(8)
            control_marker = "obs-e04-" + control_run
            control_runs[signal] = control_run
            control_traces[signal] = control_trace
            control_markers[signal] = control_marker
            control_parents[signal] = control_parent
            control_children[signal] = control_child
            full_payloads = build_payloads(
                run=control_run,
                trace=control_trace,
                parent=control_parent,
                child=control_child,
                marker=control_marker,
                now=now,
            )
            inject_privacy_canary(full_payloads, canary=canary, now=now)
            positive[signal] = copy.deepcopy(full_payloads[signal])

        for signal, payload in positive.items():
            response = http_call(collector, f"/v1/{signal}", data=payload, timeout_s=HTTP_MAX_S)
            (out / f"positive-{signal}.receipt.json").write_text(json.dumps(response))
            partial = response.get("partialSuccess", {})
            assert not any(
                int(partial.get(key, 0)) for key in ("rejectedSpans", "rejectedLogRecords", "rejectedDataPoints")
            ), partial

        # R28 forbidden injections on independent deep copies.
        badrun = secrets.token_hex(8)
        badtrace = secrets.token_hex(16)
        bad = copy.deepcopy(build_payloads(
            run=badrun,
            trace=badtrace,
            parent=secrets.token_hex(8),
            child=secrets.token_hex(8),
            marker="obs-e04-" + badrun,
            now=now,
        ))
        for span in bad["traces"]["resourceSpans"][0]["scopeSpans"][0]["spans"]:
            span["name"] = canary
        bad["logs"]["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]["body"] = {
            "stringValue": canary
        }
        bad["metrics"]["resourceMetrics"][0]["scopeMetrics"][0]["metrics"][0]["name"] = (
            "offscreen_forbidden_" + badrun
        )
        bad["metrics"]["resourceMetrics"][0]["scopeMetrics"][0]["metrics"][0]["sum"][
            "dataPoints"
        ][0]["attributes"] = [attr("probe_run", badrun)]
        for signal, payload in bad.items():
            http_call(collector, f"/v1/{signal}", data=copy.deepcopy(payload), timeout_s=HTTP_MAX_S)

        spoofrun = secrets.token_hex(8)
        spooftrace = secrets.token_hex(16)
        spoof = copy.deepcopy(build_payloads(
            run=spoofrun,
            trace=spooftrace,
            parent=secrets.token_hex(8),
            child=secrets.token_hex(8),
            marker="obs-e04-" + spoofrun,
            now=now,
        ))
        for payload in spoof.values():
            group = next(iter(payload.values()))[0]
            group["resource"]["attributes"] = [
                attr("service.name", "forbidden-" + spoofrun),
                attr("deployment.environment.name", "synthetic"),
                attr("service.instance.id", spoofrun),
            ]
        for span in spoof["traces"]["resourceSpans"][0]["scopeSpans"][0]["spans"]:
            span["traceId"] = spooftrace
        spoof["logs"]["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]["body"] = {
            "stringValue": "obs-e04-" + spoofrun
        }
        spoof["metrics"]["resourceMetrics"][0]["scopeMetrics"][0]["metrics"][0]["sum"][
            "dataPoints"
        ][0]["attributes"] = [attr("probe_run", spoofrun)]
        for signal, payload in spoof.items():
            http_call(collector, f"/v1/{signal}", data=copy.deepcopy(payload), timeout_s=HTTP_MAX_S)

        invalid_instance_traces = {}
        for signal in ("traces", "logs", "metrics"):
            control_run = control_runs[signal]
            trace_id, payload = build_invalid_instance_submission(signal, control_run)
            invalid_instance_traces[signal] = trace_id
            http_call(collector, f"/v1/{signal}", data=payload, timeout_s=HTTP_MAX_S)

        allowed_key_run = secrets.token_hex(8)
        allowed_key_trace, allowed_payloads = build_invalid_allowed_key_submission(
            allowed_key_run
        )
        for signal, payload in allowed_payloads.items():
            http_call(collector, f"/v1/{signal}", data=payload, timeout_s=HTTP_MAX_S)

        privacy_identities = dict(
            canary=canary,
            badtrace=badtrace,
            badrun=badrun,
            spoofrun=spoofrun,
            spooftrace=spooftrace,
            control_runs=control_runs,
            control_traces=control_traces,
            control_markers=control_markers,
            invalid_instance_traces=invalid_instance_traces,
            allowed_key_trace=allowed_key_trace,
            allowed_key_run=allowed_key_run,
        )
        (out / "privacy-identities.json").write_text(json.dumps(privacy_identities))

        # Positive queries for privacy controls use each signal's own IDs.
        checks = {
            "trace-traces": (
                tempo,
                f"/api/traces/{control_traces['traces']}",
                None,
                trace_check,
                {
                    "trace": control_traces["traces"],
                    "parent": control_parents["traces"],
                    "child": control_children["traces"],
                },
            ),
            "log-logs": (
                loki,
                "/loki/api/v1/query_range",
                {
                    "query": '{service_name="' + SERVICE + '"} |= "' + control_markers["logs"] + '"',
                    "start": str(now - 60_000_000_000),
                    "end": str(now + 60_000_000_000),
                },
                logs_check,
                {
                    "trace": control_traces["logs"],
                    "child": control_children["logs"],
                    "marker": control_markers["logs"],
                },
            ),
            "metric-metrics": (
                prom,
                "/api/v1/query",
                {
                    "query": 'offscreen_probe_events_total{probe_run="'
                    + control_runs["metrics"]
                    + '"}'
                },
                metrics_check,
                {"run": control_runs["metrics"]},
            ),
        }
        pending = observe_positive_queries(
            checks=checks,
            out=out,
            http_call=http_call,
            monotonic=monotonic,
            deadline=monotonic() + POSITIVE_QUERY_S,
            sleep=sleep,
        )
        assert not pending, pending
        for name in checks:
            assert canary not in (out / f"{name}.query.json").read_text(), name

        negative_queries = [
            {
                "kind": "tempo",
                "base": tempo,
                "trace_id": badtrace,
                "label": "forbidden-trace",
            },
            {
                "kind": "tempo",
                "base": tempo,
                "trace_id": spooftrace,
                "label": "spoof-trace",
            },
            {
                "kind": "tempo",
                "base": tempo,
                "trace_id": allowed_key_trace,
                "label": "invalid-allowed-key-trace",
            },
        ]
        for signal, trace_id in invalid_instance_traces.items():
            negative_queries.append(
                {
                    "kind": "tempo",
                    "base": tempo,
                    "trace_id": trace_id,
                    "label": f"invalid-instance-{signal}",
                }
            )
        negative_queries.extend(
            [
                {
                    "kind": "loki",
                    "base": loki,
                    "path": "/loki/api/v1/query_range",
                    "params": {
                        "query": '{service_name="' + SERVICE + '"} |= "' + canary + '"',
                        "start": str(now - 60_000_000_000),
                        "end": str(time_ns()),
                    },
                    "label": "forbidden-log-marker",
                },
                {
                    "kind": "loki",
                    "base": loki,
                    "path": "/loki/api/v1/query_range",
                    "params": {
                        "query": '{service_name="forbidden-' + spoofrun + '"}',
                        "start": str(now - 60_000_000_000),
                        "end": str(time_ns()),
                    },
                    "label": "spoof-log-service",
                },
                {
                    "kind": "prom",
                    "base": prom,
                    "path": "/api/v1/query",
                    "params": {"query": '{__name__=~"offscreen_forbidden_' + badrun + '.*"}'},
                    "label": "forbidden-metric",
                },
                {
                    "kind": "prom",
                    "base": prom,
                    "path": "/api/v1/query",
                    "params": {"query": 'offscreen_probe_events_total{probe_run="' + spoofrun + '"}'},
                    "label": "spoof-metric",
                },
                {
                    "kind": "prom",
                    "base": prom,
                    "path": "/api/v1/query",
                    "params": {
                        "query": 'offscreen_probe_events_total{probe_run="' + allowed_key_run + '"}'
                    },
                    "label": "invalid-allowed-key-metric",
                },
            ]
        )
        try:
            http_call(
                prom,
                "/api/v1/metadata",
                params={"metric": "offscreen_probe_events"},
                timeout_s=HTTP_MAX_S,
            )
            (out / "metadata.query.json").write_text('{"status":"queried"}')
        except (RuntimeError, OSError, urllib.error.URLError) as error:
            (out / "metadata.visibility.txt").write_text(str(error))
        try:
            http_call(
                prom,
                "/api/v1/query_exemplars",
                params={"query": 'offscreen_probe_events_total{probe_run="' + control_runs["metrics"] + '"}'},
                timeout_s=HTTP_MAX_S,
            )
            (out / "exemplar.query.json").write_text('{"status":"queried"}')
        except (RuntimeError, OSError, urllib.error.URLError) as error:
            (out / "exemplar.visibility.txt").write_text(str(error))

        observe_negative_queries(
            queries=negative_queries,
            http_call=http_call,
            monotonic=monotonic,
            sleep=sleep,
        )
        print("PRIVACY PASS", flush=True)
        return 0

    (out / "identity.json").write_text(
        json.dumps(
            dict(run=run, trace=trace, parent=parent, child=child, marker=marker, now=now),
            indent=2,
        )
    )
    if not replay:
        for signal, payload in payloads.items():
            response = http_call(collector, f"/v1/{signal}", data=payload, timeout_s=HTTP_MAX_S)
            (out / f"{signal}.receipt.json").write_text(json.dumps(response))
            partial = response.get("partialSuccess", {})
            assert not any(
                int(partial.get(key, 0))
                for key in ("rejectedSpans", "rejectedLogRecords", "rejectedDataPoints")
            ), partial
            print("OTLP accepted", signal, flush=True)

    checks = {
        "trace": (
            tempo,
            f"/api/traces/{trace}",
            None,
            trace_check,
            {"trace": trace, "parent": parent, "child": child},
        ),
        "log": (
            loki,
            "/loki/api/v1/query_range",
            {
                "query": '{service_name="' + SERVICE + '"} |= "' + marker + '"',
                "start": str(now - 60_000_000_000),
                "end": str(now + 60_000_000_000),
            },
            logs_check,
            {"trace": trace, "child": child, "marker": marker},
        ),
        "metric": (
            prom,
            "/api/v1/query",
            {
                "query": 'offscreen_probe_events_total{probe_run="' + run + '"}',
                **({"time": str(now / 1e9 + 2)} if replay else {}),
            },
            metrics_check,
            {"run": run},
        ),
    }
    pending = {"log", "metric"} if mode == "tempo-outage" else set(checks)
    deadline = monotonic() + POSITIVE_QUERY_S
    while pending and monotonic() < deadline:
        for name in sorted(pending):
            base, path, params, check, ctx = checks[name]
            remaining = deadline - monotonic()
            if remaining <= 0:
                break
            try:
                payload = http_call(
                    base,
                    path,
                    params=params,
                    timeout_s=query_timeout_s(remaining),
                )
                (out / f"{name}.query.json").write_text(json.dumps(payload, indent=2))
                if check(payload, **ctx):
                    print("PASS", name, flush=True)
                    pending.remove(name)
            except (OSError, ValueError, RuntimeError, urllib.error.URLError) as error:
                (out / f"{name}.error.txt").write_text(str(error))
        if pending:
            sleep(2)
    label = "ISOLATION" if mode == "tempo-outage" else ("QUERY" if replay else "SIGNAL")
    print(label, "PASS" if not pending else "FAIL: " + ",".join(sorted(pending)), flush=True)
    return int(bool(pending))


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv
    out = pathlib.Path(argv[1])
    collector, prom, loki, tempo = argv[2:6]
    replay = json.loads(argv[6]) if len(argv) >= 7 and argv[6] else None
    mode = argv[7] if len(argv) == 8 else "normal"
    return run_probe(
        out,
        collector,
        prom,
        loki,
        tempo,
        replay=replay,
        mode=mode,
    )


if __name__ == "__main__":
    raise SystemExit(main())