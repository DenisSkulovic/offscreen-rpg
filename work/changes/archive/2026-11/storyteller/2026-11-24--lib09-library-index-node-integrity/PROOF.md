# LIB09 | Acceptance
- Every node loaded by `loadLibraryIndex` canonical-hashes to its requested key; forged reader cannot swap valid-looking nodes.
- Root parsed and in-memory root hash consistent when asserted by the public consistency helper, without breaking legitimate drafts.
- Empty and multi-entry renamed/deleted valid trie round trips; bytes/hashes unchanged for fixtures.
- Wrong-hash node, malformed node, missing root, bad child fail; no silent rehash or auto-repair of canonical objects.
- Existing Documents tests pass, no wire/store format/migration/tenant changes.
- Planner did not execute tests.

## Executed evidence (2026-11-24)

- `pnpm --filter @offscreen/documents test`: 50 pass, 2 skipped (live S3), 0 fail. Re-run after quality cleanup is recorded at join if still green.
- `pnpm --filter @offscreen/documents typecheck`: exit 0.
- `node --test test/library-index-integrity.test.mjs`: 8/8 pass before the dead-code quality cleanup.
- `pnpm exec eslint --config eslint.quality.config.mjs packages/documents/src/library-index.ts --max-warnings 0`: exit 0 after removing unused imports, unused `applyOne`, the non-null assertion, and a one-line `if`.
- Draft stop: not taken. No caller in `packages/documents` asserts consistency before `rootHash` is set from `hashCanonicalJson`.
