#!/usr/bin/env bash
# Start labOnce, stop the worker after its timer has started, replace the server pod,
# start the worker again, and require the same run to finish with one side effect.
# Does not delete the cluster, the PVC, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values. Does not run a game workflow.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../../clusters/kind/release/lib.sh"
TEMPORAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi
if ! "${KUBECTL[@]}" -n lab-temporal get deploy temporal-server >/dev/null 2>&1; then
  echo "Temporal server is absent. Run temporal/install.sh first." >&2
  exit 1
fi

require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

temporal() {
  "${KUBECTL[@]}" -n lab-temporal exec deploy/temporal-admin -- temporal "$@"
}

effect_count() {
  "${KUBECTL[@]}" -n lab-temporal exec deploy/temporal-postgres -- \
    bash -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d lab -Atqc "SELECT count(*) FROM lab_effect;"'
}

show_summary() {
  temporal workflow show -w lab-once -o json >"$work/show.json"
  node "$TEMPORAL_DIR/read-history.mjs" "$work/show.json"
}

describe_summary() {
  temporal workflow describe -w lab-once -o json >"$work/describe.json"
  node "$TEMPORAL_DIR/read-history.mjs" "$work/describe.json"
}

field() {
  node -e '
    let doc;
    try { doc = JSON.parse(process.argv[1]); }
    catch { process.stdout.write(""); process.exit(0); }
    const value = doc[process.argv[2]];
    process.stdout.write(value === undefined || value === null ? "" : String(value));
  ' "$1" "$2"
}

"${KUBECTL[@]}" apply -f "$TEMPORAL_DIR/worker.yaml"
"${KUBECTL[@]}" -n lab-temporal rollout status deployment/lab-once-worker --timeout=240s
"${KUBECTL[@]}" -n lab-temporal delete job lab-once-start --ignore-not-found >/dev/null
"${KUBECTL[@]}" apply -f "$TEMPORAL_DIR/start-job.yaml"
if ! "${KUBECTL[@]}" -n lab-temporal wait --for=condition=complete job/lab-once-start --timeout=120s; then
  echo "The starter did not accept the workflow." >&2
  "${KUBECTL[@]}" -n lab-temporal logs job/lab-once-start --tail=40 >&2 || true
  exit 1
fi
echo "Starter log:"
"${KUBECTL[@]}" -n lab-temporal logs job/lab-once-start

deadline=$((SECONDS + 120))
summary='{}'
described='{}'
while (( SECONDS < deadline )); do
  summary="$(show_summary 2>/dev/null || printf '%s' '{}')"
  described="$(describe_summary 2>/dev/null || printf '%s' '{}')"
  echo "History while running: ${summary}"
  echo "Describe while running: ${described}"
  if [[ "$(field "$summary" timerStarted)" == "1" && "$(field "$summary" activityCompleted)" == "1" && "$(field "$described" status)" == "RUNNING" ]]; then
    break
  fi
  sleep 2
done
if [[ "$(field "$summary" timerStarted)" != "1" || "$(field "$summary" activityCompleted)" != "1" || "$(field "$described" status)" != "RUNNING" ]]; then
  echo "The durable timer was not observed while the workflow was still running." >&2
  echo "Last history: ${summary}" >&2
  echo "Last describe: ${described}" >&2
  exit 1
fi

run_id="$(field "$described" runId)"
if [[ -z "$run_id" ]]; then
  echo "History did not include a run id." >&2
  exit 1
fi
effects="$(effect_count)"
echo "Effects after the activity and before the worker stop: ${effects}"
if [[ "$effects" != "1" ]]; then
  echo "The external insert did not happen exactly once before the worker stop." >&2
  exit 1
fi

"${KUBECTL[@]}" -n lab-temporal scale deployment/lab-once-worker --replicas=0
"${KUBECTL[@]}" -n lab-temporal wait --for=delete pod -l app=lab-once-worker --timeout=120s
running_workers="$("${KUBECTL[@]}" -n lab-temporal get pods -l app=lab-once-worker --no-headers 2>/dev/null | wc -l | tr -d ' ')"
echo "Worker pods after scale down: ${running_workers}"
if [[ "$running_workers" != "0" ]]; then
  echo "The worker was still running after scale down." >&2
  exit 1
fi

paused="$(describe_summary)"
echo "Describe after worker stop: ${paused}"
if [[ "$(field "$paused" status)" != "RUNNING" || "$(field "$paused" runId)" != "$run_id" ]]; then
  echo "Stopping the worker changed the run or completed it early." >&2
  exit 1
fi

server_uid_before="$("${KUBECTL[@]}" -n lab-temporal get pod -l app=temporal-server -o jsonpath='{.items[0].metadata.uid}')"
pvc_uid_before="$("${KUBECTL[@]}" -n lab-temporal get pvc temporal-postgres -o jsonpath='{.metadata.uid}')"
echo "Server pod uid before delete: ${server_uid_before}"
echo "PVC uid before delete: ${pvc_uid_before}"
"${KUBECTL[@]}" -n lab-temporal delete pod -l app=temporal-server --wait=true --timeout=180s

deadline=$((SECONDS + 300))
server_uid_after=""
ready="false"
while (( SECONDS < deadline )); do
  server_uid_after="$("${KUBECTL[@]}" -n lab-temporal get pod -l app=temporal-server -o jsonpath='{.items[0].metadata.uid}' 2>/dev/null || true)"
  ready="$("${KUBECTL[@]}" -n lab-temporal get pod -l app=temporal-server -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>/dev/null || true)"
  if [[ -n "$server_uid_after" && "$server_uid_after" != "$server_uid_before" && "$ready" == "true" ]]; then
    break
  fi
  sleep 3
done
if [[ -z "$server_uid_after" || "$server_uid_after" == "$server_uid_before" || "$ready" != "true" ]]; then
  echo "Replacement Temporal server did not become ready." >&2
  exit 1
fi
health="$(temporal operator cluster health)"
echo "Cluster health after server replacement: ${health}"
if [[ "$health" != *SERVING* ]]; then
  echo "Replaced Temporal server is not SERVING." >&2
  exit 1
fi

resumed='{}'
resumed_state='{}'
for _ in $(seq 1 20); do
  resumed="$(show_summary 2>/dev/null || printf '%s' '{}')"
  resumed_state="$(describe_summary 2>/dev/null || printf '%s' '{}')"
  if [[ -n "$(field "$resumed_state" runId)" && "$(field "$resumed" timerStarted)" == "1" ]]; then
    break
  fi
  sleep 3
done
echo "History after server replacement: ${resumed}"
echo "Describe after server replacement: ${resumed_state}"
if [[ "$(field "$resumed_state" runId)" != "$run_id" || "$(field "$resumed" timerStarted)" != "1" || "$(field "$resumed" workflowStarted)" != "1" ]]; then
  echo "Replacing the server pod erased or replaced the workflow history." >&2
  exit 1
fi
if [[ "$(field "$resumed_state" status)" == "COMPLETED" ]]; then
  echo "The workflow completed while the worker was stopped." >&2
  exit 1
fi
effects="$(effect_count)"
echo "Effects after server replacement: ${effects}"
if [[ "$effects" != "1" ]]; then
  echo "Server replacement changed the external side effect." >&2
  exit 1
fi
pvc_uid_after="$("${KUBECTL[@]}" -n lab-temporal get pvc temporal-postgres -o jsonpath='{.metadata.uid}')"
echo "Server pod uid after delete: ${server_uid_after}"
echo "PVC uid after delete: ${pvc_uid_after}"
if [[ "$pvc_uid_after" != "$pvc_uid_before" ]]; then
  echo "The persistence claim changed when the server pod was replaced." >&2
  exit 1
fi

"${KUBECTL[@]}" -n lab-temporal scale deployment/lab-once-worker --replicas=1
"${KUBECTL[@]}" -n lab-temporal rollout status deployment/lab-once-worker --timeout=240s

deadline=$((SECONDS + 150))
finished=""
while (( SECONDS < deadline )); do
  if finished="$(describe_summary 2>/dev/null)"; then
    echo "Describe after worker return: ${finished}"
    if [[ "$(field "$finished" status)" == "COMPLETED" || "$(field "$finished" status)" == "FAILED" ]]; then
      break
    fi
  fi
  sleep 3
done
if [[ "$(field "$finished" status)" != "COMPLETED" || "$(field "$finished" runId)" != "$run_id" ]]; then
  echo "The same workflow did not complete after the worker returned." >&2
  echo "Last describe: ${finished}" >&2
  exit 1
fi

final="$(show_summary)"
echo "Final history: ${final}"
effects="$(effect_count)"
echo "Effects after completion: ${effects}"
if [[ "$effects" != "1" ]]; then
  echo "Worker restart duplicated or lost the external side effect." >&2
  exit 1
fi
if [[ "$(field "$final" activityCompleted)" != "1" || "$(field "$final" activityScheduled)" != "1" || "$(field "$final" activityFailed)" != "0" ]]; then
  echo "The activity did not complete exactly once." >&2
  exit 1
fi
if [[ "$(field "$final" workflowCompleted)" != "1" || "$(field "$final" workflowStarted)" != "1" ]]; then
  echo "The workflow did not start and complete exactly once." >&2
  exit 1
fi
result_text="$(temporal workflow show -w lab-once)"
printf '%s\n' "$result_text" | tail -30
if [[ "$result_text" != *finished-once* && "$(field "$final" finishedOnce)" != "true" ]]; then
  echo "The completed workflow did not return finished-once." >&2
  exit 1
fi

closed="$(temporal workflow list -o json --query 'WorkflowId="lab-once"')"
echo "Workflow list: ${closed}"
closed_count="$(node -e '
const raw = require("fs").readFileSync(0, "utf8");
let doc;
try { doc = JSON.parse(raw); }
catch { process.stdout.write("0"); process.exit(0); }
const rows = Array.isArray(doc) ? doc : (doc.executions || doc.workflows || []);
const mentions = raw.split("\"workflowId\":\"lab-once\"").length - 1;
const count = rows.length > 0 ? rows.length : mentions;
process.stdout.write(String(count));
' <<<"$closed")"
echo "Listed executions: ${closed_count}"
if [[ "$closed_count" != "1" ]]; then
  echo "lab-once did not finish as one execution." >&2
  exit 1
fi

cmdline="$("${KUBECTL[@]}" -n lab-temporal exec deploy/temporal-server -- sh -c 'tr "\0" " " < /proc/1/cmdline')"
echo "Server command: ${cmdline}"
if [[ "$cmdline" == *start-dev* || "$cmdline" != *temporal-server* ]]; then
  echo "The running server is not the pinned temporal-server process." >&2
  exit 1
fi

assert_loopback_only
volume_guard_end "$work"

echo "Smoke passed: lab-once run ${run_id} finished once after the worker and server were replaced."
echo "The external insert remained 1. The PVC uid stayed ${pvc_uid_after}."
echo "Deleting the kind cluster is not a backup of this workflow history."
