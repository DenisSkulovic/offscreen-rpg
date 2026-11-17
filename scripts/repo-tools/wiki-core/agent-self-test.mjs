import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { normalizeTrial } from './agent-trace.mjs';
import { scoreAnswer } from './agent-score.mjs';
import { HAR08_TASKS } from './agent-fixtures/har08-tasks.mjs';
import {
  agentPrompt,
  evaluateLaunchGate,
  evaluatePair,
  questionHash,
  stageHostOracle,
} from './agent-native-preflight.mjs';
import {
  assertRealLaunchAllowed,
  buildSnapshotManifest,
  dryRunReport,
  materializeSnapshot,
  readSnapshotFile,
} from './agent-harness.mjs';
import { root } from '../process.mjs';
import { FUNNEL_CASES } from '../retrieval-funnel-oracle.mjs';
import { CASES as WIKI_CASES } from '../wiki-benchmarks/static-v1.mjs';

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

  check('missing usage stays null and a reported zero stays zero', () => {
    const missing = normalizeTrial({ ...base, tokens: { input: 0, output: 0 }, events: [] });
    assert.equal(missing.tokens.input, null);
    assert.equal(missing.tokens.output, null);
    assert.equal(missing.tokens.reported, false);
    const reported = normalizeTrial({ ...base, tokens: { reported: true, input: 0, output: 2 }, events: [] });
    assert.equal(reported.tokens.input, 0);
    assert.equal(reported.tokens.output, 2);
  });

  check('held-out questions stay out of the snapshot and off older exams', () => {
    assert.equal(HAR08_TASKS.length, 6);
    assert.equal(new Set(HAR08_TASKS.map((task) => task.category)).size, 6);
    const older = new Set([
      ...FUNNEL_CASES.map((item) => item.question),
      ...WIKI_CASES.map((item) => item.question),
    ]);
    for (const task of HAR08_TASKS) {
      assert.equal(task.review, 'unreviewed');
      assert.equal(older.has(task.question), false);
      assert.equal(task.question.includes('packages/'), false);
      assert.equal(task.question.includes('docs/'), false);
      for (const role of task.roles) assert.equal(task.question.includes(role.path), false);
    }
    const hidden = buildSnapshotManifest([
      'docs/README.md',
      'out/agent-evaluation/sha/tasks.json',
      'scripts/repo-tools/wiki-core/agent-fixtures/har08-tasks.mjs',
      'scripts/repo-tools/retrieval-funnel-oracle.mjs',
    ]);
    assert.deepEqual(hidden.included, ['docs/README.md']);
    const dir = mkdtempSync(path.join(tmpdir(), 'har08-oracle-'));
    const staged = stageHostOracle(dir, 'a'.repeat(40));
    const raw = readFileSync(staged.file, 'utf8');
    assert.equal(JSON.parse(raw).verifiedCount, 0);
    const snap = mkdtempSync(path.join(tmpdir(), 'har08-snap-'));
    materializeSnapshot(snap, { 'docs/README.md': '# Docs\n', 'out/agent-evaluation/sha/tasks.json': raw });
    assert.throws(() => readSnapshotFile(snap, 'out/agent-evaluation/sha/tasks.json'));
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    assert.equal(head.status, 0);
    const host = stageHostOracle(root, head.stdout.trim());
    assert.equal(host.count, 6);
    assert.equal(host.verifiedCount, 0);
  });

  check('A and B match except the navigation cue, and a bad gate refuses', () => {
    const sha = 'b'.repeat(40);
    const task = HAR08_TASKS[0];
    const cap = { minutes: 8, toolCalls: 20, attempts: 1 };
    const arm = (sessionId, prompt) => ({
      repoSha: sha,
      sessionId,
      resumed: false,
      question: task.question,
      questionHash: questionHash(task.question),
      client: 'cursor',
      model: 'unlaunched-example',
      cap,
      prompt,
    });
    const matched = evaluatePair({
      pinnedSha: sha,
      orderSeed: '17',
      goldPaths: task.roles.map((role) => role.path),
      priorReceiptVisible: false,
      a: arm('session-a', agentPrompt('A', task.question)),
      b: arm('session-b', agentPrompt('B', task.question)),
    });
    assert.equal(matched.ok, true);
    const resumed = evaluatePair({
      pinnedSha: sha,
      orderSeed: '17',
      a: { ...arm('session-a', agentPrompt('A', task.question)), resumed: true },
      b: arm('session-b', agentPrompt('B', task.question)),
    });
    assert.equal(resumed.ok, false);
    assert.equal(resumed.reasons.includes('session-resumed'), true);
    const wrongSha = evaluatePair({
      pinnedSha: sha,
      orderSeed: '17',
      a: { ...arm('session-a', agentPrompt('A', task.question)), repoSha: 'c'.repeat(40) },
      b: arm('session-b', agentPrompt('B', task.question)),
    });
    assert.equal(wrongSha.reasons.includes('sha-mismatch'), true);
    const leaked = evaluatePair({
      pinnedSha: sha,
      orderSeed: '17',
      goldPaths: [task.roles[0].path],
      a: arm('session-a', `${agentPrompt('A', task.question)}\n${task.roles[0].path}`),
      b: arm('session-b', agentPrompt('B', task.question)),
    });
    assert.equal(leaked.reasons.includes('oracle-leak'), true);
    const gate = evaluateLaunchGate({
      client: 'unknown',
      resumedSession: true,
      goldReadable: true,
      writesAllowed: true,
      repoSha: 'c'.repeat(40),
      pinnedSha: sha,
    });
    assert.equal(gate.allowed, false);
    for (const reason of ['client', 'model', 'usage-policy', 'enforced-caps', 'sandbox', 'sha-mismatch', 'session-resumed', 'oracle-accessible', 'unsafe-write', 'har08-does-not-authorize-launch']) {
      assert.equal(gate.reasons.includes(reason), true, reason);
    }
    const filled = evaluateLaunchGate({
      approveModelUsage: true,
      client: 'cursor',
      model: 'exact',
      usagePolicy: 'record unknown usage',
      cap: cap,
      maxAttempts: 1,
      sandbox: 'proved',
      freshProcess: true,
      pinnedSha: sha,
      repoSha: sha,
    });
    assert.equal(filled.allowed, false);
    assert.deepEqual(filled.reasons, ['har08-does-not-authorize-launch']);
  });

  if (failures.length > 0) {
    console.error('AGENT HARNESS SELF-TEST FAILURES:');
    for (const failure of failures) console.error(failure);
    return 1;
  }
  console.log(
    'Agent harness self-test passed: fake traces, null usage, negation and archive rejection, unverified citation, snapshot canary, refused launch, A/B gate, host oracle. No model was called.',
  );
  return 0;
}
