#!/usr/bin/env python3
"""Synthetic lab HTTP backends.

These processes are not the game, not a database, and not an authorization
service. Proxy headers are echoed and then ignored.
"""

import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROLE = os.environ.get("ROLE", "web")
PORT = int(os.environ.get("PORT", "8080"))

# Kept in sync with infra/verification/smoke/gateway/long-stream.mjs
LONG_SSE_EVENT_DELAYS_S = (0, 15, 30, 45)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        return

    def _send(self, code, body, content_type="text/plain; charset=utf-8"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _json(self, code, payload):
        self._send(code, json.dumps(payload, sort_keys=True) + "\n", "application/json")

    def _identity(self):
        return {
            "decision": "unauthorized",
            "gateway-is-not-authorization": True,
            "seen-forwarded-for": self.headers.get("X-Forwarded-For", ""),
            "seen-forwarded-user": self.headers.get("X-Forwarded-User", ""),
            "trusted-role": "none",
        }

    def _chunk(self, payload):
        data = payload if isinstance(payload, bytes) else payload.encode()
        self.wfile.write(f"{len(data):x}\r\n".encode())
        self.wfile.write(data)
        self.wfile.write(b"\r\n")
        self.wfile.flush()

    def _sse(self, prefix):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()
        for index in (1, 2, 3):
            self._chunk(f"data: {prefix}-event-{index}\n\n")
            if index < 3:
                time.sleep(0.45)
        self.wfile.write(b"0\r\n\r\n")
        self.wfile.flush()
        self.close_connection = True

    def _sse_long(self, prefix, delays=LONG_SSE_EVENT_DELAYS_S):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()
        started = time.monotonic()
        for index, scheduled in enumerate(delays, start=1):
            elapsed = time.monotonic() - started
            wait = scheduled - elapsed
            if wait > 0:
                time.sleep(wait)
            self._chunk(f"data: {prefix}-event-{index}\n\n")
        self.wfile.write(b"0\r\n\r\n")
        self.wfile.flush()
        self.close_connection = True

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/healthz":
            self._send(200, "health-ok\n")
            return
        if ROLE == "web":
            if path == "/":
                self._json(200, {"body": "web-ok", "role": "web", **self._identity()})
                return
            if path == "/events":
                self._sse("web")
                return
            self._send(404, "web-not-found\n")
            return
        if path in ("/api", "/api/"):
            self._json(200, {"body": "api-ok", "role": "api", **self._identity()})
            return
        if path == "/api/events":
            self._sse("api")
            return
        if path == "/api/events/long":
            self._sse_long("api")
            return
        self._send(404, "api-not-found\n")

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(min(max(length, 0), 4096)) if length else b""
        if ROLE == "api" and path == "/api/hooks/example":
            self._json(
                200,
                {
                    "body": "hook-accepted-unsigned",
                    "bytes": len(raw),
                    "decision": "unauthorized",
                    "gateway-is-not-authorization": True,
                    "role": "api",
                    "signature-checked": False,
                    "signature-header-present": bool(self.headers.get("Stripe-Signature")),
                    "trusted-role": "none",
                },
            )
            return
        self._send(404, "api-not-found\n")


def main():
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
