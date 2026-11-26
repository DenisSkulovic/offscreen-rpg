#!/usr/bin/env bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
out="$(mktemp -d /tmp/offscreen-obs-final.XXXXXXXX)"
echo "Final evidence directory: $out"
bash "$here/render.sh" | tee "$out/render.log"
src="$(sed -n 's/^Evidence directory: //p' "$out/render.log" | tail -n 1)"
[[ -d "$src" && "$src" == */offscreen-obs-render.* ]]
bash "$here/validate.sh" "$src" | tee "$out/validate.log"
bin="$(sed -n 's/^Evidence directory: //p' "$out/validate.log" | tail -n 1)"
[[ -d "$bin" && "$bin" == /tmp/offscreen-obs-binary.* ]]
python3 - "$here/../specimens/image-lock-candidate.tsv" "$bin/images.tsv" "$bin/results.tsv" "$src/results.tsv" <<'PY'
import csv,sys
def rows(f):
    with open(f) as h: return list(csv.DictReader(h,delimiter="\t"))
def canon(s): return s.removeprefix("docker.io/").removeprefix("index.docker.io/")
expected={r["role"]:canon(r["immutable-reference"]) for r in rows(sys.argv[1])}
actual={r["role"]:canon(r["immutable-reference"]) for r in rows(sys.argv[2])}
assert len(expected)==5 and actual==expected,(expected,actual)
roles=set(expected)
pairs={(r,p) for r in roles for p in ("dev","release")}
render=rows(sys.argv[4])
assert len(render)==10 and {(r["chart"],r["profile"]) for r in render}==pairs and all(r["state"]=="RENDERED" for r in render)
validation=rows(sys.argv[3])
assert len(validation)==10 and {(r["role"],r["profile"]) for r in validation}==pairs
assert all(r["state"]==("DEFERRED_STARTUP" if r["role"]=="grafana" else "PASS") for r in validation)
print("FINAL: 10 renders, 8 native validations, 5 locked digests PASS; Grafana startup separately observed")
PY
echo "Render receipt: $src"
echo "Binary receipt: $bin"
echo "Final evidence directory: $out"
