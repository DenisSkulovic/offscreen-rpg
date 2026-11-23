import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTerminalPairingSchema } from '../src/terminal-auth.js';

const fixture = {
  challengeSha256: 'a'.repeat(64),
  label: 'proof',
};

test('createTerminalPairingSchema accepts canonical pairing request', () => {
  assert.deepEqual(createTerminalPairingSchema.parse(fixture), fixture);
});

test('createTerminalPairingSchema rejects unknown keys (strict object)', () => {
  assert.throws(() =>
    createTerminalPairingSchema.parse({ ...fixture, extra: true }),
  );
});

test('createTerminalPairingSchema rejects uppercase challenge digest', () => {
  assert.throws(() =>
    createTerminalPairingSchema.parse({
      ...fixture,
      challengeSha256: 'A'.repeat(64),
    }),
  );
});