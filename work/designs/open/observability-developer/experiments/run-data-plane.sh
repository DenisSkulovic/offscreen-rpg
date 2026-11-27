#!/usr/bin/env bash
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "$0")" && pwd)"
RELAY="${1:?rendered relay.yaml required}"
OUT="$(mktemp -d /tmp/offscreen-obs-data-plane.XXXXXXXX)"
echo "Evidence directory: $OUT"
IMAGE=ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib@sha256:e40d61f10c9a617cca1ffd1be4d7e2b3a4b0f0001798ff07e58cabe82e618cea
PYIMAGE=docker.io/library/python@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b
PROMIMAGE=quay.io/prometheus/prometheus@sha256:9332054523223e2ddc18d8101799d54a4a8d823b030c53216f063a6c117773cd
docker image inspect "$IMAGE" "$PYIMAGE" "$PROMIMAGE" >/dev/null
python3 - "$RELAY" "$OUT/relay.yaml" <<'PY'
import pathlib,sys,yaml
src,dst=map(pathlib.Path,sys.argv[1:])
cfg=yaml.safe_load(src.read_text())
cfg["exporters"]={"debug/experiment":{"verbosity":"detailed","sampling_initial":1000,"sampling_thereafter":1}, "otlp_http/prometheus": {"endpoint":"http://127.0.0.1:9090/api/v1/otlp","timeout":"3s"}}
for pipeline in cfg["service"]["pipelines"].values():
    pipeline["exporters"]=["debug/experiment"]
cfg["service"]["pipelines"]["metrics/developer"]["exporters"].append("otlp_http/prometheus")
dst.write_text(yaml.safe_dump(cfg,sort_keys=False))
PY
# docker cp into a stopped disposable container avoids WSL mount translation and
# environment-provider interpolation. Writable container layer only; no host mounts.
COMMON=(--pull=never --cap-drop ALL --security-opt no-new-privileges)
timeout 60s docker run --rm --interactive "${COMMON[@]}" --read-only --network none --memory 256m --cpus 1 -e MY_POD_IP=127.0.0.1 "$IMAGE" validate --config=file:/dev/stdin <"$OUT/relay.yaml"
CID=""
PID=""
PROM=""
cleanup() {
  rc=$?
  trap - EXIT
  if [[ -n "$PID" ]]; then docker rm -f "$PID" >/dev/null 2>&1 || true; fi
  if [[ -n "$PROM" ]]; then docker logs "$PROM" >"$OUT/prometheus.log" 2>&1 || true; docker rm -f "$PROM" >/dev/null 2>&1 || true; fi
  if [[ -n "$CID" ]]; then docker logs "$CID" >"$OUT/collector.log" 2>&1 || true; docker rm -f "$CID" >/dev/null 2>&1 || true; fi
  echo "Evidence directory: $OUT"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
CID="$(docker create "${COMMON[@]}" --network none --memory 256m --cpus 1 -e MY_POD_IP=127.0.0.1 "$IMAGE" --config=file:/tmp/relay.yaml)"
docker cp "$OUT/relay.yaml" "$CID:/tmp/relay.yaml"
docker start "$CID" >/dev/null
cat >"$OUT/prometheus.yaml" <<'YAML'
global:
  scrape_interval: 15s
otlp:
  promote_resource_attributes: [deployment.environment.name, service.namespace, service.name]
scrape_configs: []
YAML
PROM="$(docker create "${COMMON[@]}" --network "container:$CID" --memory 512m --cpus 1 "$PROMIMAGE" --config.file=/tmp/experiment-prometheus.yaml --storage.tsdb.path=/tmp/experiment-tsdb --web.enable-otlp-receiver --web.listen-address=127.0.0.1:9090)"
docker cp "$OUT/prometheus.yaml" "$PROM:/tmp/experiment-prometheus.yaml"
docker start "$PROM" >/dev/null
PID="$(docker create -i "${COMMON[@]}" --network "container:$CID" --memory 128m --cpus 1 "$PYIMAGE" python3 -)"
timeout 90s docker start -ai "$PID" <"$HERE/data-plane.py" | tee "$OUT/submissions.txt"
sleep 5
echo "=== PROMETHEUS SERIES AND VALUES ==="
timeout 45s docker run --rm -i "${COMMON[@]}" --read-only --network "container:$CID" --memory 128m "$PYIMAGE" python3 - <<'PY'
import json,time,urllib.request,urllib.parse
def query(expr):
    u="http://127.0.0.1:9090/api/v1/query?"+urllib.parse.urlencode({"query":expr})
    with urllib.request.urlopen(u,timeout=3) as r:
        return json.load(r)["data"]["result"]
for attempt in range(15):
    rows=query('{__name__=~"offscreen_agent_.*"}')
    if rows: break
    time.sleep(1)
assert rows, "No application metrics"
print(json.dumps(rows,indent=2))
for row in rows:
    assert not any("run" in k or "trace" in k for k in row["metric"] if k!="__name__"), row
    assert float(row["value"][1]) not in (987654321,987654322,987654323),row
assert len(rows)<=12,rows
print("PROMETHEUS SERIES CHECK PASS")
PY
docker logs "$CID" >"$OUT/collector.log" 2>&1
python3 - "$OUT/collector.log" <<'PY'
import pathlib,sys
s=pathlib.Path(sys.argv[1]).read_text()
required=["developer.parent","developer.child","developer.completed","developer.final.control",
          "offscreen.agent.runs","offscreen.agent.active","offscreen.agent.duration",
          "0123456789abcdef","1234567890abcdef1234567890abcdef"]
forbidden=["drop_resource_canary","drop_scope_canary","drop_status_canary","drop_severity_canary",
           "drop_attribute_canary","drop_description_canary","negative.unknown.service",
           "negative.environment","negative.invalid.attribute","negative.invalid.outcome",
           "negative.cross.lane","987654321","987654322","987654323","offscreen.forbidden.metric"]
for v in required:
    assert v in s, "missing "+v
for v in forbidden:
    assert v not in s, "unexpected "+v
print("DATA PLANE MARKER CHECK PASS")
PY
# Retain full controlled debug output for planner inspection of exact records,
# parent linkage, numeric points and exporter behavior. Marker checks alone are not proof.
cat "$OUT/collector.log"
