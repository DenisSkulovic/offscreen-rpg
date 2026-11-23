# LIB09 | Acceptance
- Every node loaded by `loadLibraryIndex` canonical-hashes to its requested key; forged reader cannot swap valid-looking nodes.
- Root parsed and in-memory root hash consistent when asserted by the public consistency helper, without breaking legitimate drafts.
- Empty and multi-entry renamed/deleted valid trie round trips; bytes/hashes unchanged for fixtures.
- Wrong-hash node, malformed node, missing root, bad child fail; no silent rehash or auto-repair of canonical objects.
- Existing Documents tests pass, no wire/store format/migration/tenant changes.
- Planner did not execute tests.
