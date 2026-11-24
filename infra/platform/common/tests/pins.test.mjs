import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  POSTGRES_OPERATOR_PIN_KEYS,
  TEMPORAL_IMAGE_PIN_KEYS,
  parsePins,
  verifyManifestBytes,
} from '../pins.mjs';

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('parsePins accepts authoritative postgres operator.pin', () => {
  const text = readFileSync(
    join(platformRoot, 'postgres/operator.pin'),
    'utf8',
  );
  const pins = parsePins(text, POSTGRES_OPERATOR_PIN_KEYS);
  assert.match(pins.POSTGRES_IMAGE, /^ghcr\.io\//);
  assert.match(pins.CNPG_SHA256, /^[0-9a-f]{64}$/);
});

test('parsePins accepts authoritative temporal images.pin digests', () => {
  const text = readFileSync(join(platformRoot, 'temporal/images.pin'), 'utf8');
  const pins = parsePins(text, TEMPORAL_IMAGE_PIN_KEYS);
  assert.match(pins.SERVER_DIGEST, /^sha256:[0-9a-f]{64}$/);
});

test('parsePins rejects missing, unknown, duplicate, and malformed digest keys', () => {
  assert.throws(() => parsePins('A=1', ['A', 'B']), /missing pin key: B/);
  assert.throws(
    () => parsePins('A=1\nB=2\nEXTRA=3', ['A', 'B']),
    /unknown pin key: EXTRA/,
  );
  assert.throws(() => parsePins('A=1\nA=2', ['A']), /duplicate pin key: A/);
  assert.throws(
    () => parsePins('HASH_SHA256=not-hex', ['HASH_SHA256']),
    /invalid digest for HASH_SHA256/,
  );
});

test('verifyManifestBytes checks sha256 from actual bytes', () => {
  const body = 'fixture manifest bytes';
  const digest = createHash('sha256').update(body).digest('hex');
  assert.throws(() => verifyManifestBytes(body, 'f'.repeat(64)), /mismatch/);
  assert.equal(verifyManifestBytes(body, digest), true);
  assert.equal(verifyManifestBytes(body, `sha256:${digest}`), true);
  assert.throws(() => verifyManifestBytes(body, 'short'), /not 64 hex/);
});
