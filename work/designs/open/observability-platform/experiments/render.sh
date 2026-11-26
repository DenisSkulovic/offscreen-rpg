#!/usr/bin/env bash
# Design experiment only. No kubectl, Docker, helm install, cluster writes or image pulls.
set -uo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
spec="$here/../specimens"
for cmd in helm curl sha256sum timeout python3; do command -v "$cmd" >/dev/null || { echo "Missing $cmd" >&2; exit 2; }; done
python3 -c 'import yaml' || { echo "PyYAML required; no automatic install" >&2; exit 2; }
out="$(mktemp -d "${TMPDIR:-/tmp}/offscreen-obs-render.XXXXXXXX")" || exit 2
echo "Evidence directory: $out"
export HELM_CACHE_HOME="$out/cache" HELM_CONFIG_HOME="$out/config" HELM_DATA_HOME="$out/data"
export KUBECONFIG="$out/nonexistent-kubeconfig"
helm version --short >"$out/helm-version.txt" || exit 2
printf 'chart\tprofile\tstate\n' >"$out/results.tsv"
failed=0
while IFS=$'\t' read -r key repo name version hash; do
  archive="$out/$name-$version.tgz"
  url="https://github.com/$repo/releases/download/$name-$version/$name-$version.tgz"
  if ! curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --connect-timeout 15 --max-time 120 --max-filesize 104857600 "$url" -o "$archive" 2>"$out/$key.download.err"; then
    printf '%s\t-\tDOWNLOAD_FAILED\n' "$key" >>"$out/results.tsv"; failed=1; continue
  fi
  if ! printf '%s  %s\n' "$hash" "$archive" | sha256sum -c >"$out/$key.checksum.txt"; then
    printf '%s\t-\tCHECKSUM_FAILED\n' "$key" >>"$out/results.tsv"; failed=1; continue
  fi
  for profile in dev release; do
    ns=offscreen-dev-observability
    extra=()
    if [[ "$profile" == release ]]; then
      ns=offscreen-observability
      case "$key" in
        prometheus) extra=(--set-string server.persistentVolume.storageClass=local-path);;
        loki) extra=(--set-string singleBinary.persistence.storageClass=local-path);;
        tempo) extra=(--set-string persistence.storageClassName=local-path);;
      esac
    fi
    if timeout 90s helm template "obs-$key" "$archive" --namespace "$ns" --kube-version 1.37.0 --include-crds -f "$spec/$key.yaml" "${extra[@]}" >"$out/$key.$profile.yaml" 2>"$out/$key.$profile.err"; then
      printf '%s\t%s\tRENDERED\n' "$key" "$profile" >>"$out/results.tsv"
    else
      printf '%s\t%s\tRENDER_FAILED\n' "$key" "$profile" >>"$out/results.tsv"; failed=1
    fi
  done
done < <(python3 - "$spec/pins.yaml" <<'PY'
import sys,yaml
for key,c in yaml.safe_load(open(sys.argv[1]))["charts"].items():
    print(key,c["repository"],c["name"],c["version"],c["sha256"],sep="\t")
PY
)
python3 "$here/inventory.py" "$out" || failed=1
python3 "$here/assert-structure.py" "$out" || failed=1
cat "$out/results.tsv"
cat "$out/inventory.txt"
echo "Evidence directory: $out"
echo "Only local render; NOT runtime proof. No cluster operations performed."
exit "$failed"
