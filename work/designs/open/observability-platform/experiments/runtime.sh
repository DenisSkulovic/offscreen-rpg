#!/usr/bin/env bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
src="${1:?usage: runtime.sh E01_EVIDENCE_DIR}"
python3 "$here/assert-structure.py" "$src"
out="$(mktemp -d /tmp/offscreen-obs-runtime.XXXXXXXX)"
name="obs-e03-$(basename "$out" | tr '[:upper:]' '[:lower:]' | sed 's/.*\.//')"
export KUBECONFIG="$out/kubeconfig"
ctx="kind-$name"
ns=offscreen-dev-observability
echo "Evidence directory: $out"
echo "Cluster: $name"
printf '%s\n' "$name" >"$out/cluster-name"
python3 "$here/prepare-runtime.py" "$src" "$out" "$here/../specimens/image-lock-candidate.tsv"
[[ "$(kind get clusters)" != *"$name"* ]] || { echo "Cluster identity collision"; exit 2; }
cat >"$out/kind.yaml" <<'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  apiServerAddress: "127.0.0.1"
nodes:
  - role: control-plane
    image: kindest/node:v1.37.0
EOF
k() { timeout 30s kubectl --kubeconfig "$KUBECONFIG" --context "$ctx" "$@"; }
kn() { k -n "$ns" "$@"; }
pf=""
cleanup() {
  [[ -z "$pf" ]] || { kill "$pf" 2>/dev/null || true; wait "$pf" 2>/dev/null || true; }
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
echo "Creating isolated Kind cluster (no existing cluster mutation)"
timeout --kill-after=15s 600s kind create cluster --name "$name" --config "$out/kind.yaml" --kubeconfig "$KUBECONFIG" --wait 180s
[[ "$(k config current-context)" == "$ctx" ]]
[[ "$(k get nodes -o jsonpath='{.items[*].metadata.name}')" == "$name-control-plane" ]]
k get storageclass standard
k create namespace "$ns"
kn apply -f "$out/admin.json" >/dev/null
for role in prometheus loki tempo collector grafana; do
  echo "Applying $role"
  kn apply -f "$out/$role.yaml"
done
failed=0
for resource in deployment/obs-prometheus statefulset/obs-loki statefulset/obs-tempo deployment/obs-collector deployment/obs-grafana; do
  if ! timeout 240s kubectl --kubeconfig "$KUBECONFIG" --context "$ctx" -n "$ns" rollout status "$resource" --timeout=210s; then failed=1; fi
done
kn get pods,pvc,svc -o wide | tee "$out/inventory.txt"
kn get pods -o json >"$out/pods.json"
kn get pvc -o json >"$out/pvc.json"
python3 - "$out" <<'PY' || failed=1
import json, pathlib, sys
p=pathlib.Path(sys.argv[1])
pods=json.loads((p/"pods.json").read_text())["items"]
claims=json.loads((p/"pvc.json").read_text())["items"]
assert len(pods)==5, len(pods)
assert all(x["status"]["phase"]=="Running" and any(c["type"]=="Ready" and c["status"]=="True" for c in x["status"]["conditions"]) for x in pods)
assert len(claims)==3 and all(x["status"]["phase"]=="Bound" for x in claims)
for x in pods:
    c=x["status"]["containerStatuses"][0]
    assert c["ready"] and "@sha256:" in x["spec"]["containers"][0]["image"]
    print(x["metadata"]["name"],c["imageID"],"restarts",c["restartCount"])
PY
if (( failed )); then
  kn get events --sort-by=.lastTimestamp >"$out/events.txt" || true
  for pod in $(kn get pods -o name); do kn logs "$pod" --tail=100 >"$out/${pod#pod/}.log" 2>&1 || true; done
  echo "E03 READINESS FAILED; isolated cluster retained: $name"
  exit 1
fi
bash "$here/runtime-health.sh" "$out"
