# LIB04-A | Acceptance and limits

**Source-only adapter, not real authorization integration.** Required negative cases:
- Caller-supplied `authorize` returns null ⇒ **zero store reads**, no metadata or counts. Access revoked between calls ⇒ following call denied.
- Attempt to read developer-private or storyteller-private without explicit private grant ⇒ no title, path, counts, content or informative cursor; bare result indistinguishable from not found.
- Same `lore.md` in world A and world B must remain disambiguated, with cite containing alias, worldId, exact rootHash, documentId/objectHash/revision.
- World ref wrong root/revision/id and rules wrong engine rejected before exposing entries; object mismatch in envelope rejected.
- Path/prefix normalization and max page/read limits; 129 visible entries traverse; 512 invisible entries still advance continuation; no full-library memory leak from unbounded serialized results.
- Cursor cannot be reused for another source, query/prefix or grant epoch; no elevation by supplying root hash or authorize in op args.
- Existing source-only Story Engine/Writer types compile. No v4 mission, SQL table, Temporal command, live LLM, Pod or new stored manifest.

Planner did not execute tests. This packet has no permission for cluster or database writes.
