#!/usr/bin/env bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
src="${1:?usage: privacy.sh E03_DIRECTORY}"
name="$(cat "$src/cluster-name")"
[[ "$name" =~ ^obs-e03-[a-z0-9]+$ ]]
K=(kubectl --kubeconfig "$src/kubeconfig" --context "kind-$name" -n offscreen-dev-observability)
k() { timeout 30s "${K[@]}" "$@"; }
[[ "$(k get nodes -o jsonpath='{.items[*].metadata.name}')" == "$name-control-plane" ]]
bash -n "$here/signal-probe.sh"
python3 -c 'import ast,pathlib,sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())' "$here/signal-probe.py"
out="$(mktemp -d /tmp/offscreen-obs-privacy.XXXXXXXX)"
echo "Evidence directory: $out"
k get configmap obs-collector -o json >"$out/before.json"
k get deployment obs-collector -o json >"$out/deployment.json"
python3 - "$out" "$here/../specimens/collector.yaml" <<'PY'
import json,pathlib,sys,yaml
p=pathlib.Path(sys.argv[1]); cm=json.loads((p/"before.json").read_text()); dep=json.loads((p/"deployment.json").read_text())
assert dep["spec"]["replicas"]==1 and dep["status"]["readyReplicas"]==1
assert set(cm["data"])=={"relay"}
old=yaml.safe_load(cm["data"]["relay"])
new=yaml.safe_load(pathlib.Path(sys.argv[2]).read_text())["alternateConfig"]
assert old["exporters"]==new["exporters"] and old["receivers"]==new["receivers"]
assert old["processors"]["memory_limiter"]==new["processors"]["memory_limiter"]
assert old["processors"]["batch"]==new["processors"]["batch"]
(p/"patch.json").write_text(json.dumps({"metadata":{"resourceVersion":cm["metadata"]["resourceVersion"]},"data":{"relay":yaml.safe_dump(new)}}))
(p/"restore.json").write_text(json.dumps({"data":{"relay":cm["data"]["relay"]}}))
PY
changed=0
cleanup() {
  rc=$?
  trap - EXIT
  if (( changed )); then
    echo "Restoring original Collector configuration after unsuccessful experiment"
    k patch configmap obs-collector --type=merge --patch-file "$out/restore.json" &&
    k rollout restart deployment/obs-collector &&
    timeout 240s "${K[@]}" rollout status deployment/obs-collector --timeout=210s || { echo "RESTORATION FAILED; inspect $out"; exit 1; }
  fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Mark before patch to cover ambiguous API results. Exclusive owner-operated disposable cluster.
changed=1
k patch configmap obs-collector --type=merge --patch-file "$out/patch.json"
k rollout restart deployment/obs-collector
timeout 240s "${K[@]}" rollout status deployment/obs-collector --timeout=210s
bash "$here/signal-probe.sh" "$src" "" privacy | tee "$out/privacy.log"
k logs deployment/obs-collector --since=10m >"$out/collector.log"
python3 - "$out" <<'PY'
import json,pathlib,sys,re
p=pathlib.Path(sys.argv[1]); s=(p/"privacy.log").read_text()
m=re.search(r'"canary":\s*"(PRIVACY_CANARY_[0-9a-f]{16})"',s)
assert m,"missing canary identity"
assert m.group(1) not in (p/"collector.log").read_text(),"canary in Collector diagnostics"
print("Collector diagnostic canary absence PASS")
PY
changed=0
echo "E04-D2 RUNTIME PASS; revised Collector retained"
echo "Evidence directory: $out"
