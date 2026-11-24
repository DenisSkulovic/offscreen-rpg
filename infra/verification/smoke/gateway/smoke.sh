#!/usr/bin/env bash
# Smoke the lab Gateway: routes, missing backend, SSE, loopback, and rejected proxy identity.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Run infra/verification/smoke/gateway/setup.sh after platform install before this script.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../../clusters/kind/release/lib.sh"
GATEWAY_SMOKE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing smoke: kubectl context ${CONTEXT_NAME} is unreadable or absent." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-edge get httproute lab-edge-routes >/dev/null 2>&1; then
  echo "HTTPRoute lab-edge-routes is absent. Run ${GATEWAY_SMOKE_ROOT}/setup.sh first." >&2
  exit 1
fi

LOCAL_PORT=18080
pf_pid=""
work="$(mktemp -d)"

cleanup() {
  local status=$?
  if [[ -n "${pf_pid}" ]]; then
    kill "${pf_pid}" >/dev/null 2>&1 || true
    wait "${pf_pid}" >/dev/null 2>&1 || true
  fi
  rm -rf "$work"
  exit "$status"
}
trap cleanup EXIT

snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

echo "MemAvailable KiB: $(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
"${KUBECTL[@]}" -n gateway-system get deployment lab-gateway-traefik -o wide
"${KUBECTL[@]}" -n lab-edge get gateway,httproute,deploy,svc,endpoints
"${KUBECTL[@]}" -n gateway-system get svc lab-gateway-traefik -o wide

assert_loopback_only

"${KUBECTL[@]}" -n gateway-system port-forward --address 127.0.0.1 svc/lab-gateway-traefik "${LOCAL_PORT}:80" >"$work/port-forward.log" 2>&1 &
pf_pid=$!

ready=0
for _ in $(seq 1 30); do
  if python3 - "$LOCAL_PORT" <<'PY'
import sys, urllib.request
port = sys.argv[1]
try:
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1) as response:
        raise SystemExit(0 if response.status == 200 else 1)
except Exception:
    raise SystemExit(1)
PY
  then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "Loopback port-forward did not become ready." >&2
  cat "$work/port-forward.log" >&2
  exit 1
fi

python3 - "$LOCAL_PORT" <<'PY'
import json, socket, ssl, sys, time, urllib.error, urllib.request

port = int(sys.argv[1])
base = f"http://127.0.0.1:{port}"

def request(method, path, headers=None, body=None, timeout=5):
    data = body.encode() if isinstance(body, str) else body
    req = urllib.request.Request(base + path, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.read(), dict(response.headers.items())
    except urllib.error.HTTPError as error:
        return error.code, error.read(), dict(error.headers.items())

def expect(status, actual, label):
    if actual != status:
        raise SystemExit(f"{label}: expected HTTP {status}, got {actual}")
    print(f"pass {label} {actual}")

status, body, _headers = request("GET", "/")
expect(200, status, "GET /")
web = json.loads(body.decode())
if web.get("body") != "web-ok" or web.get("role") != "web":
    raise SystemExit(f"GET / body was not the web backend: {body!r}")
if web.get("decision") != "unauthorized" or web.get("trusted-role") != "none":
    raise SystemExit(f"GET / treated the gateway as authorization: {web}")

status, body, _headers = request("GET", "/api")
expect(200, status, "GET /api")
api = json.loads(body.decode())
if api.get("body") != "api-ok" or api.get("role") != "api":
    raise SystemExit(f"GET /api body was not the API backend: {body!r}")

status, body, _headers = request(
    "GET",
    "/api",
    headers={"X-Forwarded-For": "203.0.113.9", "X-Forwarded-User": "admin"},
)
expect(200, status, "GET /api spoofed identity")
spoofed = json.loads(body.decode())
if spoofed.get("decision") != "unauthorized" or spoofed.get("trusted-role") != "none":
    raise SystemExit(f"spoofed proxy headers were trusted: {spoofed}")
if spoofed.get("gateway-is-not-authorization") is not True:
    raise SystemExit(f"backend dropped the authorization refusal: {spoofed}")
seen_for = spoofed.get("seen-forwarded-for", "")
if seen_for.strip() == "203.0.113.9":
    raise SystemExit(f"gateway kept only the client-supplied X-Forwarded-For: {seen_for!r}")
print(f"pass forwarded-for not sole spoof {seen_for!r}")

status, body, _headers = request(
    "POST",
    "/api/hooks/example",
    headers={"Content-Type": "application/json", "Stripe-Signature": "t=1,v1=fake"},
    body='{"type":"lab.ping"}',
)
expect(200, status, "POST /api/hooks/example")
hook = json.loads(body.decode())
if hook.get("body") != "hook-accepted-unsigned" or hook.get("signature-checked") is not False:
    raise SystemExit(f"webhook signature was treated as verified: {hook}")
if hook.get("decision") != "unauthorized":
    raise SystemExit(f"webhook route authorized the caller: {hook}")
print("pass unsigned webhook was not verified")

status, body, _headers = request("GET", "/api/absent")
expect(503, status, "GET /api/absent missing backend")
print(f"missing-backend body {body[:180]!r}")

status, body, _headers = request("GET", "/no-such")
expect(404, status, "GET /no-such unmatched route")

status, body, _headers = request("GET", "/api/no-such")
expect(404, status, "GET /api/no-such")
if b"api-not-found" not in body:
    raise SystemExit(f"/api/no-such did not reach the API backend: {body!r}")

def read_sse(path):
    import subprocess
    started = time.monotonic()
    arrivals = []
    proc = subprocess.Popen(
        ["curl", "-N", "-sS", "--max-time", "8", "-D", "-", "-H", "Accept: text/event-stream", base + path],
        stdout=subprocess.PIPE,
    )
    assert proc.stdout is not None
    header = b""
    while b"\r\n\r\n" not in header:
        chunk = proc.stdout.read(1)
        if not chunk:
            raise SystemExit(f"{path}: curl closed before headers: {header!r}")
        header += chunk
    head, rest = header.split(b"\r\n\r\n", 1)
    status_line = head.split(b"\r\n", 1)[0].decode()
    if " 200 " not in status_line:
        raise SystemExit(f"{path}: {status_line}")
    if b"text/event-stream" not in head.lower():
        raise SystemExit(f"{path}: headers were {head!r}")
    buffer = rest
    while len(arrivals) < 3:
        if b"\n\n" not in buffer:
            chunk = proc.stdout.read(1)
            if not chunk:
                break
            buffer += chunk
            continue
        event, buffer = buffer.split(b"\n\n", 1)
        text = event.decode().strip()
        if text.startswith("data:"):
            arrivals.append((time.monotonic() - started, text))
    proc.kill()
    return arrivals

for path, prefix in (("/events", "web-event"), ("/api/events", "api-event")):
    arrivals = read_sse(path)
    names = [item[1] for item in arrivals]
    expected = [f"data: {prefix}-1", f"data: {prefix}-2", f"data: {prefix}-3"]
    if names != expected:
        raise SystemExit(f"{path}: stream was cut or reordered: {names}")
    gap = arrivals[2][0] - arrivals[0][0]
    if gap < 0.6:
        raise SystemExit(f"{path}: events arrived together after {gap:.3f}s, so the stream was buffered")
    print(f"pass {path} streamed 3 events over {gap:.3f}s")

try:
    sock = socket.create_connection(("127.0.0.1", port), 2)
    context = ssl.create_default_context()
    context.wrap_socket(sock, server_hostname="localhost")
except ssl.SSLError:
    print("pass TLS handshake rejected on the plain listener")
else:
    raise SystemExit("TLS handshake succeeded; the plain-loopback exception was not in force")

print("pass synthetic gateway smoke")
PY

echo "Host listeners on ${LOCAL_PORT}:"
if command -v ss >/dev/null; then
  ss -ltn | grep "${LOCAL_PORT}" | tee "$work/listeners.txt"
else
  python3 - "$LOCAL_PORT" <<'PY' | tee "$work/listeners.txt"
import socket, sys
port = int(sys.argv[1])
needle = f"{port:04X}"
for family, path in ((socket.AF_INET, "/proc/net/tcp"), (socket.AF_INET6, "/proc/net/tcp6")):
    try:
        lines = open(path).read().splitlines()[1:]
    except FileNotFoundError:
        continue
    for line in lines:
        local = line.split()[1]
        if local.endswith(":" + needle):
            print(local)
PY
fi
if grep -E '0\.0\.0\.0:'"${LOCAL_PORT}"'|\[::\]:'"${LOCAL_PORT}"'|^\*:'"${LOCAL_PORT}" "$work/listeners.txt"; then
  echo "Published port ${LOCAL_PORT} is not loopback-only." >&2
  exit 1
fi
if ! grep -q "127.0.0.1:${LOCAL_PORT}" "$work/listeners.txt"; then
  echo "127.0.0.1:${LOCAL_PORT} is not listening." >&2
  exit 1
fi

python3 - "$LOCAL_PORT" <<'PY'
import socket, sys
port = int(sys.argv[1])
addresses = []
try:
    addresses = [item[4][0] for item in socket.getaddrinfo(socket.gethostname(), None) if item[0] == socket.AF_INET]
except socket.gaierror:
    addresses = []
checked = 0
for address in addresses:
    if address.startswith("127."):
        continue
    checked += 1
    sock = socket.socket()
    sock.settimeout(1)
    try:
        result = sock.connect_ex((address, port))
    finally:
        sock.close()
    if result == 0:
        raise SystemExit(f"port {port} accepted a connection on {address}")
    print(f"pass {address}:{port} refused or unreachable ({result})")
if checked == 0:
    print("pass no non-loopback IPv4 address to probe")
PY

echo "Cluster container ports:"
docker ps --filter "name=${CLUSTER_NAME}" --format '{{.Names}} {{.Ports}}'
mapfile -t cluster_ids < <(docker ps -q --filter "name=${CLUSTER_NAME}")
if [[ ${#cluster_ids[@]} -gt 0 ]]; then
  docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' "${cluster_ids[@]}"
fi

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"

echo "Gateway smoke passed."
