/**
 * K8S10 immutable game-chaos evidence report builder (T04).
 */

import { stripSensitiveFields } from './live-game-driver.mjs';

export const K8S10_GAME_CHAOS_SCHEMA = 'offscreen.k8s10-game-chaos.v1';

const SECRET_FIELD_NAMES = new Set([
  'authorization',
  'cookie',
  'bearer',
  'prompt',
  'secret',
]);

const RAW_BEARER_PATTERN = /Bearer\s+\S+/i;
const RAW_COOKIE_PATTERN = /(?:^|[\s;])session\s*=\s*\S+/i;

/**
 * @param {unknown} value
 * @param {string[]} hits
 */
function collectStoryTextStrings(value, hits) {
  if (typeof value === 'string') {
    hits.push(value);
    return;
  }
  if (value == null || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStoryTextStrings(item, hits);
    }
    return;
  }
  for (const [key, child] of Object.entries(
    /** @type {Record<string, unknown>} */ (value),
  )) {
    if (
      SECRET_FIELD_NAMES.has(key) ||
      SECRET_FIELD_NAMES.has(key.toLowerCase())
    ) {
      continue;
    }
    collectStoryTextStrings(child, hits);
  }
}

/**
 * @param {Record<string, unknown>} input
 */
function detectRawSecretMaterial(input) {
  /** @type {string[]} */
  const textFields = [];
  collectStoryTextStrings(input.faultIntent, textFields);
  collectStoryTextStrings(input.events, textFields);
  collectStoryTextStrings(input.cleanup, textFields);

  for (const text of textFields) {
    if (RAW_BEARER_PATTERN.test(text) || RAW_COOKIE_PATTERN.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {unknown} pod
 */
function normalizePod(pod) {
  if (pod == null || typeof pod !== 'object') {
    return null;
  }
  const record = /** @type {Record<string, unknown>} */ (pod);
  if (typeof record.name !== 'string' || typeof record.uid !== 'string') {
    return null;
  }
  return {
    name: record.name,
    uid: record.uid,
    imageDigest:
      typeof record.imageDigest === 'string' ? record.imageDigest : null,
    phase: typeof record.phase === 'string' ? record.phase : 'Unknown',
  };
}

/**
 * @param {unknown} digest
 */
function redactOracleDigest(digest) {
  if (digest == null) {
    return null;
  }
  if (typeof digest === 'string') {
    return digest.startsWith('redacted:') ? digest : `redacted:${digest}`;
  }
  if (typeof digest === 'object') {
    const json = JSON.stringify(stripSensitiveFields(digest));
    return `redacted:${json}`;
  }
  return `redacted:${String(digest)}`;
}

/**
 * @param {{
 *   sourceSha?: string | null,
 *   turn03ProofId?: string | null,
 *   releaseRefSha?: string | null,
 *   clusterUid?: string | null,
 *   pods?: unknown[],
 *   storyOperationIds?: string[],
 *   oracleDigests?: unknown[],
 *   faultIntent?: unknown,
 *   events?: unknown[],
 *   latencySamples?: number[],
 *   load?: { status?: string, observedP95Ms?: number | null, multiOwner?: string },
 *   outcome?: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT-RUN',
 *   cleanup?: unknown,
 *   liveEligibility?: { eligible?: boolean, reason?: string },
 *   blockOnSecretMaterial?: boolean,
 * }} input
 */
export function buildK8s10Report(input = {}) {
  const eligibility = input.liveEligibility;
  const eligible = eligibility?.eligible === true;

  if (!eligible) {
    const sanitized = stripSensitiveFields(input);
    return {
      schema: K8S10_GAME_CHAOS_SCHEMA,
      sourceSha: input.sourceSha ?? null,
      turn03ProofId: input.turn03ProofId ?? null,
      releaseRefSha: input.releaseRefSha ?? null,
      clusterUid: input.clusterUid ?? null,
      pods: [],
      storyOperationIds: Array.isArray(input.storyOperationIds)
        ? input.storyOperationIds.filter((id) => typeof id === 'string')
        : [],
      oracleDigests: [],
      faultIntent: sanitized.faultIntent ?? null,
      events: Array.isArray(sanitized.events) ? sanitized.events : [],
      latencySamples: [],
      outcome: 'NOT-RUN',
      cleanup: sanitized.cleanup ?? {
        status: 'skipped',
        reason: eligibility?.reason ?? 'not-eligible',
      },
    };
  }

  if (detectRawSecretMaterial(input)) {
    if (input.blockOnSecretMaterial !== false) {
      throw new Error('secret-material');
    }
    return {
      schema: K8S10_GAME_CHAOS_SCHEMA,
      sourceSha: input.sourceSha ?? null,
      turn03ProofId: input.turn03ProofId ?? null,
      releaseRefSha: input.releaseRefSha ?? null,
      clusterUid: input.clusterUid ?? null,
      pods: [],
      storyOperationIds: [],
      oracleDigests: [],
      faultIntent: null,
      events: [{ type: 'blocked', reason: 'secret-material' }],
      latencySamples: [],
      outcome: 'BLOCKED',
      cleanup: { status: 'refused', reason: 'secret-material' },
    };
  }

  const sanitized = stripSensitiveFields(input);
  const pods = (Array.isArray(input.pods) ? input.pods : [])
    .map((pod) => normalizePod(pod))
    .filter((pod) => pod != null);

  const oracleDigests = (
    Array.isArray(input.oracleDigests) ? input.oracleDigests : []
  )
    .map((digest) => redactOracleDigest(digest))
    .filter((digest) => typeof digest === 'string');

  let outcome = input.outcome;
  if (outcome == null && input.load?.status != null) {
    if (input.load.status === 'PASS') {
      outcome = 'PASS';
    } else if (input.load.status === 'ABORT') {
      outcome = 'BLOCKED';
    } else {
      outcome = 'FAIL';
    }
  }
  if (outcome == null) {
    outcome = 'NOT-RUN';
  }

  const latencySamples = Array.isArray(input.latencySamples)
    ? input.latencySamples.filter((sample) => typeof sample === 'number')
    : [];

  return {
    schema: K8S10_GAME_CHAOS_SCHEMA,
    sourceSha: input.sourceSha ?? null,
    turn03ProofId: input.turn03ProofId ?? null,
    releaseRefSha: input.releaseRefSha ?? null,
    clusterUid: input.clusterUid ?? null,
    pods,
    storyOperationIds: Array.isArray(input.storyOperationIds)
      ? input.storyOperationIds.filter((id) => typeof id === 'string')
      : [],
    oracleDigests,
    faultIntent: sanitized.faultIntent ?? null,
    events: Array.isArray(sanitized.events) ? sanitized.events : [],
    latencySamples,
    observedP95Ms: input.load?.observedP95Ms ?? null,
    multiOwner: input.load?.multiOwner ?? 'NOT-RUN',
    outcome,
    cleanup: sanitized.cleanup ?? { status: 'pending' },
  };
}
