#!/usr/bin/env bash
# Prove four placeholder pods, one synthetic operation id, and a duplicate that does not apply twice.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT/../lib.sh"
NS=lab-skeletons
IMAGE="docker.io/library/python:3.12-alpine@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

echo "MemAvailable KiB: $(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
echo "Versions"
docker version --format 'Docker {{.Server.Version}}'
kind version
kubectl version --client=true
"${KUBECTL[@]}" version

echo "Workloads"
"${KUBECTL[@]}" -n "$NS" get deploy,svc,pods,pvc,ingress -o wide

pods="$("${KUBECTL[@]}" -n "$NS" get pods --no-headers)"
printf '%s\n' "$pods"
ready_count="$(printf '%s\n' "$pods" | awk '$2=="1/1" && $3=="Running" {count++} END {print count+0}')"
if [[ "$ready_count" -ne 4 ]]; then
  echo "Expected four ready placeholder pods, got ${ready_count}." >&2
  exit 1
fi

names="$("${KUBECTL[@]}" -n "$NS" get deploy,svc,pod -o name)"
for required in web-api engine storyteller notifications; do
  if ! printf '%s\n' "$names" | grep -qx "deployment.apps/${required}"; then
    echo "Missing deployment ${required}." >&2
    exit 1
  fi
done
if printf '%s\n' "$names" | grep -Ei 'economy|cognee|websocket'; then
  echo "A forbidden workload is present." >&2
  exit 1
fi

svc_lines="$("${KUBECTL[@]}" -n "$NS" get svc --no-headers)"
svc_count="$(printf '%s\n' "$svc_lines" | grep -c . || true)"
if [[ "$svc_count" -ne 4 ]]; then
  echo "Expected four Services, got ${svc_count}." >&2
  exit 1
fi
if printf '%s\n' "$svc_lines" | awk '{print $2}' | grep -v '^ClusterIP$' | grep -q .; then
  echo "A skeleton Service is not ClusterIP." >&2
  printf '%s\n' "$svc_lines" >&2
  exit 1
fi

ingress_names="$("${KUBECTL[@]}" -n "$NS" get ingress -o name)"
if [[ -n "$ingress_names" ]]; then
  echo "An Ingress is present. Public ingress stays disabled." >&2
  printf '%s\n' "$ingress_names" >&2
  exit 1
fi
pvc_names="$("${KUBECTL[@]}" -n "$NS" get pvc -o name)"
if [[ -n "$pvc_names" ]]; then
  echo "A volume claim is present. Placeholders must not persist game state." >&2
  printf '%s\n' "$pvc_names" >&2
  exit 1
fi

images="$("${KUBECTL[@]}" -n "$NS" get pods -o jsonpath='{range .items[*]}{.spec.containers[0].image}{"\n"}{end}')"
printf '%s\n' "$images"
if printf '%s\n' "$images" | grep -vx "$IMAGE" | grep -q .; then
  echo "A placeholder is not the pinned Python image." >&2
  exit 1
fi
if printf '%s\n' "$images" | grep -Ei 'next|nest'; then
  echo "A Next or Nest image is present." >&2
  exit 1
fi

replicas="$("${KUBECTL[@]}" -n "$NS" get deploy -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.replicas}{"\n"}{end}')"
printf '%s\n' "$replicas"
if printf '%s\n' "$replicas" | awk '{print $2}' | grep -vx '1' | grep -q .; then
  echo "A placeholder Deployment is not pinned at one replica." >&2
  exit 1
fi

echo "A ready pod is not a game service. Sending one synthetic operation id."
if ! smoke_log="$("${KUBECTL[@]}" -n "$NS" exec -i deploy/web-api -- python -u - <<'PY'
import json
import secrets
import urllib.error
import urllib.request

CONTRACT = "offscreen.synthetic-command.v1"
OP = "lab-op-" + secrets.token_hex(8)

def request(method, url, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode())

def check(condition, label, detail):
    if not condition:
        raise SystemExit(f"fail {label}: {detail}")
    print(f"pass {label}")

def command(scene_id, holder, contract=CONTRACT, operation_id=OP):
    return {
        "contract": contract,
        "operationId": operation_id,
        "sceneId": scene_id,
        "item": "sword-a",
        "holder": holder,
    }

hosts = {
    "web-api": "http://web-api:8080",
    "engine": "http://engine:8080",
    "storyteller": "http://storyteller:8080",
    "notifications": "http://notifications:8080",
}

for role, base in hosts.items():
    status, body = request("GET", base + "/status")
    check(status == 200, f"{role} status", body)
    check(body.get("placeholder") is True, f"{role} placeholder", body)
    check(body.get("runsGame") is False, f"{role} runsGame", body)
    check(body.get("callsModel") is False, f"{role} callsModel", body)
    check(body.get("takesPayment") is False, f"{role} takesPayment", body)
    check(body.get("writesGameDatabase") is False, f"{role} writesGameDatabase", body)
    check(body.get("websocketServer") is False, f"{role} websocket", body)
    check(body.get("cognee") is False, f"{role} cognee", body)
    check(body.get("gameEconomy") is False, f"{role} economy", body)
    check(body.get("historicalFork") is False, f"{role} historicalFork", body)
    check(body.get("checkpointWriter") is (role == "engine"), f"{role} checkpointWriter", body)

status, body = request("POST", hosts["engine"] + "/commands", command("scene-later", "holder-late", contract="offscreen.synthetic-command.v0"))
check(status == 400 and body.get("error") == "unknown-contract", "unknown contract", body)
status, body = request("GET", hosts["engine"] + "/status")
check(body.get("recordedEffects") == 0, "unknown contract applied nothing", body)

older = command("scene-older", "holder-late")
status, body = request("POST", hosts["engine"] + "/commands", older)
check(status == 409 and body.get("error") == "older-scene-is-immutable" and body.get("committed") is False, "engine rejects older scene", body)
status, edge = request("POST", hosts["web-api"] + "/api/commands", older)
check(edge.get("committed") is False and status == 409, "edge does not accept an older-scene write", (status, edge))
status, scene = request("GET", hosts["engine"] + "/scenes/scene-older")
check(scene.get("holder") == "holder-early", "older holder before transfer", scene)
status, body = request("GET", hosts["engine"] + "/status")
check(body.get("recordedEffects") == 0, "rejected writes applied nothing", body)

status, body = request("POST", hosts["engine"] + "/commit", command("scene-later", "holder-late"))
check(status == 404 and body.get("committed") is False, "engine has no second commit route", body)
status, body = request("POST", hosts["storyteller"] + "/commit", command("scene-later", "holder-late"))
check(status == 409 and body.get("error") == "storyteller-proposes-only" and body.get("committed") is False and body.get("checkpointWriter") is False, "storyteller does not commit", body)
status, body = request("POST", hosts["storyteller"] + "/commands", command("scene-later", "holder-late"))
check(status == 404, "storyteller does not apply a command", body)
status, body = request("POST", hosts["notifications"] + "/commands", command("scene-later", "holder-late"))
check(status == 404 and body.get("effectCount") == 0, "notifications do not apply a command", body)

first_status, first = request("POST", hosts["web-api"] + "/api/commands", command("scene-later", "holder-late"))
check(first_status == 202, "first delivery status", first_status)
check(first.get("committed") is False, "202 is not a commit", first)
check(first.get("httpStatusMeaning") == "accepted-not-committed", "202 meaning", first)
check(first.get("storesCheckpoint") is False, "edge stores no checkpoint", first)
check(first.get("sseHintIsCommit") is False, "sse hint is not a commit", first)
check(first.get("engineEffectCount") == 1, "engine recorded one effect", first)
check(first.get("duplicate") is False, "first delivery is not a duplicate", first)

status, operation = request("GET", hosts["engine"] + f"/operations/{OP}")
check(status == 200, "read operation", operation)
check(operation.get("effectCount") == 1, "effect count after first delivery", operation)
check(operation.get("attemptsSeen") == 1, "one attempt recorded", operation)
check(operation.get("recordedEffects") == 1, "one recorded effect", operation)
check(operation.get("gameDatabaseWrite") is False, "no game database write", operation)
check(operation.get("olderHolder") == "holder-early", "older holder after transfer", operation)
check(operation.get("laterHolder") == "holder-late", "later holder after transfer", operation)

status, later = request("GET", hosts["engine"] + "/scenes/scene-later")
check(later.get("holder") == "holder-late", "later scene holder", later)
status, older_scene = request("GET", hosts["engine"] + "/scenes/scene-older")
check(older_scene.get("holder") == "holder-early", "older scene holder", older_scene)
check(older_scene.get("historicalFork") is False, "scene read is not a fork", older_scene)
check(older_scene.get("limit") == "contract-assertion", "scene limit", older_scene)

status, contract = request("GET", hosts["engine"] + "/contract/older-scene-holder")
check(contract.get("olderHolderUnchanged") is True, "older holder unchanged", contract)
check(contract.get("transferDemonstrated") is True, "later transfer demonstrated", contract)
check(contract.get("holder") == "holder-early", "contract older holder", contract)
check(contract.get("laterHolder") == "holder-late", "contract later holder", contract)
check(contract.get("historicalFork") is False, "historical fork flag", contract)
check(contract.get("proposedForkInheritsLaterState") is False, "fork does not inherit later state", contract)
check(contract.get("limit") == "contract-assertion", "contract limit", contract)

second_status, second = request("POST", hosts["web-api"] + "/api/commands", command("scene-later", "holder-late"))
check(second_status == 202 and second.get("committed") is False, "duplicate still not a commit", second)
check(second.get("duplicate") is True, "duplicate flagged", second)
check(second.get("engineEffectCount") == 1, "duplicate does not increment the effect", second)

status, operation = request("GET", hosts["engine"] + f"/operations/{OP}")
check(operation.get("effectCount") == 1, "effect count after duplicate", operation)
check(operation.get("attemptsSeen") == 2, "duplicate attempt was seen", operation)
check(operation.get("recordedEffects") == 1, "still one recorded effect", operation)
check(operation.get("holder") == "holder-late", "holder stays the first transfer", operation)

status, proposal = request("POST", hosts["storyteller"] + "/proposals", command("scene-later", "holder-late"))
check(status == 200 and proposal.get("committed") is False, "proposal not committed", proposal)
check(proposal.get("effectCount") == 0 and proposal.get("checkpointWriter") is False, "proposal applies nothing", proposal)
check(proposal.get("proposalCount") == 1 and proposal.get("duplicate") is False, "one proposal", proposal)
status, again = request("POST", hosts["storyteller"] + "/proposals", command("scene-later", "holder-late"))
check(again.get("duplicate") is True and again.get("proposalCount") == 1, "duplicate proposal", again)
check(again.get("effectCount") == 0 and again.get("committed") is False, "duplicate proposal applies nothing", again)

status, delivery = request("POST", hosts["notifications"] + "/deliveries", command("scene-later", "holder-late"))
check(status == 200 and delivery.get("effectCount") == 0, "notification applies nothing", delivery)
check(delivery.get("deliveryCount") == 1 and delivery.get("duplicate") is False, "one delivery record", delivery)
status, delivery_again = request("POST", hosts["notifications"] + "/deliveries", command("scene-later", "holder-late"))
check(delivery_again.get("duplicate") is True, "duplicate delivery seen", delivery_again)
check(delivery_again.get("deliveryCount") == 1, "duplicate delivery is not a second record", delivery_again)
check(delivery_again.get("attemptsSeen") == 2, "both notification attempts seen", delivery_again)
check(delivery_again.get("effectCount") == 0, "duplicate delivery applies no effect", delivery_again)

status, operation = request("GET", hosts["engine"] + f"/operations/{OP}")
check(operation.get("effectCount") == 1 and operation.get("recordedEffects") == 1, "consumers did not add an effect", operation)
status, older_scene = request("GET", hosts["engine"] + "/scenes/scene-older")
check(older_scene.get("holder") == "holder-early", "older holder after consumers", older_scene)
status, contract = request("GET", hosts["engine"] + "/contract/older-scene-holder")
check(contract.get("historicalFork") is False and contract.get("olderHolderUnchanged") is True, "contract still holds", contract)
status, local = request("GET", hosts["web-api"] + "/api/local-effects")
check(local.get("effectCount") == 0 and local.get("storesCheckpoint") is False, "edge effect store stays empty", local)

print("four-placeholder-pods-ready")
print(f"operation-id:{OP}")
print("delivered-once")
print("duplicate-delivery-no-second-effect")
print("effect-count:1")
print("attempts-seen:2")
print("older-scene-holder-unchanged")
print("historical-forks-not-implemented")
print("storyteller-does-not-commit")
print("no-game-database-write")
print("ready-pod-is-not-a-game-service")
PY
)"; then
  echo "Synthetic smoke failed." >&2
  printf '%s\n' "${smoke_log:-}" >&2
  "${KUBECTL[@]}" -n "$NS" logs deploy/web-api --tail=80 || true
  "${KUBECTL[@]}" -n "$NS" logs deploy/engine --tail=80 || true
  exit 1
fi

printf '%s\n' "$smoke_log"
for line in \
  four-placeholder-pods-ready \
  delivered-once \
  duplicate-delivery-no-second-effect \
  effect-count:1 \
  attempts-seen:2 \
  older-scene-holder-unchanged \
  historical-forks-not-implemented \
  storyteller-does-not-commit \
  no-game-database-write \
  ready-pod-is-not-a-game-service
do
  if ! printf '%s\n' "$smoke_log" | grep -qx "$line"; then
    echo "Smoke log is missing ${line}." >&2
    exit 1
  fi
done
if ! printf '%s\n' "$smoke_log" | grep -Eq '^operation-id:lab-op-[0-9a-f]{16}$'; then
  echo "Smoke log is missing the operation id." >&2
  exit 1
fi

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"
echo "Smoke passed: four placeholders, one operation id, and a duplicate that did not apply a second effect."
echo "The older-scene holder check is a contract assertion. Historical forks are not implemented."
echo "A ready pod is not a game service."
