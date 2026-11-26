#!/usr/bin/env bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
python3 -c 'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())' "$here/signal-probe.py"
src="${1:?usage: signal-probe.sh E03_EVIDENCE_DIRECTORY}"
name="$(cat "$src/cluster-name")"
[[ "$name" =~ ^obs-e03-[a-z0-9]+$ ]]
ctx="kind-$name"
K=(kubectl --kubeconfig "$src/kubeconfig" --context "$ctx")
[[ "$(timeout 20s "${K[@]}" get nodes -o jsonpath='{.items[*].metadata.name}')" == "$name-control-plane" ]]
out="$(mktemp -d /tmp/offscreen-obs-signals.XXXXXXXX)"
echo "Evidence directory: $out"
pids=()
ports=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; wait "$p" 2>/dev/null || true; done; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for entry in collector:4318 prometheus:9090 loki:3100 tempo:3200; do
  role="${entry%:*}"
  "${K[@]}" -n offscreen-dev-observability port-forward --address 127.0.0.1 "svc/obs-$role" ":${entry#*:}" >"$out/$role.forward.log" 2>&1 &
  pid=$!
  pids+=("$pid")
  port=""
  for i in $(seq 1 30); do
    port="$(sed -n 's/^Forwarding from 127\.0\.0\.1:\([0-9]*\) ->.*/\1/p' "$out/$role.forward.log" | head -n 1)"
    [[ -z "$port" ]] || break
    kill -0 "$pid" || { cat "$out/$role.forward.log"; exit 1; }
    sleep 1
  done
  [[ "$port" =~ ^[0-9]+$ ]]
  ports+=("$port")
done
timeout 150s python3 "$here/signal-probe.py" "$out" "${ports[@]}"
