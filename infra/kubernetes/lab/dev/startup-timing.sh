# Append one startup phase when the Node launcher asked for a receipt.
# No-op unless OFFSCREEN_STARTUP_TIMING is set. Never print credentials.
startup_timing_begin() {
  date +%s%3N
}
startup_timing_end() {
  local name="$1" parent="${OFFSCREEN_STARTUP_PHASE_PARENT:-$2}" cache="$3" started="$4"
  local file="${OFFSCREEN_STARTUP_TIMING:-}"
  if [[ -z "$file" || -z "$started" ]]; then
    return 0
  fi
  local ended=$(( $(date +%s%3N) - started ))
  mkdir -p "$(dirname "$file")"
  printf '{"name":"%s","parent":"%s","ms":%s,"cache":"%s"}\n' "$name" "$parent" "$ended" "$cache" >> "$file"
}
