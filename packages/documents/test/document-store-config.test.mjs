import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDocumentStoreFromEnv,
  parseDocumentS3ForcePathStyle,
} from '../dist/index.js';

test('parseDocumentS3ForcePathStyle', () => {
  const endpoint = 'http://127.0.0.1:9090';
  assert.equal(parseDocumentS3ForcePathStyle(undefined, endpoint), true);
  assert.equal(parseDocumentS3ForcePathStyle(undefined, undefined), false);
  assert.equal(parseDocumentS3ForcePathStyle('1', undefined), true);
  assert.equal(parseDocumentS3ForcePathStyle('true', undefined), true);
  assert.equal(parseDocumentS3ForcePathStyle('0', endpoint), false);
  assert.equal(parseDocumentS3ForcePathStyle('false', endpoint), false);
  assert.throws(
    () => parseDocumentS3ForcePathStyle('yes', endpoint),
    (error) =>
      error instanceof Error &&
      error.message.includes('OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE'),
  );
});

test('createDocumentStoreFromEnv rejects half S3 credentials', () => {
  assert.throws(
    () =>
      createDocumentStoreFromEnv({
        OFFSCREEN_DOCUMENT_STORE: 's3',
        OFFSCREEN_DOCUMENT_S3_BUCKET: 'lab',
        OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID: 'only-key',
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes('OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID'),
  );
});
