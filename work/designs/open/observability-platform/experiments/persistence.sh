#!/usr/bin/env bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
bash -n "$here/signal-probe.sh"
src="${1:?usage: persistence.sh E03_DIRECTORY}"
name="$(cat "$src/cluster-name")"
[[ "$name" =~ ^obs-e03-[a-z0-9]+$ ]]
K=(kubectl --kubeconfig "$src/kubeconfig" --context "kind-$name" -n offscreen-dev-observability)
[[ "$(timeout 20s "${K[@]}" get nodes -o jsonpath='{.items[*].metadata.name}')" == "$name-control-plane" ]]
out="$(mktemp -d /tmp/offscreen-obs-persistence.XXXXXXXX)"
echo "Evidence directory: $out"
# Reuse the exact previously accepted marker and timestamp, without resubmission.
cat >"$out/identity.json" <<'EOF'
{"run":"20085945b332ff38","trace":"2062fd8592b3426d6dac58626f6993bc","parent":"5c32a25f8d896186","child":"18d053c3af603818","marker":"obs-e04-20085945b332ff38","now":1795719676589730186}
EOF
bash "$here/signal-probe.sh" "$src" "$out/identity.json" | tee "$out/before.log"
snapshot() {
  timeout 30s "${K[@]}" get pvc -o json | python3 -c 'import json,sys; a=json.load(sys.stdin)["items"]; assert len(a)==3 and all(x["status"]["phase"]=="Bound" for x in a); print(json.dumps(sorted((x["metadata"]["name"],x["metadata"]["uid"],x["spec"]["volumeName"]) for x in a)))'
}
snapshot >"$out/pvc-before.json"
for resource in deployment/obs-prometheus statefulset/obs-loki statefulset/obs-tempo; do
  echo "Restarting $resource"
  # Capture exact selected Pod UIDs, then wait for rollout and disappearance.
  role="${resource#*/}"
  selector="app.kubernetes.io/instance=$role"
  old="$(timeout 30s "${K[@]}" get pods -l "$selector" -o jsonpath='{.items[*].metadata.uid}')"
  [[ -n "$old" && "$old" != *" "* ]]
  timeout 30s "${K[@]}" rollout restart "$resource"
  timeout 240s "${K[@]}" rollout status "$resource" --timeout=210s
  for i in $(seq 1 60); do
    new="$(timeout 20s "${K[@]}" get pods -l "$selector" -o jsonpath='{.items[*].metadata.uid}')"
    [[ -n "$new" && "$new" != *" "* && "$new" != "$old" ]] && break
    sleep 2
  done
  [[ -n "$new" && "$new" != *" "* && "$new" != "$old" ]]
  snapshot >"$out/pvc-after.json"
  cmp "$out/pvc-before.json" "$out/pvc-after.json"
  bash "$here/signal-probe.sh" "$src" "$out/identity.json" | tee "$out/$role.after.log"
done
echo "E04-B PASS (graceful workload replacement; same PVC identities)"
echo "Evidence directory: $out"
