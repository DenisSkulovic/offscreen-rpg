import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  DocumentStorageError,
  S3DocumentStore,
  canonicalDocumentSchema,
  createDocumentStoreFromEnv,
  sha256,
  canonicalJson,
} from '../dist/index.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

const endpoint =
  process.env.OFFSCREEN_DOCUMENT_S3_ENDPOINT ?? 'http://127.0.0.1:9090';
const accessKeyId =
  process.env.OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID ?? 'offscreen';
const secretAccessKey =
  process.env.OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY ?? 'offscreen';
const defaultBucket =
  process.env.OFFSCREEN_DOCUMENT_S3_BUCKET ?? 'offscreen-cas';

function fixtureDocument() {
  return canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: randomUUID(),
      kind: 'lore',
      schemaVersion: 1,
      revision: 1,
      authority: 'canon',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Shared quay ledger',
    body: 'Three independent readers must see the same sealed note.',
  });
}

async function requireS3Mock() {
  const probe = new S3DocumentStore({
    bucket: defaultBucket,
    region: 'us-east-1',
    endpoint,
    forcePathStyle: true,
    prefix: `probe/${randomUUID()}`,
    credentials: { accessKeyId, secretAccessKey },
  });
  try {
    await probe.ensureBucket();
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 's3mock unavailable';
    throw new Error(
      `ENG05 live S3 proof needs local adobe/s3mock at ${endpoint}: ${reason}`,
    );
  }
}

test('ENG05 live: three independent S3 adapters share verified hashes', async (t) => {
  try {
    await requireS3Mock();
  } catch (error) {
    t.skip(error instanceof Error ? error.message : 's3mock unavailable');
    return;
  }
  const prefix = `cas/${randomUUID()}`;
  const make = () =>
    new S3DocumentStore({
      bucket: defaultBucket,
      region: 'us-east-1',
      endpoint,
      forcePathStyle: true,
      prefix,
      credentials: { accessKeyId, secretAccessKey },
    });
  const writer = make();
  await writer.ensureBucket();
  const readerB = make();
  const readerC = make();
  const document = fixtureDocument();
  const hash = await writer.putDocument(document);
  assert.equal(await writer.putDocument(document), hash);
  assert.deepEqual(await readerB.readDocument(hash), document);
  assert.deepEqual(await readerC.readDocument(hash), document);
  assert.equal(await readerB.objectExists(hash), true);
  // Re-put identical bytes remains idempotent across clients.
  assert.equal(await make().putDocument(document), hash);

  await assert.rejects(
    () => readerB.readDocument(sha256(canonicalJson({ not: 'a document' }))),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'missing',
  );
});

test('ENG05 config: s3 mode fails closed; local default unchanged', async () => {
  assert.equal(createDocumentStoreFromEnv({}), undefined);
  assert.throws(
    () =>
      createDocumentStoreFromEnv({
        OFFSCREEN_DOCUMENT_STORE: 's3',
      }),
    /OFFSCREEN_DOCUMENT_S3_BUCKET/,
  );
  assert.throws(
    () =>
      createDocumentStoreFromEnv({
        OFFSCREEN_DOCUMENT_STORE: 'blob',
      }),
    /Unknown OFFSCREEN_DOCUMENT_STORE/,
  );
});

test('ENG05 live: child process reads hash written by parent', async (t) => {
  try {
    await requireS3Mock();
  } catch (error) {
    t.skip(error instanceof Error ? error.message : 's3mock unavailable');
    return;
  }
  const prefix = `cas/${randomUUID()}`;
  const parent = new S3DocumentStore({
    bucket: defaultBucket,
    region: 'us-east-1',
    endpoint,
    forcePathStyle: true,
    prefix,
    credentials: { accessKeyId, secretAccessKey },
  });
  await parent.ensureBucket();
  const document = fixtureDocument();
  const hash = await parent.putDocument(document);
  const child = await new Promise((resolve, reject) => {
    const script = `
      import { S3DocumentStore } from './dist/index.js';
      const store = new S3DocumentStore({
        bucket: ${JSON.stringify(defaultBucket)},
        region: 'us-east-1',
        endpoint: ${JSON.stringify(endpoint)},
        forcePathStyle: true,
        prefix: ${JSON.stringify(prefix)},
        credentials: {
          accessKeyId: ${JSON.stringify(accessKeyId)},
          secretAccessKey: ${JSON.stringify(secretAccessKey)},
        },
      });
      const doc = await store.readDocument(${JSON.stringify(hash)});
      process.stdout.write(JSON.stringify({ title: doc.title, hash: ${JSON.stringify(hash)} }));
    `;
    const proc = spawn(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        cwd: packageRoot,
        env: process.env,
      },
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`child failed (${code}): ${stderr}`));
        return;
      }
      resolve(JSON.parse(stdout));
    });
  });
  assert.equal(child.hash, hash);
  assert.equal(child.title, document.title);
});
