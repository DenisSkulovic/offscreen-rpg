#!/usr/bin/env bash
set -euo pipefail
umask 077
out="${1:?usage: runtime-health.sh E03_EVIDENCE_DIRECTORY}"
name="$(cat "$out/cluster-name")"
[[ "$name" =~ ^obs-e03-[a-z0-9]+$ ]]
export KUBECONFIG="$out/kubeconfig"
ctx="kind-$name"
ns=offscreen-dev-observability
k() { timeout 30s kubectl --kubeconfig "$KUBECONFIG" --context "$ctx" "$@"; }
kn() { k -n "$ns" "$@"; }
[[ "$(k config current-context)" == "$ctx" ]]
[[ "$(k get nodes -o jsonpath='{.items[*].metadata.name}')" == "$name-control-plane" ]]
pf=""
cleanup() { [[ -z "$pf" ]] || { kill "$pf" 2>/dev/null || true; wait "$pf" 2>/dev/null || true; }; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
failed=0
# No mutation; refuse incomplete rollout or unexpected active pods.
kn get pods -o json >"$out/health-pods.json"
kn get pvc -o json >"$out/health-pvc.json"
python3 - "$out" <<'PY'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1])
pods=json.loads((p/"health-pods.json").read_text())["items"]
assert len(pods)==5 and all(not x["metadata"].get("deletionTimestamp") for x in pods), "Wait for obsolete replica to disappear"
assert all(x["status"]["phase"]=="Running" and len(x["status"]["containerStatuses"])==1 and x["status"]["containerStatuses"][0]["ready"] for x in pods)
claims=json.loads((p/"health-pvc.json").read_text())["items"]
assert len(claims)==3 and all(x["status"]["phase"]=="Bound" for x in claims)
for x in pods:
    print(x["metadata"]["name"],x["status"]["containerStatuses"][0]["imageID"],"restarts",x["status"]["containerStatuses"][0]["restartCount"])
PY
# Let kubectl allocate a local port, then parse its actual loopback address.
kubectl --kubeconfig "$KUBECONFIG" --context "$ctx" -n "$ns" port-forward --address 127.0.0.1 svc/obs-grafana :80 >"$out/forward.log" 2>&1 &
pf=$!
port=""
for i in $(seq 1 30); do
  port="$(sed -n 's/^Forwarding from 127\.0\.0\.1:\([0-9]*\) ->.*/\1/p' "$out/forward.log" | head -n 1)"
  [[ -z "$port" ]] || break
  kill -0 "$pf" || exit 1
  sleep 1
done
[[ "$port" =~ ^[0-9]+$ ]]
base="http://127.0.0.1:$port"
curl --noproxy '*' --fail --silent --show-error --max-time 15 --netrc-file "$out/grafana.netrc" "$base/api/datasources" >"$out/datasources.json"
python3 - "$out/datasources.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert {x["uid"]:x["url"] for x in d}=={"offscreen-metrics":"http://obs-prometheus:9090","offscreen-logs":"http://obs-loki:3100","offscreen-traces":"http://obs-tempo:3200"}
print("Datasource inventory: PASS")
PY
for uid in offscreen-metrics offscreen-logs offscreen-traces; do
  if curl --noproxy '*' --fail-with-body --silent --show-error --max-time 30 --netrc-file "$out/grafana.netrc" "$base/api/datasources/uid/$uid/health" >"$out/$uid.health.json"; then
    python3 - "$out/$uid.health.json" <<'PY' || failed=1
import json,sys
d=json.load(open(sys.argv[1]))
print(d)
assert d.get("status","").lower()=="ok"
PY
  else
    cat "$out/$uid.health.json"
    failed=1
  fi
done
# Node-wide Docker measurement includes control plane, storage provisioner and observability.
# No metrics-server installation. Pod-level resource measurements deferred.
timeout 20s docker stats --no-stream "$name-control-plane" | tee "$out/node-stats.txt" || failed=1
echo "Cluster retained: $name"
echo "Evidence directory: $out"
echo "E03 status: $([[ "$failed" == 0 ]] && echo PASS || echo FAIL)"
exit "$failed"
