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

# Full context hash for the union dev image. Caller must hold the fingerprint flock.
computeDevImageFingerprint() {
  node --input-type=module -e "
import { fingerprintDevImageContext, UNION_ROLE_FILTER } from './infra/images/development/image-plan.mjs';
const result = fingerprintDevImageContext(process.cwd(), { roleFilter: UNION_ROLE_FILTER });
if (!result.ok) { console.error(result.reason); process.exit(2); }
process.stdout.write(result.fingerprint);
"
}

# Build or reuse the canonical union dev image for one verified fingerprint.
# Sets DEV_CANONICAL_REF, DEV_ARTIFACT_DIGEST, DEV_ARTIFACT_BUILDS.
# Prints "ref digest" on stdout for machine consumers.
ensureDevArtifact() {
  local fingerprint="$1"
  if [[ -z "$fingerprint" ]]; then
    echo "refusing build: empty fingerprint" >&2
    return 1
  fi
  DEV_CANONICAL_REF="offscreen-dev-workspace:union-${fingerprint:0:16}"
  local recorded temp_tag post_build
  recorded="$(docker image inspect "$DEV_CANONICAL_REF" --format '{{index .Config.Labels "offscreen.fingerprint"}}' 2>/dev/null || true)"
  DEV_ARTIFACT_BUILDS=0
  local docker_started
  docker_started="$(startup_timing_begin)"
  if [[ "$recorded" == "$fingerprint" ]]; then
    if declare -F image_progress >/dev/null; then image_progress "Docker cache hit"; fi
    startup_timing_end docker-build images hit "$docker_started"
  else
    if declare -F image_progress >/dev/null; then image_progress "building new Docker generation"; fi
    echo "phase=docker-build role=union" >&2
    temp_tag="offscreen-dev-workspace:union-build-$$-${RANDOM}"
    docker build \
      -f infra/images/development/Dockerfile \
      --build-arg "NODE_IMAGE=${TOOLCHAIN_NODE_IMAGE}" \
      --build-arg "PNPM_VERSION=${PNPM_VERSION}" \
      --label "offscreen.fingerprint=${fingerprint}" \
      -t "$temp_tag" \
      .
    post_build="$(computeDevImageFingerprint)"
    if [[ "$post_build" != "$fingerprint" ]]; then
      docker rmi "$temp_tag" 2>/dev/null || true
      echo "refusing build: fingerprint changed during docker build (retry)" >&2
      return 1
    fi
    docker tag "$temp_tag" "$DEV_CANONICAL_REF"
    docker rmi "$temp_tag" 2>/dev/null || true
    DEV_ARTIFACT_BUILDS=1
    startup_timing_end docker-build images miss "$docker_started"
  fi
  DEV_ARTIFACT_DIGEST="$(docker image inspect "$DEV_CANONICAL_REF" --format '{{.Id}}')"
  if [[ ! "$DEV_ARTIFACT_DIGEST" =~ ^sha256: ]]; then
    echo "refusing build: invalid host digest for ${DEV_CANONICAL_REF}" >&2
    return 1
  fi
  printf '%s %s\n' "$DEV_CANONICAL_REF" "$DEV_ARTIFACT_DIGEST"
}