/** Normalize scripted agent events. Missing usage stays null. No model calls. */

export function normalizeTrial(input) {
  if (!input || !Array.isArray(input.events)) {
    return terminal(input, 'malformed-jsonl');
  }
  if (input.status && input.status !== 'completed') {
    return terminal(input, input.status);
  }
  const elapsedMs = input.endedMs - input.startedMs;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error('negative or missing trial duration');
  }
  const calls = new Map();
  const fileReads = [];
  const searches = [];
  let failed = 0;
  for (const event of input.events) {
    if (event.type !== 'tool') continue;
    if (!event.toolCallId) return terminal(input, 'malformed-jsonl');
    const prior = calls.get(event.toolCallId) ?? {
      id: event.toolCallId,
      tool: event.tool,
      phases: [],
      status: 'completed',
      path: event.path ?? null,
      command: event.command ?? null,
    };
    prior.phases.push(event.phase);
    if (event.status === 'failed') prior.status = 'failed';
    if (event.path) prior.path = event.path;
    if (event.command) prior.command = event.command;
    calls.set(event.toolCallId, prior);
  }
  let read = 0;
  let search = 0;
  let other = 0;
  for (const call of calls.values()) {
    if (call.status === 'failed') {
      failed += 1;
      continue;
    }
    const command = call.command ?? '';
    if (call.tool === 'shell' && /^\s*rg\b/.test(command)) {
      search += 1;
      searches.push({ command, scope: call.path ?? null, filesVerified: false });
      continue;
    }
    if (call.tool === 'read' && call.path) {
      read += 1;
      fileReads.push(call.path);
      continue;
    }
    if (call.tool === 'search') {
      search += 1;
      searches.push({ command: command || call.tool, scope: call.path ?? null, filesVerified: false });
      continue;
    }
    other += 1;
  }
  const distinct = [...new Set(fileReads)];
  const firstOwner = input.events.find((event) => event.tool === 'read' && event.path === input.goldPath);
  return {
    schema: 'wiki.agent-trial.v1',
    trialId: input.trialId,
    questionId: input.questionId,
    repoSha: input.repoSha,
    dirty: input.dirty ?? null,
    adapter: input.adapter,
    model: input.model ?? null,
    arm: input.arm ?? null,
    seed: input.seed ?? null,
    status: 'completed',
    evidenceClass: 'fake-harness-only',
    elapsedMs,
    firstGoldPageOpenMs:
      firstOwner && Number.isFinite(firstOwner.atMs) ? firstOwner.atMs - input.startedMs : null,
    toolCalls: {
      total: calls.size,
      completed: calls.size - failed,
      failed,
      read,
      search,
      other,
    },
    fileReads: {
      calls: fileReads.length,
      distinct: distinct.length,
      paths: distinct,
      searches,
    },
    tokens: reportedTokens(input.tokens),
    usageCostUsd: null,
    answer: input.answer ?? '',
  };
}

function reportedTokens(tokens) {
  if (tokens?.reported !== true) {
    return { input: null, cachedInput: null, output: null, reported: false };
  }
  const numberOrNull = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  return {
    input: numberOrNull(tokens.input),
    cachedInput: numberOrNull(tokens.cachedInput),
    output: numberOrNull(tokens.output),
    reported: true,
  };
}

function terminal(input, status) {
  return {
    schema: 'wiki.agent-trial.v1',
    trialId: input?.trialId ?? null,
    questionId: input?.questionId ?? null,
    repoSha: input?.repoSha ?? null,
    status,
    evidenceClass: 'fake-harness-only',
    elapsedMs: null,
    toolCalls: null,
    fileReads: null,
    tokens: { input: null, cachedInput: null, output: null, reported: false },
    usageCostUsd: null,
    answer: input?.answer ?? '',
  };
}
