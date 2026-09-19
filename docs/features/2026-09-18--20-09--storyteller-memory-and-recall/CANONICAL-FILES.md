# Canonical campaign files and the Storyteller workspace

Status: proposed architecture, requested by the owner on 2026-09-19. This is part of the [memory feature](FEATURE.md), not a second memory subsystem. The owner explicitly wants canonical files and searchable durable knowledge taken seriously in the POC. Runtime migration, a storage vendor and embedding expenditure are not implemented or selected by this document.

## Product commitment

A campaign should have an inspectable, portable library that survives the destruction of every conversational context. A new Storyteller invocation can discover what world it is in, what happened, what remains unresolved, and where to inspect the evidence. Its creative identity also comes from versioned documents. Human maintainers can read and revise these materials through admitted changes without decoding a growing collection of content tables.

The first POC should demonstrate this with the harbor story and a returning acquaintance. It need not wait for a thousand chapters. A short story can already expose lost detail, contradictory summaries and an agent that cannot find its own evidence.

Markdown is the preferred authoring format for prose. Typed metadata, links and mechanical definitions use validated frontmatter or JSON where that makes their meaning precise. Changing serialization alone does not improve memory: organization, retrieval, extraction, publication and the tools that connect them are the feature.

## One owner per kind of truth

| Material | Proposed canonical owner | Other representations |
| --- | --- | --- |
| World premises, admitted descriptive lore, stable identity descriptions and authored relationships | Versioned campaign documents | Search records and prompt cards are derived |
| Published scene prose and accepted conversational exchanges | Immutable source documents with ordered publication references | Chapter text and recaps cite them |
| Chapter/episode summaries, interpretations and narrative threads | Versioned memory documents, explicitly labelled derived or attributed | Search snippets do not acquire stronger authority |
| Storyteller style, rhythm, taste examples and task guidance | Versioned document bundle | Validated prompt fragments compiled for a captured task |
| Reusable activity/opportunity definitions | Validated structured content artifacts linked from world documents | Executable instances capture admitted definition revisions |
| Actual rolls, work progress, quantities, possession transfers, accepted choices, permission, clocks and spend | Transactional execution ledger and exact current state | Readable files and context cards are labelled projections with a source fence |
| Search chunks, vectors, backlinks and candidate rankings | Rebuildable index over committed document versions and permitted ledger projections | No exclusive facts live only in the index |
| Current invocation's context | Disposable working set with a saved input manifest | Reconstructed from pinned sources, never used as the world database |

“Canonical” means authoritative for a declared responsibility. A chapter is canonical as the approved chapter account, but remains a summary of events. A rumor document is authoritative evidence that somebody made a claim, not proof of the claim. A world document can establish newly admitted descriptive lore; it need not first be copied into an NPC or location table. Lore that changes executable rules, current possession or travel access must also pass the relevant mechanical admission boundary.

Keep a small database control layer for ownership, stable references, revision fences, commits, execution state, deduplication, indexing jobs and money. Avoid a new table per kind of narrative content. Existing SQL content is the current implementation; replacing it must actually move ownership, not add a second independently editable copy. Merely exposing SQL through virtual `.md` paths would be a useful interface but would not complete the requested file storage direction.

## A concrete workspace

Illustrative logical paths, not mandatory nouns for every world:

```text
campaign/
  START.md                         # Small orientation and links; bounded
  premise.md                       # Accepted setup, genre and current direction
  world/
    rules.md                       # Lore constraints and references to admitted rules
    places/harbor.md
    identities/keeper-mara.md
    identities/visitor-17.md
  chapters/
    first-watch/index.md           # Chapter synopsis and source/episode links
    first-watch/episodes/arrival.md
  sources/
    scenes/scene-0001.md            # Original published prose, immutable
    scenes/scene-0002.md
  threads/
    the-warning.md                  # Open/closed state, attribution and evidence
  state/
    current.json                   # Generated exact state projection; read-only
    decisions/command-17.json       # Exact choice/outcome projection; read-only
  storyteller/
    voice.md
    pacing.md
    examples.md
  private/
    possibilities.md               # Uncommitted ideas, explicitly noncanonical
```

Logical paths are navigation, not identity or authorization. A stable document ID survives renaming; the committed manifest resolves that ID to an immutable revision/hash and logical path. Backlinks and indices are generated from IDs. No automatic inference that two `mira.md` files name the same person. Package/world revisions are pinned per campaign: revising a reusable world template must not rewrite an existing campaign.

The manifest is a storage/catalogue structure, not another always-loaded prompt. Directory reads are paginated and exact document reads resolve one version; large campaigns must not require loading their full file tree into each task. The initial local implementation may use a bounded manifest, with an explicit capacity limit before selecting a more elaborate persistent directory structure.

Do not create one file for every die roll, adjective or clock tick. Significant scenes get source documents; chapters link bounded episodes and sources. Quiet work stays cheap: exact receipts accumulate in the ledger, and readable bundles can be generated deterministically at useful boundaries. No model call is required to turn a saved receipt into a readable record. An episode need not be a human conversation or a geographical visit; a microbe's environmental interval fits the same source/identity contract.

### Document envelope

Every stored version has validated metadata: `documentId`, `kind`, `schemaVersion`, `revision`, `visibility`, `authority`, source/derivation references, and any relevant story-time/sequence coverage. The commit manifest binds it to its campaign, path, content hash, author operation and previous version. IDs and hashes are assigned or checked by the application, not accepted as self-certifying model claims.

Links reference document IDs plus revisions/sections where evidence requires an exact version. Search and excerpts return the actual version/hash read. A mutable friendly path never serves as a frozen citation. A document can contain several claims with different attribution; a top-level `canon` label must not turn every quoted rumor into established truth.

Example human-readable episode, shown without machine-assigned hash/IDs:

```markdown
---
kind: episode
revision: 1
authority: derived
visibility: player-known
coverage: { fromSequence: 2, throughSequence: 4 }
sources: [scene-0002@1, scene-0003@1, scene-0004@1]
---
# The visitor at the beacon
The visitor claimed to represent the harbor watch. Mara inspected his badge
and accepted the recorded successful result. She asked him to return to the boat.

## Consequences and loose ends
- The warning remains unresolved: [The warning](thread:the-warning).
- Repair was interrupted, not completed. Consult current state for its progress.
```

The original exchange remains available if the exact warning or tone matters later. This episode does not replace that evidence or grant a reward.

## The Storyteller as a versioned bundle

Move creative guidance toward a bundle with a small entry document, voice/rhythm/choice principles, a few relevant examples and task-specific sections. The current implementation already loads profiles from validated JSON files in `packages/storyteller/src/profiles/definitions`; it does not require a database row for each personality. File bundles evolve that boundary rather than introduce one agent instance per story or NPC.

Capture the exact bundle revision in every task. Load the entry and relevant sections within the context budget; do not concatenate the whole bundle on every call. Creative guidance may influence presentation and proposals, but executable schemas, tool permissions, accounting and mechanical rules remain application policy. Story text cannot impersonate bundle instructions. Campaign notes cannot silently rewrite the selected Storyteller's style, and changing a shared bundle cannot alter a task already captured.

## Agent working cycle

1. Capture the campaign's state/receipt fence, committed document-root revision, selected Storyteller bundle and viewer knowledge scope. Narrative sequence alone is insufficient while quiet work changes mechanics.
2. Load bounded orientation, current exact state and the relevant current scene. Returning identities and open commitments supply automatic historical leads, even if the model does not think to search.
3. Let the Storyteller list a permitted directory, search a topic, read sections and follow backlinks. Expose logical document operations through the existing bounded exploration protocol; no unrestricted shell or bucket credentials are necessary.
4. Compose narration/options with dependencies on the sources actually read. Where appropriate, propose document changes in the same result: add a new identity description, close a thread, or seal an episode. New lore proposals identify their authority and constraints rather than fabricating historical citations.
5. Validate and publish admitted content. Extraction/summarization can accompany an already-required turn or run as a separately budgeted maintenance task. Failure of optional maintenance does not undo a committed roll or cause mechanics to run again.
6. Save an updated bounded orientation and coverage markers when appropriate. Subsequent invocations can reconstruct the working set without access to the previous model conversation.

The proposed tool vocabulary extends the existing memory tools: `list_documents` returns scoped paths and headers; `read_document` returns bounded whole sections; `search_memory` searches documents and sources; `query_registry` returns exact current state or admitted identity metadata. `inspect_memory` and `read_source` remain semantic views over these owners, not separate stores. Avoid exposing redundant tools that differ only in backend. A typed `propose_document_changes` result records expected versions and source dependencies; it is not direct write permission.

One invocation can read a chapter, follow a linked acquaintance and inspect the original promise before composing. It can also decline a weak connection. Every extra model round consumes the existing shared round/byte/spend allowance. Retrieval must improve what the next scene knows without forcing a dramatic callback every time.

## Extract, summarize and revise deliberately

- Preserve original published scenes and exact decisions/results. A failed or unselected generated branch is not history; keep it out of ordinary canon/search.
- Maintain bounded episode summaries from original source ranges and relevant receipts. A chapter can group episodes, but revisions must not recursively summarize the last summary as the only surviving evidence.
- Promote identities and threads when later continuity needs them. Use stable IDs and explicit alias associations. A passing crowd does not require a folder full of permanent biographies.
- Preserve distinctive lived details: a damaged shutter, the way a favor was offered, a recurring joke. Pure state deltas are insufficient for recognizably remembered relationships.
- Separate “known then,” “claimed by X,” “currently established” and “proposed possibility.” Later knowledge supersedes a claim's present usefulness without rewriting the original speech.
- Source additions, retirements and superseding versions invalidate dependent summaries/index chunks through recorded dependencies. Invalidated derived memory is marked stale until rebuilt; it is not quietly served as current.
- A human edit creates a proposed revision and readable diff. Descriptive corrections can use document admission; a retcon that changes already-executed mechanics needs an explicit administrative operation. Editing `current.json` in an export never changes live currency.
- A Storyteller's scratchpad may preserve short nonbinding leads or maintenance tasks, but not hidden chain-of-thought transcripts. Speculation is labelled and cannot become evidence merely because it survived a restart.

## Search belongs in the POC

Build searchable documents as a POC capability. Include semantic/hybrid retrieval in its evaluation scope; do not postpone the document architecture until lexical search has “failed enough.” The initial connected proof can use exact paths, IDs, backlinks and lexical search while an embedding adapter is selected and evaluated. Do not call a synthetic vector fixture demonstrated semantic recall.

Search indexes are replaceable projections. A chunk identifies its campaign, document/version/hash, section, source coverage, authority, knowledge scope and embedding model/version. Chunk along sections/episodes rather than arbitrary bytes that separate a claim from its negation or attribution. Large sections split with retained parent context and bounded overlap. Keep relevant raw sources searchable even when their detail was omitted from summaries.

Apply campaign, visibility, committed-version and time filters before returning candidates, snippets, titles or counts. Filter again against the authoritative manifest on read; an index cannot grant access. Merge lexical and semantic candidates using a deliberate ranking policy, deduplicate repeated sections and return source links. Similarity does not establish identity, current possession or historical truth.

Track lexical and embedding coverage separately by committed document revisions. A missing match can mean absent, stale index, unavailable backend or incomplete coverage. New committed documents remain discoverable by exact references and bounded unindexed-tail fallback while indexing catches up. Do not scan a whole lifetime on each turn to hide index lag; hold required recall if its permitted fallback exceeds the budget.

No vendor is selected yet. Compare a local index with optional pgvector against a dedicated search/vector service on the same document/tool contract. Reusing PostgreSQL for a disposable index would not make it the canonical content store. A separate knowledge-base product is worthwhile if it supplies useful retrieval/inspection, but must preserve source IDs, permissions, deletion and export; opaque ingestion that becomes the only copy of knowledge fails this design.

Embedding backfills and query vectors have a compute/data policy of their own. Local embeddings are a candidate, subject to model/license/resource selection; hosted embeddings require explicitly authorized destination and allowance. Neither vector indexing nor repeated summarization is assumed free. No installation, model download or remote content upload follows from this design pass.

## Publication across files and the execution ledger

Proposed implementation: immutable content objects plus a manifest; PostgreSQL atomically selects the published manifest root alongside affected game state. The manifest owns the file namespace. Small database references coordinate execution; they do not duplicate editable lore bodies.

For a turn that establishes required narrative canon:

1. Validate a proposed change set against captured sources, document revisions and allowed content/mechanics. Build new immutable document objects and a candidate manifest outside the database transaction.
2. Store those immutable objects and verify their hashes/durability before publication. Never overwrite a currently published object in place. The storage adapter must define its durable-write behavior; file-close alone is not an unconditional crash-safety guarantee.
3. In one short database transaction, lock/recheck the campaign's relevant state and current document-root revision, deduplicate the operation, and commit admitted effects/publication references, the new manifest root and an indexing outbox notice. Do not perform object-store I/O or inference under that lock.
4. Index after commit. Readers resolve only objects reachable from their captured published manifest. A staged but unpublished document is never story evidence.

A crash before the transaction leaves unreachable staged objects; cleanup may remove them after a grace period and reachability check. A lost acknowledgement after commit is recovered through the saved operation/root without applying effects again. Concurrent conflicting changes fail their expected-root check; any retry rebuilds against an explicit fresh base. A background summary cannot overwrite a newer chapter by last-write-wins.

Reachability includes retained published history, source citations, captured tasks, pending commit leases and retained exports, not just the current root. Garbage collection must not delete an old scene still cited by a summary or an in-flight request. Retention/deletion policy can deliberately retire history, but ordinary cleanup cannot silently destroy it.

Required narrative content unavailable in storage means its publication remains held. Already committed mechanical work and pending consequence receipts remain intact. Optional episode extraction can lag through a durable maintenance intent: use original committed evidence and show the gap. Quiet activity receipts can be exported asynchronously because the ledger remains their authority; a later task must include the unexported relevant tail or explicitly hold, never pretend file coverage is complete.

For the first slice, expose a read-only file view of existing committed scenes/receipts with coverage clearly labelled as a projection. In the next connected slice, move admitted narrative bodies to immutable objects and retain SQL publication metadata/references. Remove the superseded body-writing path when ownership moves. This staged implementation preserves reviewable boundaries without making the projection the permanent endpoint.

Object-store conditional writes can protect individual objects or heads; they do not themselves create an atomic transaction spanning a bucket and PostgreSQL. Using a database manifest pointer is an intentional coordination choice. A wholly file-based engine would need its own transaction journal, concurrency, recovery and accounting design; it is a separate proposal with no demonstrated gameplay advantage here.

## Recovery, inspection and portability

First adapter recommendation: ignored local `data/` storage shared by API and worker, with a storage contract that can later support a bucket. Export materializes friendly `.md` paths plus manifest, immutable versions/source links and checksums. Live campaign content never enters this source repository by default. Example documents checked into tests must be invented/public fixtures.

Deleting and rebuilding the search index must leave the campaign intact. Export/import should restore a navigable knowledge workspace with provenance. Resuming the executable game additionally needs the transactional ledger, settings, permissions, clocks and outstanding operations; a folder of prose alone is not a complete runnable save. Document this distinction in tooling rather than promising recovery it cannot perform.

Access and deletion apply to object versions, exports, search chunks, caches and saved prompts as well as current paths. Raw object listings are not exposed to the Storyteller. Scope path resolution, reject traversal and arbitrary URI fetches, and escape rendered Markdown. A secret document's title/backlink cannot leak through public search. Visibility changes invalidate old public index/cache views; authorization is checked again on read even for a pinned task.

Chamber should show the document tree, kind/authority, current version, source coverage, publication status, index status and the exact documents selected for a task. Logs record stable events such as `knowledge.commit_conflict`, `knowledge.required_document_unavailable` and `knowledge.index_lag` with campaign/operation/version correlation, never private prose. This inspection can begin as a compact developer panel.

## Concrete acceptance flows

**Harbor:** repair reaches an interruption. The exact progress and roll remain in the ledger. The committed encounter scene becomes a source document; subsequent conversation establishes a visitor identity and a sourced warning thread. Several quiet activities later, discard all invocation context. A fresh task reads orientation, discovers the warning, inspects the exchange and offers a relevant supported response while using the current repair/reward state. Rebuild the index and repeat. A chapter summary cannot claim four credits before completion.

**Returning inn:** store the original key handover, unresolved favor and rumor about the bridge; later commit the bridge repair and changed possession. After forty unrelated scenes, the Storyteller finds Mira by stable identity, reads the old favor, distinguishes the rumor from later knowledge and uses the exact current holder. Search for a paraphrase with no shared names to evaluate semantic retrieval's contribution. A second Mira and a secret similarly worded episode are negative candidates.

**Pineapple and microbe:** remembered comic details and an organism's previous chemical environment use the same document/source/retrieval contract. No compulsory NPC biography, money, map or chapter-length schedule appears in generic policy.

**Recovery:** attempt two edits from the same root, retry a committed change after losing its acknowledgement, delay indexing, fail optional summarization and remove access to a document during retrieval. Observe one published version/result, visible incomplete coverage and correct authorization. The old task never silently substitutes newer sources.

Success is a restarted Storyteller using the right old detail in a playable turn with bounded context and inspectable evidence. The presence of a bucket, Markdown files or vectors alone does not meet that acceptance.

Evaluate both recall and operational cost: correct/forbidden retrieved sources, preserved attribution, unsupported recollections, prompt bytes, tool/model rounds, storage reads, indexing lag and time to an accepted turn. Compare a known-return scene and an unrelated scene. More file reads can increase latency and more exploration can increase token spend; automatic focused orientation and batched reads should earn their cost. Neither file format nor a citation validator proves that a generated summary is faithful, so include human review of the original-versus-summary examples.

## Research informing the proposal

- [Anthropic: effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) describes lightweight file references, on-demand exploration and durable notes outside the context window. It supports investigating this approach, not a measured improvement claim for our game.
- [Amazon S3 consistency](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel) and [conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html) inform the immutable-object/head boundary. Adapter guarantees must be checked for the actual selected service; “S3-compatible” is not proof of every AWS guarantee.
- [Qdrant hybrid queries](https://qdrant.tech/documentation/search/hybrid-queries/) and [filtering](https://qdrant.tech/documentation/search/filtering/) show search mechanisms worth comparing. They do not select a vendor or establish recall quality for this corpus.
