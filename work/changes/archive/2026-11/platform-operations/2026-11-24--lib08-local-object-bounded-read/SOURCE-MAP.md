# LIB08 | Baseline source facts
- `packages/object-storage/src/local-object-storage.ts`: get performs `stat` then `readFile` and only after read validates `bytes.byteLength`. putIfAbsent already uses staged exclusive file, sync, link; intentionally NOT touched.
- `packages/object-storage/src/object-storage.ts`: `ObjectStorage.get(key,maxBytes):Promise<Uint8Array>`, `assertByteCeiling` caps maxBytes at 32MiB; `ObjectStorageError` codes missing/unavailable/too-large/invalid-key/conflict.
- `packages/object-storage/test/object-storage.test.mjs`: existing local small, traversal, missing, oversize fixture, S3 get mocks. Extend same file.
- `packages/documents/src/local-store.ts`: consumes ObjectStorage and maps errors, max document 1MiB. No edit.
- `packages/object-storage/package.json`: `test` builds then runs test/*.test.mjs, `typecheck` tsc --noEmit.

Stop if source drift since current HEAD changes the named get implementation.
