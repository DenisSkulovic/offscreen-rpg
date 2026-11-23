# LIB08 | Small execution steps

## T01 | Local bounded get
Read `packages/object-storage/src/local-object-storage.ts`, `src/object-storage.ts`, `test/object-storage.test.mjs`. Edit ONLY `src/local-object-storage.ts`. Replace get's readFile strategy with bounded file-handle chunk reads, close in finally, final-component symlink/directory refusal. Preserve putIfAbsent, exists, errors and API. Positive exact maxBytes, zero byte. Negative oversized on-disk fixture with code-path verification of bounded reads, and symlink.

## T02 | Regression and closure
Read new get and existing tests; edit ONLY `packages/object-storage/test/object-storage.test.mjs` plus a minimal correction in get if needed. Add deterministic cap, symlink/directory and error cases; do not rely on timing-sensitive races. Run object-storage test + typecheck, Documents test, changed-file formatting/quality. Integrate using one Change worktree, archive with exact receipt. Stop on platform/error mismatch.
