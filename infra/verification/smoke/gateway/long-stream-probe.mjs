#!/usr/bin/env node
/** Live long-stream smoke (single HTTP connection, no reconnect). */
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import {
  LONG_SSE_EVENT_COUNT,
  LONG_STREAM_DEADLINE_S,
  expectedLongEventNames,
  validateLongStreamTiming,
} from './long-stream.mjs';

const port = Number(process.argv[2]);
if (!Number.isFinite(port)) {
  process.stderr.write('usage: long-stream-probe.mjs <port>\n');
  process.exit(2);
}

const base = `http://127.0.0.1:${port}`;
const path = '/api/events/long';
const started = performance.now() / 1000;
const deadline = LONG_STREAM_DEADLINE_S;

const proc = spawn(
  'curl',
  [
    '-N',
    '-sS',
    '--max-time',
    String(deadline),
    '-D',
    '-',
    '-H',
    'Accept: text/event-stream',
    `${base}${path}`,
  ],
  { stdio: ['ignore', 'pipe', 'inherit'] },
);

/** @type {string[]} */
const arrivalPayloads = [];
/** @type {number[]} */
const arrivalOffsets = [];
let bodyStarted = false;
let carry = '';

proc.stdout.on('data', (chunk) => {
  carry += chunk.toString('utf8');
  if (!bodyStarted) {
    const headerEnd = carry.indexOf('\r\n\r\n');
    if (headerEnd < 0) {
      return;
    }
    const head = carry.slice(0, headerEnd);
    const statusLine = head.split('\r\n')[0] ?? '';
    if (!statusLine.includes(' 200 ')) {
      process.stderr.write(`${path}: ${statusLine}\n`);
      proc.kill();
      process.exit(1);
    }
    if (!head.toLowerCase().includes('text/event-stream')) {
      process.stderr.write(`${path}: headers were ${head}\n`);
      proc.kill();
      process.exit(1);
    }
    carry = carry.slice(headerEnd + 4);
    bodyStarted = true;
  }

  while (arrivalPayloads.length < LONG_SSE_EVENT_COUNT) {
    const now = performance.now() / 1000 - started;
    if (now > deadline) {
      process.stderr.write(`${path}: exceeded ${deadline}s overall deadline\n`);
      proc.kill();
      process.exit(1);
    }
    const boundary = carry.indexOf('\n\n');
    if (boundary < 0) {
      break;
    }
    const block = carry.slice(0, boundary).trim();
    carry = carry.slice(boundary + 2);
    if (!block.startsWith('data:')) {
      continue;
    }
    arrivalOffsets.push(now);
    arrivalPayloads.push(block);
  }
});

const exitCode = await new Promise((resolve) => {
  proc.on('close', (code) => resolve(code ?? 1));
});

if (arrivalPayloads.length < LONG_SSE_EVENT_COUNT) {
  process.stderr.write(
    `${path}: curl exited ${exitCode} with ${arrivalPayloads.length} events\n`,
  );
  process.exit(1);
}

const result = validateLongStreamTiming(arrivalOffsets);
if (!result.ok) {
  process.stderr.write(`${path}: timing check failed: ${result.reason}\n`);
  process.exit(1);
}
const expected = expectedLongEventNames('api');
if (JSON.stringify(arrivalPayloads) !== JSON.stringify(expected)) {
  process.stderr.write(
    `${path}: events were ${JSON.stringify(arrivalPayloads)}, expected ${JSON.stringify(expected)}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `pass ${path} streamed ${arrivalPayloads.length} events over ${arrivalOffsets.at(-1)?.toFixed(3)}s\n`,
);
