# Append one startup phase when the Node launcher asked for a receipt.
# No-op unless OFFSCREEN_STARTUP_TIMING is set. Never print credentials.
startup_timing_begin() {
  local started_ms
  started_ms="$(date +%s%3N)"
  if command -v uuidgen >/dev/null 2>&1; then
    export OFFSCREEN_STARTUP_PHASE_ID="$(uuidgen)"
  elif [[ -r /proc/sys/kernel/random/uuid ]]; then
    export OFFSCREEN_STARTUP_PHASE_ID="$(tr -d '\n' < /proc/sys/kernel/random/uuid)"
  else
    export OFFSCREEN_STARTUP_PHASE_ID=""
  fi
  export OFFSCREEN_STARTUP_PHASE_STARTED_MS="$started_ms"
  printf '%s' "$started_ms"
}
startup_timing_end() {
  local name="$1" parent="${OFFSCREEN_STARTUP_PHASE_PARENT:-$2}" cache="$3" started="$4"
  local file="${OFFSCREEN_STARTUP_TIMING:-}"
  if [[ -z "$file" || -z "$started" ]]; then
    return 0
  fi
  local ended_ms=$(( $(date +%s%3N) - started ))
  local ended_at
  ended_at="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")"
  local started_at="${OFFSCREEN_STARTUP_PHASE_STARTED_AT:-}"
  if [[ -z "$started_at" ]]; then
    started_at="$(date -u -d "@$((started / 1000))" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")"
  fi
  mkdir -p "$(dirname "$file")"
  local operation_id="${OFFSCREEN_MONITOR_OPERATION_ID:-}"
  local phase_id="${OFFSCREEN_STARTUP_PHASE_ID:-}"
  local parent_phase_id="${OFFSCREEN_STARTUP_PARENT_PHASE_ID:-}"
  local parent_hint="false"
  if [[ -z "$parent_phase_id" && -n "$parent" ]]; then
    parent_hint="true"
  fi
  if command -v python3 >/dev/null 2>&1; then
    PYTHONPATH= python3 - <<'PY' "$file" "$name" "$parent" "$ended_ms" "$cache" "$started_at" "$ended_at" "$operation_id" "$phase_id" "$parent_phase_id" "$parent_hint"
import json, sys
path, name, parent, ms, cache, started_at, ended_at, operation_id, phase_id, parent_phase_id, parent_hint = sys.argv[1:12]
row = {
    "name": name,
    "parent": parent or None,
    "ms": int(ms),
    "cache": cache or None,
    "startedAt": started_at,
    "finishedAt": ended_at,
}
if operation_id:
    row["operationId"] = operation_id
if phase_id:
    row["phaseId"] = phase_id
if parent_phase_id:
    row["parentPhaseId"] = parent_phase_id
elif parent_hint == "true":
    row["parentHintApproximate"] = True
with open(path, "a", encoding="utf-8") as handle:
    handle.write(json.dumps(row, separators=(",", ":")) + "\n")
PY
    unset OFFSCREEN_STARTUP_PHASE_ID
    unset OFFSCREEN_STARTUP_PHASE_STARTED_MS
    unset OFFSCREEN_STARTUP_PHASE_STARTED_AT
    return 0
  fi
  printf '{"name":"%s","parent":"%s","ms":%s,"cache":"%s","startedAt":"%s","finishedAt":"%s"' \
    "$name" "$parent" "$ended_ms" "$cache" "$started_at" "$ended_at" >>"$file"
  if [[ -n "$operation_id" ]]; then
    printf ',"operationId":"%s"' "$operation_id" >>"$file"
  fi
  if [[ -n "$phase_id" ]]; then
    printf ',"phaseId":"%s"' "$phase_id" >>"$file"
  fi
  if [[ -n "$parent_phase_id" ]]; then
    printf ',"parentPhaseId":"%s"' "$parent_phase_id" >>"$file"
  elif [[ "$parent_hint" == "true" ]]; then
    printf ',"parentHintApproximate":true' >>"$file"
  fi
  printf '}\n' >>"$file"
  unset OFFSCREEN_STARTUP_PHASE_ID
  unset OFFSCREEN_STARTUP_PHASE_STARTED_MS
  unset OFFSCREEN_STARTUP_PHASE_STARTED_AT
}