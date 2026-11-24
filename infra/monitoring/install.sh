#!/usr/bin/env bash
# offscreen-monitor installation planner and guarded apply.
# Default: read-only --plan. Mutations require --apply --confirm.
# Live activation (--activate) is operator-authorized only; source tests must not use it.
set -euo pipefail

readonly OWNED_MARKER='offscreen-monitor-managed'
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_MONITOR_ROOT="${OFFSCREEN_MONITOR_REPO_ROOT:-$SCRIPT_DIR}"

MODE=plan
APPLY_CONFIRM=false
ACTIVATE=false
NETDATA_REPLACE=false

usage() {
  cat <<'EOF'
Usage: infra/monitoring/install.sh [--plan] [--apply --confirm] [--activate] [--netdata-replace]

  --plan            Read-only install plan (default).
  --apply           Perform file installation (requires --confirm).
  --confirm         Explicit acknowledgement for --apply.
  --activate        After apply, enable units and verify health (operator only).
  --netdata-replace Replace existing unowned Netdata config after operator backup.

Native Netdata v2 package installation is a separate operator step.
No curl-pipe-shell, no package repository changes, no sudo escalation here.
EOF
}

log() { printf 'offscreen-monitor: %s\n' "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan) MODE=plan; shift ;;
    --apply) MODE=apply; shift ;;
    --confirm) APPLY_CONFIRM=true; shift ;;
    --activate) ACTIVATE=true; shift ;;
    --netdata-replace) NETDATA_REPLACE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

if [[ "$MODE" == apply && "$APPLY_CONFIRM" != true ]]; then
  die "--apply requires explicit --confirm"
fi

if [[ "$ACTIVATE" == true && "$MODE" != apply ]]; then
  die "--activate requires --apply --confirm"
fi

# 1. Resolve install destinations (overridable for fixture runs).
LIB_PREFIX="${OFFSCREEN_MONITOR_LIB_PREFIX:-/usr/local/lib/offscreen-monitor}"
ETC_PREFIX="${OFFSCREEN_MONITOR_ETC_PREFIX:-/etc/offscreen-monitor}"
UNIT_DIR="${OFFSCREEN_MONITOR_UNIT_DIR:-/etc/systemd/system}"
NETDATA_CONF_DEST="${OFFSCREEN_MONITOR_NETDATA_CONF:-/etc/netdata/netdata.conf}"
STATE_ROOT="${OFFSCREEN_MONITOR_STATE_ROOT:-${HOME:-}/.local/state/offscreen-monitor}"
MANIFEST_PATH="${OFFSCREEN_MONITOR_MANIFEST:-$STATE_ROOT/capability-manifest.json}"

RUN_PYTHON="${OFFSCREEN_MONITOR_RUN_PYTHON:-python3}"
RUN_NETDATA_VERSION="${OFFSCREEN_MONITOR_RUN_NETDATA_VERSION:-}"
RUN_PORT_CHECK="${OFFSCREEN_MONITOR_RUN_PORT_CHECK:-}"
RUN_SYSTEMCTL="${OFFSCREEN_MONITOR_RUN_SYSTEMCTL:-systemctl}"
PROC1_COMM_FILE="${OFFSCREEN_MONITOR_PROC1_COMM_FILE:-/proc/1/comm}"

CALLER_UID="${OFFSCREEN_MONITOR_CALLER_UID:-$(id -u)}"
CALLER_USER="${OFFSCREEN_MONITOR_CALLER_USER:-$(id -un)}"

owned_file() {
  local path="$1"
  [[ -f "$path" ]] || return 1
  grep -q "$OWNED_MARKER" "$path"
}

read_proc1_comm() {
  if [[ -r "$PROC1_COMM_FILE" ]]; then
    tr -d '\n' <"$PROC1_COMM_FILE"
  else
    echo ''
  fi
}

run_port_collision_check() {
  local port="${1:-19999}"
  if [[ -n "$RUN_PORT_CHECK" ]]; then
    # shellcheck disable=SC2086
    $RUN_PORT_CHECK "$port"
    return $?
  fi
  if command -v ss >/dev/null 2>&1; then
    if ss -H -ltn "sport = :$port" 2>/dev/null | grep -q .; then
      return 0
    fi
    return 1
  fi
  return 2
}

netdata_version_ok() {
  if [[ -n "$RUN_NETDATA_VERSION" ]]; then
    # shellcheck disable=SC2086
    $RUN_NETDATA_VERSION
    return $?
  fi
  if command -v netdatacli >/dev/null 2>&1; then
    local ver
    ver="$(netdatacli -v 2>/dev/null || true)"
    [[ "$ver" =~ v?2\. ]] && return 0
  fi
  if command -v netdata >/dev/null 2>&1; then
    local ver
    ver="$(netdata -v 2>&1 || true)"
    [[ "$ver" =~ v?2\. ]] && return 0
  fi
  return 1
}

# 2. Preflight guards shared by plan and apply.
preflight() {
  [[ "$(uname -s)" == Linux ]] || die 'BLOCKED: Linux required'

  local proc1
  proc1="$(read_proc1_comm)"
  [[ "$proc1" == systemd ]] || die "BLOCKED: systemd must be PID 1 (saw: ${proc1:-unknown})"

  [[ "$CALLER_UID" -gt 0 ]] || die 'BLOCKED: refuse root-owned install; run as the operator user'

  [[ -n "${HOME:-}" ]] || die 'BLOCKED: HOME must be set'
  [[ "${HOME:0:1}" == / ]] || die 'BLOCKED: HOME must be an absolute path'
  if [[ -L "$HOME" ]]; then
    die 'BLOCKED: HOME must not be a symlink for stable service paths'
  fi

  if ! command -v "$RUN_PYTHON" >/dev/null 2>&1 && [[ ! -x "$RUN_PYTHON" ]]; then
    die 'BLOCKED: python3 required'
  fi
  # shellcheck disable=SC2086
  $RUN_PYTHON -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' \
    || die 'BLOCKED: python3 >= 3.9 required'

  netdata_version_ok || die 'BLOCKED: Netdata Agent v2 not detected (operator package step)'

  local unit_path="$UNIT_DIR/offscreen-monitor@.service"
  if [[ -f "$unit_path" ]] && ! owned_file "$unit_path"; then
    die "BLOCKED: foreign unit already present at $unit_path"
  fi

  if [[ -f "$NETDATA_CONF_DEST" ]] && ! owned_file "$NETDATA_CONF_DEST"; then
    if [[ "$NETDATA_REPLACE" != true ]]; then
      die "BLOCKED: existing Netdata config at $NETDATA_CONF_DEST (use --netdata-replace after operator backup)"
    fi
  fi

  local collision_rc=1
  run_port_collision_check 19999 && collision_rc=0 || collision_rc=$?
  if [[ $collision_rc -eq 0 ]]; then
    if [[ ! -f "$NETDATA_CONF_DEST" ]] || ! owned_file "$NETDATA_CONF_DEST"; then
      die 'BLOCKED: loopback port 19999 already in use by an unowned listener'
    fi
  elif [[ $collision_rc -eq 2 ]]; then
    log 'WARN: port check unavailable; plan continues but live activation may be BLOCKED'
  fi

  if [[ -d "$LIB_PREFIX" ]] && [[ -L "$LIB_PREFIX" ]]; then
    die "BLOCKED: install lib path must not be a symlink: $LIB_PREFIX"
  fi
}

user_config_path() {
  printf '%s/%s.json' "$ETC_PREFIX" "$CALLER_USER"
}

render_user_config() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  cat >"$dest" <<JSON
{
  "schemaVersion": 1,
  "managedBy": "offscreen-monitor",
  "username": "${CALLER_USER}",
  "stateRoot": "${STATE_ROOT}",
  "dockerContext": "${OFFSCREEN_MONITOR_DOCKER_CONTEXT:-}",
  "kubeconfigPath": "${OFFSCREEN_MONITOR_KUBECONFIG_PATH:-}",
  "companionConfig": "$(user_config_path)"
}
JSON
}

copy_owned_tree() {
  local dest="$1"
  mkdir -p "$dest"
  # Ship tracked companion sources except operator-only install paths.
  if [[ -f "$REPO_MONITOR_ROOT/README.md" ]]; then
    install -m 0644 "$REPO_MONITOR_ROOT/README.md" "$dest/README.md"
  fi
  shopt -s nullglob
  local py_file
  for py_file in "$REPO_MONITOR_ROOT"/*.py "$REPO_MONITOR_ROOT"/offscreen_monitor/*.py; do
    mkdir -p "$dest/$(dirname "${py_file#$REPO_MONITOR_ROOT/}")"
    install -m 0644 "$py_file" "$dest/${py_file#$REPO_MONITOR_ROOT/}"
  done
  shopt -u nullglob
  if [[ -f "$REPO_MONITOR_ROOT/install.sh" ]]; then
    install -m 0755 "$REPO_MONITOR_ROOT/install.sh" "$dest/install.sh"
  fi
  printf '# offscreen-monitor-managed: v1\n' >"$dest/.offscreen-monitor-owned"
}

install_netdata_conf() {
  local src="$REPO_MONITOR_ROOT/config/netdata.conf"
  [[ -f "$src" ]] || die "missing tracked config: $src"
  mkdir -p "$(dirname "$NETDATA_CONF_DEST")"
  if [[ -f "$NETDATA_CONF_DEST" ]] && owned_file "$NETDATA_CONF_DEST"; then
    cmp -s "$src" "$NETDATA_CONF_DEST" && return 0
  fi
  if [[ -f "$NETDATA_CONF_DEST" ]]; then
    local backup="${NETDATA_CONF_DEST}.operator-backup.$(date -u +%Y%m%dT%H%M%SZ)"
    cp -a "$NETDATA_CONF_DEST" "$backup"
    log "operator backup written: $backup"
  fi
  install -m 0644 "$src" "$NETDATA_CONF_DEST"
}

install_unit() {
  local src="$REPO_MONITOR_ROOT/systemd/offscreen-monitor@.service"
  [[ -f "$src" ]] || die "missing tracked unit: $src"
  mkdir -p "$UNIT_DIR"
  install -m 0644 "$src" "$UNIT_DIR/offscreen-monitor@.service"
}

ensure_state_root() {
  mkdir -p "$STATE_ROOT"
  chmod 0700 "$STATE_ROOT" 2>/dev/null || true
}

print_plan() {
  cat <<PLAN
mode: ${MODE}
user: ${CALLER_USER} (uid ${CALLER_UID})
lib: ${LIB_PREFIX}
user-config: $(user_config_path)
state-root: ${STATE_ROOT}
unit: ${UNIT_DIR}/offscreen-monitor@.service
netdata-config: ${NETDATA_CONF_DEST}
manifest: ${MANIFEST_PATH}
actions:
  - verify systemd PID 1 and Netdata v2 prerequisites
  - copy owned companion tree to ${LIB_PREFIX}
  - write ${ETC_PREFIX}/${CALLER_USER}.json with absolute paths only
  - install declared offscreen-monitor@.service unit only
  - install owned Netdata config when permitted
  - create private state directory ${STATE_ROOT}
PLAN
  if [[ "$MODE" == apply ]]; then
    echo "  - run systemctl daemon-reload (no start unless --activate)"
  fi
  if [[ "$ACTIVATE" == true ]]; then
    echo "  - enable and start offscreen-monitor@${CALLER_USER}.service"
    echo "  - verify loopback :19999 and Netdata db tier API"
    echo "  - write capability manifest at ${MANIFEST_PATH}"
  fi
}

run_apply() {
  copy_owned_tree "$LIB_PREFIX"
  render_user_config "$(user_config_path)"
  install_unit
  install_netdata_conf
  ensure_state_root

  if [[ "${OFFSCREEN_MONITOR_SKIP_DAEMON_RELOAD:-}" != 1 ]]; then
    # shellcheck disable=SC2086
  $RUN_SYSTEMCTL daemon-reload
  fi

  log "apply complete for user ${CALLER_USER}"
}

verify_activation() {
  # shellcheck disable=SC2086
  $RUN_SYSTEMCTL is-active "offscreen-monitor@${CALLER_USER}.service" >/dev/null \
    || die 'BLOCKED: companion service not active after activation'

  if [[ -n "$RUN_PORT_CHECK" ]]; then
    # shellcheck disable=SC2086
    $RUN_PORT_CHECK verify-loopback || die 'BLOCKED: loopback listener check failed'
  elif command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 'http://127.0.0.1:19999/api/v1/info' >/dev/null \
      || die 'BLOCKED: Netdata loopback API unavailable'
  else
    die 'BLOCKED: cannot verify loopback listener (curl absent)'
  fi

  mkdir -p "$STATE_ROOT"
  cat >"$MANIFEST_PATH" <<JSON
{
  "schemaVersion": 1,
  "managedBy": "offscreen-monitor",
  "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "netdata": {
    "loopback": "127.0.0.1:19999",
    "dbengineTiers": 3
  },
  "companionUnit": "offscreen-monitor@${CALLER_USER}.service"
}
JSON
  chmod 0600 "$MANIFEST_PATH" 2>/dev/null || true
  log "capability manifest written: $MANIFEST_PATH"
}

preflight
print_plan

if [[ "$MODE" == plan ]]; then
  exit 0
fi

run_apply

if [[ "$ACTIVATE" == true ]]; then
  # shellcheck disable=SC2086
  $RUN_SYSTEMCTL enable "offscreen-monitor@${CALLER_USER}.service"
  # shellcheck disable=SC2086
  $RUN_SYSTEMCTL start "offscreen-monitor@${CALLER_USER}.service"
  verify_activation
fi

exit 0