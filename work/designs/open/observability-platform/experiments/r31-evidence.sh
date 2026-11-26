#!/usr/bin/env bash
# R31 evidence only: offline renders, local source grep. No cluster or Docker commands.
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
root="$(git rev-parse --show-toplevel)"
baseline=a81e275821496e478ba55ae3dce5e72cf63d5dfd
git -C "$root" cat-file -e "$baseline^{commit}"
out="$(mktemp -d /tmp/offscreen-obs-r31.XXXXXXXX)"
echo "Receipt: $out"
if [[ $# -gt 1 ]]; then echo "usage: r31-evidence.sh [existing E01 render directory]" >&2; exit 2; fi
if [[ $# == 1 ]]; then
  src="$(realpath -- "$1")"
else
  bash "$here/render.sh" | tee "$out/render.log"
  src="$(sed -n 's/^Evidence directory: //p' "$out/render.log" | tail -n 1)"
fi
[[ -d "$src" ]]
# Recheck original downloaded archive bytes even when reusing R29 output.
python3 - "$here/../specimens/pins.yaml" "$src" <<'PY'
import hashlib, pathlib, sys, yaml
root=pathlib.Path(sys.argv[2])
for c in yaml.safe_load(open(sys.argv[1]))["charts"].values():
    p=root/(c["name"]+"-"+c["version"]+".tgz")
    assert hashlib.sha256(p.read_bytes()).hexdigest()==c["sha256"], p.name
print("CHART HASHES PASS")
PY
# Re-render from verified archives using the existing render semantics; do not trust cached YAML alone.
export HELM_CACHE_HOME="$out/cache" HELM_CONFIG_HOME="$out/config" HELM_DATA_HOME="$out/data" KUBECONFIG="$out/nonexistent"
mkdir "$out/renders"
cp "$src/results.tsv" "$out/renders/results.tsv"
while IFS=$'\t' read -r key name version; do
  for profile in dev release; do
    ns=offscreen-dev-observability; extra=()
    if [[ "$profile" == release ]]; then
      ns=offscreen-observability
      case "$key" in
        prometheus) extra=(--set-string server.persistentVolume.storageClass=local-path);;
        loki) extra=(--set-string singleBinary.persistence.storageClass=local-path);;
        tempo) extra=(--set-string persistence.storageClassName=local-path);;
      esac
    fi
    timeout 90s helm template "obs-$key" "$src/$name-$version.tgz" --namespace "$ns" --kube-version 1.37.0 --include-crds -f "$here/../specimens/$key.yaml" "${extra[@]}" >"$out/renders/$key.$profile.yaml"
  done
done < <(python3 - "$here/../specimens/pins.yaml" <<'PY'
import sys,yaml
for k,c in yaml.safe_load(open(sys.argv[1]))["charts"].items(): print(k,c["name"],c["version"],sep="\t")
PY
)
python3 "$here/assert-structure.py" "$out/renders"
python3 "$here/freeze-inventory.py" "$out/renders" >"$out/inventory.json"
git -C "$root" grep -n -I -E 'observability|otel-collector|synthetic-hop|hop-a|hop-b|OTEL_EXPORTER_OTLP' "$baseline" -- infra tools apps packages scripts docs package.json >"$out/callers.txt" || { rc=$?; [[ $rc == 1 ]] || exit "$rc"; }
git -C "$root" ls-tree -r --name-only "$baseline" -- infra/platform/observability infra/verification/smoke/observability >"$out/legacy-paths.txt"
echo "=== FROZEN INVENTORY ==="
cat "$out/inventory.json"
echo "=== CALLER PATHS ==="
cut -d: -f2 "$out/callers.txt" | sort -u
echo "=== LEGACY PATHS ==="
cat "$out/legacy-paths.txt"
echo "Receipt: $out"
echo "R31 OFFLINE PASS (caller disposition and runtime fault feasibility separately pending)"
