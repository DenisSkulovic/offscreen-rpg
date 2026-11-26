#!/usr/bin/env bash
# E02: local Docker only, no Kubernetes, no host networking, no application data.
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
src="${1:?usage: validate.sh E01_EVIDENCE_DIRECTORY}"
python3 "$here/assert-structure.py" "$src"
out="$(mktemp -d /tmp/offscreen-obs-binary.XXXXXXXX)"
echo "Evidence directory: $out"
python3 "$here/extract-config.py" "$src" "$out"
printf 'role\timage\timmutable-reference\n' > "$out/images.tsv"
printf 'role\tprofile\tstate\n' > "$out/results.tsv"
failed=0
while IFS=$'\t' read -r role image; do
  if ! timeout 300s docker pull --platform linux/amd64 "$image" >"$out/$role.pull.log" 2>&1; then
    echo "$role PULL_FAILED"; failed=1; continue
  fi
  # Select the repo digest matching the original repository, never an unrelated alias.
  digest="$(docker image inspect "$image" --format '{{json .RepoDigests}}' | python3 -c 'import json,sys; repo=sys.argv[1].rsplit(":",1)[0]; canonical=lambda s:s.removeprefix("docker.io/").removeprefix("index.docker.io/"); ds=[x for x in json.load(sys.stdin) if canonical(x.split("@")[0])==canonical(repo) and "@sha256:" in x]; assert len(ds)==1,ds; print(ds[0])' "$image")" || { failed=1; continue; }
  printf '%s\t%s\t%s\n' "$role" "$image" "$digest" >> "$out/images.tsv"
  for profile in dev release; do
    dir="$out/$role/$profile"
    args=()
    case "$role" in
      collector) args=(--env MY_POD_IP=127.0.0.1 --mount "type=bind,src=$dir,dst=/conf,readonly" "$digest" validate --config=/conf/relay.yaml);;
      prometheus) args=(--entrypoint /bin/promtool --mount "type=bind,src=$dir,dst=/etc/config,readonly" "$digest" check config /etc/config/prometheus.yml);;
      loki) args=(--mount "type=bind,src=$dir,dst=/conf,readonly" "$digest" -config.file=/conf/config.yaml -verify-config=true);;
      tempo) args=(--mount "type=bind,src=$dir,dst=/conf,readonly" "$digest" -config.file=/conf/tempo.yaml -config.verify);;
      grafana) printf '%s\t%s\tDEFERRED_STARTUP\n' "$role" "$profile" >> "$out/results.tsv"; continue;;
    esac
    # Name allows cleanup if the Docker client times out. Never remove another container.
    name="obs-e02-$(basename "$out")-$role-$profile"
    if timeout --kill-after=5s 60s docker run --rm --name "$name" --platform linux/amd64 --network none --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 1 "${args[@]}" >"$out/$role.$profile.log" 2>&1; then
      state=PASS
    else
      state=FAIL; failed=1
      docker rm -f "$name" >/dev/null 2>&1 || true
    fi
    printf '%s\t%s\t%s\n' "$role" "$profile" "$state" >> "$out/results.tsv"
  done
done < "$out/roles.tsv"
cat "$out/images.tsv" "$out/results.tsv"
for log in "$out"/*.dev.log "$out"/*.release.log; do
  [[ -f "$log" ]] || continue
  printf '\n### %s\n' "$(basename "$log")"
  tail -n 25 "$log"
done
echo "Evidence directory: $out"
exit "$failed"
