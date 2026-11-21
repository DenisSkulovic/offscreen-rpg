import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  canonicalStructuredDocumentSchema,
  hashCanonicalJson,
  maximumStoredObjectBytes,
  type CanonicalStructuredDocument,
  type DocumentStore,
} from '@offscreen/documents';
import {
  putDurableWriterProviderResponse,
  readDurableWriterProviderResponse,
  WriterProviderResponseError,
  WRITER_PROVIDER_RESPONSE_SCHEMA_ID,
  type WriterProviderResponseIdentity,
} from './writer-provider-response';
import { hashWriterMissionSerializedResponse } from './writer-mission-custody';

function sampleIdentity(
  overrides: Partial<WriterProviderResponseIdentity> = {},
): WriterProviderResponseIdentity {
  const missionId = overrides.missionId ?? randomUUID();
  return {
    missionId,
    contextId: overrides.contextId ?? missionId,
    ordinal: overrides.ordinal ?? 1,
    attemptId: overrides.attemptId ?? randomUUID(),
    requestSha256:
      overrides.requestSha256 ??
      createHash('sha256').update('request-wire').digest('hex'),
  };
}

function createMemoryStructuredStore(
  options: {
    corruptOnRead?: boolean;
  } = {},
): Pick<DocumentStore, 'putStructuredDocument' | 'readStructuredDocument'> {
  const objects = new Map<string, CanonicalStructuredDocument>();
  return {
    async putStructuredDocument(document) {
      const hash = hashCanonicalJson(
        canonicalStructuredDocumentSchema.parse(document),
      );
      objects.set(hash, structuredClone(document));
      return hash;
    },
    async readStructuredDocument(hash) {
      const doc = objects.get(hash);
      if (!doc) {
        throw new Error('missing');
      }
      if (options.corruptOnRead) {
        return structuredClone({
          ...doc,
          data: {
            ...(doc.data as Record<string, unknown>),
            serializedResponse: 'corrupted-body',
          },
        });
      }
      return structuredClone(doc);
    },
  };
}

test('put/read round-trip preserves identity and response digest', async () => {
  const identity = sampleIdentity();
  const serializedResponse = '{"opening":"Vivec City whispers."}';
  const storage = createMemoryStructuredStore();
  const objectHash = await putDurableWriterProviderResponse(
    storage,
    identity,
    serializedResponse,
  );
  const responseSha256 = hashWriterMissionSerializedResponse(serializedResponse);
  const roundTrip = await readDurableWriterProviderResponse(
    storage,
    objectHash,
    identity,
    responseSha256,
  );
  assert.equal(roundTrip, serializedResponse);
});

test('read rejects wrong attempt identity', async () => {
  const identity = sampleIdentity();
  const serializedResponse = '{"note":"once"}';
  const storage = createMemoryStructuredStore();
  const objectHash = await putDurableWriterProviderResponse(
    storage,
    identity,
    serializedResponse,
  );
  const responseSha256 = hashWriterMissionSerializedResponse(serializedResponse);
  const wrongRequest = {
    ...identity,
    requestSha256: createHash('sha256').update('other-wire').digest('hex'),
  };
  await assert.rejects(
    () =>
      readDurableWriterProviderResponse(
        storage,
        objectHash,
        wrongRequest,
        responseSha256,
      ),
    (error: unknown) => {
      assert.ok(error instanceof WriterProviderResponseError);
      assert.equal(error.code, 'identity_mismatch');
      return true;
    },
  );
});

test('read rejects corrupt CAS payload', async () => {
  const identity = sampleIdentity();
  const serializedResponse = '{"note":"once"}';
  const honest = createMemoryStructuredStore();
  const objectHash = await putDurableWriterProviderResponse(
    honest,
    identity,
    serializedResponse,
  );
  const corrupt = createMemoryStructuredStore({ corruptOnRead: true });
  const record = await honest.readStructuredDocument(objectHash);
  corrupt.putStructuredDocument(record);
  const responseSha256 = hashWriterMissionSerializedResponse(serializedResponse);
  await assert.rejects(
    () =>
      readDurableWriterProviderResponse(
        corrupt,
        objectHash,
        identity,
        responseSha256,
      ),
    (error: unknown) => {
      assert.ok(error instanceof WriterProviderResponseError);
      assert.equal(error.code, 'response_digest_mismatch');
      return true;
    },
  );
});

test('put rejects canonical object larger than 1MiB', async () => {
  const identity = sampleIdentity();
  const padding = 'x'.repeat(maximumStoredObjectBytes);
  const serializedResponse = padding;
  const storage = createMemoryStructuredStore();
  await assert.rejects(
    () => putDurableWriterProviderResponse(storage, identity, serializedResponse),
    (error: unknown) => {
      assert.ok(error instanceof WriterProviderResponseError);
      assert.equal(error.code, 'response_too_large');
      return true;
    },
  );
});

test('envelope uses private writer-provider-response schema', async () => {
  const identity = sampleIdentity();
  const serializedResponse = '{"probe":true}';
  const storage = createMemoryStructuredStore();
  const objectHash = await putDurableWriterProviderResponse(
    storage,
    identity,
    serializedResponse,
  );
  const record = await storage.readStructuredDocument(objectHash);
  assert.equal(record.schemaId, WRITER_PROVIDER_RESPONSE_SCHEMA_ID);
  assert.equal(record.envelope.documentId, identity.attemptId);
  assert.equal(record.envelope.visibility, 'storyteller-private');
});