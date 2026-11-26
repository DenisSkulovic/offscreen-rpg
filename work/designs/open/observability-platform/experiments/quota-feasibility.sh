#!/usr/bin/env bash
# Design feasibility only: real pinned Loki Helm install rejected by namespace quota.
# Existing disposable E03 cluster ONLY; no public CLI claim and no cleanup/deletion.
set -euo pipefail
umask 077
[[ $# == 2 && "$1" == /tmp/offscreen-obs-runtime.* && "$2" == /tmp/offscreen-obs-render.* ]]
src="$1"; render="$2"
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
name="$(cat "$src/cluster-name")"
[[ "$name" == obs-e03-oexbycbn ]]
ctx="kind-$name"
export KUBECONFIG="$src/kubeconfig"
for v in DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY HELM_KUBEAPISERVER HELM_KUBECONTEXT HELM_KUBETOKEN HELM_KUBECAFILE HELM_KUBEINSECURE_SKIP_TLS_VERIFY HELM_DRIVER; do
  [[ -z "${!v:-}" ]] || { echo "Refused override: $v"; exit 2; }
done
k() { timeout 15s kubectl --kubeconfig "$KUBECONFIG" --context "$ctx" "$@"; }
[[ "$(k get nodes -o jsonpath='{.items[*].metadata.name}')" == "$name-control-plane" ]]
[[ "$(k -n offscreen-dev-observability get pvc obs-prometheus -o jsonpath='{.metadata.uid}')" == fa6a7b16-9a73-464a-a955-56fc4daf6ea0 ]]
[[ "$(k -n offscreen-dev-observability get pvc storage-obs-loki-0 -o jsonpath='{.metadata.uid}')" == 8aad28e8-be27-4621-9511-d349c33c1fb4 ]]
[[ "$(k -n offscreen-dev-observability get pvc storage-obs-tempo-0 -o jsonpath='{.metadata.uid}')" == d8820374-5fbf-45ee-8fce-760f40d478d3 ]]
cluster_uid="$(k get namespace kube-system -o jsonpath='{.metadata.uid}')"
[[ -n "$cluster_uid" ]]
out="$(mktemp -d /tmp/offscreen-obs-quota.XXXXXXXX)"
ns="obs-quota-$(basename "$out" | sed 's/.*\.//' | tr '[:upper:]' '[:lower:]')"
echo "Receipt: $out; isolated namespace: $ns"
archive="$render/loki-21.6.0.tgz"
printf '%s  %s\n' ae5aa1c2039636e94f89b6149c3cd2f5a2f9e1749d9600de51f94da3160ee6b2 "$archive" | sha256sum -c
python3 -c 'import yaml'
# Native Loki digest setting; verify actual render before any writes.
digest=sha256:b43c257ccfc925d4a50b8717cac61a3b51df8c48d01847936057e5c4075a24a7
values=(-f "$here/../specimens/loki.yaml" --set-string "loki.image.digest=$digest")
export HELM_CACHE_HOME="$out/cache" HELM_CONFIG_HOME="$out/config" HELM_DATA_HOME="$out/data"
H=(helm --kubeconfig "$KUBECONFIG" --kube-context "$ctx" --namespace "$ns")
timeout 90s "${H[@]}" template obs-loki "$archive" "${values[@]}" >"$out/rendered.yaml"
python3 - "$out/rendered.yaml" "$ns" "$digest" <<'PY'
import sys,yaml
docs=[x for x in yaml.safe_load_all(open(sys.argv[1])) if x is not None]
assert all(x["metadata"]["namespace"]==sys.argv[2] for x in docs)
assert all(x["kind"] in {"ServiceAccount","ConfigMap","Service","StatefulSet"} for x in docs)
assert not any((x["metadata"].get("annotations") or {}).get("helm.sh/hook") for x in docs)
w=[x for x in docs if x["kind"]=="StatefulSet"]
assert len(w)==1 and w[0]["metadata"]["name"]=="obs-loki"
p=w[0]["spec"]["template"]["spec"]
assert len(p["containers"])==1 and not p.get("initContainers")
image=p["containers"][0]["image"]
assert image.removeprefix("docker.io/")=="grafana/loki@"+sys.argv[3],image
print("NATIVE LOKI DIGEST PASS")
PY
[[ "$(k get namespace "$ns" --ignore-not-found -o name)" == "" ]]
[[ "$(k get namespace kube-system -o jsonpath='{.metadata.uid}')" == "$cluster_uid" ]]
nsuid="$(k create namespace "$ns" -o jsonpath='{.metadata.uid}')"
[[ -n "$nsuid" ]]
guard() {
  [[ "$(k get namespace kube-system -o jsonpath='{.metadata.uid}')" == "$cluster_uid" ]]
  [[ "$(k get namespace "$ns" -o jsonpath='{.metadata.uid}')" == "$nsuid" ]]
}
guard
# Deny StatefulSet creation immediately. No pod/image download or PVC needed.
cat <<EOF | k -n "$ns" create -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: deny-loki-statefulset
spec:
  hard:
    count/statefulsets.apps: "0"
EOF
# Wait for admission quota status to be populated, not just object existence.
ready=0
for i in $(seq 1 20); do
  if k -n "$ns" get resourcequota deny-loki-statefulset -o json | python3 -c 'import json,sys; sys.exit(json.load(sys.stdin).get("status",{}).get("hard",{}).get("count/statefulsets.apps")!="0")'; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
guard
set +e
timeout --kill-after=5s 90s "${H[@]}" install obs-loki "$archive" "${values[@]}" --wait --timeout 45s >"$out/helm.log" 2>&1
rc=$?
set -e
cat "$out/helm.log"
[[ "$rc" != 0 && "$rc" != 124 && "$rc" != 137 ]]
grep -i 'exceeded quota' "$out/helm.log"
grep -F 'deny-loki-statefulset' "$out/helm.log"
guard
timeout 20s "${H[@]}" list --all -o json >"$out/releases.json"
python3 - "$out/releases.json" <<'PY'
import json,sys
x=json.load(open(sys.argv[1]))
assert len(x)==1 and x[0]["name"]=="obs-loki" and x[0]["status"]=="failed",x
print("FAILED HELM RELEASE RETAINED")
PY
[[ "$(k -n "$ns" get statefulset obs-loki --ignore-not-found -o name)" == "" ]]
k -n "$ns" get configmap,service,serviceaccount,pvc,pod,statefulset,resourcequota -o name | tee "$out/objects.txt"
guard
echo "R32 QUOTA FEASIBILITY PASS; namespace retained: $ns ($nsuid)"
echo "Receipt: $out"
