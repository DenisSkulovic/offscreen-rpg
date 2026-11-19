#!/usr/bin/env python3
"""Synthetic two-hop OpenTelemetry source for the disposable lab.

This process is not the game, not an API, and not a worker. It exports one
trace across hop-a and hop-b, and one failure signal when hop-b cannot be
reached. Attribute keys and values stay on a fixed allowlist. A request
cannot place a player identifier, story text, or secret into the export.
"""

from __future__ import annotations

import json
import os
import re
import secrets
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROLE = os.environ.get("ROLE", "")
PORT = int(os.environ.get("PORT", "8080"))
COLLECTOR = os.environ.get("COLLECTOR_URL", "http://otel-collector:4318").rstrip("/")
PEER = os.environ.get("PEER_URL", "http://hop-b:8080/hop")
SERVICE = "synthetic-hop-a" if ROLE == "a" else "synthetic-hop-b"
FAILURE = "second_hop_missing"

OP_RE = re.compile(r"^lab-op-[0-9a-f]{16}$")
TRACEPARENT_RE = re.compile(r"^00-([0-9a-f]{32})-([0-9a-f]{16})-01$")
SPAN_RE = re.compile(r"^[0-9a-f]{16}$")

FIXED = {
    "service.name": {"synthetic-hop-a", "synthetic-hop-b"},
    "hop": {"a", "b"},
    "failure.signal": {FAILURE},
    "peer.name": {"hop-b"},
}


class RejectedTelemetry(Exception):
    pass


def attributes(pairs):
    rendered = []
    for key, value in pairs:
        if key == "operation.id":
            if not OP_RE.fullmatch(value):
                raise RejectedTelemetry("rejected-operation-id")
        elif value not in FIXED.get(key, ()):
            raise RejectedTelemetry("rejected-attribute")
        rendered.append({"key": key, "value": {"stringValue": value}})
    return rendered


def new_hex(nbytes):
    return secrets.token_hex(nbytes)


def now_ns():
    return str(time.time_ns())


def resource():
    return {"attributes": attributes([("service.name", SERVICE)])}


def post(path, payload):
    data = json.dumps(payload).encode()
    request = urllib.request.Request(
        COLLECTOR + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            body = response.read()
    except urllib.error.HTTPError as exc:
        exc.read()
        raise RejectedTelemetry("collector-rejected") from None
    except urllib.error.URLError:
        raise RejectedTelemetry("collector-unreachable") from None
    if not body:
        return
    parsed = json.loads(body.decode() or "{}")
    partial = parsed.get("partialSuccess") if isinstance(parsed, dict) else None
    if not isinstance(partial, dict):
        return
    for field in ("rejectedSpans", "rejectedLogRecords", "rejectedDataPoints"):
        if int(partial.get(field) or 0) > 0:
            raise RejectedTelemetry("collector-rejected")


def export_span(trace_id, span_id, parent_span_id, name, kind, start, end, pairs, failed):
    span = {
        "traceId": trace_id,
        "spanId": span_id,
        "name": name,
        "kind": kind,
        "startTimeUnixNano": start,
        "endTimeUnixNano": end,
        "attributes": attributes(pairs),
        "status": {"code": 2, "message": FAILURE} if failed else {"code": 1},
    }
    if parent_span_id:
        span["parentSpanId"] = parent_span_id
    post(
        "/v1/traces",
        {
            "resourceSpans": [
                {
                    "resource": resource(),
                    "scopeSpans": [
                        {
                            "scope": {"name": "lab-observability"},
                            "spans": [span],
                        }
                    ],
                }
            ]
        },
    )


def export_failure_signal(trace_id, span_id, operation_id, when):
    post(
        "/v1/logs",
        {
            "resourceLogs": [
                {
                    "resource": resource(),
                    "scopeLogs": [
                        {
                            "scope": {"name": "lab-observability"},
                            "logRecords": [
                                {
                                    "timeUnixNano": when,
                                    "observedTimeUnixNano": when,
                                    "severityNumber": 17,
                                    "severityText": "ERROR",
                                    "body": {"stringValue": FAILURE},
                                    "attributes": attributes(
                                        [
                                            ("operation.id", operation_id),
                                            ("failure.signal", FAILURE),
                                            ("hop", "a"),
                                        ]
                                    ),
                                    "traceId": trace_id,
                                    "spanId": span_id,
                                }
                            ],
                        }
                    ],
                }
            ]
        },
    )
    post(
        "/v1/metrics",
        {
            "resourceMetrics": [
                {
                    "resource": resource(),
                    "scopeMetrics": [
                        {
                            "scope": {"name": "lab-observability"},
                            "metrics": [
                                {
                                    "name": "synthetic_second_hop_missing",
                                    "unit": "1",
                                    "sum": {
                                        "aggregationTemporality": 2,
                                        "isMonotonic": True,
                                        "dataPoints": [
                                            {
                                                "startTimeUnixNano": when,
                                                "timeUnixNano": when,
                                                "asInt": "1",
                                                "attributes": attributes(
                                                    [("failure.signal", FAILURE)]
                                                ),
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
    )


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        return

    def _send(self, code, payload):
        data = (json.dumps(payload, sort_keys=True) + "\n").encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/healthz":
            self._send(200, {"result": "health-ok"})
            return
        if ROLE == "b" and path == "/hop":
            self._hop_b()
            return
        if ROLE == "a" and path == "/call":
            self._hop_a()
            return
        self._send(404, {"result": "not-found"})

    def _hop_b(self):
        match = TRACEPARENT_RE.fullmatch((self.headers.get("traceparent") or "").strip())
        operation_id = (self.headers.get("X-Operation-Id") or "").strip()
        if not match or not OP_RE.fullmatch(operation_id):
            self._send(400, {"result": "rejected-context"})
            return
        trace_id, parent = match.group(1), match.group(2)
        span_id = new_hex(8)
        start = now_ns()
        end = now_ns()
        try:
            export_span(
                trace_id,
                span_id,
                parent,
                "synthetic.hop_b",
                2,
                start,
                end,
                [("operation.id", operation_id), ("hop", "b")],
                False,
            )
        except RejectedTelemetry:
            self._send(502, {"result": "telemetry-export-failed"})
            return
        self._send(
            200,
            {
                "result": "hop-b",
                "trace_id": trace_id,
                "span_id": span_id,
                "parent_span_id": parent,
                "operation_id": operation_id,
            },
        )

    def _fail(self, trace_id, span_id, operation_id, start):
        end = now_ns()
        try:
            export_span(
                trace_id,
                span_id,
                "",
                "synthetic.hop_a",
                3,
                start,
                end,
                [
                    ("operation.id", operation_id),
                    ("hop", "a"),
                    ("peer.name", "hop-b"),
                    ("failure.signal", FAILURE),
                ],
                True,
            )
            export_failure_signal(trace_id, span_id, operation_id, end)
        except RejectedTelemetry:
            self._send(502, {"result": "telemetry-export-failed"})
            return
        self._send(
            503,
            {
                "result": "second-hop-missing",
                "failure": FAILURE,
                "trace_id": trace_id,
                "span_id": span_id,
                "operation_id": operation_id,
            },
        )

    def _hop_a(self):
        trace_id = new_hex(16)
        span_id = new_hex(8)
        operation_id = "lab-op-" + new_hex(8)
        start = now_ns()
        request = urllib.request.Request(
            PEER,
            headers={
                "traceparent": f"00-{trace_id}-{span_id}-01",
                "X-Operation-Id": operation_id,
            },
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=2) as response:
                child = json.loads(response.read().decode())
        except (urllib.error.URLError, TimeoutError):
            self._fail(trace_id, span_id, operation_id, start)
            return
        except json.JSONDecodeError:
            self._send(502, {"result": "second-hop-rejected"})
            return
        child_span = child.get("span_id", "")
        if (
            child.get("trace_id") != trace_id
            or child.get("operation_id") != operation_id
            or child.get("parent_span_id") != span_id
            or not SPAN_RE.fullmatch(child_span)
        ):
            self._send(502, {"result": "second-hop-rejected"})
            return
        end = now_ns()
        try:
            export_span(
                trace_id,
                span_id,
                "",
                "synthetic.hop_a",
                3,
                start,
                end,
                [
                    ("operation.id", operation_id),
                    ("hop", "a"),
                    ("peer.name", "hop-b"),
                ],
                False,
            )
        except RejectedTelemetry:
            self._send(502, {"result": "telemetry-export-failed"})
            return
        self._send(
            200,
            {
                "result": "two-hop",
                "trace_id": trace_id,
                "span_id": span_id,
                "child_span_id": child_span,
                "operation_id": operation_id,
            },
        )


def main():
    if ROLE not in {"a", "b"}:
        raise SystemExit("ROLE must be a or b")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
