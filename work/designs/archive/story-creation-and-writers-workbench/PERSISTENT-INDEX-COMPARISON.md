# Persistent index comparison and research-only microbenchmark

**Status:** investigation 2026-11-20; **not an accepted data format**, production benchmark, runtime implementation, or Cursor Change. **Source:** uploaded code tree `09d5820bcafe`; prior [v1 audit](VERSIONED-LIBRARY-SOURCE-AUDIT.md). The script [research_index_microbench.py](experiments/research_index_microbench.py) is self-contained, requires only Python standard library, and **writes no application/SQL/provider data**.

## Decision being narrowed

Choose an immutable, content-addressed **Library index** that permits exact named Markdown-document reads, browse-by-prefix and small batched edits; shares unchanged metadata between scenes and branches; and does not depend on traversing all previous roots. Put branch ownership, progression sequence and scene context **outside** the shared tree.

A clean v2 model separates:

- **Document object:** existing or versioned canonical body/envelope, hash-addressed and immutable.
- **Index nodes:** hashed immutable leaves/interior nodes containing normalized-path-to-document-version metadata. **No campaign ID, branch ID, sequence number or previous-root pointer in the shared tree nodes.**
- **Branch/scene selectors:** transactional authoritative references to one index-root hash plus separate checkpoint/evidence/policy identities.
- **History DAG:** causal scene commits whose parents/branch lineage are distinct from directory navigation. A new scene can reference the same root, or a new structurally shared root.

This separation is essential: v1 `offscreen.manifest.v1` has a `campaignId` *inside the manifest hash*, which currently forces the fork to build another flat manifest instead of reusing that exact root.

## Actual source constraints

- `packages/documents/src/schema.ts`: flat v1 entries array is limited to **4096**, each path normalized and up to **320 characters**. Each entry contains ID, revision, path, object hash, kind, authority, visibility.
- `packages/documents/src/local-store.ts`: an individual CAS object is capped at **1 MiB**. The manifest size can reach this cap *before* 4096 realistically sized entries are accepted.
- `packages/application/src/stories/documents.ts`: ordinary writes serialize a complete sorted entry array and traverse root history, with an explicit **256-manifest** limit for the current historical source validation/read path.
- `packages/application/src/stories/passage-documents.ts`: each supported Storyteller publication includes a new immutable source-passage entry, even with no other lore edits. Thus normal long play advances document roots frequently.
- `packages/application/src/stories/forks.ts`: fork branches use inherited content object hashes but a *new campaign-bound flat manifest*, so full content is not copied but O(N) metadata is.

## Ranking the data-structure choices

| Candidate | Point read/update | Prefix browsing | Hard part | Judgment |
| --- | --- | --- | --- | --- |
| **Persistent path-ordered B+ tree** with bounded serialized node bytes | O(log N) path to leaf, structural sharing; batch edits can share traversals | Efficient ordered prefix range traversal | Deterministic splits/merges; canonical-byte validation; stable revision semantics | **Preferred prototype** |
| Persistent radix/ART keyed by full normalized paths | O(path length), compressed shared prefixes | Naturally models directory prefixes | Fanout/encoding variability; unicode/canonical bytes; compaction | **Strong alternative** if B+ complexity dominates |
| HAMT keyed by hash(path/ID) | Fast exact reads and updates | Bad at human folder/prefix listing without a secondary index | Deterministic listing/index synchronization | Not preferred for a library-navigation-first interface |
| Delta-only manifest with periodic snapshots | Cheap local appends | Needs replay or secondary index | Unbounded read/GC/history complexity, awkward forks | Reject as sole authoritative index |
| Flat v1 manifest | Simple and inspectable | O(N) scan | O(N) rewrite; size/history ceilings | Maintain legacy reads; not the unbounded writer target |
| Direct Git objects or Git repo per story | Familiar semantics | File/path features available | Huge integration, trust, transactional and operational mismatch | **Not recommended** |

**Strong preference, not final selection:** benchmark B+ and path-compressed radix against exact same generated workloads, then choose the simplest correct implementation. “Uses Merkle hashes” is not enough to claim bounded writes: one huge directory node is still a giant rewrite.

### Node format principles

- Deterministic byte encoding with content hash verification; fixed schema/version prefix; bounds on *serialized bytes*, count, key length and depth.
- Stable sorted paths for prefix listing; paths are **case-sensitive** under current schema, no OS-dependent Unicode/case folding without a separate validated migration.
- Leaf version value pins immutable `documentId`, `revision`, `objectHash`, authority/visibility/kind, potentially exact provenance. Hash uniqueness does not itself authorize access.
- Internal node separator keys and hashes must be deterministic and cannot create cycles. Splitting one node must preserve ability to rebuild the same logical map into a stable root under declared canonicalization rules.
- Source packages can be read-only mounted roots; campaign overlays and stage roots must resolve explicit precedence, not overwrite packages in place.
- Batch K proposed updates against one expected root. Check all conflicts and permissions, then construct one new root and allow one Game Authority publication decision.
- Separate index/update transaction from scene/game-state commit: object-store writes can stage before SQL; only admitted SQL selector confers story truth. Missing/corrupt root or node means hold/error, never “use latest.”

## Research-only microbenchmark: what it actually measures

Run:

```sh
python3 work/designs/open/story-creation-and-writers-workbench/experiments/research_index_microbench.py
```

The script generates representative flat document-entry metadata and calculates serialized bytes rewritten for **100 existing-key revisions**, comparing v1-style full manifests with a **toy immutable 32-way path-ordered tree** (leaf and index nodes hashed to a process-local dictionary). All keys are in one logical folder, to pressure-test flat-directory behavior. No content-body bytes are included in either edit total, because they are shared across both variants. Python timings are CPU-only curiosities, **not S3/SQL/cluster latency**.

| Documents | v1 single manifest | 100 v1 rewrites | 100 toy tree edits | Metadata reduction | Toy node height |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 25,260 B | 2,530,281 B | 823,947 B | 3.1× | 2 |
| 1,000 | 250,260 B | 25,030,281 B | 1,164,393 B | 21.5× | 2 |
| 4,000 | 1,000,260 B | 100,030,281 B | 1,205,048 B | 83.0× | 3 |
| 10,000 | 2,500,260 B | 250,030,281 B | 1,275,393 B | 196.0× | 3 |

**What this supports:** a bounded multi-level index has a potentially large serialization advantage for repeated small edits as N grows. At 100 documents, the advantage is much smaller. A 10,000-entry v1 object is **not valid** under today's 4096 schema/1 MiB cap; it is an intentionally outside-current-limits extrapolation.

**What it does NOT support:** that our toy is a correct B+ tree, that it handles new paths or deleted paths, that these are real AWS bytes billed, that 32 is an optimal fanout, that node trees are fast under network RTT, or that a SQL transaction/fork will be safe. The toy implements **only lookup and replacement of existing keys in a statically built tree**. It intentionally omits insertion, split, merge, deletion, rename, history GC, caches, authentication and concurrent publication.

The initial tree also carries some extra metadata overhead; when the Library is small or rarely changed, migration has a complexity cost that may not pay back. The persistent tree becomes compelling when normal passage publication repeatedly rewrites increasingly large flat manifests.

## Benchmarks that can genuinely select v2

Before selecting a concrete production index format, implement **throwaway** versions of B+ and compressed radix (no service integration) and compare:
1. **Mixed writes**: append 1,000 sequential passage paths, revise existing lore, rename and delete, batch 1–8 files; all in one flat folder *and* across 100 subdirectories.
2. **Reads**: exact path, prefix page 50, random old-root read, tree-to-tree diff (hash pruning), root-specific visibility-filtered lookup. Include real object-store adapter/caching GET/PUT counts in a later bounded integration benchmark.
3. **Fork**: spawn 100 branches from root at scene 37, diverge each, assert parent untouched and metadata construction O(1) excluding state/lineage remapping.
4. **History**: 1,000+ passage commits, retain citations to old hashes, no read request walking back 256 revisions.
5. **Faults**: missing/corrupt tree node, stale root CAS, ambiguous ID, concurrent updates, multi-object partially staged write, cache corruption and process restart.
6. **Cost**: object count, total metadata bytes, p50/p95 write/read, read amplification from tree depth and actual storage/network cost, with node-size ceiling including 320-byte paths.

**Implementation-slicing idea (future):** preserve v1 read adapters for historical scene selectors; introduce v2 indexing behind a read/write interface. Do not rewrite immutable v1 roots or their checkpoint hashes. If an old root needs a v2 head, convert **once** under an explicit migration/admission operation and retain a verifiable link to the source v1 root, rather than cloning all documents on each fork/scene. The precise migration strategy is **not accepted** yet.

## Preliminary decision recommendation

The requirements narrow the field to a **persistent path-oriented tree**. Prototype B+ and compressed radix before choosing node format/fanout. Treat the toy measurement as a falsifiable motivation for the experiment, not a decisive production benchmark. The history DAG, fork capture and citation models are separate design concerns; no index choice can substitute for them.
