# LIB05 | Current source and responsibility map

**Inspected:** repository snapshot at 484fd4a0; remote post-LIB02 schema split at abdce8d7. Storage file structure unchanged by LIB02.

| Current anchor | Ownership decision |
| --- | --- |
| `packages/documents/src/s3-store.ts`: `S3DocumentStore`, `S3DocumentStoreConfig`, `objectKey`, `readBodyString`, `isNotFound`, `isPreconditionFailed`, `isAlreadyOwned`, `ensureBucket`, `putValidated/readRaw/readValidated` | Move raw S3 client setup, Head/Get/IfNoneMatch Put, bucket helper and error detection to `packages/object-storage/src/s3-object-storage.ts`; keep `objectKey` JSON SHA namespace, canonical serialization, schema/hash verification, type-specific methods in Documents facade |
| `packages/documents/src/local-store.ts`: `durableExclusiveWrite`, `LocalDocumentStore`, `DocumentStorageError`, `maximumStoredObjectBytes`, `DocumentStore` | Move byte-level atomic local persistence to `packages/object-storage/src/local-object-storage.ts`; keep `DocumentStorageError` public, 1MiB doc cap and typed API in Documents. Move object-key-to-path mapping only if identical suffix and root preserved |
| `packages/documents/src/document-store-config.ts`: `createDocumentStoreFromEnv` and OFFSCREEN_DOCUMENT_S3_* env | Stay Documents composition root initially, unchanged public config/selection/fail-closed behavior |
| `packages/documents/src/canonical-json.ts`: canonicalJson, sha256 | Stay Documents. Raw store need not import either |
| `packages/documents/src/schema.ts`, `hash-schema.ts`, `scene-checkpoint-schema.ts`, `package-reference-schema.ts` | Stay Documents; no wire change |
| `packages/documents/src/index.ts`, `packages/documents/package.json` | Keep old public exports, add direct dependency `@offscreen/object-storage`; AWS SDK dependency moves solely to new workspace when no other Documents code imports SDK |
| `packages/documents/test/documents.test.mjs`, `library-v2-store.test.mjs`, `s3-store.live.test.mjs` | Keep typed document tests; add raw transport tests in object-storage package with conditional-put, corrupt/oversize, missing/unavailable, path traversal and bucket helper cases |
| `apps/api`, `apps/game-authority`, `apps/worker`, `tools/chamber`, `tools/api-integration` | Keep using Documents facade and current environment config; no runtime manifest changes |

## API outline
`ObjectStorageError.code: 'missing'|'unavailable'|'too-large'|'invalid-key'|'conflict'`. `ObjectStorage`: `putIfAbsent(key:string, bytes:Uint8Array, contentType:string):Promise<'written'|'already-exists'>`, `get(key:string,maxBytes:number):Promise<Uint8Array>`, `exists(key:string):Promise<boolean>`. `LocalObjectStorage(root)` and `S3ObjectStorage({bucket,region,endpoint?,forcePathStyle?,prefix?,credentials?,client?})`; bootstrap `ensureBucket` only on S3 adapter, not generalized mandatory interface. Bounded get/put hard 32 MiB, Documents always enforces 1MiB. Verify duplicate content in Documents because raw store reports only existence; do not confuse same-key identity with actual equality.

**Important compatibility:** S3 key prefix normalization, existing JSON suffix, S3 SDK client injection, local staged filename, durability and conditional collision behavior are presently part of user-visible storage semantics. Preserve them.
