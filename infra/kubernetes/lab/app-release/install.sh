#!/usr/bin/env bash
# Apply the TURN02 app release overlay after local image and cluster guards.
# Does not delete Docker volumes, namespaces, or clusters. Does not print Secret values.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OVERLAY_DIR="${RELEASE_DIR}/overlay"
CONTEXT_NAME="kind-offscreen-lab"
CLUSTER_NAME="offscreen-lab"
KUBECTL=(kubectl --context "$CONTEXT_NAME")

WEB_IMAGE="offscreen-lab-game-web:turn02"
API_IMAGE="offscreen-lab-app-release-api:turn02"
GA_IMAGE="offscreen-lab-app-release-ga:turn02"
WORKER_IMAGE="offscreen-lab-app-release-worker:turn02"

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing install: kubectl context ${CONTEXT_NAME} is absent. Not switching contexts." >&2
  exit 1
fi

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Refusing install: kind cluster ${CLUSTER_NAME} is not running." >&2
  exit 1
fi

for image in "$WEB_IMAGE" "$API_IMAGE" "$GA_IMAGE"; do
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Refusing install: local image ${image} is missing." >&2
    exit 1
  fi
done

if ! docker image inspect "$WORKER_IMAGE" >/dev/null 2>&1; then
  echo "Refusing install: local image ${WORKER_IMAGE} is missing." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-edge get gateway lab-edge >/dev/null 2>&1; then
  echo "Refusing install: Gateway lab-edge is missing in lab-edge." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-postgres get secret lab-pg-app >/dev/null 2>&1; then
  echo "Refusing install: Secret lab-pg-app is missing in lab-postgres." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-objects get service object-store >/dev/null 2>&1; then
  echo "Refusing install: Service object-store is missing in lab-objects." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-temporal get service temporal-server >/dev/null 2>&1; then
  echo "Refusing install: Service temporal-server is missing in lab-temporal." >&2
  exit 1
fi

echo "Loading release images into ${CLUSTER_NAME}…"
for image in "$WEB_IMAGE" "$API_IMAGE" "$GA_IMAGE" "$WORKER_IMAGE"; do
  if ! kind load docker-image "$image" --name "$CLUSTER_NAME"; then
    echo "Refusing install: could not load ${image} into ${CLUSTER_NAME}." >&2
    exit 1
  fi
done

echo "Preparing release Secrets from the lab database, object store, and root .env…"
export OFFSCREEN_REPO_ROOT="$(cd "${RELEASE_DIR}/../../../.." && pwd)"
python3 - "$CONTEXT_NAME" <<'PY'
import base64, json, os, secrets, subprocess, sys

context = sys.argv[1]
kubectl = ["kubectl", "--context", context]

def run(args, data=None):
    result = subprocess.run(
        kubectl + args,
        input=data,
        capture_output=True,
    )
    if result.returncode != 0:
        sys.stderr.buffer.write(result.stderr[:800])
        raise SystemExit(result.returncode)
    return result.stdout

def ensure_namespace(name):
    manifest = run(["create", "namespace", name, "--dry-run=client", "-o", "yaml"])
    run(["apply", "-f", "-"], manifest)

def read_secret(namespace, name):
    try:
        raw = subprocess.run(
            kubectl + ["-n", namespace, "get", "secret", name, "-o", "json"],
            capture_output=True,
            check=True,
        ).stdout
    except subprocess.CalledProcessError:
        return None
    encoded = json.loads(raw)["data"]
    return {key: base64.b64decode(value).decode() for key, value in encoded.items()}

def apply_secret(namespace, name, values):
    manifest = {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {
            "name": name,
            "namespace": namespace,
            "labels": {"offscreen.rpg/lab": "disposable"},
        },
        "type": "Opaque",
        "stringData": values,
    }
    run(["apply", "-f", "-"], json.dumps(manifest).encode())

for namespace in ("lab-edge", "lab-authority", "lab-workers"):
    ensure_namespace(namespace)

def read_local_env(path):
    values = {}
    if not os.path.isfile(path):
        return values
    with open(path, encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values

local_env = read_local_env(os.environ["OFFSCREEN_REPO_ROOT"] + "/.env")
required = ("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "BETTER_AUTH_SECRET")
missing = [key for key in required if not local_env.get(key)]
if missing:
    sys.stderr.write(
        "Refusing install: root .env is missing "
        + ", ".join(missing)
        + ". Copy .env.example and set the local GitHub OAuth app values. Do not commit .env.\n"
    )
    raise SystemExit(1)
if len(local_env["BETTER_AUTH_SECRET"]) < 32:
    sys.stderr.write(
        "Refusing install: BETTER_AUTH_SECRET in .env must be at least 32 characters.\n"
    )
    raise SystemExit(1)

database = read_secret("lab-edge", "game-db")
if database is None:
    source = read_secret("lab-postgres", "lab-pg-app")
    if source is None or not source.get("uri"):
        sys.stderr.write("Refusing install: lab-pg-app has no uri.\n")
        raise SystemExit(1)
    database = {"uri": source["uri"]}
runtime = read_secret("lab-edge", "game-runtime")
if runtime is None:
    store = read_secret("lab-objects", "object-store-s3")
    if store is None or not store.get("access-key-id") or not store.get("secret-access-key"):
        sys.stderr.write("Refusing install: object-store-s3 is missing access keys.\n")
        raise SystemExit(1)
    tokens = [secrets.token_hex(24) for _ in range(3)]
    runtime = {
        "access-key-id": store["access-key-id"],
        "secret-access-key": store["secret-access-key"],
        "better-auth-secret": local_env["BETTER_AUTH_SECRET"],
        "game-authority-service-token": tokens[0],
        "game-authority-control-token": tokens[1],
        "game-authority-executor-token": tokens[2],
        "github-client-id": local_env["GITHUB_CLIENT_ID"],
        "github-client-secret": local_env["GITHUB_CLIENT_SECRET"],
    }
else:
    runtime["better-auth-secret"] = local_env["BETTER_AUTH_SECRET"]
    runtime["github-client-id"] = local_env["GITHUB_CLIENT_ID"]
    runtime["github-client-secret"] = local_env["GITHUB_CLIENT_SECRET"]
for namespace in ("lab-edge", "lab-authority", "lab-workers"):
    if read_secret(namespace, "game-db") is None:
        apply_secret(namespace, "game-db", database)
    apply_secret(namespace, "game-runtime", runtime)
PY

echo "Applying migration Job ${OVERLAY_DIR}/migrate.yaml and waiting for completion…"
"${KUBECTL[@]}" apply -f "${OVERLAY_DIR}/migrate.yaml"
"${KUBECTL[@]}" -n lab-edge wait --for=condition=complete "job/game-migrate" --timeout=300s

echo "Applying authority, workers, and edge overlays…"
"${KUBECTL[@]}" apply -f "${OVERLAY_DIR}/authority.yaml"
"${KUBECTL[@]}" apply -f "${OVERLAY_DIR}/workers.yaml"
"${KUBECTL[@]}" apply -f "${OVERLAY_DIR}/edge.yaml"

"${KUBECTL[@]}" -n lab-edge rollout status deployment/game-api --timeout=300s
"${KUBECTL[@]}" -n lab-edge rollout status deployment/game-web --timeout=300s
"${KUBECTL[@]}" -n lab-authority rollout status deployment/game-authority --timeout=300s
"${KUBECTL[@]}" -n lab-workers rollout status deployment/game-control --timeout=300s
"${KUBECTL[@]}" -n lab-workers rollout status deployment/game-executor --timeout=300s
"${KUBECTL[@]}" -n lab-workers rollout status deployment/game-relay --timeout=300s

echo "App release overlay applied."