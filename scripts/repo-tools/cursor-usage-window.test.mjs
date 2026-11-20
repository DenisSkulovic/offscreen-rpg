import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, summarizeUsage } from './cursor-usage-window.mjs';
const header = 'Date,Cloud Agent ID,Automation ID,Kind,Model,Max Mode,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost';
const a = '"2026-11-20T00:00:00.000Z","","","Included","composer-2.5","No","0","10","80","10","100","Included"';
const b = '"2026-11-20T01:00:00.000Z","a1","","Credit","grok","No","0","4","5","1","10","Free"';
const csv = header + '\n' + a + '\n' + b + '\n';
test('parses BOM, CRLF and quoted comma', () => {
  assert.equal(parseCsv('\uFEFF' + header + '\r\n' + a.replace('"composer-2.5"', '"composer, 2.5"') + '\r\n')[0].Model, 'composer, 2.5');
});
test('selects half-open time window in offset timezone', () => {
  const x = summarizeUsage(csv, { from: '2026-11-20T02:00:00+02:00', to: '2026-11-20T03:00:00+02:00' });
  assert.equal(x.events, 1); assert.equal(x.totalTokens, 100);
});
test('does not claim billed currency or per-agent cost', () => {
  const x = summarizeUsage(csv); assert.equal(x.billedCurrency, null);
  assert.equal(x.linkedAgentEvents, 1); assert.equal(x.cacheRead, 85);
});
test('blank metrics are unmeasured; partial blank is rejected', () => {
  const blank = a.replace('"0","10","80","10","100"', '"","","","",""');
  const x = summarizeUsage(header + '\n' + blank + '\n');
  assert.equal(x.unmeasuredEvents, 1); assert.equal(x.measuredEvents, 0);
  assert.throws(() => summarizeUsage(csv.replace('"80"', '""')), /Partially empty/);
});
test('rejects malformed totals and timestamps', () => {
  assert.throws(() => summarizeUsage(csv.replace('"100"', '"99"')), /mismatch/);
  assert.throws(() => summarizeUsage(csv, { from: '2026-11-20T01:00' }), /timezone/);
});
test('rejects incomplete CSV', () => {
  assert.throws(() => parseCsv('Date,Model\na,b'), /Missing column/);
  assert.throws(() => parseCsv(header + '\n"unclosed'), /Unclosed/);
});
