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
APPLY_USER=""

FIXTURE_MODE=false
if [[ "${OFFSCREEN_MONITOR_FIXTURE:-}" == 1 ]]; then
  FIXTURE_MODE=true
fi

usage() {
  cat <<'EOF'
Usage: infra/monitoring/install.sh [--plan] [--apply --confirm [--user NAME]] [--activate] [--netdata-replace]

  --plan            Read-only install plan (default, unprivileged operator).
  --apply           Perform file installation (requires --confirm).
  --confirm         Explicit acknowledgement for --apply.
  --user NAME       Target operator for privileged install (required as root).
  --activate        After apply, enable units and verify health (operator only).
  --netdata-replace Replace existing unowned Netdata config after operator backup.

Privileged production apply uses fixed system paths. OFFSCREEN_MONITOR_FIXTURE=1 enables
unprivileged staged paths for source tests only.
Native Netdata v2 package installation is a separate operator step.
EOF
}

log() { printf 'offscreen-monitor: %s\n' "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan) MODE=plan; shift ;;
    --apply) MODE=apply; shift ;;
    --confirm) APPLY_CONFIRM=true; shift ;;
    --user) APPLY_USER="${2:-}"; shift 2 ;;
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

if [[ -n "$APPLY_USER" && "$MODE" != apply ]]; then
  die "--user is only valid with --apply --confirm"
fi

# 1. Resolve install destinations (fixture overrides only in explicit fixture mode).
LIB_PREFIX="/usr/local/lib/offscreen-monitor"
ETC_PREFIX="/etc/offscreen-monitor"
UNIT_DIR="/etc/systemd/system"
NETDATA_CONF_DEST="/etc/netdata/netdata.conf"

if [[ "$FIXTURE_MODE" == true ]]; then
  LIB_PREFIX="${OFFSCREEN_MONITOR_LIB_PREFIX:-$LIB_PREFIX}"
  ETC_PREFIX="${OFFSCREEN_MONITOR_ETC_PREFIX:-$ETC_PREFIX}"
  UNIT_DIR="${OFFSCREEN_MONITOR_UNIT_DIR:-$UNIT_DIR}"
  NETDATA_CONF_DEST="${OFFSCREEN_MONITOR_NETDATA_CONF:-$NETDATA_CONF_DEST}"
fi

STATE_ROOT=""
MANIFEST_PATH=""

RUN_PYTHON="${OFFSCREEN_MONITOR_RUN_PYTHON:-python3}"
RUN_NETDATA_VERSION="${OFFSCREEN_MONITOR_RUN_NETDATA_VERSION:-}"
RUN_PORT_CHECK="${OFFSCREEN_MONITOR_RUN_PORT_CHECK:-}"
RUN_SYSTEMCTL="${OFFSCREEN_MONITOR_RUN_SYSTEMCTL:-systemctl}"
PROC1_COMM_FILE="${OFFSCREEN_MONITOR_PROC1_COMM_FILE:-/proc/1/comm}"

CALLER_UID="$(id -u)"
CALLER_USER="$(id -un 2>/dev/null || true)"
TARGET_USER=""
TARGET_UID=""
TARGET_GID=""
TARGET_HOME=""
TARGET_GROUP=""

owned_file() {
  local path="$1"
  [[ -f "$path" ]] || return 1
  grep -q "$OWNED_MARKER" "$path"
}

owned_tree_root() {
  local path="$1"
  [[ -f "$path/.offscreen-monitor-owned" ]] && owned_file "$path/.offscreen-monitor-owned"
}

resolve_target_user() {
  local user="$1"
  [[ -n "$user" ]] || die 'BLOCKED: missing target username'
  local line
  line="$(getent passwd "$user" 2>/dev/null || true)"
  [[ -n "$line" ]] || die "BLOCKED: unknown user via getent: $user"
  TARGET_USER="$user"
  TARGET_UID="$(echo "$line" | cut -d: -f3)"
  TARGET_GID="$(echo "$line" | cut -d: -f4)"
  TARGET_HOME="$(echo "$line" | cut -d: -f6)"
  TARGET_GROUP="$(getent group "$TARGET_GID" 2>/dev/null | cut -d: -f1 || echo "$user")"
  [[ -n "$TARGET_HOME" && "${TARGET_HOME:0:1}" == / ]] || die 'BLOCKED: target HOME must be absolute'
  if [[ -L "$TARGET_HOME" ]]; then
    die 'BLOCKED: target HOME must not be a symlink'
  fi
}

resolve_operator_context() {
  local uid="$1"
  local user="$2"
  if [[ "$MODE" == apply ]]; then
    if [[ "$uid" -eq 0 ]]; then
      [[ -n "$APPLY_USER" ]] || die 'BLOCKED: --apply as root requires --user resolved via getent'
      [[ "$FIXTURE_MODE" == true ]] && die 'BLOCKED: fixture mode cannot run privileged apply'
      resolve_target_user "$APPLY_USER"
      STATE_ROOT="${TARGET_HOME}/.local/state/offscreen-monitor"
      MANIFEST_PATH="${STATE_ROOT}/capability-manifest.json"
      CALLER_USER="$TARGET_USER"
      CALLER_UID="$TARGET_UID"
      return
    fi
    if [[ "$FIXTURE_MODE" != true ]]; then
      die 'BLOCKED: --apply requires root and --user, or OFFSCREEN_MONITOR_FIXTURE=1'
    fi
  else
    if [[ "$uid" -eq 0 && "$FIXTURE_MODE" != true ]]; then
      die 'BLOCKED: --plan must run as the operator user (unprivileged)'
    fi
  fi

  if [[ -n "${OFFSCREEN_MONITOR_CALLER_UID:-}" ]]; then
    CALLER_UID="$OFFSCREEN_MONITOR_CALLER_UID"
  fi
  if [[ -n "${OFFSCREEN_MONITOR_CALLER_USER:-}" ]]; then
    CALLER_USER="$OFFSCREEN_MONITOR_CALLER_USER"
  fi
  [[ -n "$CALLER_USER" ]] || die 'BLOCKED: caller username unavailable'
  [[ "$CALLER_UID" -gt 0 ]] || die 'BLOCKED: refuse root-owned operator context'

  if [[ -n "${OFFSCREEN_MONITOR_STATE_ROOT:-}" ]]; then
    STATE_ROOT="$OFFSCREEN_MONITOR_STATE_ROOT"
  else
    STATE_ROOT="${HOME:-}/.local/state/offscreen-monitor"
  fi
  MANIFEST_PATH="${OFFSCREEN_MONITOR_MANIFEST:-$STATE_ROOT/capability-manifest.json}"
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

preflight() {
  [[ "$(uname -s)" == Linux ]] || die 'BLOCKED: Linux required'

  local proc1
  proc1="$(read_proc1_comm)"
  [[ "$proc1" == systemd ]] || die "BLOCKED: systemd must be PID 1 (saw: ${proc1:-unknown})"

  resolve_operator_context "$CALLER_UID" "$CALLER_USER"

  if [[ -z "${HOME:-}" && "$FIXTURE_MODE" != true && "$(id -u)" -ne 0 ]]; then
    die 'BLOCKED: HOME must be set'
  fi
  if [[ -n "${HOME:-}" ]]; then
    [[ "${HOME:0:1}" == / ]] || die 'BLOCKED: HOME must be an absolute path'
    if [[ -L "$HOME" ]]; then
      die 'BLOCKED: HOME must not be a symlink for stable service paths'
    fi
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

  if [[ -L "$LIB_PREFIX" ]]; then
    die "BLOCKED: install lib path must not be a symlink: $LIB_PREFIX"
  fi
  if [[ -d "$LIB_PREFIX" ]] && owned_tree_root "$LIB_PREFIX"; then
    : # ok
  elif [[ -d "$LIB_PREFIX" ]] && [[ -n "$(ls -A "$LIB_PREFIX" 2>/dev/null || true)" ]] && ! owned_tree_root "$LIB_PREFIX"; then
    die "BLOCKED: foreign content at $LIB_PREFIX"
  fi
}

user_config_path() {
  printf '%s/%s.json' "$ETC_PREFIX" "$CALLER_USER"
}

render_user_config() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  # shellcheck disable=SC2086
  DEST="$dest" TARGET_USER="$CALLER_USER" STATE_ROOT="$STATE_ROOT" \
    OFFSCREEN_MONITOR_DOCKER_CONTEXT="${OFFSCREEN_MONITOR_DOCKER_CONTEXT:-}" \
    OFFSCREEN_MONITOR_KUBECONFIG_PATH="${OFFSCREEN_MONITOR_KUBECONFIG_PATH:-}" \
    COMPANION_CONFIG_PATH="$(user_config_path)" \
    $RUN_PYTHON - <<'PY'
import json
import os
import uuid
from pathlib import Path

dest = Path(os.environ["DEST"])
existing_id = None
if dest.is_file():
    try:
        payload = json.loads(dest.read_text(encoding="utf-8"))
        existing_id = payload.get("installationId")
    except (json.JSONDecodeError, OSError, TypeError):
        existing_id = None

installation_id = existing_id if existing_id else str(uuid.uuid4())
payload = {
    "schemaVersion": 1,
    "managedBy": "offscreen-monitor",
    "installationId": installation_id,
    "username": os.environ["TARGET_USER"],
    "stateRoot": os.environ["STATE_ROOT"],
    "dockerContext": os.environ.get("OFFSCREEN_MONITOR_DOCKER_CONTEXT", ""),
    "kubeconfigPath": os.environ.get("OFFSCREEN_MONITOR_KUBECONFIG_PATH", ""),
    "companionConfig": os.environ["COMPANION_CONFIG_PATH"],
}
dest.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
}

copy_owned_file() {
  local src="$1"
  local rel="$2"
  local dest_root="$3"
  local out="$dest_root/$rel"

  if [[ -L "$out" ]]; then
    die "BLOCKED: refusing symlink destination $out"
  fi
  if [[ -f "$out" ]] && ! owned_file "$out"; then
    if [[ "$rel" == ".offscreen-monitor-owned" ]] || owned_tree_root "$dest_root"; then
      :
    else
      die "BLOCKED: foreign file at $out"
    fi
  fi

  mkdir -p "$(dirname "$out")"
  install -m 0644 "$src" "$out"
}

copy_owned_tree() {
  local dest="$1"
  if [[ -L "$dest" ]]; then
    die "BLOCKED: install lib path must not be a symlink: $dest"
  fi
  mkdir -p "$dest"

  shopt -s nullglob
  local py_file sh_file
  for py_file in "$REPO_MONITOR_ROOT"/*.py; do
    copy_owned_file "$py_file" "$(basename "$py_file")" "$dest"
  done
  install_owned_executable() {
    local src="$1"
    local rel="$2"
    local out="$dest/$rel"
    if [[ -L "$out" ]]; then
      die "BLOCKED: refusing symlink destination $out"
    fi
    if [[ -f "$out" ]] && ! owned_file "$out" && ! owned_tree_root "$dest"; then
      die "BLOCKED: foreign file at $out"
    fi
    install -m 0755 "$src" "$out"
  }
  if [[ -f "$REPO_MONITOR_ROOT/cgroup_probe.sh" ]]; then
    install_owned_executable "$REPO_MONITOR_ROOT/cgroup_probe.sh" "cgroup_probe.sh"
  fi
  for sh_file in "$REPO_MONITOR_ROOT"/*.sh; do
    base="$(basename "$sh_file")"
    [[ "$base" == "install.sh" || "$base" == "cgroup_probe.sh" ]] && continue
    install_owned_executable "$sh_file" "$base"
  done
  shopt -u nullglob

  if [[ -f "$REPO_MONITOR_ROOT/README.md" ]]; then
    copy_owned_file "$REPO_MONITOR_ROOT/README.md" "README.md" "$dest"
  fi
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
  local owner_uid owner_gid
  if [[ "$(id -u)" -eq 0 ]]; then
    owner_uid="$TARGET_UID"
    owner_gid="$TARGET_GID"
  else
    owner_uid="$CALLER_UID"
    owner_gid="$(id -g)"
  fi
  mkdir -p "$STATE_ROOT"
  chown "$owner_uid:$owner_gid" "$STATE_ROOT" 2>/dev/null || true
  chmod 0700 "$STATE_ROOT" 2>/dev/null || true
  if [[ -f "$MANIFEST_PATH" ]]; then
    chown "$owner_uid:$owner_gid" "$MANIFEST_PATH" 2>/dev/null || true
    chmod 0600 "$MANIFEST_PATH" 2>/dev/null || true
  fi
}

finalize_user_config_permissions() {
  local dest
  dest="$(user_config_path)"
  [[ -f "$dest" ]] || return 0
  if [[ "$(id -u)" -eq 0 ]]; then
    chown "root:${TARGET_GID}" "$dest"
    chmod 0640 "$dest"
  fi
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
  - write ${ETC_PREFIX}/${CALLER_USER}.json with installationId and absolute paths only
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
  finalize_user_config_permissions
  install_unit
  install_netdata_conf
  ensure_state_root

  if [[ "${OFFSCREEN_MONITOR_SKIP_DAEMON_RELOAD:-}" != 1 ]]; then
    # shellcheck disable=SC2086
    $RUN_SYSTEMCTL daemon-reload
  fi

  log "apply complete for user ${CALLER_USER}"
}

fetch_netdata_info_json() {
  if [[ -n "${OFFSCREEN_MONITOR_NETDATA_INFO_JSON:-}" ]]; then
    cat <<JSON
${OFFSCREEN_MONITOR_NETDATA_INFO_JSON}
JSON
    return 0
  fi
  if [[ -n "$RUN_PORT_CHECK" ]]; then
    return 1
  fi
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 'http://127.0.0.1:19999/api/v1/info' 2>/dev/null
    return $?
  fi
  return 1
}

netdata_tier_fact() {
  local info_json="$1"
  # shellcheck disable=SC2086
  INFO_JSON="$info_json" $RUN_PYTHON - <<'PY'
import json
import os

raw = os.environ.get("INFO_JSON", "")
if not raw.strip():
    print("unknown")
    raise SystemExit(0)
try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    print("unknown")
    raise SystemExit(0)

candidates = [
    payload.get("db_engine_tiers"),
    payload.get("dbengine_tiers"),
    (payload.get("db") or {}).get("tiers"),
]
value = next((item for item in candidates if isinstance(item, int) and item > 0), None)
if value is None:
    print("unknown")
else:
    print(value)
PY
}

verify_activation() {
  # shellcheck disable=SC2086
  $RUN_SYSTEMCTL is-active "offscreen-monitor@${CALLER_USER}.service" >/dev/null \
    || die 'BLOCKED: companion service not active after activation'

  local bind_check_ok=false
  if [[ -n "$RUN_PORT_CHECK" ]]; then
    # shellcheck disable=SC2086
    $RUN_PORT_CHECK verify-loopback && bind_check_ok=true
  fi
  local info_json=""
  if info_json="$(fetch_netdata_info_json)"; then
    bind_check_ok=true
  elif [[ "$bind_check_ok" != true ]]; then
    die 'BLOCKED: loopback listener check failed'
  fi

  local tier_fact="unknown"
  if [[ -n "$info_json" ]]; then
    tier_fact="$(netdata_tier_fact "$info_json")"
  fi

  mkdir -p "$STATE_ROOT"
  # shellcheck disable=SC2086
  MANIFEST_PATH="$MANIFEST_PATH" CALLER_USER="$CALLER_USER" TIER_FACT="$tier_fact" \
    INSTALLED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    $RUN_PYTHON - <<'PY'
import json
import os
from pathlib import Path

tier = os.environ.get("TIER_FACT", "unknown")
if tier == "unknown":
    tier_value = None
else:
    try:
        tier_value = int(tier)
    except ValueError:
        tier_value = None

manifest = {
    "schemaVersion": 1,
    "managedBy": "offscreen-monitor",
    "installedAt": os.environ["INSTALLED_AT"],
    "netdata": {
        "loopback": "127.0.0.1:19999",
        "dbengineTiers": tier_value,
    },
    "companionUnit": f"offscreen-monitor@{os.environ['CALLER_USER']}.service",
}
path = Path(os.environ["MANIFEST_PATH"])
path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
  chmod 0600 "$MANIFEST_PATH" 2>/dev/null || true
  if [[ "$(id -u)" -eq 0 ]]; then
    chown "${TARGET_UID}:${TARGET_GID}" "$MANIFEST_PATH" 2>/dev/null || true
  fi
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