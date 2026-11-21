/**
 * WR09A: private CAS envelope for durable writer provider responses.
 * Legacy result_cas_hash remains SHA256(serializedResponse); this object is a
 * separate immutable pointer for strict provider replay.
 */
import { z } from 'zod';
import {
  canonicalJson,
  canonicalStructuredDocumentSchema,
  contentHashSchema,
  maximumStoredObjectBytes,
  type CanonicalStructuredDocument,
  type DocumentStore,
} from '@offscreen/documents';
import { hashWriterMissionSerializedResponse } from './writer-mission-custody';

export const WRITER_PROVIDER_RESPONSE_SCHEMA_ID =
  'writer-provider-response.v1' as const;

const writerProviderResponseDataSchema = z.strictObject({
  missionId: z.uuid(),
  contextId: z.uuid(),
  ordinal: z.number().int().positive(),
  attemptId: z.uuid(),
  requestSha256: contentHashSchema,
  responseSha256: contentHashSchema,
  serializedResponse: z.string(),
});

export type WriterProviderResponseIdentity = {
  missionId: string;
  contextId: string;
  ordinal: number;
  attemptId: string;
  requestSha256: string;
};

export class WriterProviderResponseError extends Error {
  constructor(
    public readonly code:
      | 'response_too_large'
      | 'identity_mismatch'
      | 'schema_mismatch'
      | 'response_digest_mismatch'
      | 'storage_mismatch'
      | 'missing_pointer',
  ) {
    super(code);
  }
}

function buildProviderResponseDocument(
  identity: WriterProviderResponseIdentity,
  serializedResponse: string,
  responseSha256: string,
): CanonicalStructuredDocument {
  return {
    format: 'offscreen.structured-document.v1',
    envelope: {
      documentId: identity.attemptId,
      schemaVersion: 1,
      revision: 1,
      kind: 'lore',
      authority: 'noncanonical',
      visibility: 'storyteller-private',
      sources: [],
    },
    schemaId: WRITER_PROVIDER_RESPONSE_SCHEMA_ID,
    data: {
      missionId: identity.missionId,
      contextId: identity.contextId,
      ordinal: identity.ordinal,
      attemptId: identity.attemptId,
      requestSha256: identity.requestSha256,
      responseSha256,
      serializedResponse,
    },
  };
}

function assertCanonicalDocumentFits(document: CanonicalStructuredDocument) {
  const bytes = canonicalJson(
    canonicalStructuredDocumentSchema.parse(document),
  );
  if (Buffer.byteLength(bytes) > maximumStoredObjectBytes) {
    throw new WriterProviderResponseError('response_too_large');
  }
}

function validateReadEnvelope(
  record: CanonicalStructuredDocument,
  identity: WriterProviderResponseIdentity,
) {
  if (
    record.format !== 'offscreen.structured-document.v1' ||
    record.schemaId !== WRITER_PROVIDER_RESPONSE_SCHEMA_ID
  ) {
    throw new WriterProviderResponseError('schema_mismatch');
  }
  const { envelope } = record;
  if (
    envelope.documentId !== identity.attemptId ||
    envelope.schemaVersion !== 1 ||
    envelope.revision !== 1 ||
    envelope.kind !== 'lore' ||
    envelope.authority !== 'noncanonical' ||
    envelope.visibility !== 'storyteller-private' ||
    envelope.sources.length !== 0
  ) {
    throw new WriterProviderResponseError('schema_mismatch');
  }
}

function parseProviderResponseData(
  record: CanonicalStructuredDocument,
  identity: WriterProviderResponseIdentity,
  expectedResponseSha256: string,
): string {
  validateReadEnvelope(record, identity);
  const data = writerProviderResponseDataSchema.safeParse(record.data);
  if (!data.success) {
    throw new WriterProviderResponseError('schema_mismatch');
  }
  const payload = data.data;
  if (
    payload.missionId !== identity.missionId ||
    payload.contextId !== identity.contextId ||
    payload.ordinal !== identity.ordinal ||
    payload.attemptId !== identity.attemptId ||
    payload.requestSha256 !== identity.requestSha256
  ) {
    throw new WriterProviderResponseError('identity_mismatch');
  }
  if (payload.responseSha256 !== expectedResponseSha256) {
    throw new WriterProviderResponseError('response_digest_mismatch');
  }
  const bodyDigest = hashWriterMissionSerializedResponse(
    payload.serializedResponse,
  );
  if (bodyDigest !== expectedResponseSha256) {
    throw new WriterProviderResponseError('response_digest_mismatch');
  }
  return payload.serializedResponse;
}

type WriterProviderResponseStorage = Pick<
  DocumentStore,
  'putStructuredDocument' | 'readStructuredDocument'
>;

/** Persists the private response object and returns its CAS hash after read-back verification. */
export async function putDurableWriterProviderResponse(
  storage: WriterProviderResponseStorage,
  identity: WriterProviderResponseIdentity,
  serializedResponse: string,
): Promise<string> {
  const responseSha256 = hashWriterMissionSerializedResponse(serializedResponse);
  const document = buildProviderResponseDocument(
    identity,
    serializedResponse,
    responseSha256,
  );
  assertCanonicalDocumentFits(document);

  const objectHash = await storage.putStructuredDocument(document);
  const record = await storage.readStructuredDocument(objectHash);
  const roundTrip = parseProviderResponseData(
    record,
    identity,
    responseSha256,
  );
  if (roundTrip !== serializedResponse) {
    throw new WriterProviderResponseError('storage_mismatch');
  }
  return objectHash;
}

/** Reads and validates a stored provider response; returns raw UTF-8 body bytes as string. */
export async function readDurableWriterProviderResponse(
  storage: Pick<DocumentStore, 'readStructuredDocument'>,
  responseObjectHash: string,
  identity: WriterProviderResponseIdentity,
  expectedResponseSha256: string,
): Promise<string> {
  if (!contentHashSchema.safeParse(responseObjectHash).success) {
    throw new WriterProviderResponseError('missing_pointer');
  }
  const record = await storage.readStructuredDocument(responseObjectHash);
  return parseProviderResponseData(record, identity, expectedResponseSha256);
}