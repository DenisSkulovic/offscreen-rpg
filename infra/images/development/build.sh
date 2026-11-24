# Sourced dev image factory helpers. Caller holds the fingerprint flock through
# distribution and alias tagging.
# shellcheck shell=bash

write_image_ref_receipt() {
  local target="$1"
  local value="$2"
  local dir
  dir="$(dirname "$target")"
  mkdir -p "$dir"
  local tmp
  tmp="$(mktemp "${dir}/.ref.XXXXXX")"
  printf '%s\n' "$value" > "$tmp"
  mv -f "$tmp" "$target"
}

# Build or reuse the canonical union dev image for one fingerprint.
# Sets DEV_CANONICAL_REF, DEV_ARTIFACT_DIGEST, DEV_ARTIFACT_BUILDS.
# Prints "ref digest" on stdout for machine consumers.
ensureDevArtifact() {
  local fingerprint="$1"
  if [[ -z "$fingerprint" ]]; then
    echo "refusing build: empty fingerprint" >&2
    return 1
  fi
  DEV_CANONICAL_REF="offscreen-dev-workspace:union-${fingerprint:0:16}"
  local recorded
  recorded="$(docker image inspect "$DEV_CANONICAL_REF" --format '{{index .Config.Labels "offscreen.fingerprint"}}' 2>/dev/null || true)"
  DEV_ARTIFACT_BUILDS=0
  local docker_started
  docker_started="$(startup_timing_begin)"
  if [[ "$recorded" != "$fingerprint" ]]; then
    echo "phase=docker-build role=union" >&2
    docker build \
      -f infra/images/development/Dockerfile \
      --build-arg "NODE_IMAGE=${TOOLCHAIN_NODE_IMAGE}" \
      --build-arg "PNPM_VERSION=${PNPM_VERSION}" \
      --label "offscreen.fingerprint=${fingerprint}" \
      -t "$DEV_CANONICAL_REF" \
      .
    DEV_ARTIFACT_BUILDS=1
    startup_timing_end docker-build images miss "$docker_started"
  else
    startup_timing_end docker-build images hit "$docker_started"
  fi
  DEV_ARTIFACT_DIGEST="$(docker image inspect "$DEV_CANONICAL_REF" --format '{{.Id}}')"
  if [[ ! "$DEV_ARTIFACT_DIGEST" =~ ^sha256: ]]; then
    echo "refusing build: invalid host digest for ${DEV_CANONICAL_REF}" >&2
    return 1
  fi
  printf '%s %s\n' "$DEV_CANONICAL_REF" "$DEV_ARTIFACT_DIGEST"
}