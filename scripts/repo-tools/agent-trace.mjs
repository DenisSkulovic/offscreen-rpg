/**
 * Summarize a redacted Cursor `agent --print --output-format stream-json` trace.
 * Prints counts only. Does not write a raw trace, and does not invent token totals.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const GUARD_PATH = /(?:change-guard|wiki-change-guard|docs-health|wiki-health|check_docs)/;

export function summarizeAgentTrace(text) {
  const summary = emptySummary();
  const readCounts = new Map();
  let sawBytes = false;
  let bytes = 0;
  let toolsBeforeEdit = 0;
  let sawEdit = false;
  let firstTimestamp = null;
  const lines = String(text).split(/\n/);
  for (const line of lines) {
    if (line.trim() === '') continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return unclassified('invalid-json');
    }
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      return unclassified('not-an-object');
    }
    const stamp = timestampMs(event);
    if (stamp !== null && firstTimestamp === null) firstTimestamp = stamp;
    const kind = classify(event);
    if (!kind) return unclassified(event.type ?? 'missing-type');
    if (kind.turn) summary.modelTurns += 1;
    if (kind.usageError) return unclassified('usage');
    if (kind.usage) applyUsage(summary, kind.usage);
    if (kind.tool) {
      summary.toolCalls.total += 1;
      summary.toolCalls[kind.tool] += 1;
      if (!sawEdit && (kind.tool === 'read' || kind.tool === 'search')) {
        toolsBeforeEdit += 1;
      }
      if (kind.tool === 'edit' && !sawEdit) {
        sawEdit = true;
        summary.navigationBeforeFirstEdit = toolsBeforeEdit;
        summary.firstEditLatencyMs =
          stamp !== null && firstTimestamp !== null ? stamp - firstTimestamp : null;
      }
    }
    if (kind.path) {
      const count = (readCounts.get(kind.path) ?? 0) + 1;
      readCounts.set(kind.path, count);
      if (count > 1) summary.files.repeatedReads += 1;
      if (GUARD_PATH.test(kind.path)) summary.diagnosticsReads += 1;
      else summary.sourceOwnerReads += 1;
    }
    if (typeof event.bytes === 'number' && Number.isFinite(event.bytes)) {
      sawBytes = true;
      bytes += event.bytes;
    }
  }
  summary.files.distinct = readCounts.size;
  summary.files.bytesDelivered = sawBytes ? bytes : null;
  return { ok: true, summary };
}

function emptySummary() {
  return {
    schema: 'wiki.agent-trace.v1',
    modelTurns: 0,
    toolCalls: { total: 0, read: 0, search: 0, shell: 0, edit: 0 },
    files: { distinct: 0, repeatedReads: 0, bytesDelivered: null },
    navigationBeforeFirstEdit: null,
    firstEditLatencyMs: null,
    diagnosticsReads: 0,
    sourceOwnerReads: 0,
    tokens: { input: null, cachedInput: null, output: null },
  };
}

function unclassified(event) {
  return { ok: false, error: 'unclassified', event };
}

function timestampMs(event) {
  const value = event.timestampMs ?? event.timestamp_ms;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function classify(event) {
  if (event.type === 'assistant') return { turn: true };
  if (event.type === 'result') {
    if (event.usage === undefined || event.usage === null) return { usage: null };
    if (typeof event.usage !== 'object' || Array.isArray(event.usage)) {
      return { usageError: true };
    }
    return { usage: event.usage };
  }
  if (event.type !== 'tool_call') return null;
  if (event.subtype === 'started') return { ignore: true };
  const nested = event.tool_call ?? {};
  const name = String(
    event.name ??
      nested.name ??
      (nested.readToolCall
        ? 'read'
        : nested.grepToolCall
          ? 'search'
          : nested.editToolCall || nested.writeToolCall
            ? 'edit'
            : ''),
  ).toLowerCase();
  const pathValue =
    event.path ??
    nested.readToolCall?.args?.path ??
    nested.grepToolCall?.args?.path ??
    null;
  if (name === 'read' || name === 'readfile') {
    return { tool: 'read', path: typeof pathValue === 'string' ? pathValue : null };
  }
  if (name === 'search' || name === 'grep' || name === 'rg') return { tool: 'search' };
  if (name === 'shell') return { tool: 'shell' };
  if (name === 'edit' || name === 'write' || name === 'strreplace') return { tool: 'edit' };
  return null;
}

function applyUsage(summary, usage) {
  summary.tokens.input = numberOrNull(usage.input_tokens ?? usage.inputTokens);
  summary.tokens.cachedInput = numberOrNull(
    usage.cache_read_tokens ?? usage.cacheReadTokens ?? usage.cached_input_tokens,
  );
  summary.tokens.output = numberOrNull(usage.output_tokens ?? usage.outputTokens);
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function main() {
  const text = readFileSync(0, 'utf8');
  const result = summarizeAgentTrace(text);
  if (!result.ok) {
    console.error(`unclassified: ${result.event}`);
    process.exit(2);
  }
  process.stdout.write(`${JSON.stringify(result.summary)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
