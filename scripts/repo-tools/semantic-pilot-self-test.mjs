import assert from 'node:assert/strict';
import { buildReport, judgeHits } from './semantic-pilot.mjs';

export function runSemanticPilotSelfTest() {
  const hit = (path, text, extra = {}) => ({ path, text, ...extra });
  const owner = judgeHits([hit('packages/game/src/activities.ts', 'export function settleProcessBoundary')], {
    owners: ['packages/game/src/activities.ts'],
    symbol: 'settleProcessBoundary',
  });
  assert.equal(owner.passed, true);
  assert.equal(owner.ownerAt1, 1);

  const miss = judgeHits([hit('docs/other.md', 'nothing')], {
    owners: ['packages/game/src/activities.ts'],
    symbol: 'settleProcessBoundary',
  });
  assert.equal(miss.passed, false);

  const proposal = judgeHits([hit('docs/technical/observability/telemetry-and-diagnostics.md', 'not installed', { authority: 'proposal', notice: 'NOT SELECTED' })], {
    owners: ['docs/technical/observability/telemetry-and-diagnostics.md'],
    authority: 'proposal',
  });
  assert.equal(proposal.passed, true);

  const promoted = judgeHits([hit('docs/technical/observability/telemetry-and-diagnostics.md', 'installed', { authority: 'normative' })], {
    owners: ['docs/technical/observability/telemetry-and-diagnostics.md'],
    authority: 'proposal',
  });
  assert.equal(promoted.passed, false);

  const archive = judgeHits([hit('work/changes/archive/old/CHANGE.md', 'do this')], {
    owners: ['AGENTS.md'],
    archiveForbidden: true,
  });
  assert.equal(archive.passed, false);

  const absent = judgeHits([hit('packages/game/src/activities.ts', 'no dashboard here')], { absent: true, forbidden: 'grafana' });
  assert.equal(absent.passed, false);
  assert.equal(absent.nearestNeighbor, true);
  const quiet = judgeHits([], { absent: true, forbidden: 'grafana' });
  assert.equal(quiet.passed, true);

  const leaked = judgeHits([hit('out/semantic-pilot/secret-probe.txt', 'SEMANTIC_PILOT_SECRET_PROBE')], { forbiddenPath: 'secret-probe' });
  assert.equal(leaked.passed, false);

  const fresh = judgeHits([], { freshness: true });
  assert.equal(fresh.unknown, true);
  assert.equal(fresh.passed, null);

  const decoy = judgeHits([hit('packages/game/src/activities.ts', 'settleProcessBoundary')], {
    owners: ['packages/game/src/activities.ts'],
    symbol: 'activityBoundaryBlockText',
    decoy: 'settleProcessBoundary',
  });
  assert.equal(decoy.passed, false);

  const report = buildReport({
    fingerprint: { sha: 'a'.repeat(40), dirty: false, tools: { qmd: 'not-configured' } },
    cases: [{ id: 'D0', lane: 'docs', query: 'q', baseline: { status: 'ran', judgment: owner }, candidate: { status: 'not-configured' } }],
  });
  assert.equal(report.agentTrial, false);
  assert.equal(report.cases[0].candidate.status, 'not-configured');
  assert.equal(report.cases[0].candidate.passed, null);
  console.log('Semantic-pilot self-test passed: owner hit, proposal lane, archive decoy, absent neighbor, secret leak, stale unknown, missing tool.');
}
