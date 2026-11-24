# LIB08 | Bounded local-object reads without stat/readFile race

**State: Done.** Source-only. Integration target: `undertaking/storyteller-workshop`. Worktree baseline `28f1439c96b7e94eee1e458395b158f245102994`. **Owner:** `packages/object-storage`. No Pods, database, provider, live S3, or user data mutation. CACHE01–CACHE07 files were not edited. No CACHE06A worktree was present.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| LocalObjectStorage.get bounded read | Code | changed: local get enforces maxBytes while reading a regular file | packages/object-storage/src/local-object-storage.ts on change/lib08-local-object-bounded-read | source-only | 70 KiB fixture with maxBytes 4 returns too-large; get no longer calls readFile; symlink and directory return unavailable | packages/object-storage/README.md already required a bounded get |
| ObjectStorage port and S3 get | Code | unchanged because the public signature, error codes, and S3 adapter stay | object-storage.ts and S3 tests inspected | source-inspected | Existing S3 conditional-put and oversize-stream tests passed | No port export added |
| Documents consumers | Code | unchanged because Documents still maps the same storage errors | pnpm --filter @offscreen/documents test | source-only | 42 pass, 2 live S3 skips, 0 fail; no Documents source edit | No document schema change |
| docs/product and docs/technical | Product / technical | unchanged because this is a local filesystem enforcement of an existing byte ceiling | No product or technical page edited | reviewed | Parent-directory symlink races are not claimed closed | work/QUEUE.md was not the selector |

Receipt: `@offscreen/object-storage` test 5/5 and typecheck PASS as uid 1000, including chmod 000 mapping to unavailable. Documents test 42 pass, 2 skipped, 0 fail. Changed files formatted with Prettier. No database, cluster, or provider call.

## Observed defect
`LocalObjectStorage.get()` in `packages/object-storage/src/local-object-storage.ts` calls `stat(path)` and then `readFile(path)`. A file changed/grown between those calls can cause allocation of an unbounded buffer before the post-read maxBytes check. `exists` uses `stat`. The package promises bounded bytes for `get(key,maxBytes)`; its local implementation does not enforce the bound *while reading*.

## Selected algorithm
Replace get's stat/readFile pair with an opened file descriptor and incremental bounded reads. Validate key and requested ceiling before opening. Open final path read-only with `O_NOFOLLOW` when supported on Linux, using the existing `resolveKey` lexical guard; `handle.stat()` must report a regular file, not directory/device. Read chunks of at most `min(64 KiB, remaining+1)`, check cumulative length at each step, and throw `ObjectStorageError('too-large')` immediately after reading maxBytes+1. Assemble the bounded buffer only at successful EOF; always close the handle in finally. Distinguish `ENOENT` -> missing; other filesystem failures -> unavailable. Existing exact bytes and zero-byte behavior remain. Do not introduce streaming in the public API, mutable writes, symlink policy for intermediate root folders, or a reusable filesystem abstraction. Linux final-component symlink refusal is desired; document that this does not eliminate all intermediate-directory race cases.

`LocalObjectStorage.putIfAbsent` durable staged-write/hard-link behavior stays unchanged. S3 transport, ObjectStorage port, Documents typed API and error codes stay unchanged. Avoid making object reads unsafe on Windows: if O_NOFOLLOW is unavailable, perform an explicit lstat final-path check; fail closed when unable to verify.

## Proof and stops
Add tests to existing `packages/object-storage/test/object-storage.test.mjs`: existing small/zero/exact-bound bytes pass; >cap is rejected; an oversized on-disk fixture is rejected after at most maxBytes+1 bytes are read, verified by code-level bounded-read test or controlled file-handle fixture (no timing-based race tests); final symlink and directory refuse; missing and permission failures retain codes; no write/collision regression. Run `pnpm --filter @offscreen/object-storage test`, `typecheck`, then `pnpm --filter @offscreen/documents test` with changed-file formatting. Stop if platform-safe bounded I/O cannot be done without changing `ObjectStorage.get` signature or error contract. Tests must never modify production bucket or runtime data.
