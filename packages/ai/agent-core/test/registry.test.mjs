import assert from 'node:assert/strict';
import test from 'node:test';
import { selectCapabilities, validateToolInput } from '../dist/tools/registry.js';

const echo = {
  name: 'readDocument',
  description: 'Read a fixture document.',
  inputSchema: {
    safeParse(value) {
      if (value !== null && typeof value === 'object' && value.id === 'a') {
        return { success: true, data: { id: 'a' } };
      }
      return { success: false };
    },
  },
};

test('selection follows request order and refuses unknown or duplicate registry state', () => {
  const other = { ...echo, name: 'calculate', description: 'Add fixture numbers.' };
  assert.deepEqual(
    selectCapabilities([echo, other], ['calculate', 'readDocument']).map((binding) => binding.name),
    ['calculate', 'readDocument'],
  );
  assert.throws(() => selectCapabilities([echo, echo], ['readDocument']), /invalid-registry/);
  assert.throws(
    () => selectCapabilities([{ ...echo, name: '__proto__' }], ['__proto__']),
    /invalid-registry/,
  );
  assert.throws(() => selectCapabilities([echo], ['missing']), /tool-not-allowed/);
  assert.throws(() => selectCapabilities([echo], ['readDocument', 'readDocument']), /invalid-registry/);
});

test('oversize and non-JSON arguments never become a validated value', () => {
  const ok = validateToolInput(echo.inputSchema, { id: 'a' });
  assert.deepEqual(ok, { ok: true, value: { id: 'a' } });
  assert.deepEqual(validateToolInput(echo.inputSchema, { id: 'no' }), {
    ok: false,
    code: 'invalid-tool-input',
  });
  assert.equal(validateToolInput(echo.inputSchema, Number.NaN).code, 'invalid-tool-input');
  const cycle = {};
  cycle.self = cycle;
  assert.equal(validateToolInput(echo.inputSchema, cycle).code, 'invalid-tool-input');
  assert.equal(
    validateToolInput(echo.inputSchema, { id: 'a'.repeat(1100) }).code,
    'tool-input-limit',
  );
});
