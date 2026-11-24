#!/usr/bin/env bash
# Ensure the disposable lab-a namespace exists before optional platform installs.
# Reads the live object, creates the exact namespace manifest if absent, requires the lab label.

set -euo pipefail

LAB_A_NAMESPACE_MANIFEST="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lab-a-namespace.yaml"
LAB_LABEL_VALUE='disposable'

ensure_lab_namespace() {
  local ns="${1:-lab-a}"
  if [[ "$ns" != "lab-a" ]]; then
    echo "Refusing: ensure_lab_namespace only supports lab-a." >&2
    exit 1
  fi
  if [[ -z "${KUBECTL:-}" ]]; then
    echo "Refusing: KUBECTL is unset; source release lib.sh first." >&2
    exit 1
  fi

  local found
  found="$("${KUBECTL[@]}" get namespace "$ns" --ignore-not-found -o name 2>/dev/null)" || {
    echo "Refusing: namespace ${ns} is unreadable." >&2
    exit 1
  }
  if [[ -z "$found" ]]; then
    "${KUBECTL[@]}" apply -f "$LAB_A_NAMESPACE_MANIFEST"
    return 0
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
}