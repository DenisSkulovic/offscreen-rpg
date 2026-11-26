#!/usr/bin/env bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
bash -n "$here/signal-probe.sh"
python3 -c 'import ast,pathlib,sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())' "$here/signal-probe.py"
src="${1:?usage: outage.sh E03_DIRECTORY}"
name="$(cat "$src/cluster-name")"
[[ "$name" =~ ^obs-e03-[a-z0-9]+$ ]]
K=(kubectl --kubeconfig "$src/kubeconfig" --context "kind-$name" -n offscreen-dev-observability)
k() { timeout 30s "${K[@]}" "$@"; }
[[ "$(k get nodes -o jsonpath='{.items[*].metadata.name}')" == "$name-control-plane" ]]
out="$(mktemp -d /tmp/offscreen-obs-outage.XXXXXXXX)"
echo "Evidence directory: $out"
[[ "$(k get statefulset obs-tempo -o jsonpath='{.spec.replicas}')" == 1 ]]
k get pods,pvc -o json >"$out/before.json"
collector="$(k get pods -l app.kubernetes.io/instance=obs-collector -o jsonpath='{.items[*].metadata.uid}')"
[[ -n "$collector" && "$collector" != *" "* ]]
restore=0
cleanup() {
  rc=$?
  trap - EXIT
  if (( restore )); then
    echo "Restoring Tempo to one replica"
    if ! k scale statefulset/obs-tempo --replicas=1; then
      echo "RESTORE FAILED: manually restore Tempo in $name"
      exit 1
    fi
    if ! timeout 240s "${K[@]}" rollout status statefulset/obs-tempo --timeout=210s; then
      echo "RESTORE NOT READY: inspect $name"
      exit 1
    fi
  fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Precondition: full signal path works before fault.
bash "$here/signal-probe.sh" "$src" | tee "$out/baseline.log"
restore=1
k scale statefulset/obs-tempo --replicas=0 --current-replicas=1
for i in $(seq 1 60); do
  remaining="$(k get pods -l app.kubernetes.io/instance=obs-tempo -o name)"
  [[ -z "$remaining" ]] && break
  sleep 2
done
[[ -z "$remaining" ]]
echo "Tempo unavailable: zero matching Pods"
k get endpointslices -l kubernetes.io/service-name=obs-tempo -o json >"$out/tempo-endpoints-down.json"
python3 - "$out/tempo-endpoints-down.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert not any(e.get("conditions",{}).get("ready",True) for s in d["items"] for e in s.get("endpoints",[])), "Tempo still has ready endpoints"
PY
# Submit all three signals while Tempo is unavailable. Only healthy paths must succeed.
bash "$here/signal-probe.sh" "$src" "" tempo-outage | tee "$out/during.log"
[[ "$(k get statefulset obs-tempo -o jsonpath='{.spec.replicas}')" == 0 ]]
[[ -z "$(k get pods -l app.kubernetes.io/instance=obs-tempo -o name)" ]]
k logs deployment/obs-collector --tail=150 >"$out/collector-during.log"
k scale statefulset/obs-tempo --replicas=1 --current-replicas=0
timeout 240s "${K[@]}" rollout status statefulset/obs-tempo --timeout=210s
restore=0
# Fresh all-signal submission after recovery; no claim about queued outage trace survival.
bash "$here/signal-probe.sh" "$src" | tee "$out/recovery.log"
[[ "$(k get pods -l app.kubernetes.io/instance=obs-collector -o jsonpath='{.items[*].metadata.uid}')" == "$collector" ]]
k get pods,pvc -o json >"$out/after.json"
python3 - "$out" <<'PY'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1])
def pvc(f):
    return sorted((x["metadata"]["name"],x["metadata"]["uid"],x["spec"]["volumeName"]) for x in json.loads((p/f).read_text())["items"] if x["kind"]=="PersistentVolumeClaim" and x["status"]["phase"]=="Bound")
a,b=pvc("before.json"),pvc("after.json")
assert len(a)==3 and a==b
PY
echo "E04-C PASS (Tempo outage; healthy paths and fresh recovery)"
echo "Evidence directory: $out"
