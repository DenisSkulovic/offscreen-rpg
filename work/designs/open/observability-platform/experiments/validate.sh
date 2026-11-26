#!/usr/bin/env bash
# E02: local Docker only; no bind mounts, Kubernetes or application data.
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
mapfile -t rows < "$out/roles.tsv"
[[ "${#rows[@]}" -eq 5 ]] || { echo "Expected five roles" >&2; exit 2; }
cid=""
cleanup() {
  if [[ -n "$cid" ]]; then
    timeout 20s docker rm -f "$cid" </dev/null >/dev/null 2>&1 || return 1
    cid=""
  fi
}
trap 'cleanup || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for row in "${rows[@]}"; do
  IFS=$'\t' read -r role image <<< "$row"
  if ! timeout 300s docker pull --platform linux/amd64 "$image" </dev/null >"$out/$role.pull.log" 2>&1; then
    printf '%s\t-\tPULL_FAILED\n' "$role" >>"$out/results.tsv"; failed=1; continue
  fi
  if ! digest="$(timeout 20s docker image inspect "$image" --format '{{json .RepoDigests}}' </dev/null | python3 -c 'import json,sys,re; repo=sys.argv[1].rsplit(":",1)[0]; canonical=lambda s:s.removeprefix("docker.io/").removeprefix("index.docker.io/"); ds=[x for x in json.load(sys.stdin) if canonical(x.split("@")[0])==canonical(repo) and re.fullmatch(r"sha256:[0-9a-f]{64}",x.split("@")[-1])]; assert len(ds)==1,ds; print(ds[0])' "$image")"; then
    printf '%s\t-\tDIGEST_FAILED\n' "$role" >>"$out/results.tsv"; failed=1; continue
  fi
  printf '%s\t%s\t%s\n' "$role" "$image" "$digest" >> "$out/images.tsv"
  for profile in dev release; do
    dir="$out/$role/$profile"
    opts=(); args=(); dest=/conf
    case "$role" in
      collector) opts=(--env MY_POD_IP=127.0.0.1); args=(validate --config=/conf/relay.yaml);;
      prometheus) opts=(--entrypoint /bin/promtool); dest=/etc/prometheus; args=(check config /etc/prometheus/prometheus.yml);;
      loki) args=(-config.file=/conf/config.yaml -verify-config=true);;
      tempo) args=(-config.file=/conf/tempo.yaml -config.verify=true);;
      grafana) printf '%s\t%s\tDEFERRED_STARTUP\n' "$role" "$profile" >> "$out/results.tsv"; continue;;
      *) echo "Unknown role: $role" >&2; exit 2;;
    esac
    # Copy one tar archive via Docker API, not a host path visible to the daemon.
    # Prometheus rule references remain /etc/config; copy into that exact directory.
    [[ "$role" != prometheus ]] || { dest=/etc/config; args=(check config /etc/config/prometheus.yml); }
    log="$out/$role.$profile.log"
    name="obs-e02-$(basename "$out")-$role-$profile"
    state=FAIL
    if cid="$(timeout 30s docker create --name "$name" --platform linux/amd64 --network none --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 1 "${opts[@]}" "$digest" "${args[@]}" </dev/null 2>"$log")"; then
      # Archive paths relative to container root. Docker extracts files into its writable layer.
      mkdir -p "$out/staging/$role/$profile$dest"
      cp "$dir/"* "$out/staging/$role/$profile$dest/"
      if tar --mode="u=rwX,go=rX" --owner=0 --group=0 --numeric-owner -C "$out/staging/$role/$profile" -cf - "${dest#/}" | timeout 30s docker cp - "$cid:/" >>"$log" 2>&1; then
        if timeout --kill-after=5s 60s docker start -a "$cid" </dev/null >>"$log" 2>&1 &&
           [[ "$(timeout 20s docker inspect --format '{{.State.Status}}:{{.State.ExitCode}}' "$cid" </dev/null)" == exited:0 ]]; then
          state=PASS
        fi
      fi
      cleanup || { echo "Cleanup failed for owned container $cid" >&2; exit 2; }
    else
      # A timed-out create can leave an object; do not delete by name without verified ID.
      echo "Create failed; inspect exact experiment name $name if timeout occurred" >>"$log"
      cid=""
    fi
    [[ "$state" == PASS ]] || failed=1
    printf '%s\t%s\t%s\n' "$role" "$profile" "$state" >>"$out/results.tsv"
  done
done
cat "$out/images.tsv" "$out/results.tsv"
for log in "$out"/*.dev.log "$out"/*.release.log "$out"/*.pull.log; do
  [[ -f "$log" ]] || continue
  printf '\n### %s\n' "$(basename "$log")"
  head -n 25 "$log"
  if [[ "$(wc -l < "$log")" -gt 25 ]]; then
    echo "... (full log retained locally) ..."
  fi
done
echo "Evidence directory: $out"
exit "$failed"
