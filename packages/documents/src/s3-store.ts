/**
 * S3-compatible DocumentStore adapter. Same canonical JSON/SHA-256/1 MiB
 * contract as LocalDocumentStore. Object keys: objects/sha256/<ab>/<hash>.json
 */
import type { z } from 'zod';
import {
  ObjectStorageError,
  S3ObjectStorage,
  type S3Client,
} from '@offscreen/object-storage';
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
  sceneCheckpointSchema,
  startPackageManifestSchema,
  worldPackageManifestSchema,
  libraryNodeV2Schema,
  libraryRootV2Schema,
  type CanonicalDocument,
  type CanonicalSourcePassage,
  type CanonicalStructuredDocument,
  type DocumentManifest,
  type RulePackageManifest,
  type SceneCheckpoint,
  type StartPackageManifest,
  type WorldPackageManifest,
  type LibraryNodeV2,
  type LibraryRootV2,
} from './schema.js';

export type { S3Client };

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

export class S3DocumentStore implements DocumentStore {
  private readonly storage: S3ObjectStorage;
  private readonly prefix: string;

  constructor(config: S3DocumentStoreConfig) {
    this.prefix = config.prefix?.trim() ?? '';
    this.storage = new S3ObjectStorage({
      bucket: config.bucket,
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      ...(config.forcePathStyle === undefined
        ? {}
        : { forcePathStyle: config.forcePathStyle }),
      ...(config.credentials ? { credentials: config.credentials } : {}),
      ...(config.client ? { client: config.client } : {}),
    });
  }

  /** Ensure the configured private bucket exists (lab/bootstrap only). */
  async ensureBucket() {
    try {
      await this.storage.ensureBucket();
    } catch (error) {
      throw mapStorageError(error);
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
      await this.storage.putIfAbsent(
        key,
        Buffer.from(bytes),
        'application/json',
      );
    } catch (error) {
      throw mapStorageError(error);
    }
    const stored = await this.readRaw(hash);
    if (stored !== bytes || sha256(stored) !== hash) {
      throw new DocumentStorageError('corrupt');
    }
    return hash;
  }

  private async readRaw(hash: string) {
    try {
      const raw = await this.storage.get(
        objectKey(this.prefix, hash),
        maximumStoredObjectBytes,
      );
      return Buffer.from(raw).toString('utf8');
    } catch (error) {
      throw mapStorageError(error);
    }
  }

  private async readValidated<T>(
    hash: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
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

  putSceneCheckpoint(checkpoint: SceneCheckpoint) {
    return this.putValidated(sceneCheckpointSchema.parse(checkpoint));
  }

  putLibraryNode(node: LibraryNodeV2) {
    return this.putValidated(libraryNodeV2Schema.parse(node));
  }

  putLibraryRoot(root: LibraryRootV2) {
    return this.putValidated(libraryRootV2Schema.parse(root));
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

  readSceneCheckpoint(hash: string) {
    return this.readValidated(hash, sceneCheckpointSchema);
  }

  readLibraryNode(hash: string) {
    return this.readValidated(hash, libraryNodeV2Schema);
  }

  readLibraryRoot(hash: string) {
    return this.readValidated(hash, libraryRootV2Schema);
  }

  async objectExists(hash: string) {
    try {
      return await this.storage.exists(objectKey(this.prefix, hash));
    } catch (error) {
      throw mapStorageError(error);
    }
  }
}

function mapStorageError(error: unknown): Error {
  if (error instanceof DocumentStorageError) return error;
  if (error instanceof ObjectStorageError) {
    if (error.code === 'missing') {
      return new DocumentStorageError('missing', { cause: error });
    }
    if (error.code === 'too-large') {
      return new DocumentStorageError('too-large', { cause: error });
    }
    const cause = error.cause;
    if (
      cause instanceof Error &&
      (cause.message === 'empty-object-body' ||
        cause.message === 'unreadable-object-body')
    ) {
      return new DocumentStorageError('corrupt', { cause: error });
    }
    return new DocumentStorageError('unavailable', { cause: error });
  }
  return new DocumentStorageError('unavailable', { cause: error });
}
