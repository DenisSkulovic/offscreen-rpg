/**
 * Pure, frozen Helm revision table for the observability stack (OBS-E2-01 T02).
 * No I/O. Each list is ordered by Helm revision 1..N: the last entry is the
 * deployed latest, earlier entries are retained superseded revisions.
 */

export const HISTORY_ROLES = Object.freeze([
  'collector',
  'prometheus',
  'grafana',
  'loki',
  'tempo',
]);

export const E2_PHASES = Object.freeze([
  'prometheus-intent',
  'grafana-intent',
  'final-verification',
]);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function row(profileId, id, artifactId, collector, prometheus, grafana) {
  return {
    profileId,
    id,
    artifactId,
    releases: {
      collector,
      prometheus,
      grafana,
      loki: [artifactId],
      tempo: [artifactId],
    },
  };
}

const BASE = 'dev-e1-base';
const DEV = 'dev-e1-developer';
const E2 = 'dev-e2';
const REL = 'release-e1';

export const ARTIFACT_HISTORY_ROWS = deepFreeze([
  row('dev', 'base-fresh', BASE, [BASE], [BASE], [BASE]),
  row('dev', 'developer-fresh', DEV, [DEV], [DEV], [DEV]),
  row('dev', 'developer-upgraded', DEV, [BASE, DEV], [DEV], [DEV]),
  row('dev', 'e2-fresh', E2, [E2], [E2], [E2]),
  row('dev', 'e2-from-developer-fresh', E2, [E2], [DEV, E2], [DEV, E2]),
  row('dev', 'e2-from-developer-upgraded', E2, [BASE, E2], [DEV, E2], [DEV, E2]),
  row('release', 'release-e1', REL, [REL], [REL], [REL]),
]);

function intermediate(originalHistoryId, collector) {
  return {
    profileId: 'dev',
    originalHistoryId,
    nonPublic: true,
    finalRow: false,
    predecessorArtifactId: DEV,
    targetArtifactId: E2,
    releases: {
      collector,
      prometheus: [DEV, E2],
      grafana: [DEV],
      loki: [DEV],
      tempo: [DEV],
    },
  };
}

/**
 * Observed state after the Prometheus upgrade, before the Grafana upgrade.
 * Never a public or final row; reachable only through the phase lookup.
 */
export const E2_INTERMEDIATE_ROWS = deepFreeze([
  intermediate('developer-fresh', [DEV]),
  intermediate('developer-upgraded', [BASE, DEV]),
]);

function fail(message) {
  throw new Error(`artifact-history: ${message}`);
}

/** Select a final row by profile AND unique history ID. */
export function lookupArtifactHistoryRow(profileId, historyId) {
  if (typeof profileId !== 'string' || typeof historyId !== 'string') {
    fail('profileId and historyId are required strings');
  }
  const matches = ARTIFACT_HISTORY_ROWS.filter((r) => r.id === historyId);
  if (matches.length === 0) fail(`unknown history id ${historyId}`);
  if (matches.length > 1) fail(`ambiguous history id ${historyId}`);
  if (matches[0].profileId !== profileId) {
    fail(`history id ${historyId} does not belong to profile ${profileId}`);
  }
  return matches[0];
}

/** Select a non-public intermediate row by original history ID and phase. */
export function lookupE2IntermediateRow(originalHistoryId, phase) {
  if (!E2_PHASES.includes(phase)) fail(`unknown phase ${String(phase)}`);
  const matches = E2_INTERMEDIATE_ROWS.filter(
    (r) => r.originalHistoryId === originalHistoryId,
  );
  if (matches.length === 0) {
    fail(`no intermediate row for ${String(originalHistoryId)}`);
  }
  if (matches.length > 1) fail(`ambiguous intermediate ${originalHistoryId}`);
  return matches[0];
}
