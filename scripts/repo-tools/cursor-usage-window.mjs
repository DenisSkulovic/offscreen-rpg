#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fields = ['Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output Tokens', 'Total Tokens'];
export function parseCsv(source) {
  const rows = []; let row = [], field = '', quote = false;
  const input = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote && c === '"' && input[i + 1] === '"') { field += '"'; i++; }
    else if (c === '"') quote = !quote;
    else if (!quote && (c === ',' || c === '\n' || c === '\r')) {
      row.push(field); field = '';
      if (c !== ',') { if (row.some(Boolean)) rows.push(row); row = []; if (c === '\r' && input[i + 1] === '\n') i++; }
    } else field += c;
  }
  if (quote) throw new Error('Unclosed CSV quote');
  if (row.length || field) { row.push(field); rows.push(row); }
  const [headers, ...records] = rows;
  if (!headers) throw new Error('Empty CSV');
  for (const name of ['Date', 'Model', 'Cost', 'Cloud Agent ID', ...fields]) {
    if (!headers.includes(name)) throw new Error('Missing column: ' + name);
  }
  return records.map((values, i) => {
    if (values.length !== headers.length) throw new Error('Wrong number of columns at row ' + (i + 2));
    return Object.fromEntries(headers.map((name, n) => [name, values[n]]));
  });
}
function instant(s) {
  if (!s) return null;
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?:[:.]\d+)*(?:Z|[+-]\d\d:\d\d)$/.test(s) || !Number.isFinite(Date.parse(s))) throw new Error('ISO timestamp with explicit timezone required: ' + s);
  return Date.parse(s);
}
export function summarizeUsage(csv, opts = {}) {
  const from = instant(opts.from), to = instant(opts.to);
  if (from !== null && to !== null && to <= from) throw new Error('Invalid time window');
  const rows = parseCsv(csv), totals = Object.fromEntries(fields.map(f => [f, 0]));
  const modelCounts = {}, costLabels = {};
  let events = 0, unmeasured = 0, agentIds = 0;
  for (const [index, row] of rows.entries()) {
    const at = instant(row.Date);
    if ((from !== null && at < from) || (to !== null && at >= to)) continue;
    events++;
    if (row['Cloud Agent ID']) agentIds++;
    const model = row.Model || '(empty)';
    modelCounts[model] = (modelCounts[model] || 0) + 1;
    const cost = row.Cost || '(empty)';
    costLabels[cost] = (costLabels[cost] || 0) + 1;
    const blanks = fields.filter(f => row[f] === '').length;
    if (blanks === fields.length) { unmeasured++; continue; }
    if (blanks) throw new Error('Partially empty metrics on CSV row ' + (index + 2));
    const parts = fields.map(f => {
      if (!/^\d+$/.test(row[f]) || !Number.isSafeInteger(Number(row[f]))) throw new Error('Invalid token count on CSV row ' + (index + 2));
      return Number(row[f]);
    });
    if (parts.slice(0, 4).reduce((a, b) => a + b, 0) !== parts[4]) throw new Error('Token total mismatch on CSV row ' + (index + 2));
    fields.forEach((f, i) => { totals[f] += parts[i]; });
  }
  return {
    events, measuredEvents: events - unmeasured, unmeasuredEvents: unmeasured,
    totalTokens: totals['Total Tokens'], inputNoCacheWrite: totals['Input (w/o Cache Write)'], inputWithCacheWrite: totals['Input (w/ Cache Write)'],
    cacheRead: totals['Cache Read'], output: totals['Output Tokens'],
    modelCounts, costLabels, linkedAgentEvents: agentIds, billedCurrency: null,
    warnings: ['Window is not session attribution when chats overlap', 'Blank metrics are unknown, not zero', 'Cost labels are not dollar prices', 'Usage events do not establish accepted tasks'],
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const file = args[0];
    if (!file) throw new Error('Usage: pnpm repo:cursor-usage <events.csv> [--from ISO] [--to ISO]');
    const options = {};
    for (let i = 1; i < args.length; i += 2) {
      if (!['--from', '--to'].includes(args[i]) || !args[i + 1]) throw new Error('Expected --from or --to and an ISO date with timezone');
      options[args[i].slice(2)] = args[i + 1];
    }
    console.log(JSON.stringify(summarizeUsage(readFileSync(file, 'utf8'), options), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
