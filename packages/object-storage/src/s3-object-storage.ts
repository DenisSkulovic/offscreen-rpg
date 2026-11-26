import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import {
  assertByteCeiling,
  assertObjectKey,
  maximumObjectBytes,
  ObjectStorageError,
  readBoundedBody,
  type ObjectStorage,
  type PutIfAbsentResult,
} from './object-storage.js';

export type { S3Client };

export type S3ObjectStorageConfig = Readonly<{
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  prefix?: string;
  credentials?: Readonly<{ accessKeyId: string; secretAccessKey: string }>;
  client?: S3Client;
}>;

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(config: S3ObjectStorageConfig) {
    if (!config.bucket.trim())
      throw new Error('S3 object storage bucket is required');
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

  /** Runtime access check: bucket must exist and be reachable. */
  async requireBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      throw new ObjectStorageError('unavailable', { cause: error });
    }
  }

  /** Lab/bootstrap only. Not part of the ObjectStorage port. */
  async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch (error) {
      if (!isNotFound(error)) {
        throw new ObjectStorageError('unavailable', { cause: error });
      }
    }
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      throw new ObjectStorageError('unavailable', { cause: error });
    }
  }

  async putIfAbsent(
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<PutIfAbsentResult> {
    if (!contentType.trim()) throw new Error('Object content type is required');
    if (bytes.byteLength > maximumObjectBytes) {
      throw new ObjectStorageError('too-large');
    }
    const storedKey = this.storageKey(key);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storedKey,
          Body: bytes,
          ContentType: contentType,
          IfNoneMatch: '*',
        }),
      );
      return 'written';
    } catch (error) {
      if (isPreconditionFailed(error)) return 'already-exists';
      if (isConflict(error)) {
        throw new ObjectStorageError('unavailable', { cause: error });
      }
      if (error instanceof ObjectStorageError) throw error;
      throw new ObjectStorageError('unavailable', { cause: error });
    }
  }

  async get(key: string, maxBytes: number): Promise<Uint8Array> {
    assertByteCeiling(maxBytes);
    const storedKey = this.storageKey(key);
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storedKey }),
      );
      return await readBoundedBody(response.Body, maxBytes);
    } catch (error) {
      if (error instanceof ObjectStorageError) throw error;
      if (isNotFound(error))
        throw new ObjectStorageError('missing', { cause: error });
      throw new ObjectStorageError('unavailable', { cause: error });
    }
  }

  async exists(key: string): Promise<boolean> {
    const storedKey = this.storageKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: storedKey }),
      );
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw new ObjectStorageError('unavailable', { cause: error });
    }
  }

  private storageKey(key: string) {
    assertObjectKey(key);
    if (!this.prefix) return key;
    const normalized = this.prefix.replace(/\/+$/, '');
    assertObjectKey(normalized);
    return `${normalized}/${key}`;
  }
}

function isS3Exception(error: unknown): error is S3ServiceException {
  return error instanceof S3ServiceException;
}

function isNotFound(error: unknown) {
  if (!isS3Exception(error)) {
    const name = (error as { name?: string }).name;
    const code =
      (error as { Code?: string; code?: string }).Code ??
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

function isConflict(error: unknown) {
  if (isS3Exception(error)) {
    return error.name === 'Conflict' || error.$metadata.httpStatusCode === 409;
  }
  const name = (error as { name?: string }).name;
  const code = (error as { Code?: string }).Code;
  return (
    name === 'Conflict' ||
    code === 'Conflict' ||
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode === 409
  );
}
