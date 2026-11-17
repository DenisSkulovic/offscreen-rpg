import assert from 'node:assert/strict';
import { FUNNEL_CASES } from './retrieval-funnel-oracle.mjs';
import { evaluateFunnel, fuseCandidates, scoreCandidates } from './wiki-core/retrieval-funnel.mjs';

const SHA = 'a'.repeat(40);

function hit(path, text, extra = {}) {
  return { path, line: extra.line ?? 1, text, ...extra };
}

export function runRetrievalFunnelSelfTest() {
  const owner = hit('packages/game/src/activities.ts', 'export function settleProcessBoundary');
  const decoys = Array.from({ length: 16 }, (_, index) => hit(`packages/other/file-${index}.ts`, 'nearby', { line: index + 1 }));
  const buried = scoreCandidates([...decoys, owner, ...Array.from({ length: 13 }, (_, index) => hit(`packages/tail/file-${index}.ts`, 'tail', { line: index + 1 }))], FUNNEL_CASES.find((item) => item.id === 'C5'));
  assert.equal(buried.recallAt20, true);
  assert.equal(buried.recallAt5, false);
  assert.equal(buried.buried, true);
  assert.equal(buried.generationMiss, false);

  const missing = scoreCandidates(decoys, FUNNEL_CASES.find((item) => item.id === 'C5'));
  assert.equal(missing.generationMiss, true);
  assert.equal(missing.recallAt30, false);

  const neighbors = scoreCandidates([
    hit('packages/application/src/generations/scripted-continuation-timing.ts', 'timing only'),
  ], FUNNEL_CASES.find((item) => item.id === 'C7'));
  assert.equal(neighbors.existenceClaim, false);
  assert.equal(neighbors.abstained, true);
  assert.equal(neighbors.noise, 1);

  const claimed = scoreCandidates([hit('packages/ops/grafana.ts', 'grafana exporter implemented')], FUNNEL_CASES.find((item) => item.id === 'C7'));
  assert.equal(claimed.existenceClaim, true);
  assert.equal(claimed.evidenceAt5, false);
  const mentioned = scoreCandidates([
    hit('docs/technical/observability/telemetry-and-diagnostics.md', 'Grafana is proposed, not installed or authorized'),
  ], FUNNEL_CASES.find((item) => item.id === 'C7'));
  assert.equal(mentioned.existenceClaim, false);
  assert.equal(mentioned.abstained, true);
  assert.equal(mentioned.mentions, 1);

  const definitionOnly = scoreCandidates([owner], FUNNEL_CASES.find((item) => item.id === 'C8'));
  assert.equal(definitionOnly.generationMiss, true);
  const caller = scoreCandidates([
    hit('packages/application/src/campaign/activities.ts', 'settleProcessBoundary(plan, processProgress'),
  ], FUNNEL_CASES.find((item) => item.id === 'C8'));
  assert.equal(caller.evidenceAt5, true);

  const proposal = scoreCandidates([
    hit('docs/technical/observability/telemetry-and-diagnostics.md', 'not installed', { authority: 'normative' }),
  ], FUNNEL_CASES.find((item) => item.id === 'D5'));
  assert.equal(proposal.recallAt5, true);
  assert.equal(proposal.evidenceAt5, false);
  const labeled = scoreCandidates([
    hit('docs/technical/observability/telemetry-and-diagnostics.md', 'not installed', { authority: 'proposal', notice: 'NOT SELECTED' }),
  ], FUNNEL_CASES.find((item) => item.id === 'D5'));
  assert.equal(labeled.evidenceAt5, true);

  const archive = scoreCandidates([
    hit('work/changes/archive/old/CHANGE.md', 'do this new work'),
    hit('AGENTS.md', 'current authority'),
  ], FUNNEL_CASES.find((item) => item.id === 'D6'));
  assert.equal(archive.evidenceAt5, false);
  assert.equal(archive.archiveFirst, true);

  const leaked = scoreCandidates([hit('out/semantic-pilot/secret-probe.txt', 'SECRET')], { forbiddenPath: 'secret-probe', secret: 'SECRET' });
  assert.equal(leaked.leaked, true);

  for (const item of FUNNEL_CASES) {
    for (const query of item.queries) {
      assert.equal(query.includes('packages/'), false);
      assert.equal(query.includes('docs/'), false);
    }
    assert.equal(item.review, 'unreviewed');
  }

  const fused = fuseCandidates([
    { id: 'A', hits: [hit('packages/game/src/activities.ts', 'settleProcessBoundary', { line: 10 })] },
    { id: 'B', hits: [hit('packages/game/src/activities.ts', 'activityBoundaryBlockText', { line: 400 })] },
  ]);
  assert.equal(fused.length, 2);

  const sameSymbol = fuseCandidates([
    { id: 'A', hits: [hit('packages/game/src/activities.ts', 'settleProcessBoundary', { symbol: 'settleProcessBoundary', line: 467 })] },
    { id: 'B', hits: [hit('packages/game/src/activities.ts', 'settleProcessBoundary', { symbol: 'settleProcessBoundary', line: 467 })] },
  ]);
  assert.equal(sameSymbol.length, 1);
  assert.deepEqual(sameSymbol[0].origins, ['A', 'B']);

  const mismatched = evaluateFunnel({
    schema: 'repo.retrieval-funnel.v1',
    sha: SHA,
    dirty: false,
    cases: [FUNNEL_CASES.find((item) => item.id === 'C5')],
    arms: {
      A: { status: 'ran', sha: 'b'.repeat(40), hits: [owner] },
      B: { status: 'ran', sha: SHA, hits: [owner] },
    },
  });
  assert.equal(mismatched.cases[0].arms.A.unknown, true);
  assert.equal(mismatched.cases[0].arms.A.reason, 'revision-mismatch');
  assert.equal(mismatched.diagnosticOnly, true);
  assert.equal(mismatched.verifiedCount, 0);

  const stale = evaluateFunnel({
    schema: 'repo.retrieval-funnel.v1',
    sha: SHA,
    dirty: false,
    cases: [FUNNEL_CASES.find((item) => item.id === 'C7')],
    arms: {
      A: { status: 'ran', sha: SHA, hits: [] },
      B: { status: 'ran', sha: SHA, hits: [] },
      C: { status: 'uncomparable', reason: 'index-revision-unattested', hits: [hit('packages/noise.ts', 'neighbor')] },
    },
  });
  assert.equal(stale.fences.C, 'index-revision-unattested');
  assert.equal(stale.cases[0].arms.C.unknown, true);
  assert.equal(stale.cases[0].arms.A.abstained, true);

  console.log('Retrieval-funnel self-test passed: buried rank, missing candidate, absent neighbor, caller versus definition, proposal label, archive decoy, secret leak, revision fence, unattested index.');
}
