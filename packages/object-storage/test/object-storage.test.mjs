import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  symlink,
  writeFile,
  chmod,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  S3ObjectStorage,
  LocalObjectStorage,
  ObjectStorageError,
  readBoundedBody,
} from '../dist/index.js';

test('local put is exclusive and rejects traversal before disk access', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-object-'));
  const storage = new LocalObjectStorage(root);
  const first = Buffer.from('alpha');
  const second = Buffer.from('beta');
  const [a, b] = await Promise.all([
    storage.putIfAbsent(
      'objects/sha256/aa/one.bin',
      first,
      'application/octet-stream',
    ),
    storage.putIfAbsent(
      'objects/sha256/aa/one.bin',
      second,
      'application/octet-stream',
    ),
  ]);
  assert.deepEqual([a, b].sort(), ['already-exists', 'written']);
  const stored = await storage.get('objects/sha256/aa/one.bin', 16);
  assert.ok(
    stored.byteLength === first.byteLength ||
      stored.byteLength === second.byteLength,
  );
  const text = Buffer.from(stored).toString('utf8');
  assert.ok(text === 'alpha' || text === 'beta');
  const again = Buffer.from(text);
  assert.deepEqual(
    Buffer.from(await storage.get('objects/sha256/aa/one.bin', 16)),
    again,
  );
  assert.equal(await storage.exists('objects/sha256/aa/one.bin'), true);
  assert.equal(await storage.exists('objects/sha256/aa/missing.bin'), false);
  await assert.rejects(
    () => storage.putIfAbsent('../secret', first, 'application/octet-stream'),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'invalid-key',
  );
  await assert.rejects(
    () => storage.get('a/../../etc/passwd', 32),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'invalid-key',
  );
  await assert.rejects(
    () => storage.get('objects/sha256/aa/missing.bin', 32),
    (error) => error instanceof ObjectStorageError && error.code === 'missing',
  );
  const big = join(root, 'objects', 'sha256', 'bb', 'big.bin');
  await storage.putIfAbsent(
    'objects/sha256/bb/big.bin',
    Buffer.from('0123456789'),
    'application/octet-stream',
  );
  await assert.rejects(
    () => storage.get('objects/sha256/bb/big.bin', 4),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'too-large',
  );
  assert.equal(await readFile(big, 'utf8'), '0123456789');
});

test('local get returns exact bounds and refuses symlink, directory, and unread oversize', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-object-bounds-'));
  const storage = new LocalObjectStorage(root);
  await storage.putIfAbsent(
    'objects/empty.bin',
    Buffer.alloc(0),
    'application/octet-stream',
  );
  assert.deepEqual(await storage.get('objects/empty.bin', 1), new Uint8Array());
  const exact = Buffer.from('abcd');
  await storage.putIfAbsent(
    'objects/exact.bin',
    exact,
    'application/octet-stream',
  );
  assert.deepEqual(
    Buffer.from(await storage.get('objects/exact.bin', 4)),
    exact,
  );

  const oversized = Buffer.alloc(70 * 1024, 7);
  await storage.putIfAbsent(
    'objects/over.bin',
    oversized,
    'application/octet-stream',
  );
  await assert.rejects(
    () => storage.get('objects/over.bin', 4),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'too-large',
  );

  await writeFile(join(root, 'secret.bin'), Buffer.from('secret-bytes'));
  await symlink(join(root, 'secret.bin'), join(root, 'link.bin'));
  await assert.rejects(
    () => storage.get('link.bin', 64),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'unavailable',
  );

  await mkdir(join(root, 'objects', 'dir.bin'));
  await assert.rejects(
    () => storage.get('objects/dir.bin', 64),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'unavailable',
  );

  if (process.getuid() !== 0) {
    await chmod(join(root, 'objects', 'exact.bin'), 0o000);
    await assert.rejects(
      () => storage.get('objects/exact.bin', 4),
      (error) =>
        error instanceof ObjectStorageError && error.code === 'unavailable',
    );
  }

  const source = await readFile(
    new URL('../src/local-object-storage.ts', import.meta.url),
    'utf8',
  );
  const getSource = source.slice(
    source.indexOf('async get('),
    source.indexOf('async exists('),
  );
  assert.equal(getSource.includes('readFile'), false);
  assert.match(source, /maxBytes \+ 1 - total/);
  assert.match(source, /readChunkBytes = 64 \* 1024/);
});

test('bounded body stops a chunked stream without transformToString', async () => {
  let transformed = false;
  const body = {
    transformToString() {
      transformed = true;
      return Promise.resolve('x'.repeat(1000));
    },
    async *[Symbol.asyncIterator]() {
      yield new Uint8Array([1, 2, 3]);
      yield new Uint8Array([4, 5, 6, 7]);
    },
  };
  await assert.rejects(
    () => readBoundedBody(body, 5),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'too-large',
  );
  assert.equal(transformed, false);
  const exact = await readBoundedBody(new Uint8Array([9, 8, 7]), 3);
  assert.deepEqual(exact, new Uint8Array([9, 8, 7]));
  await assert.rejects(
    () => readBoundedBody('abcdef', 3),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'too-large',
  );
});

test('S3 adapter keeps conditional put, path style and bounded get', async () => {
  const objects = new Map();
  const commands = [];
  const client = {
    async send(command) {
      commands.push(command);
      const name = command.constructor.name;
      const key = command.input.Key;
      if (name === 'PutObjectCommand') {
        assert.equal(command.input.IfNoneMatch, '*');
        assert.equal(command.input.ContentType, 'application/octet-stream');
        if (objects.has(key)) {
          const error = new Error('PreconditionFailed');
          error.name = 'PreconditionFailed';
          error.$metadata = { httpStatusCode: 412 };
          throw error;
        }
        objects.set(key, Buffer.from(command.input.Body));
        return {};
      }
      if (name === 'GetObjectCommand') {
        if (!objects.has(key)) {
          const error = new Error('NoSuchKey');
          error.name = 'NoSuchKey';
          error.$metadata = { httpStatusCode: 404 };
          throw error;
        }
        const bytes = objects.get(key);
        return {
          Body: (async function* () {
            yield bytes.subarray(0, 2);
            yield bytes.subarray(2);
          })(),
        };
      }
      if (name === 'HeadObjectCommand') {
        if (!objects.has(key)) {
          const error = new Error('NoSuchKey');
          error.name = 'NoSuchKey';
          error.$metadata = { httpStatusCode: 404 };
          throw error;
        }
        return {};
      }
      if (name === 'HeadBucketCommand') {
        const error = new Error('NoSuchBucket');
        error.name = 'NoSuchBucket';
        error.$metadata = { httpStatusCode: 404 };
        throw error;
      }
      if (name === 'CreateBucketCommand') return {};
      throw new Error(`unexpected ${name}`);
    },
  };
  const storage = new S3ObjectStorage({
    bucket: 'lab',
    region: 'us-east-1',
    endpoint: 'http://127.0.0.1:9090',
    forcePathStyle: true,
    prefix: 'tenant/',
    client,
  });
  assert.equal(
    await storage.putIfAbsent(
      'objects/sha256/ab/hash.bin',
      Buffer.from('wxyz'),
      'application/octet-stream',
    ),
    'written',
  );
  assert.equal(
    await storage.putIfAbsent(
      'objects/sha256/ab/hash.bin',
      Buffer.from('nope'),
      'application/octet-stream',
    ),
    'already-exists',
  );
  assert.equal(
    objects.get('tenant/objects/sha256/ab/hash.bin').toString('utf8'),
    'wxyz',
  );
  assert.equal(
    Buffer.from(await storage.get('objects/sha256/ab/hash.bin', 4)).toString(
      'utf8',
    ),
    'wxyz',
  );
  await assert.rejects(
    () => storage.get('objects/sha256/ab/hash.bin', 3),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'too-large',
  );
  assert.equal(await storage.exists('objects/sha256/ab/hash.bin'), true);
  assert.equal(await storage.exists('objects/sha256/ab/missing.bin'), false);
  await assert.rejects(
    () => storage.get('objects/sha256/ab/missing.bin', 8),
    (error) => error instanceof ObjectStorageError && error.code === 'missing',
  );
  await storage.ensureBucket();
  assert.ok(
    commands.some(
      (command) => command.constructor.name === 'HeadBucketCommand',
    ),
  );
  assert.ok(
    commands.some((command) => command.constructor.name === 'PutObjectCommand'),
  );
  assert.ok(
    commands.some(
      (command) => command.constructor.name === 'HeadObjectCommand',
    ),
  );
  const down = new S3ObjectStorage({
    bucket: 'lab',
    region: 'us-east-1',
    client: {
      async send() {
        const error = new Error('offline');
        error.$metadata = { httpStatusCode: 500 };
        throw error;
      },
    },
  });
  await assert.rejects(
    () => down.get('objects/a.bin', 8),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'unavailable',
  );
});

test('requireBucket uses HeadBucket only and maps denial to unavailable', async () => {
  const commands = [];
  const client = {
    async send(command) {
      commands.push(command);
      const name = command.constructor.name;
      if (name === 'HeadBucketCommand') {
        const error = new Error('NoSuchBucket');
        error.name = 'NoSuchBucket';
        error.$metadata = { httpStatusCode: 404 };
        throw error;
      }
      throw new Error(`unexpected ${name}`);
    },
  };
  const storage = new S3ObjectStorage({
    bucket: 'lab',
    region: 'us-east-1',
    client,
  });
  await assert.rejects(
    () => storage.requireBucket(),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'unavailable',
  );
  assert.equal(
    commands.filter((c) => c.constructor.name === 'HeadBucketCommand').length,
    1,
  );
  assert.equal(
    commands.filter((c) => c.constructor.name === 'CreateBucketCommand').length,
    0,
  );

  const denied = [];
  const deniedClient = {
    async send(command) {
      denied.push(command);
      const error = new Error('Forbidden');
      error.name = 'Forbidden';
      error.$metadata = { httpStatusCode: 403 };
      throw error;
    },
  };
  const deniedStorage = new S3ObjectStorage({
    bucket: 'lab',
    region: 'us-east-1',
    client: deniedClient,
  });
  await assert.rejects(
    () => deniedStorage.requireBucket(),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'unavailable',
  );
  assert.equal(
    denied.filter((c) => c.constructor.name === 'CreateBucketCommand').length,
    0,
  );

  const okCommands = [];
  const okClient = {
    async send(command) {
      okCommands.push(command);
      if (command.constructor.name !== 'HeadBucketCommand') {
        throw new Error(`unexpected ${command.constructor.name}`);
      }
      return {};
    },
  };
  await new S3ObjectStorage({
    bucket: 'lab',
    region: 'us-east-1',
    client: okClient,
  }).requireBucket();
  assert.equal(
    okCommands.filter((c) => c.constructor.name === 'CreateBucketCommand')
      .length,
    0,
  );
});

test('ensureBucket rejects BucketAlreadyExists and get maps 403 to unavailable', async () => {
  const createCommands = [];
  const createClient = {
    async send(command) {
      createCommands.push(command);
      const name = command.constructor.name;
      if (name === 'HeadBucketCommand') {
        const error = new Error('NoSuchBucket');
        error.name = 'NoSuchBucket';
        error.$metadata = { httpStatusCode: 404 };
        throw error;
      }
      if (name === 'CreateBucketCommand') {
        const error = new Error('Bucket already exists');
        error.name = 'BucketAlreadyExists';
        throw error;
      }
      throw new Error(`unexpected ${name}`);
    },
  };
  await assert.rejects(
    () =>
      new S3ObjectStorage({
        bucket: 'lab',
        region: 'us-east-1',
        client: createClient,
      }).ensureBucket(),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'unavailable',
  );

  const forbiddenClient = {
    async send(command) {
      if (command.constructor.name === 'GetObjectCommand') {
        const error = new Error('Forbidden');
        error.name = 'Forbidden';
        error.$metadata = { httpStatusCode: 403 };
        throw error;
      }
      throw new Error(`unexpected ${command.constructor.name}`);
    },
  };
  await assert.rejects(
    () =>
      new S3ObjectStorage({
        bucket: 'lab',
        region: 'us-east-1',
        client: forbiddenClient,
      }).get('objects/a.bin', 8),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'unavailable',
  );
});

test('putIfAbsent maps HTTP 409 to unavailable without overwrite', async () => {
  const objects = new Map([['held.bin', Buffer.from('prior')]]);
  const putCommands = [];
  const client = {
    async send(command) {
      const name = command.constructor.name;
      if (name === 'PutObjectCommand') {
        putCommands.push(command);
        assert.equal(command.input.IfNoneMatch, '*');
        const error = new Error('Conflict');
        error.name = 'Conflict';
        error.$metadata = { httpStatusCode: 409 };
        throw error;
      }
      throw new Error(`unexpected ${name}`);
    },
  };
  const storage = new S3ObjectStorage({
    bucket: 'lab',
    region: 'us-east-1',
    client,
  });
  await assert.rejects(
    () => storage.putIfAbsent('held.bin', Buffer.from('new'), 'text/plain'),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'unavailable',
  );
  assert.equal(putCommands.length, 1);
  assert.deepEqual(objects.get('held.bin'), Buffer.from('prior'));
});

test('oversize stream and bad keys never touch the client', async () => {
  let sent = false;
  const storage = new S3ObjectStorage({
    bucket: 'lab',
    region: 'us-east-1',
    client: {
      async send() {
        sent = true;
        return { Body: null };
      },
    },
  });
  await assert.rejects(
    () => storage.get('..\\secret', 8),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'invalid-key',
  );
  await assert.rejects(
    () => storage.putIfAbsent('a/./b', Buffer.from('x'), 'text/plain'),
    (error) =>
      error instanceof ObjectStorageError && error.code === 'invalid-key',
  );
  assert.equal(sent, false);
  const nullBody = new S3ObjectStorage({
    bucket: 'lab',
    region: 'us-east-1',
    client: {
      async send() {
        return { Body: null };
      },
    },
  });
  await assert.rejects(
    () => nullBody.get('a.bin', 8),
    (error) => {
      return (
        error instanceof ObjectStorageError &&
        error.code === 'unavailable' &&
        error.cause instanceof Error &&
        error.cause.message === 'empty-object-body'
      );
    },
  );
});
