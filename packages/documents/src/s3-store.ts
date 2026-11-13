/**
 * S3-compatible DocumentStore adapter. Same canonical JSON/SHA-256/1 MiB
 * contract as LocalDocumentStore. Object keys: objects/sha256/<ab>/<hash>.json
 */
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import type { z } from 'zod';
import { canonicalJson, sha256 } from './canonical-json.js';
import {
  DocumentStorageError,
  maximumStoredObjectBytes,
  type DocumentStore,
} from './local-store.js';
import {
  canonicalDocumentSchema,
  canonicalSourcePassageSchema,
  canonicalStructuredDocumentSchema,
  contentHashSchema,
  documentManifestSchema,
  rulePackageManifestSchema,
  startPackageManifestSchema,
  worldPackageManifestSchema,
  type CanonicalDocument,
  type CanonicalSourcePassage,
  type CanonicalStructuredDocument,
  type DocumentManifest,
  type RulePackageManifest,
  type StartPackageManifest,
  type WorldPackageManifest,
} from './schema.js';

export type S3DocumentStoreConfig = Readonly<{
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  prefix?: string;
  credentials?: Readonly<{ accessKeyId: string; secretAccessKey: string }>;
  client?: S3Client;
}>;

function objectKey(prefix: string, hash: string) {
  const valid = contentHashSchema.parse(hash);
  const base = `objects/sha256/${valid.slice(0, 2)}/${valid}.json`;
  return prefix ? `${prefix.replace(/\/+$/, '')}/${base}` : base;
}

async function readBodyString(body: unknown): Promise<string> {
  if (body == null) throw new DocumentStorageError('corrupt');
  if (typeof body === 'string') return body;
  if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8');
  if (typeof (body as { transformToString?: unknown }).transformToString === 'function') {
    return (body as { transformToString: () => Promise<string> }).transformToString();
  }
  throw new DocumentStorageError('corrupt');
}

export class S3DocumentStore implements DocumentStore {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(config: S3DocumentStoreConfig) {
    if (!config.bucket.trim()) {
      throw new Error('S3 document store bucket is required');
    }
    this.bucket = config.bucket.trim();
    this.prefix = config.prefix?.trim() ?? '';
    this.client =
      config.client ??
      new S3Client({
        region: config.region,
        ...(config.endpoint ? { endpoint: config.endpoint } : {}),
        forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
        ...(config.credentials
          ? {
              credentials: {
                accessKeyId: config.credentials.accessKeyId,
                secretAccessKey: config.credentials.secretAccessKey,
              },
            }
          : {}),
      });
  }

  /** Ensure the configured private bucket exists (lab/bootstrap only). */
  async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch (error) {
      if (!isNotFound(error)) {
        throw new DocumentStorageError('unavailable', { cause: error });
      }
    }
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (isAlreadyOwned(error)) return;
      throw new DocumentStorageError('unavailable', { cause: error });
    }
  }

  private async putValidated(value: unknown) {
    const bytes = canonicalJson(value);
    if (Buffer.byteLength(bytes) > maximumStoredObjectBytes) {
      throw new DocumentStorageError('too-large');
    }
    const hash = sha256(bytes);
    const key = objectKey(this.prefix, hash);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: bytes,
          ContentType: 'application/json',
          IfNoneMatch: '*',
        }),
      );
    } catch (error) {
      if (isPreconditionFailed(error)) {
        const existing = await this.readRaw(hash);
        if (existing !== bytes || sha256(existing) !== hash) {
          throw new DocumentStorageError('corrupt');
        }
        return hash;
      }
      if (error instanceof DocumentStorageError) throw error;
      throw new DocumentStorageError('unavailable', { cause: error });
    }
    const stored = await this.readRaw(hash);
    if (stored !== bytes || sha256(stored) !== hash) {
      throw new DocumentStorageError('corrupt');
    }
    return hash;
  }

  private async readRaw(hash: string) {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: objectKey(this.prefix, hash),
        }),
      );
      const bytes = await readBodyString(response.Body);
      if (Buffer.byteLength(bytes) > maximumStoredObjectBytes) {
        throw new DocumentStorageError('too-large');
      }
      return bytes;
    } catch (error) {
      if (error instanceof DocumentStorageError) throw error;
      if (isNotFound(error)) {
        throw new DocumentStorageError('missing', { cause: error });
      }
      throw new DocumentStorageError('unavailable', { cause: error });
    }
  }

  private async readValidated<T>(hash: string, schema: z.ZodType<T>): Promise<T> {
    const bytes = await this.readRaw(hash);
    if (sha256(bytes) !== hash) throw new DocumentStorageError('corrupt');
    try {
      return schema.parse(JSON.parse(bytes));
    } catch (error) {
      throw new DocumentStorageError('corrupt', { cause: error });
    }
  }

  putDocument(document: CanonicalDocument) {
    return this.putValidated(canonicalDocumentSchema.parse(document));
  }

  putSourcePassage(passage: CanonicalSourcePassage) {
    return this.putValidated(canonicalSourcePassageSchema.parse(passage));
  }

  putStructuredDocument(document: CanonicalStructuredDocument) {
    return this.putValidated(canonicalStructuredDocumentSchema.parse(document));
  }

  putManifest(manifest: DocumentManifest) {
    return this.putValidated(documentManifestSchema.parse(manifest));
  }

  putWorldPackageManifest(manifest: WorldPackageManifest) {
    return this.putValidated(worldPackageManifestSchema.parse(manifest));
  }

  putRulePackageManifest(manifest: RulePackageManifest) {
    return this.putValidated(rulePackageManifestSchema.parse(manifest));
  }

  putStartPackageManifest(manifest: StartPackageManifest) {
    return this.putValidated(startPackageManifestSchema.parse(manifest));
  }

  readDocument(hash: string) {
    return this.readValidated(hash, canonicalDocumentSchema);
  }

  readSourcePassage(hash: string) {
    return this.readValidated(hash, canonicalSourcePassageSchema);
  }

  readStructuredDocument(hash: string) {
    return this.readValidated(hash, canonicalStructuredDocumentSchema);
  }

  readManifest(hash: string) {
    return this.readValidated(hash, documentManifestSchema);
  }

  readWorldPackageManifest(hash: string) {
    return this.readValidated(hash, worldPackageManifestSchema);
  }

  readRulePackageManifest(hash: string) {
    return this.readValidated(hash, rulePackageManifestSchema);
  }

  readStartPackageManifest(hash: string) {
    return this.readValidated(hash, startPackageManifestSchema);
  }

  async objectExists(hash: string) {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: objectKey(this.prefix, hash),
        }),
      );
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw new DocumentStorageError('unavailable', { cause: error });
    }
  }
}

function isS3Exception(error: unknown): error is S3ServiceException {
  return error instanceof S3ServiceException;
}

function isNotFound(error: unknown) {
  if (!isS3Exception(error)) {
    const name = (error as { name?: string }).name;
    const code = (error as { Code?: string; code?: string }).Code ??
      (error as { code?: string }).code;
    return (
      name === 'NotFound' ||
      name === 'NoSuchKey' ||
      name === 'NoSuchBucket' ||
      code === 'NotFound' ||
      code === 'NoSuchKey' ||
      code === 'NoSuchBucket' ||
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 404
    );
  }
  return (
    error.name === 'NotFound' ||
    error.name === 'NoSuchKey' ||
    error.name === 'NoSuchBucket' ||
    error.$metadata.httpStatusCode === 404
  );
}

function isPreconditionFailed(error: unknown) {
  if (isS3Exception(error)) {
    return (
      error.name === 'PreconditionFailed' ||
      error.$metadata.httpStatusCode === 412
    );
  }
  const name = (error as { name?: string }).name;
  const code = (error as { Code?: string }).Code;
  return (
    name === 'PreconditionFailed' ||
    code === 'PreconditionFailed' ||
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode === 412
  );
}

function isAlreadyOwned(error: unknown) {
  if (!isS3Exception(error)) {
    const code = (error as { Code?: string; name?: string }).Code ??
      (error as { name?: string }).name;
    return code === 'BucketAlreadyOwnedByYou' || code === 'BucketAlreadyExists';
  }
  return (
    error.name === 'BucketAlreadyOwnedByYou' ||
    error.name === 'BucketAlreadyExists'
  );
}
