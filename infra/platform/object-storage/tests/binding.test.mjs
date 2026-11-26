import assert from 'node:assert/strict';
import test from 'node:test';
import {
  localObjectStorageBinding,
  validateObjectStorageBinding,
} from '../binding.mjs';

test('localObjectStorageBinding returns canonical local binding', () => {
  const binding = localObjectStorageBinding({
    bucket: 'offscreen-dev-1',
    endpoint:
      'http://object-store.offscreen-dev-objects.svc.cluster.local:8333',
    secretName: 'dev-1-s3',
  });
  assert.equal(binding.bucket, 'offscreen-dev-1');
  assert.equal(binding.region, 'us-east-1');
  assert.equal(binding.forcePathStyle, true);
  assert.equal(binding.credentials.mode, 'secret');
  assert.equal(binding.credentials.secretName, 'dev-1-s3');
  assert.deepEqual(validateObjectStorageBinding(binding), binding);
});

test('external https binding with default-chain credentials is accepted', () => {
  const binding = validateObjectStorageBinding({
    bucket: 'hosted-bucket',
    region: 'eu-west-1',
    endpoint: 'https://s3.example.com',
    forcePathStyle: false,
    credentials: { mode: 'default-chain' },
  });
  assert.equal(binding.credentials.mode, 'default-chain');
  assert.equal(binding.endpoint, 'https://s3.example.com');
});

test('omitted endpoint secret-mode binding is accepted', () => {
  const binding = validateObjectStorageBinding({
    bucket: 'data-only',
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { mode: 'secret', secretName: 'game-s3' },
  });
  assert.equal(binding.endpoint, undefined);
});

test('missing bucket throws', () => {
  assert.throws(
    () =>
      validateObjectStorageBinding({
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: { mode: 'secret', secretName: 'game-s3' },
      }),
    /bucket is required/,
  );
});

test('unknown key throws', () => {
  assert.throws(
    () =>
      validateObjectStorageBinding({
        bucket: 'lab-objects',
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: { mode: 'secret', secretName: 'game-s3' },
        s3Secret: 'legacy',
      }),
    /unknown objectStorage key: s3Secret/,
  );
});

test('secret value material throws', () => {
  assert.throws(
    () =>
      validateObjectStorageBinding({
        bucket: 'lab-objects',
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: {
          mode: 'secret',
          secretName: 'game-s3',
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        },
      }),
    /accessKeyId is not permitted/,
  );
});

test('half credentials throw', () => {
  assert.throws(
    () =>
      validateObjectStorageBinding({
        bucket: 'lab-objects',
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: { mode: 'secret' },
      }),
    /secretName is required/,
  );
  assert.throws(
    () =>
      validateObjectStorageBinding({
        bucket: 'lab-objects',
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: { mode: 'default-chain', secretName: 'game-s3' },
      }),
    /not valid for default-chain/,
  );
});
