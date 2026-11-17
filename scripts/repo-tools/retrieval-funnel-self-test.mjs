import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FUNNEL_CASES } from './retrieval-funnel-oracle.mjs';
import { root } from './process.mjs';
import { evaluateFunnel, fuseCandidates, scoreCandidates } from './wiki-core/retrieval-funnel.mjs';
import { enclosingSymbol, followEvidence } from './wiki-core/source-route.mjs';

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

  const distinctSymbols = fuseCandidates([
    { id: 'A', hits: [hit('packages/game/src/immediate-actions.ts', 'one', { line: 381, proof: { method: 'enclosing-read', symbol: 'issue' } })] },
    { id: 'B', hits: [hit('packages/game/src/immediate-actions.ts', 'two', { line: 385, proof: { method: 'enclosing-read', symbol: 'validateImmediateActionProposal' } })] },
  ]);
  assert.equal(distinctSymbols.length, 2);

  const shared = hit('packages/game/src/activities.ts', 'settleProcessBoundary', { line: 467, provenance: 'rg:shared' });
  const duplicated = fuseCandidates([{ id: 'A', hits: [shared] }, { id: 'B', hits: [shared] }]);
  const single = fuseCandidates([{ id: 'A', hits: [shared] }]);
  assert.equal(duplicated.length, 1);
  assert.deepEqual(duplicated[0].origins, ['A', 'B']);
  assert.equal(duplicated[0].rrf, single[0].rrf);

  const c4 = FUNNEL_CASES.find((item) => item.id === 'C4');
  const bareLine = scoreCandidates([
    hit('packages/game/src/immediate-actions.ts', 'Generated plans cannot include mechanical world effects', { line: 384 }),
  ], c4);
  assert.equal(bareLine.fileCandidateRecallAt5, true);
  assert.equal(bareLine.fileGenerationMiss, false);
  assert.equal(bareLine.symbolVerified, false);
  assert.equal(bareLine.evidenceAt5, false);
  const wrongFunction = scoreCandidates([
    hit('packages/game/src/immediate-actions.ts', 'Generated plans cannot include mechanical world effects', {
      line: 100,
      proof: { method: 'enclosing-read', symbol: 'issue' },
    }),
  ], c4);
  assert.equal(wrongFunction.fileCandidateRecallAt5, true);
  assert.equal(wrongFunction.evidenceAt5, false);
  const proved = scoreCandidates([
    hit('packages/game/src/immediate-actions.ts', 'Generated plans cannot include mechanical world effects', {
      line: 384,
      proof: { method: 'enclosing-read', symbol: 'validateImmediateActionProposal' },
    }),
  ], c4);
  assert.equal(proved.evidenceAt5, true);
  assert.equal(proved.symbolVerified, true);

  const source = readFileSync(`${root}/packages/game/src/immediate-actions.ts`, 'utf8');
  assert.equal(enclosingSymbol(source, 384).symbol, 'validateImmediateActionProposal');
  assert.notEqual(enclosingSymbol(source, 1).symbol, 'validateImmediateActionProposal');

  const files = new Map([
    ['wiki/start.md', 'See the [package map](packages/demo/README.md).\n'],
    ['packages/demo/README.md', 'The generated check lives in [generated owner](src/owner.ts).\n'],
    ['packages/demo/src/owner.ts', 'export function ownerThing() {\n  return "generated plan";\n}\n'],
  ]);
  const synthetic = followEvidence({
    question: 'where is the generated plan checked',
    headings: [{ path: 'wiki/start.md', ref: 'wiki/start.md', authority: 'normative', text: 'start' }],
    readText: (rel) => files.get(rel),
    exists: (rel) => files.has(rel),
    resolveLink: (from, href) => {
      if (href === 'packages/demo/README.md') return { ok: true, rel: 'packages/demo/README.md' };
      if (href === 'src/owner.ts') return { ok: true, rel: 'packages/demo/src/owner.ts' };
      if (href === 'out/secret-probe.txt') return { ok: true, rel: 'out/secret-probe.txt' };
      return { ok: false, code: 'missing' };
    },
    resolveModule: () => null,
  });
  const ownerHit = synthetic.hits.find((item) => item.path === 'packages/demo/src/owner.ts' && item.proof?.symbol === 'ownerThing');
  assert.ok(ownerHit);
  assert.deepEqual(ownerHit.trace.map((step) => step.kind), ['wiki-link', 'source-map-link', 'source-map-link', 'targeted-search']);
  const blocked = followEvidence({
    question: 'where is the generated plan checked',
    headings: [{ path: 'wiki/start.md', ref: 'wiki/start.md', authority: 'proposal', text: 'secret' }],
    readText: () => 'A [secret](out/secret-probe.txt) and a [missing](missing.md).\n',
    exists: () => true,
    resolveLink: (_from, href) => href.includes('secret')
      ? { ok: true, rel: 'out/secret-probe.txt' }
      : { ok: false, code: 'missing' },
    resolveModule: () => null,
  });
  assert.equal(blocked.hits.some((item) => String(item.path).includes('secret')), false);
  assert.ok(blocked.unresolved.some((item) => item.reason === 'excluded' || item.reason === 'missing'));

  const c4Route = followEvidence({
    root,
    question: c4.question,
    headings: [{
      path: 'docs/technical/engine/mechanics-and-capabilities.md',
      ref: 'docs/technical/engine/mechanics-and-capabilities.md',
      authority: 'normative',
      text: 'mechanics',
    }],
  });
  const c4Hit = c4Route.hits.find((item) => item.path === 'packages/game/src/immediate-actions.ts' && item.proof?.symbol === 'validateImmediateActionProposal');
  assert.ok(c4Hit, 'the mechanics page module reference should reach the enclosing function');
  assert.ok(c4Hit.trace.some((step) => step.kind === 'verified-module-ref'));

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

  console.log('Retrieval-funnel self-test passed: buried rank, missing candidate, absent neighbor, caller versus definition, proposal label, archive decoy, secret leak, revision fence, unattested index, file-versus-symbol, source route.');
}
