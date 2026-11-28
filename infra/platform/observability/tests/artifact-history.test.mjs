import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARTIFACT_HISTORY_ROWS,
  E2_INTERMEDIATE_ROWS,
  E2_PHASES,
  HISTORY_ROLES,
  lookupArtifactHistoryRow,
  lookupE2IntermediateRow,
} from '../artifact-history.mjs';
import { OBSERVABILITY_RELEASE_ORDER } from '../artifacts.mjs';

const B = 'dev-e1-base';
const D = 'dev-e1-developer';
const E = 'dev-e2';
const R = 'release-e1';

function expected(profileId, id, artifactId, c, p, g) {
  return {
    profileId,
    id,
    artifactId,
    releases: {
      collector: c,
      prometheus: p,
      grafana: g,
      loki: [artifactId],
      tempo: [artifactId],
    },
  };
}

const EXPECTED = [
  expected('dev', 'base-fresh', B, [B], [B], [B]),
  expected('dev', 'developer-fresh', D, [D], [D], [D]),
  expected('dev', 'developer-upgraded', D, [B, D], [D], [D]),
  expected('dev', 'e2-fresh', E, [E], [E], [E]),
  expected('dev', 'e2-from-developer-fresh', E, [E], [D, E], [D, E]),
  expected('dev', 'e2-from-developer-upgraded', E, [B, E], [D, E], [D, E]),
  expected('release', 'release-e1', R, [R], [R], [R]),
];

const TUPLES = {
  'base-fresh': [1, 1, 1],
  'developer-fresh': [1, 1, 1],
  'developer-upgraded': [2, 1, 1],
  'e2-fresh': [1, 1, 1],
  'e2-from-developer-fresh': [1, 2, 2],
  'e2-from-developer-upgraded': [2, 2, 2],
  'release-e1': [1, 1, 1],
};

test('roles equal the source release roles', () => {
  assert.deepEqual(
    [...HISTORY_ROLES].sort(),
    OBSERVABILITY_RELEASE_ORDER.map((r) => r.role).sort(),
  );
});

test('all seven final rows are exact', () => {
  assert.equal(ARTIFACT_HISTORY_ROWS.length, 7);
  assert.deepEqual(ARTIFACT_HISTORY_ROWS, EXPECTED);
});

test('revision counts match (C,P,G) and Loki/Tempo are revision 1', () => {
  for (const row of ARTIFACT_HISTORY_ROWS) {
    const [c, p, g] = TUPLES[row.id];
    assert.deepEqual(Object.keys(row.releases).sort(), [...HISTORY_ROLES].sort());
    assert.equal(row.releases.collector.length, c);
    assert.equal(row.releases.prometheus.length, p);
    assert.equal(row.releases.grafana.length, g);
    assert.equal(row.releases.loki.length, 1);
    assert.equal(row.releases.tempo.length, 1);
  }
});

test('structures are deeply frozen', () => {
  assert.ok(Object.isFrozen(ARTIFACT_HISTORY_ROWS));
  assert.ok(Object.isFrozen(E2_PHASES));
  assert.ok(Object.isFrozen(E2_INTERMEDIATE_ROWS));
  for (const row of [...ARTIFACT_HISTORY_ROWS, ...E2_INTERMEDIATE_ROWS]) {
    assert.ok(Object.isFrozen(row));
    assert.ok(Object.isFrozen(row.releases));
    for (const list of Object.values(row.releases)) {
      assert.ok(Object.isFrozen(list));
    }
  }
  assert.throws(() => ARTIFACT_HISTORY_ROWS[2].releases.collector.push('x'));
});

test('E2 phases are exact', () => {
  assert.deepEqual(E2_PHASES, [
    'prometheus-intent',
    'grafana-intent',
    'final-verification',
  ]);
});

test('final lookup returns the exact row for profile and id', () => {
  for (const row of EXPECTED) {
    assert.equal(
      lookupArtifactHistoryRow(row.profileId, row.id),
      ARTIFACT_HISTORY_ROWS.find((r) => r.id === row.id),
    );
  }
});

test('final lookup throws on wrong tuple, unknown profile or id, other profile', () => {
  assert.throws(() => lookupArtifactHistoryRow('dev', 'nope'));
  assert.throws(() => lookupArtifactHistoryRow('staging', 'base-fresh'));
  assert.throws(() => lookupArtifactHistoryRow('release', 'base-fresh'));
  assert.throws(() => lookupArtifactHistoryRow('dev', 'release-e1'));
  assert.throws(() => lookupArtifactHistoryRow('dev', '(1,2,2)'));
  assert.throws(() => lookupArtifactHistoryRow('dev', 2));
  assert.throws(() => lookupArtifactHistoryRow('dev'));
  assert.throws(() => lookupArtifactHistoryRow('dev', 'dev-e2'));
});

test('intermediate rows: only Prometheus differs, flagged non-public', () => {
  assert.equal(E2_INTERMEDIATE_ROWS.length, 2);
  const fresh = lookupE2IntermediateRow('developer-fresh', 'prometheus-intent');
  const upgraded = lookupE2IntermediateRow('developer-upgraded', 'grafana-intent');
  assert.deepEqual(fresh.releases, {
    collector: [D],
    prometheus: [D, E],
    grafana: [D],
    loki: [D],
    tempo: [D],
  });
  assert.deepEqual(upgraded.releases.collector, [B, D]);
  assert.deepEqual(upgraded.releases.prometheus, [D, E]);
  assert.deepEqual(upgraded.releases.grafana, [D]);
  for (const r of E2_INTERMEDIATE_ROWS) {
    assert.equal(r.nonPublic, true);
    assert.equal(r.finalRow, false);
  }
});

test('intermediate lookup rejects unknown phase or id, and final ids', () => {
  assert.throws(() => lookupE2IntermediateRow('developer-fresh', 'bogus'));
  assert.throws(() => lookupE2IntermediateRow('developer-fresh'));
  assert.throws(() => lookupE2IntermediateRow('e2-fresh', 'grafana-intent'));
  assert.throws(() => lookupE2IntermediateRow('base-fresh', 'grafana-intent'));
  assert.throws(() => lookupE2IntermediateRow(2, 'grafana-intent'));
});

test('intermediate rows are never returned by the final lookup', () => {
  for (const r of E2_INTERMEDIATE_ROWS) {
    assert.ok(!ARTIFACT_HISTORY_ROWS.includes(r));
  }
  const finals = new Set(ARTIFACT_HISTORY_ROWS);
  for (const row of EXPECTED) {
    assert.ok(finals.has(lookupArtifactHistoryRow(row.profileId, row.id)));
  }
});
