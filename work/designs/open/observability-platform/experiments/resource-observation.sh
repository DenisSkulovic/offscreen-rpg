#!/usr/bin/env bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
src="${1:?usage: resource-observation.sh E03_DIRECTORY}"
python3 -c 'import ast,pathlib,sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())' "$here/resource-observation.py"
name="$(cat "$src/cluster-name")"
[[ "$name" =~ ^obs-e03-[a-z0-9]+$ ]]
ctx="kind-$name"
K=(kubectl --kubeconfig "$src/kubeconfig" --context "$ctx")
node="$name-control-plane"
[[ "$(timeout 20s "${K[@]}" get nodes -o jsonpath='{.items[*].metadata.name}')" == "$node" ]]
out="$(mktemp -d /tmp/offscreen-obs-resources.XXXXXXXX)"
echo "Evidence directory: $out"
pf=""
cleanup() { [[ -z "$pf" ]] || { kill "$pf" 2>/dev/null || true; wait "$pf" 2>/dev/null || true; }; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"${K[@]}" -n offscreen-dev-observability port-forward --address 127.0.0.1 svc/obs-prometheus :9090 >"$out/forward.log" 2>&1 &
pf=$!
port=""
for i in $(seq 1 30); do
  port="$(sed -n 's/^Forwarding from 127\.0\.0\.1:\([0-9]*\) ->.*/\1/p' "$out/forward.log" | head -n 1)"
  [[ -z "$port" ]] || break
  kill -0 "$pf" || { cat "$out/forward.log"; exit 1; }
  sleep 1
done
[[ "$port" =~ ^[0-9]+$ ]]
timeout 20s docker stats --no-stream "$node" | tee "$out/node-before.txt"
timeout 300s python3 -u "$here/resource-observation.py" "$out" "$src/kubeconfig" "$ctx" "$node" "$port" | tee "$out/observation.log"
timeout 20s docker stats --no-stream "$node" | tee "$out/node-after.txt"
echo "Evidence directory: $out"
