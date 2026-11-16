import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { normalizeTrial } from './agent-trace.mjs';
import { scoreAnswer } from './agent-score.mjs';
import {
  assertRealLaunchAllowed,
  buildSnapshotManifest,
  dryRunReport,
  materializeSnapshot,
  readSnapshotFile,
} from './agent-harness.mjs';

function tool(id, phase, extra = {}) {
  return { type: 'tool', toolCallId: id, phase, atMs: extra.atMs ?? 0, ...extra };
}

export function runAgentSelfTest() {
  const failures = [];
  function check(label, fn) {
    try {
      fn();
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const base = {
    trialId: 't1',
    questionId: 'P02',
    repoSha: 'fake-fixture-not-real',
    adapter: 'fake',
    model: null,
    startedMs: 1000,
    endedMs: 1123,
    goldPath: 'docs/product/gameplay/time-and-autonomy.md',
    tokens: {},
    answer: 'See docs/product/gameplay/time-and-autonomy.md. The proposal is not accepted.',
  };

  check('start and complete collapse to one invocation', () => {
    const events = [];
    for (let index = 0; index < 10; index += 1) {
      events.push(tool(`c${index}`, 'start', { tool: index === 0 ? 'search' : 'read', path: `file-${index}.md`, atMs: 1000 }));
      events.push(tool(`c${index}`, 'complete', { tool: index === 0 ? 'search' : 'read', path: `file-${index}.md`, atMs: 1010 }));
    }
    const trial = normalizeTrial({ ...base, events });
    assert.equal(trial.toolCalls.total, 10);
    assert.equal(trial.toolCalls.read, 9);
    assert.equal(trial.toolCalls.search, 1);
    assert.equal(trial.tokens.input, null);
    assert.equal(trial.usageCostUsd, null);
    assert.equal(trial.evidenceClass, 'fake-harness-only');
    const again = normalizeTrial({ ...base, events });
    const strip = (value) => JSON.stringify(value);
    assert.equal(strip(trial), strip(again));
  });

  check('rg is a search scope, not a file open', () => {
    const trial = normalizeTrial({
      ...base,
      events: [tool('s', 'complete', { tool: 'shell', command: 'rg time docs', path: 'docs' })],
    });
    assert.equal(trial.toolCalls.search, 1);
    assert.equal(trial.fileReads.calls, 0);
    assert.equal(trial.fileReads.searches[0].filesVerified, false);
  });

  check('repeated reads count two calls and one file', () => {
    const trial = normalizeTrial({
      ...base,
      events: [
        tool('a', 'complete', { tool: 'read', path: 'docs/README.md', atMs: 1100 }),
        tool('b', 'complete', { tool: 'read', path: 'docs/README.md', atMs: 1200 }),
      ],
    });
    assert.equal(trial.fileReads.calls, 2);
    assert.equal(trial.fileReads.distinct, 1);
    assert.equal(trial.firstGoldPageOpenMs, null);
  });

  check('failed calls are separate and negative duration is rejected', () => {
    const trial = normalizeTrial({
      ...base,
      events: [tool('bad', 'complete', { tool: 'read', path: 'missing.md', status: 'failed' })],
    });
    assert.equal(trial.toolCalls.failed, 1);
    assert.equal(trial.toolCalls.read, 0);
    assert.throws(() => normalizeTrial({ ...base, startedMs: 5, endedMs: 1, events: [] }));
  });

  check('malformed, timeout and refusal are terminal', () => {
    assert.equal(normalizeTrial({ events: 'nope' }).status, 'malformed-jsonl');
    assert.equal(normalizeTrial({ ...base, status: 'timeout', events: [] }).status, 'timeout');
    assert.equal(normalizeTrial({ ...base, status: 'refused', events: [] }).status, 'refused');
  });

  check('archive citation fails and a bounded product answer passes', () => {
    const archived = scoreAnswer('The owner is work/changes/archive/old/CHANGE.md', {
      requiredPaths: ['docs/product/gameplay/time-and-autonomy.md'],
    });
    assert.equal(archived.critical, true);
    const ok = scoreAnswer('See docs/product/gameplay/time-and-autonomy.md. The proposal is not accepted.', {
      requiredPaths: ['docs/product/gameplay/time-and-autonomy.md'],
      prohibited: ['The proposal is accepted'],
    });
    assert.equal(ok.passed, true);
    const tier = scoreAnswer('apps/web/src/features/play/use-story-live-updates.ts is production-ready', {
      requiredPaths: ['apps/web/src/features/play/use-story-live-updates.ts'],
      forbiddenTiers: ['production-ready'],
      proofTier: 'source-observed',
    });
    assert.equal(tier.critical, true);
  });

  check('snapshot hides gold and the canary is unreadable', () => {
    const files = {
      'docs/README.md': '# Docs\n',
      'scripts/repo-tools/wiki-benchmarks/static-v1.mjs': 'SECRET GOLD',
      'work/designs/open/wiki-health/README.md': '# Real design with answers\n',
      'AGENTS.md': '# Agents\n',
    };
    const manifest = buildSnapshotManifest(Object.keys(files));
    assert.equal(manifest.included.includes('docs/README.md'), true);
    assert.equal(manifest.included.includes('scripts/repo-tools/wiki-benchmarks/static-v1.mjs'), false);
    const dir = mkdtempSync(path.join(tmpdir(), 'wiki-agent-'));
    materializeSnapshot(dir, files);
    assert.equal(readSnapshotFile(dir, 'docs/README.md'), '# Docs\n');
    assert.match(readSnapshotFile(dir, 'work/designs/open/wiki-health/README.md'), /Withheld/);
    assert.throws(() => readSnapshotFile(dir, 'scripts/repo-tools/wiki-benchmarks/static-v1.mjs'));
    const canary = path.join(tmpdir(), `wiki-canary-${process.pid}.txt`);
    writeFileSync(canary, 'canary-secret');
    assert.throws(() => readSnapshotFile(dir, path.relative(dir, canary)));
    const before = readFileSync(path.join(dir, 'docs', 'README.md'), 'utf8');
    assert.equal(readFileSync(path.join(dir, 'docs', 'README.md'), 'utf8'), before);
  });

  check('negation, rejected archive, and an unopened citation are not false authority', () => {
    const negated = scoreAnswer('It is false that The proposal is accepted.', {
      prohibited: ['The proposal is accepted'],
    });
    assert.equal(negated.passed, true);
    assert.equal(negated.semanticCertification, false);
    const rejected = scoreAnswer(
      'See work/changes/archive/old/CHANGE.md as stale evidence. That archived packet is not permission to implement.',
      {},
    );
    assert.equal(rejected.passed, true);
    assert.equal(rejected.notes.includes('archive-mentioned-as-non-authority'), true);
    const relied = scoreAnswer('The current normative proof is work/changes/archive/old/CHANGE.md.', {});
    assert.equal(relied.critical, true);
    const unread = scoreAnswer('See docs/product/gameplay/time-and-autonomy.md.', {
      requiredPaths: ['docs/product/gameplay/time-and-autonomy.md'],
    }, { openedPaths: [] });
    assert.equal(unread.passed, true);
    assert.deepEqual(unread.unverifiedCitations, ['docs/product/gameplay/time-and-autonomy.md']);
    assert.equal(unread.semanticCertification, false);
    const uncited = scoreAnswer('The absence rule is the product page.', {});
    assert.equal(uncited.passed, true);
    assert.equal(uncited.semanticCertification, false);
  });

  check('dry run and unapproved launch do not start a model', () => {
    const report = dryRunReport();
    assert.equal(report.realLaunch, 'refused');
    assert.equal(report.cliProbed, false);
    assert.equal(report.model, null);
    assert.throws(
      () => assertRealLaunchAllowed({ approveModelUsage: true }),
      (error) => error.code === 'refused',
    );
  });

  if (failures.length > 0) {
    console.error('AGENT HARNESS SELF-TEST FAILURES:');
    for (const failure of failures) console.error(failure);
    return 1;
  }
  console.log(
    'Agent harness self-test passed: fake traces, null usage, negation and archive rejection, unverified citation, snapshot canary, refused launch. No model was called.',
  );
  return 0;
}
