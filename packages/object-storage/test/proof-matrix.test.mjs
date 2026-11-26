import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ObjectStorageError,
  S3ObjectStorage,
  runInjectedScopedProof,
} from '../dist/index.js';

function forbidden() {
  const error = new Error('Forbidden');
  error.name = 'Forbidden';
  error.$metadata = { httpStatusCode: 403 };
  return error;
}

function notFound() {
  const error = new Error('NoSuchKey');
  error.name = 'NoSuchKey';
  error.$metadata = { httpStatusCode: 404 };
  return error;
}

function preconditionFailed() {
  const error = new Error('PreconditionFailed');
  error.name = 'PreconditionFailed';
  error.$metadata = { httpStatusCode: 412 };
  return error;
}

/**
 * One in-memory store keyed by object key. Each entry records which identity wrote it.
 * PutObject marks the key present synchronously before any await so parallel races resolve.
 */
function createInjectedClients() {
  /** @type {Map<string, { body: Buffer, owner: 'own' | 'other' }>} */
  const objects = new Map();

  /**
   * @param {'own' | 'other'} identity
   * @param {string} bucket
   */
  function makeClient(identity, bucket) {
    return {
      async send(command) {
        const name = command.constructor.name;
        if (name === 'HeadBucketCommand') {
          assert.equal(command.input.Bucket, bucket);
          return {};
        }
        const key = command.input.Key;
        assert.equal(command.input.Bucket, bucket);
        if (name === 'PutObjectCommand') {
          assert.equal(command.input.IfNoneMatch, '*');
          if (objects.has(key)) {
            throw preconditionFailed();
          }
          objects.set(key, {
            body: Buffer.from(command.input.Body),
            owner: identity,
          });
          return {};
        }
        if (name === 'GetObjectCommand') {
          const entry = objects.get(key);
          if (!entry) throw notFound();
          if (entry.owner !== identity) throw forbidden();
          const bytes = entry.body;
          return {
            Body: (async function* () {
              yield bytes;
            })(),
          };
        }
        if (name === 'HeadObjectCommand') {
          const entry = objects.get(key);
          if (!entry) throw notFound();
          if (entry.owner !== identity) throw forbidden();
          return {};
        }
        throw new Error(`unexpected ${name}`);
      },
    };
  }

  const deniedClient = {
    async send() {
      throw forbidden();
    },
  };

  const owner = new S3ObjectStorage({
    bucket: 'own',
    region: 'us-east-1',
    client: makeClient('own', 'own'),
  });
  const stranger = new S3ObjectStorage({
    bucket: 'other',
    region: 'us-east-1',
    client: makeClient('other', 'other'),
  });
  const denied = new S3ObjectStorage({
    bucket: 'denied',
    region: 'us-east-1',
    client: deniedClient,
  });

  return { objects, owner, stranger, denied };
}

test('runInjectedScopedProof exercises scoped access matrix with injected clients', async () => {
  const { objects, owner, stranger, denied } = createInjectedClients();
  const keyPrefix = 'proof/0123456789abcdef/';
  /** @type {string[]} */
  const deleteCalls = [];

  const deleteOwned = async (key) => {
    assert.ok(
      key.startsWith(keyPrefix),
      `deleteOwned refused non-prefix key: ${key}`,
    );
    deleteCalls.push(key);
    const entry = objects.get(key);
    if (entry?.owner === 'own') {
      objects.delete(key);
    }
    if (entry?.owner === 'other') {
      objects.delete(key);
    }
  };

  const result = await runInjectedScopedProof({
    owner,
    stranger,
    denied,
    keyPrefix,
    deleteOwned,
  });

  assert.equal(result.duplicate, 'already-exists');
  assert.equal(result.readback, 'alpha');
  assert.equal(result.missing, 'missing');
  assert.equal(result.strangerRead, 'denied');
  assert.equal(result.ownerCrossRead, 'denied');
  assert.equal(result.deniedHead, 'unavailable');
  assert.equal(result.raceWritten, 1);
  assert.equal(result.raceAlreadyExists, 7);
  assert.ok(/^w[0-7]$/.test(result.raceWinner));
  assert.equal(result.grant, 'unsupported');
  assert.deepEqual(result.deleted, [
    `${keyPrefix}object.bin`,
    `${keyPrefix}stranger.bin`,
    `${keyPrefix}race.bin`,
  ]);
  assert.deepEqual(deleteCalls, result.deleted);
  assert.equal(objects.has(`${keyPrefix}object.bin`), false);
  assert.equal(objects.has(`${keyPrefix}race.bin`), false);
});

test('runInjectedScopedProof refuses bad prefix before deleteOwned', async () => {
  const { owner, stranger, denied } = createInjectedClients();
  /** @type {string[]} */
  const deleteCalls = [];
  const deleteOwned = async (key) => {
    deleteCalls.push(key);
  };

  await assert.rejects(
    () =>
      runInjectedScopedProof({
        owner,
        stranger,
        denied,
        keyPrefix: 'other/',
        deleteOwned,
      }),
    (error) =>
      error instanceof Error && error.message === 'proof key prefix refused',
  );
  assert.equal(deleteCalls.length, 0);
});
