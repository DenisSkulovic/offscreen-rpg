#!/usr/bin/env bash
# Ensure disposable probe namespaces lab-a and lab-b. Creates missing only; never deletes.
# Caller must source infra/clusters/kind/release/lib.sh first (KUBECTL, CONTEXT_NAME).

set -euo pipefail

ENSURE_PROBE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROBE_NAMESPACES_MANIFEST="${ENSURE_PROBE_ROOT}/namespaces.yaml"
LAB_LABEL_VALUE='disposable'

ensure_probe_namespaces() {
  if [[ -z "${KUBECTL:-}" ]]; then
    echo "Refusing: KUBECTL is unset; source release lib.sh first." >&2
    exit 1
  fi
  if [[ -n "${CONTEXT_NAME:-}" ]]; then
    if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
      echo "Refusing: kubectl context ${CONTEXT_NAME} is unreadable or absent." >&2
      exit 1
    fi
  fi

  local need_apply=0
  local ns
  for ns in lab-a lab-b; do
    local found
    found="$("${KUBECTL[@]}" get namespace "$ns" --ignore-not-found -o name 2>/dev/null)" || {
      echo "Refusing: namespace ${ns} is unreadable." >&2
      exit 1
    }
    if [[ -z "$found" ]]; then
      need_apply=1
      continue
    fi
    local lab=""
    lab="$("${KUBECTL[@]}" get namespace "$ns" -o "jsonpath={.metadata.labels.offscreen\.rpg/lab}" 2>/dev/null)" || {
      echo "Refusing: namespace ${ns} is unreadable." >&2
      exit 1
    }
    if [[ "$lab" != "$LAB_LABEL_VALUE" ]]; then
      echo "Refusing: namespace ${ns} has foreign or missing lab label." >&2
      exit 1
    fi
  done

  if [[ "$need_apply" -eq 1 ]]; then
    "${KUBECTL[@]}" apply -f "$PROBE_NAMESPACES_MANIFEST"
  fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  source "$(cd "$ENSURE_PROBE_ROOT/../../../clusters/kind/release" && pwd)/lib.sh"
  ensure_probe_namespaces
fi