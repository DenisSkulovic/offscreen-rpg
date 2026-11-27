#!/usr/bin/env bash
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "$0")" && pwd)"
RELAY="${1:?rendered relay.yaml required}"
OUT="$(mktemp -d /tmp/offscreen-obs-data-plane.XXXXXXXX)"
echo "Evidence directory: $OUT"
IMAGE=ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib@sha256:e40d61f10c9a617cca1ffd1be4d7e2b3a4b0f0001798ff07e58cabe82e618cea
PYIMAGE=docker.io/library/python@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b
docker image inspect "$IMAGE" "$PYIMAGE" >/dev/null
python3 - "$RELAY" "$OUT/relay.yaml" <<'PY'
import pathlib,sys,yaml
src,dst=map(pathlib.Path,sys.argv[1:])
cfg=yaml.safe_load(src.read_text())
cfg["exporters"]={"debug/experiment":{"verbosity":"detailed","sampling_initial":1000,"sampling_thereafter":1}}
for pipeline in cfg["service"]["pipelines"].values():
    pipeline["exporters"]=["debug/experiment"]
dst.write_text(yaml.safe_dump(cfg,sort_keys=False))
PY
# No host bind mounts; env contains only synthetic configuration, not credentials.
export OBS_EXPERIMENT_CONFIG="$(cat "$OUT/relay.yaml")"
COMMON=(--pull=never --read-only --cap-drop ALL --security-opt no-new-privileges)
timeout 60s docker run --rm "${COMMON[@]}" --network none --memory 256m --cpus 1 -e MY_POD_IP=127.0.0.1 -e OBS_EXPERIMENT_CONFIG "$IMAGE" validate --config=env:OBS_EXPERIMENT_CONFIG
CID=""
PID=""
cleanup() {
  rc=$?
  trap - EXIT
  if [[ -n "$PID" ]]; then docker rm -f "$PID" >/dev/null 2>&1 || true; fi
  if [[ -n "$CID" ]]; then docker logs "$CID" >"$OUT/collector.log" 2>&1 || true; docker rm -f "$CID" >/dev/null 2>&1 || true; fi
  echo "Evidence directory: $OUT"
  exit "$rc"
}
trap cleanup EXIT
CID="$(docker create "${COMMON[@]}" --network none --memory 256m --cpus 1 -e MY_POD_IP=127.0.0.1 -e OBS_EXPERIMENT_CONFIG "$IMAGE" --config=env:OBS_EXPERIMENT_CONFIG)"
docker start "$CID" >/dev/null
PID="$(docker create -i "${COMMON[@]}" --network "container:$CID" --memory 128m --cpus 1 "$PYIMAGE" python3 -)"
timeout 90s docker start -ai "$PID" <"$HERE/data-plane.py" | tee "$OUT/submissions.txt"
sleep 5
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
