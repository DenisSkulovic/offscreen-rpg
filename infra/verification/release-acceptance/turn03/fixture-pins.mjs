export { EXPECTED_IMPORT_ROOTS } from './fixture-import-roots.mjs';
import { createRequire } from 'node:module';
import {
  rulePackageManifestSchema,
  startPackageManifestSchema,
} from '../../../../packages/documents/dist/schema.js';

const require = createRequire(
  new URL('../../../../packages/documents/dist/schema.js', import.meta.url),
);
const { z } = require('zod');

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const releaseSha = z.string().regex(/^[0-9a-f]{40}$/);
const adapterId = z.string().regex(/^[a-z][a-z0-9.-]{0,119}$/);

const engineSchema = z.strictObject({
  adapterId,
  adapterVersion: z.number().int().positive(),
});

export const fixturePinManifestSchema = z.strictObject({
  schema: z.literal('offscreen.turn03-fixture-pins.v1'),
  releaseSha,
  bucket: z.string().min(1),
  start: z.strictObject({
    startPackageId: z.uuid(),
    rootHash: sha256,
    revision: z.number().int().positive(),
  }),
  rules: z.strictObject({
    ruleSetId: z.uuid(),
    rootHash: sha256,
    revision: z.number().int().positive(),
    engine: engineSchema,
  }),
});

const INJECTED_EVIDENCE = 'injected-readonly-store';

/**
 * Read-only check that a caller-supplied pin matches immutable start and rule
 * manifests. Success is an injected-store receipt, never cross-Pod evidence.
 *
 * @param {{
 *   manifest: unknown,
 *   expectedReleaseSha: string,
 *   expectedBucket: string,
 *   store: {
 *     readStartPackageManifest: (hash: string) => Promise<unknown>,
 *     readRulePackageManifest: (hash: string) => Promise<unknown>,
 *   },
 * }} input
 */
export async function verifyPinnedFixture(input) {
  // 1. Accept only the strict pin. A bad pin fails before any object read.
  const pin = fixturePinManifestSchema.safeParse(input?.manifest);
  if (!pin.success) {
    return refusal('FAIL', 'malformed-pin', 'Fixture pin manifest is not valid.');
  }
  if (
    input.expectedReleaseSha !== pin.data.releaseSha ||
    input.expectedBucket !== pin.data.bucket
  ) {
    return refusal(
      'FAIL',
      'release-or-bucket-mismatch',
      'Pinned release SHA or bucket does not match the injected expectation.',
    );
  }

  // 2. Read the start root. Unavailable storage blocks; missing or corrupt bytes fail.
  const startRead = await readManifest(
    input.store,
    'readStartPackageManifest',
    pin.data.start.rootHash,
    startPackageManifestSchema,
  );
  if (startRead.outcome !== 'ok') return startRead.outcome;

  const start = startRead.value;
  const rulesPin = pin.data.rules;
  const sameEngine =
    start.rules.engine.adapterId === rulesPin.engine.adapterId &&
    start.rules.engine.adapterVersion === rulesPin.engine.adapterVersion;
  if (
    start.startPackageId !== pin.data.start.startPackageId ||
    start.revision !== pin.data.start.revision ||
    start.rules.ruleSetId !== rulesPin.ruleSetId ||
    start.rules.rootHash !== rulesPin.rootHash ||
    start.rules.revision !== rulesPin.revision ||
    !sameEngine
  ) {
    return refusal(
      'FAIL',
      'start-identity-mismatch',
      'Start manifest identity does not match the pin.',
    );
  }

  // 3. This orientation-only fixture cannot carry worlds or executable obligations.
  if (start.worlds.length > 0) {
    return refusal('FAIL', 'worlds-present', 'Pinned fixture must not mount worlds.');
  }
  if (start.entries.some((entry) => entry.activation === 'executable-obligation')) {
    return refusal(
      'FAIL',
      'executable-obligation',
      'Pinned fixture must not contain an executable obligation.',
    );
  }
  const orientation = start.entries.find(
    (entry) => entry.documentId === start.orientationDocumentId,
  );
  if (
    !orientation ||
    orientation.kind !== 'orientation' ||
    orientation.activation !== 'initial-canon'
  ) {
    return refusal(
      'FAIL',
      'orientation-missing',
      'Pinned fixture needs an initial-canon orientation entry.',
    );
  }

  // 4. Confirm the rule root names the same package, revision and engine.
  const rulesRead = await readManifest(
    input.store,
    'readRulePackageManifest',
    rulesPin.rootHash,
    rulePackageManifestSchema,
  );
  if (rulesRead.outcome !== 'ok') return rulesRead.outcome;
  const rules = rulesRead.value;
  if (
    rules.ruleSetId !== rulesPin.ruleSetId ||
    rules.revision !== rulesPin.revision ||
    rules.engine.adapterId !== rulesPin.engine.adapterId ||
    rules.engine.adapterVersion !== rulesPin.engine.adapterVersion
  ) {
    return refusal(
      'FAIL',
      'rules-identity-mismatch',
      'Rule manifest identity does not match the pin.',
    );
  }

  return {
    verified: true,
    bucket: pin.data.bucket,
    releaseSha: pin.data.releaseSha,
    startRootHash: pin.data.start.rootHash,
    rulesRootHash: rulesPin.rootHash,
    evidence: INJECTED_EVIDENCE,
  };
}

function refusal(status, code, message) {
  return { status, code, message, evidence: INJECTED_EVIDENCE };
}

async function readManifest(store, methodName, rootHash, schema) {
  const method = store?.[methodName];
  if (typeof method !== 'function') {
    return {
      outcome: refusal('BLOCKED', 'store-unavailable', 'Document read is unavailable.'),
    };
  }

  let raw;
  try {
    raw = await method.call(store, rootHash);
  } catch (error) {
    return { outcome: classifyReadError(error) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      outcome: refusal('FAIL', 'corrupt-object', 'Stored manifest bytes are not a valid package.'),
    };
  }
  return { outcome: 'ok', value: parsed.data };
}

function classifyReadError(error) {
  const code = error && typeof error === 'object' ? error.code : undefined;
  if (code === 'unavailable') {
    return refusal('BLOCKED', 'store-unavailable', 'Document read is unavailable.');
  }
  if (code === 'missing') {
    return refusal('FAIL', 'missing-object', 'Pinned object is missing.');
  }
  if (code === 'corrupt' || code === 'too-large') {
    return refusal('FAIL', 'corrupt-object', 'Stored manifest bytes are not a valid package.');
  }
  return refusal('BLOCKED', 'store-unavailable', 'Document read is unavailable.');
}
