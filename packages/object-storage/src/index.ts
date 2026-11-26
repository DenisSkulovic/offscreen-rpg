export { LocalObjectStorage } from './local-object-storage.js';
export {
  maximumObjectBytes,
  ObjectStorageError,
  assertObjectKey,
  readBoundedBody,
  type ObjectStorage,
  type ObjectStorageErrorCode,
  type PutIfAbsentResult,
} from './object-storage.js';
export {
  S3ObjectStorage,
  type S3Client,
  type S3ObjectStorageConfig,
} from './s3-object-storage.js';
export { runInjectedScopedProof } from './proof-matrix.js';
