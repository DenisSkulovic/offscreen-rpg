#!/usr/bin/env bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
src="${1:?usage: signal-probe.sh E03_EVIDENCE_DIRECTORY [identity.json]}"
identity="${2:-}"
if [[ -n "$identity" ]]; then test -f "$identity"; fi
python3 -c 'import ast,pathlib,sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())' "$here/signal-probe.py"
name="$(cat "$src/cluster-name")"
[[ "$name" =~ ^obs-e03-[a-z0-9]+$ ]]
ctx="kind-$name"
K=(kubectl --kubeconfig "$src/kubeconfig" --context "$ctx")
[[ "$(timeout 20s "${K[@]}" get nodes -o jsonpath='{.items[*].metadata.name}')" == "$name-control-plane" ]]
out="$(mktemp -d /tmp/offscreen-obs-signals.XXXXXXXX)"
echo "Evidence directory: $out"
ns=offscreen-dev-observability
probe="obs-e04-$(basename "$out" | sed 's/.*\.//' | tr '[:upper:]' '[:lower:]')"
# Test tooling only, not an additional platform dependency. Resolve immutable identity before creating Pod.
image=docker.io/library/python@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b
timeout 300s docker pull --platform linux/amd64 "$image" </dev/null >"$out/pull.log" 2>&1
digest="$image"
printf '%s\n' "$digest" >"$out/probe-image.txt"
echo "Probe image: $digest"
# New Pod only; no workload changes or API credentials. Script passed via ConfigMap.
python3 - "$here/signal-probe.py" "$out" "$probe" "$digest" "$identity" <<'PY'
import json,pathlib,sys
script,out,name,image,identity=sys.argv[1:]
p=pathlib.Path(out)
meta={"name":name,"namespace":"offscreen-dev-observability"}
cm={"apiVersion":"v1","kind":"ConfigMap","metadata":meta,"data":{"probe.py":pathlib.Path(script).read_text()}}
pod={"apiVersion":"v1","kind":"Pod","metadata":meta,"spec":{"automountServiceAccountToken":False,"restartPolicy":"Never","activeDeadlineSeconds":200,"securityContext":{"runAsNonRoot":True,"runAsUser":10001,"runAsGroup":10001,"fsGroup":10001,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"probe","image":image,"command":["python","-B","/probe/probe.py","/evidence","http://obs-collector:4318","http://obs-prometheus:9090","http://obs-loki:3100","http://obs-tempo:3200"],"resources":{"requests":{"cpu":"25m","memory":"32Mi"},"limits":{"memory":"128Mi","cpu":"500m"}},"securityContext":{"allowPrivilegeEscalation":False,"readOnlyRootFilesystem":True,"capabilities":{"drop":["ALL"]}},"volumeMounts":[{"name":"script","mountPath":"/probe","readOnly":True},{"name":"evidence","mountPath":"/evidence"}]}],"volumes":[{"name":"script","configMap":{"name":name}},{"name":"evidence","emptyDir":{"sizeLimit":"16Mi"}}]}}
if identity:
    pod["spec"]["containers"][0]["command"].append(pathlib.Path(identity).read_text())
(p/"cm.json").write_text(json.dumps(cm))
(p/"pod.json").write_text(json.dumps(pod))
PY
# Preserve evidence in Pod logs as well as local files; completed Pods cannot be exec'd.
# Add an outer Python wrapper to print evidence before process exit.
python3 - "$out/cm.json" <<'PY'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1]); d=json.loads(p.read_text()); orig=d["data"]["probe.py"]
d["data"]["probe.py"]="import pathlib, traceback\ntry:\n    exec(compile("+repr(orig)+", '/probe/probe.py', 'exec'))\nfinally:\n    for f in sorted(pathlib.Path('/evidence').glob('*')):\n        if f.is_file():\n            print('EVIDENCE', f.name, f.read_text()[:12000], flush=True)\n"
p.write_text(json.dumps(d))
PY
cmuid=""; poduid=""
cleanup() {
  # Only unique names created successfully by this invocation.
  [[ -z "$poduid" ]] || timeout 30s "${K[@]}" -n "$ns" delete pod "$probe" --wait=false >/dev/null 2>&1 || true
  [[ -z "$cmuid" ]] || timeout 30s "${K[@]}" -n "$ns" delete configmap "$probe" --wait=false >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cmuid="$(timeout 30s "${K[@]}" create -f "$out/cm.json" -o jsonpath='{.metadata.uid}')"
poduid="$(timeout 30s "${K[@]}" create -f "$out/pod.json" -o jsonpath='{.metadata.uid}')"
echo "Probe Pod: $probe"
phase=""
for i in $(seq 1 120); do
  phase="$(timeout 10s "${K[@]}" -n "$ns" get pod "$probe" -o jsonpath='{.status.phase}')"
  [[ "$phase" != Succeeded && "$phase" != Failed ]] || break
  sleep 2
done
timeout 30s "${K[@]}" -n "$ns" logs "$probe" >"$out/probe.log" 2>&1 || true
cat "$out/probe.log"
timeout 20s "${K[@]}" -n "$ns" get pod "$probe" -o json >"$out/pod-status.json"
echo "Evidence directory: $out"
[[ "$phase" == Succeeded ]] && grep -Eq '^E04-(A|B QUERY) PASS$' "$out/probe.log"
