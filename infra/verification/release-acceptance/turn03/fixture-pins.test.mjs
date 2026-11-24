import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyPinnedFixture } from './fixture-pins.mjs';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const RELEASE = 'c'.repeat(40);
const START_ID = '11111111-1111-4111-8111-111111111111';
const RULE_ID = '22222222-2222-4222-8222-222222222222';
const DOC_ID = '33333333-3333-4333-8333-333333333333';
const OP_ID = '44444444-4444-4444-8444-444444444444';
const ENGINE = { adapterId: 'srd-2014', adapterVersion: 1 };

function pin(overrides = {}) {
  return {
    schema: 'offscreen.turn03-fixture-pins.v1',
    releaseSha: RELEASE,
    bucket: 'lab-objects',
    start: { startPackageId: START_ID, rootHash: HASH_A, revision: 1 },
    rules: { ruleSetId: RULE_ID, rootHash: HASH_B, revision: 1, engine: ENGINE },
    ...overrides,
  };
}

function startManifest(overrides = {}) {
  return {
    format: 'offscreen.start-package-manifest.v1',
    startPackageId: START_ID,
    title: 'Orientation',
    revision: 1,
    previousRootHash: null,
    authorOperationId: OP_ID,
    orientationDocumentId: DOC_ID,
    worlds: [],
    rules: { ruleSetId: RULE_ID, rootHash: HASH_B, revision: 1, engine: ENGINE },
    entries: [
      {
        documentId: DOC_ID,
        revision: 1,
        path: 'orientation.md',
        objectHash: HASH_A,
        kind: 'orientation',
        authority: 'canon',
        visibility: 'player-known',
        activation: 'initial-canon',
      },
    ],
    ...overrides,
  };
}

function ruleManifest(overrides = {}) {
  return {
    format: 'offscreen.rule-package-manifest.v1',
    ruleSetId: RULE_ID,
    title: 'Rules',
    revision: 1,
    previousRootHash: null,
    authorOperationId: OP_ID,
    orientationDocumentId: DOC_ID,
    engine: ENGINE,
    license: {
      name: 'SRD',
      source: 'https://example.com/srd',
      attribution: 'Fixture',
    },
    entries: [
      {
        documentId: DOC_ID,
        revision: 1,
        path: 'rules/orientation.md',
        objectHash: HASH_B,
        kind: 'orientation',
        authority: 'canon',
        visibility: 'player-known',
        sourceBytes: 32,
        topics: ['orientation'],
        sections: [],
      },
    ],
    ...overrides,
  };
}

function storeFor(start, rules) {
  const calls = [];
  return {
    calls,
    async readStartPackageManifest(hash) {
      calls.push(['readStartPackageManifest', hash]);
      if (start instanceof Error) throw start;
      return start;
    },
    async readRulePackageManifest(hash) {
      calls.push(['readRulePackageManifest', hash]);
      if (rules instanceof Error) throw rules;
      return rules;
    },
    async putStartPackageManifest() {
      throw new Error('put-invoked');
    },
    async ensureBucket() {
      throw new Error('ensure-invoked');
    },
  };
}

function verify(manifest, store, expected = {}) {
  return verifyPinnedFixture({
    manifest,
    expectedReleaseSha: expected.releaseSha ?? RELEASE,
    expectedBucket: expected.bucket ?? 'lab-objects',
    store,
  });
}

test('matching pins verify as an injected-store receipt', async () => {
  const store = storeFor(startManifest(), ruleManifest());
  const result = await verify(pin(), store);
  assert.deepEqual(result, {
    verified: true,
    bucket: 'lab-objects',
    releaseSha: RELEASE,
    startRootHash: HASH_A,
    rulesRootHash: HASH_B,
    evidence: 'injected-readonly-store',
  });
  assert.notEqual(result.evidence, 'kind-cross-pod');
  assert.deepEqual(store.calls, [
    ['readStartPackageManifest', HASH_A],
    ['readRulePackageManifest', HASH_B],
  ]);
  assert.equal(JSON.stringify(result).includes('orientation'), false);
});

test('rejects malformed hashes, ids, schema and extra keys', async () => {
  const store = storeFor(startManifest(), ruleManifest());
  const cases = [
    pin({ releaseSha: 'ABC' }),
    pin({ start: { startPackageId: 'not-a-uuid', rootHash: HASH_A, revision: 1 } }),
    pin({ schema: 'other' }),
    { ...pin(), extra: true },
  ];
  for (const manifest of cases) {
    const result = await verify(manifest, store);
    assert.equal(result.status, 'FAIL');
    assert.equal(result.code, 'malformed-pin');
  }
  assert.equal(store.calls.length, 0);
});

test('rejects a release or bucket that differs from the injected expectation', async () => {
  const store = storeFor(startManifest(), ruleManifest());
  const wrongRelease = await verify(pin(), store, { releaseSha: 'd'.repeat(40) });
  const wrongBucket = await verify(pin(), store, { bucket: 'other-bucket' });
  assert.equal(wrongRelease.code, 'release-or-bucket-mismatch');
  assert.equal(wrongBucket.code, 'release-or-bucket-mismatch');
  assert.equal(store.calls.length, 0);
});

test('rejects start, rule and engine identity mismatches', async () => {
  const cases = [
    startManifest({ startPackageId: '55555555-5555-4555-8555-555555555555' }),
    startManifest({ revision: 2, previousRootHash: HASH_A }),
    startManifest({
      rules: { ruleSetId: RULE_ID, rootHash: HASH_B, revision: 1, engine: { adapterId: 'other', adapterVersion: 1 } },
    }),
  ];
  for (const start of cases) {
    const result = await verify(pin(), storeFor(start, ruleManifest()));
    assert.equal(result.code, 'start-identity-mismatch');
  }
  const rules = await verify(
    pin(),
    storeFor(startManifest(), ruleManifest({ revision: 2, previousRootHash: HASH_B })),
  );
  assert.equal(rules.code, 'rules-identity-mismatch');
});

test('rejects worlds and executable obligations', async () => {
  const worlds = await verify(
    pin(),
    storeFor(
      startManifest({
        worlds: [
          {
            worldId: '66666666-6666-4666-8666-666666666666',
            rootHash: HASH_A,
            revision: 1,
            mount: 'vvardenfell',
          },
        ],
      }),
      ruleManifest(),
    ),
  );
  assert.equal(worlds.code, 'worlds-present');

  const obligation = await verify(
    pin(),
    storeFor(
      startManifest({
        entries: [
          ...startManifest().entries,
          {
            documentId: '77777777-7777-4777-8777-777777777777',
            revision: 1,
            path: 'obligations/wake.json',
            objectHash: HASH_B,
            kind: 'world-obligation',
            authority: 'canon',
            visibility: 'storyteller-private',
            activation: 'executable-obligation',
          },
        ],
      }),
      ruleManifest(),
    ),
  );
  assert.equal(obligation.code, 'executable-obligation');
  assert.equal(JSON.stringify(obligation).includes('wake.json'), false);
});

test('missing, corrupt and unavailable reads stay typed and content-free', async () => {
  const missing = await verify(pin(), storeFor(Object.assign(new Error('missing'), { code: 'missing' }), ruleManifest()));
  assert.equal(missing.status, 'FAIL');
  assert.equal(missing.code, 'missing-object');

  const corrupt = await verify(pin(), storeFor({ leaked: 'secret-body' }, ruleManifest()));
  assert.equal(corrupt.code, 'corrupt-object');
  assert.equal(JSON.stringify(corrupt).includes('secret-body'), false);

  let reads = 0;
  const delayed = {
    async readStartPackageManifest() {
      reads += 1;
      if (reads === 1) {
        throw Object.assign(new Error('later'), { code: 'unavailable' });
      }
      return startManifest();
    },
    async readRulePackageManifest() {
      return ruleManifest();
    },
  };
  const blocked = await verify(pin(), delayed);
  assert.equal(blocked.status, 'BLOCKED');
  assert.equal(blocked.code, 'store-unavailable');
  const stillBlocked = await verify(pin(), {});
  assert.equal(stillBlocked.status, 'BLOCKED');
});

test('a fake store cannot be reported as kind-cross-pod', async () => {
  const result = await verify(pin(), storeFor(startManifest(), ruleManifest()));
  assert.equal(result.verified, true);
  assert.equal(result.evidence, 'injected-readonly-store');
  assert.equal(Object.hasOwn(result, 'kind'), false);
});
