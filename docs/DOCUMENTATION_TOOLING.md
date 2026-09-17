# Documentation tooling decision

Status: Selected by the assistant under Denis's request to decide the documentation setup; reversible.
Updated: 2026-09-16. Applies to documentation work, not the game's runtime architecture.

## Decision

Keep Markdown in this Git repository as the authoritative project knowledge base. The previous Drive folder is a migration snapshot, not a second editable master. Use the existing documentation map, brief, topic metadata, links, requirement IDs and local ripgrep search. Do not install a vector database, hosted knowledge-base service, embeddings pipeline, or additional chat-over-documents layer now.

Ripgrep availability was verified on this workstation. A library of 200 files is not by itself evidence that semantic retrieval is necessary. Retrieval quality and the amount of text loaded matter more than file count.

No new software, hosted index or paid API calls were set up for this decision. No automatic semantic memory is claimed.

## Structured relationships

Follow [document identity and relationships](DOCUMENTATION_CONVENTIONS.md): stable IDs, controlled cross-cutting tags and typed links. Markdown remains authoritative. Follow relevant dependencies and search incoming references before material changes. No graph database or automatic graph index has been installed.

## Retrieval workflow

1. At session start, read required workspace/project instructions and the short current focus. Within the same conversation, reuse already-read unchanged instructions; check for modifications rather than repeatedly dumping all files.
2. Route by the documentation map or search filenames. Search relevant domains first.
3. Search headings, exact terms, glossary synonyms and requirement IDs using ripgrep. Return file/line matches with bounded context rather than whole documents.
4. Read the relevant sections and linked constraints. Expand when evidence is insufficient; do not force a narrow result cap that hides contradictions.
5. Before editing, read the current affected content. Check dependencies and accepted decisions relevant to the change.
6. Make targeted edits and verify the changed sections. Do not rewrite all status files for every minor wording change.
7. Exclude archive/ and templates/ from ordinary behavior searches; use them explicitly for history or workflow tasks.

Search all relevant domains for cross-cutting changes. Retrieval finds candidates; it does not establish completeness or authority. Drafts and superseded decisions must not override accepted current decisions just because they match a query.

Keep topic status, scope, headings and related-document links useful. The map records purpose and planned versus existing files. A generated manifest can be added if manually maintaining navigation becomes unreliable; it is not needed yet.

## Why not vectors now?

Semantic retrieval can find relevant passages without matching vocabulary. That is useful, but an additional index also requires freshness, deletion/rename handling, source identity, status filtering and evaluation.

Embeddings do not resolve contradictory requirements, automatically identify current authority, or eliminate the tokens needed to read results. Local embeddings can avoid per-query API charges but still require software, compute and maintenance.

Our library is deliberately structured and editable with shared terminology. Keyword search plus navigation is the baseline to beat.

## Escalation based on evidence

Record concrete retrieval misses when they happen: question, expected authoritative section, attempted searches, irrelevant/stale hits and reading burden.

- If ranking and snippets become the bottleneck, evaluate a small local SQLite FTS5 section index. It supports full-text ranking; no model is required for its search.
- If vocabulary mismatch repeatedly defeats keyword search and glossary synonyms, evaluate hybrid keyword/semantic retrieval using a small set of representative real questions.
- Compare answer-source recall, stale hits, returned context size, maintenance and total cost. Keep a richer tool only if it improves the workflow.
- Any future index is a disposable derived cache, with source paths/headings, status and freshness checks. Keep writable databases outside Drive sync; rebuild per device from Markdown.

No fixed document-count threshold triggers a migration. Do not preselect the game's knowledge storage based on this documentation choice.

## Usage and cost limits

Local search itself does not call an LLM. Search output and subsequent reasoning still use assistant context. No percentage saving or subscription multiplier is promised. Selective reading and avoiding redundant generation are the immediate controls.

The repository migration establishes Git authority at technical handoff, independently of search. A document viewer can be added later if Denis wants a better reading interface; it is not needed for assistant retrieval.

## Sources checked

- [SQLite FTS5](https://www.sqlite.org/fts5.html): full-text search and BM25 ranking.
- [OpenAI Retrieval guide](https://developers.openai.com/api/docs/guides/retrieval): semantic retrieval, chunks, source attribution and vector-store indexing.

The choice of the lightweight baseline is our engineering judgment, not a vendor claim of guaranteed savings.
