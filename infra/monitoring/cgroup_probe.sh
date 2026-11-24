#!/usr/bin/env bash
# Read-only cgroup v2 probe for Kind node containers (INF45 T03).
# Container IDs (lowercase 64-hex) on stdin, one per line; NDJSON per ID on stdout.
set -euo pipefail

CGROUP_ROOT="${CGROUP_ROOT:-/sys/fs/cgroup}"
PROC_ROOT="${PROC_ROOT:-/proc}"
MAX_DEPTH="${MAX_DEPTH:-12}"
MAX_FILE_BYTES="${MAX_FILE_BYTES:-65536}"
MAX_PROCS="${MAX_PROCS:-100}"
PROBE_DEADLINE_S="${PROBE_DEADLINE_S:-8}"
CGROUP_ID_RE='^[a-f0-9]{64}$'

start_epoch="${PROBE_START_EPOCH:-$(date +%s)}"

json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

deadline_reached() {
  local now
  now="$(date +%s)"
  (( now - start_epoch >= PROBE_DEADLINE_S ))
}

read_file_bounded() {
  local path="$1"
  if [[ -L "$path" ]]; then
    return 1
  fi
  if [[ ! -r "$path" ]]; then
    return 1
  fi
  head -c "$MAX_FILE_BYTES" "$path" 2>/dev/null
}

cgroup_v2_supported() {
  [[ -f "$CGROUP_ROOT/cgroup.controllers" ]] || [[ -f "$CGROUP_ROOT/cgroup.subtree_control" ]]
}

read_int_file() {
  local path="$1"
  local raw
  raw="$(read_file_bounded "$path" || true)"
  raw="${raw//$'\n'/}"
  raw="${raw//$'\r'/}"
  if [[ "$raw" =~ ^-?[0-9]+$ ]]; then
    printf '%s' "$raw"
    return 0
  fi
  return 1
}

append_kv_json() {
  local path="$1"
  local allow_re="$2"
  local line key val
  local first="${3:-1}"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line//$'\r'/}"
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^([^[:space:]]+)[[:space:]]+(.+)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      if [[ "$key" =~ $allow_re ]]; then
        if (( first )); then
          first=0
        else
          printf ','
        fi
        if [[ "$val" =~ ^-?[0-9]+$ ]]; then
          printf '"%s":%s' "$key" "$val"
        else
          printf '"%s":"%s"' "$key" "$(json_escape "$val")"
        fi
      fi
    fi
  done < <(read_file_bounded "$path" || true)
}

append_pressure_json() {
  local path="$1"
  local line section rest token k v
  local -a keys=(avg10 avg60 avg300 total)
  local section_idx=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line//$'\r'/}"
    [[ -z "$line" ]] && continue
    section="${line%% *}"
    rest="${line#* }"
    (( section_idx > 0 )) && printf ','
    printf '"%s":{' "$section"
    local idx=0
    for token in $rest; do
      k="${token%%=*}"
      v="${token#*=}"
      for key in "${keys[@]}"; do
        if [[ "$k" == "$key" ]]; then
          (( idx > 0 )) && printf ','
          printf '"%s":%s' "$k" "$v"
          idx=$((idx + 1))
          break
        fi
      done
    done
    printf '}'
    section_idx=$((section_idx + 1))
  done < <(read_file_bounded "$path" || true)
}

status_int() {
  local pid="$1"
  local field="$2"
  local line
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^${field}:[[:space:]]+([0-9]+) ]]; then
      printf '%s' "${BASH_REMATCH[1]}"
      return 0
    fi
  done < <(read_file_bounded "$PROC_ROOT/$pid/status" || true)
  return 1
}

emit_gap() {
  local id="$1"
  local reason="$2"
  printf '{"containerId":"%s","state":"gap","gapReason":"%s"}\n' "$id" "$(json_escape "$reason")"
}

emit_probe() {
  local id="$1"
  local cg_dir="$2"
  local proc_count=0
  local truncated=0
  local mem_current mem_peak swap_current swap_peak

  mem_current="$(read_int_file "$cg_dir/memory.current" 2>/dev/null || true)"
  mem_peak="$(read_int_file "$cg_dir/memory.peak" 2>/dev/null || true)"
  swap_current="$(read_int_file "$cg_dir/swap.current" 2>/dev/null || true)"
  swap_peak="$(read_int_file "$cg_dir/swap.peak" 2>/dev/null || true)"

  printf '{"containerId":"%s","state":"ok","cgroupPath":"%s",' "$id" "$(json_escape "${cg_dir#$CGROUP_ROOT}")"
  printf '"memory":{'
  local need_comma=0
  if [[ -n "$mem_current" ]]; then printf '"current":%s' "$mem_current"; need_comma=1; fi
  if [[ -n "$mem_peak" ]]; then (( need_comma )) && printf ','; printf '"peak":%s' "$mem_peak"; need_comma=1; fi
  if [[ -n "$swap_current" ]]; then (( need_comma )) && printf ','; printf '"swapCurrent":%s' "$swap_current"; need_comma=1; fi
  if [[ -n "$swap_peak" ]]; then (( need_comma )) && printf ','; printf '"swapPeak":%s' "$swap_peak"; need_comma=1; fi
  if [[ -r "$cg_dir/memory.events" ]] && [[ ! -L "$cg_dir/memory.events" ]]; then
    (( need_comma )) && printf ','
    printf '"events":{'
    append_kv_json "$cg_dir/memory.events" '^(oom_kill|oom|max|high|low)$'
    printf '}'
  fi
  printf '}'

  if [[ -r "$cg_dir/cpu.stat" ]] && [[ ! -L "$cg_dir/cpu.stat" ]]; then
    printf ',"cpuStat":{'
    append_kv_json "$cg_dir/cpu.stat" '^(usage_usec|user_usec|system_usec|nr_periods|nr_throttled|throttled_usec)$'
    printf '}'
  fi

  if [[ -r "$cg_dir/io.stat" ]] && [[ ! -L "$cg_dir/io.stat" ]]; then
    printf ',"ioStatPresent":true'
  fi

  for psi in memory cpu io; do
    if [[ -r "$cg_dir/${psi}.pressure" ]] && [[ ! -L "$cg_dir/${psi}.pressure" ]]; then
      printf ',"%sPressure":{' "$psi"
      append_pressure_json "$cg_dir/${psi}.pressure"
      printf '}'
    fi
  done

  printf ',"processes":['
  local proc_json=0
  while IFS= read -r pid || [[ -n "$pid" ]]; do
    pid="${pid//$'\r'/}"
    [[ -z "$pid" ]] && continue
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    if (( proc_count >= MAX_PROCS )); then
      truncated=1
      break
    fi
    if deadline_reached; then
      truncated=1
      break
    fi
    local stat_line comm pid_val rest fields
    stat_line="$(read_file_bounded "$PROC_ROOT/$pid/stat" || true)"
    [[ -z "$stat_line" ]] && continue
    pid_val="${stat_line%% *}"
    comm="${stat_line#*(}"
    comm="${comm%%)*}"
    rest="${stat_line##*)}"
    rest="${rest# }"
    fields=($rest)
    if ((${#fields[@]} < 21)); then
      continue
    fi
    (( proc_json )) && printf ','
    proc_json=1
    printf '{"pid":%s,"starttimeTicks":%s,"state":"%s","ppid":%s,"utime":%s,"stime":%s,"rssPages":%s' \
      "${pid_val}" "${fields[18]}" "$(json_escape "${fields[0]}")" "${fields[1]}" \
      "${fields[10]}" "${fields[11]}" "${fields[20]}"
    local vm_rss threads
    vm_rss="$(status_int "$pid" "VmRSS" 2>/dev/null || true)"
    threads="$(status_int "$pid" "Threads" 2>/dev/null || true)"
    if [[ -n "$vm_rss" ]]; then printf ',"vmRssKiB":%s' "$vm_rss"; fi
    if [[ -n "$threads" ]]; then printf ',"threads":%s' "$threads"; fi
    printf ',"comm":"%s"}' "$(json_escape "$comm")"
    proc_count=$((proc_count + 1))
  done < <(read_file_bounded "$cg_dir/cgroup.procs" 2>/dev/null || true)

  printf '],"processTruncated":'
  if (( truncated )); then printf 'true'; else printf 'false'; fi
  printf ',"processCount":%s}\n' "$proc_count"
}

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line//$'\r'/}"
  line="${line//[[:space:]]/}"
  [[ -z "$line" ]] && continue
  if [[ ! "$line" =~ $CGROUP_ID_RE ]]; then
    emit_gap "${line:0:32}" "invalid container id"
    continue
  fi
  if deadline_reached; then
    emit_gap "$line" "probe deadline exceeded"
    continue
  fi
  if ! cgroup_v2_supported; then
    emit_gap "$line" "cgroup v1 unsupported"
    continue
  fi
  hits=()
  while IFS= read -r -d '' path; do
    if [[ -L "$path" ]]; then
      continue
    fi
    base="$(basename "$path")"
    if [[ "$base" == "cri-containerd-${line}.scope" || "$base" == "$line" ]]; then
      hits+=("$path")
    fi
  done < <(find "$CGROUP_ROOT" -maxdepth "$MAX_DEPTH" \( \
    -name "cri-containerd-${line}.scope" -o -name "$line" \) -print0 2>/dev/null || true)
  if ((${#hits[@]} == 0)); then
    emit_gap "$line" "cgroup directory absent"
    continue
  fi
  if ((${#hits[@]} > 1)); then
    emit_gap "$line" "ambiguous cgroup directory"
    continue
  fi
  if [[ ! -d "${hits[0]}" ]]; then
    emit_gap "$line" "cgroup directory unreadable"
    continue
  fi
  emit_probe "$line" "${hits[0]}"
done