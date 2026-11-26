import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  LONG_SSE_EVENT_DELAYS_S,
  LONG_SSE_EVENT_COUNT,
  expectedLongEventNames,
  parseSseDataLines,
  validateLongStreamTiming,
} from '../long-stream.mjs';

const smokeDir = dirname(dirname(fileURLToPath(import.meta.url)));
const backendPath = join(smokeDir, 'backend.py');
const smokePath = join(smokeDir, 'smoke.sh');
const setupPath = join(smokeDir, 'setup.sh');

test('LONG_SSE_EVENT_DELAYS_S matches backend.py constant', () => {
  const backend = readFileSync(backendPath, 'utf8');
  const match = backend.match(/LONG_SSE_EVENT_DELAYS_S = \(([^)]+)\)/);
  assert.ok(match, 'backend.py must define LONG_SSE_EVENT_DELAYS_S');
  const pythonDelays = match[1].split(',').map((part) => Number(part.trim()));
  assert.deepEqual(pythonDelays, [...LONG_SSE_EVENT_DELAYS_S]);
  assert.equal(LONG_SSE_EVENT_COUNT, 4);
});

test('parseSseDataLines extracts data fields from SSE blocks', () => {
  const chunk =
    'data: api-event-1\n\ndata: api-event-2\n\n:comment\n\ndata: api-event-3\n\n';
  assert.deepEqual(parseSseDataLines(chunk), [
    'data: api-event-1',
    'data: api-event-2',
    'data: api-event-3',
  ]);
});

test('validateLongStreamTiming accepts on-schedule injected arrivals', () => {
  const arrivals = [0.1, 15.2, 30.1, 45.0];
  const result = validateLongStreamTiming(arrivals);
  assert.equal(result.ok, true);
});

test('validateLongStreamTiming rejects early arrival', () => {
  const result = validateLongStreamTiming([0, 14.9, 30, 45]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /before scheduled/);
});

test('validateLongStreamTiming rejects late arrival past next slot plus tolerance', () => {
  const result = validateLongStreamTiming([0, 35.1, 30, 45]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /after bound/);
});

test('validateLongStreamTiming rejects wrong event count', () => {
  const result = validateLongStreamTiming([0, 15, 30]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /expected 4 events/);
});

test('expectedLongEventNames builds four api events', () => {
  assert.deepEqual(expectedLongEventNames('api'), [
    'data: api-event-1',
    'data: api-event-2',
    'data: api-event-3',
    'data: api-event-4',
  ]);
});

test('smoke.sh default mode is quick and long-stream is optional', () => {
  const text = readFileSync(smokePath, 'utf8');
  assert.match(text, /SMOKE_MODE="quick"/);
  assert.match(text, /long-stream/);
  assert.match(text, /Running separate long SSE probe/);
  assert.doesNotMatch(text, /time\.sleep\(45/);
});

test('setup.sh documents owned fixture cleanup without cluster delete', () => {
  const text = readFileSync(setupPath, 'utf8');
  assert.match(text, /delete httproute lab-edge-routes/);
  assert.match(text, /delete configmap synthetic-backend/);
  assert.match(text, /Do not delete:.*Gateway API CRDs/);
  assert.doesNotMatch(text, /kind delete/);
});
