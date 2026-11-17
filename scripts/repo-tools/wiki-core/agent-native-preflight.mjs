import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { HAR08_TASKS } from './agent-fixtures/har08-tasks.mjs';

export const COMMON_INSTRUCTION = [
  'Read-only investigation of the supplied Offscreen RPG source snapshot.',
  'Do not modify files, invoke other agents, start providers or services, browse the network, or run mutating commands.',
  'Answer the question using the repository\'s current source and documents.',
  'Cite exact paths, headings or symbols you actually inspected.',
  'Distinguish selected design from implemented/tested behavior; state uncertainty and a meaningful negative case.',
  'Stop when the evidence is sufficient.',
].join(' ');

export const NAVIGATION_CUE = [
  'For unfamiliar topics, navigate through the repository\'s product/technical owner headings using `wiki:find` and bounded `wiki:read` or direct source-map links.',
  'Follow only relevant referenced implementation files and tests; check `STATUS.md` when current realization matters.',
  'Verify the strongest negative or disqualifying case.',
  'Do not keep reading after the answer can be supported by a few exact citations.',
].join(' ');

export function agentPrompt(arm, question) {
  if (arm !== 'A' && arm !== 'B') throw new Error(`unknown arm ${arm}`);
  const base = `${COMMON_INSTRUCTION}\n\n${question}`;
  return arm === 'B' ? `${base}\n\n${NAVIGATION_CUE}` : base;
}

export function evaluatePair(record) {
  const reasons = [];
  const left = record?.a;
  const right = record?.b;
  if (!left || !right) reasons.push('missing-arm');
  if (left && right) {
    if (!record.pinnedSha || left.repoSha !== record.pinnedSha || right.repoSha !== record.pinnedSha) reasons.push('sha-mismatch');
    if (!left.sessionId || !right.sessionId || left.sessionId === right.sessionId) reasons.push('session-reused');
    if (left.resumed || right.resumed) reasons.push('session-resumed');
    if (!left.question || left.question !== right.question) reasons.push('question-mismatch');
    if (!left.client || left.client === 'unknown' || left.client !== right.client) reasons.push('client-mismatch');
    if (!left.model || left.model !== right.model) reasons.push('model-mismatch');
    if (!sameCap(left.cap, right.cap)) reasons.push('cap-mismatch');
    if (left.questionHash !== right.questionHash) reasons.push('question-hash-mismatch');
    const expected = `${left.prompt}\n\n${NAVIGATION_CUE}`;
    if (left.prompt !== agentPrompt('A', left.question) || right.prompt !== expected) reasons.push('prompt-delta');
    if (String(left.prompt).includes(NAVIGATION_CUE)) reasons.push('cue-on-native-arm');
  }
  if (!record?.orderSeed) reasons.push('missing-order');
  if (record?.priorReceiptVisible) reasons.push('prior-result-leak');
  for (const role of record?.goldPaths ?? []) {
    if (String(left?.prompt ?? '').includes(role) || String(right?.prompt ?? '').includes(role)) reasons.push('oracle-leak');
  }
  return { ok: reasons.length === 0, reasons };
}

function sameCap(left, right) {
  return Boolean(left && right && left.minutes === right.minutes && left.toolCalls === right.toolCalls && left.attempts === right.attempts);
}

export function evaluateLaunchGate(options = {}) {
  const reasons = [];
  if (!options.approveModelUsage) reasons.push('approve-model-usage');
  if (!options.client || options.client === 'unknown') reasons.push('client');
  if (!options.model) reasons.push('model');
  if (!options.usagePolicy) reasons.push('usage-policy');
  if (!options.cap?.minutes || !options.cap?.toolCalls || !options.cap?.attempts) reasons.push('enforced-caps');
  if (!options.maxAttempts) reasons.push('max-attempts');
  if (options.sandbox !== 'proved') reasons.push('sandbox');
  if (!options.freshProcess) reasons.push('fresh-process');
  if (!options.pinnedSha || options.repoSha !== options.pinnedSha) reasons.push('sha-mismatch');
  if (options.resumedSession) reasons.push('session-resumed');
  if (options.goldReadable || options.canaryReadable) reasons.push('oracle-accessible');
  if (options.writesAllowed) reasons.push('unsafe-write');
  reasons.push('har08-does-not-authorize-launch');
  return { allowed: false, reasons, realLaunch: 'refused', sandbox: options.sandbox === 'proved' ? 'proved' : 'unproven' };
}

export function stageHostOracle(root, repoSha) {
  if (!/^[0-9a-f]{40}$/.test(repoSha ?? '')) throw new Error('host oracle requires a full SHA');
  const tasks = HAR08_TASKS.map((task) => ({
    ...task,
    inspectedSha: repoSha,
    semanticCertification: false,
  }));
  if (tasks.some((task) => task.review !== 'unreviewed')) throw new Error('HAR08 tasks are not independently reviewed');
  for (const task of tasks) {
    for (const role of task.roles) {
      if (task.question.includes(role.path) || task.question.includes(role.symbol ?? '\u0000')) {
        throw new Error(`question ${task.id} names its oracle`);
      }
    }
  }
  const body = {
    schema: 'har08.host-oracle.v1',
    repoSha,
    review: 'unreviewed',
    verifiedCount: 0,
    diagnosticOnly: true,
    count: tasks.length,
    tasks,
  };
  const dir = path.join(root, 'out', 'agent-evaluation', repoSha);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'tasks.json');
  writeFileSync(file, JSON.stringify(body, null, 2));
  return { file, count: tasks.length, review: 'unreviewed', verifiedCount: 0 };
}

export function questionHash(question) {
  return createHash('sha256').update(String(question)).digest('hex');
}
