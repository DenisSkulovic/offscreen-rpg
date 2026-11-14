# Context and retrieval | reconstruct one life without reading the whole world

**Status: selected desired architecture, 2026-11-14.** Parent [operating model](target-operating-model.md), code evidence [flow audit](evidence/current-flow-audit-2026-11-14.md), historical [long-memory research](../engineering/long-story-memory-and-retrieval.md) and immutable [canon authority](../technical/canonical-files.md). No provider or database change authorized.

## Foundational decision: truth, working memory and creative leads are different objects

The Storyteller should see **enough genuine current reality** to produce a safe, meaningful next scene, and only the relevant amount of historical detail. There is no universal 10k/50k context cut or permanent chat that represents the world.

| Data class | Authority | Typical access | Stop when unavailable |
| --- | --- | --- | --- |
| Current actor, capabilities, owner-held item/facts, pending commitments, clock, offer and accepted result | SQL/pure rules; typed current snapshot | Always capture exact applicable state, usually no model-tool round | Required mismatch: hold/fail, never infer from prose |
| Current published passage and bounded active scene | Immutable passage + captured scene scope | Include exact current/required source in first packet | Missing/old revision: hold and recheck |
| Selected player intention/receipt or world event | Admitted operation/receipt | Exact request/settled result; no separate vague summary | Never narrate unearned progress |
| Canonical world/rule packages | Pinned manifest root, exact rule/section version | Selected mandatory fragments, topic catalogue, scoped optional exact read | Missing required rule: no model improvisation of mechanics |
| Source-backed continuity notes | Derived, evidence-linked | Include concise relevant notes and their precise source anchors | Missing source: don't assert the claim as canon |
| Descriptive identity/place/relationship/thread records | Canonical descriptive revisions and sources, not typed game mechanics | Direct ID/alias/relationship lookup, then exact record | Partial recall: acknowledge uncertainty rather than invent |
| Older passages / dialogue exact wording | Immutable source history | Lexical/structured retrieval + final exact read, small excerpt | No-match/partial indexes explicit |
| Private Storyteller directions/possibilities | Noncanonical, scoped and expirable | Optional creative evidence when profile/permission allows | Never treat as committed fact |
| Index, episode and global summaries | Derived/search aid, versioned coverage | Candidate generation, not world truth | Rebuild/fallback to exact source, never silently promote |

**Source/visibility guard:** player-known vs storyteller-private vs developer-private, direct canonical fact vs attributed claim, earlier belief vs superseding fact, and same-world branch vs fork are separate filters. A hidden plan may guide authorized Storyteller preparation but cannot leak through a player-visible source link or borrowed UI scene.

## The six-stage retrieval pipeline

1. **Freeze need and source identity.** Task purpose, current narrative revision, canonical root hash/revision, actor/offer/operation, permitted visibility and requested claim type. End immediately if stale.
2. **Deterministic first answer.** Read current typed item/ability/quantity, admitted receipt, calendar/clock, current known identity and exact direct source links. The model does not call ask_memory to discover an item already present in frozen current state.
3. **Cheap candidate discovery.** ID/alias lookup, current related document/source edges and lexical/field index. Expose score/coverage, not “found truth.” Different fictional languages, spelling and aliases must be test cases.
4. **Optional richer search.** Bounded hybrid lexical+dense, source relation traversal, time-aware episode aggregation or broad synthesis *only when the same corpus benchmark shows value*. No vector store as source of truth. Do not build a graph for every NPC because the DM mentioned them.
5. **Exact source read.** Open the current approved CAS record or published passage by handle/root. Verify content hash/version, scope, visibility and authoritativeness before use. A snippet alone cannot authorize an in-world claim.
6. **Bounded, source-linked evidence packet.** Deduplicate, rank, cap bytes and return `itemId/sourceIds/provenance/coverage`. Mark omission, mismatch, no match and stale index distinctly. The final model request contains exact text for only selected evidence and can cite only actually present handles.

**Negative:** if a retrieved source is plausible but contradicts current typed item holder, **the current typed state wins**, while an attributed mistaken memory may remain fictionally meaningful as a character belief. Never silently combine old and new sources into a false current fact.

## Required, useful and decorative context

**Required:** accepted intention/receipt, current passage and active scene source, exact actor/rule facts necessary for the planned actions, outstanding holds, current game time and source/visibility scope. These get priority even for cheap user tiers. A provider route that cannot fit them plus output should be rejected before transport.

**Useful:** directly related past encounter, person/relationship/card, one exact quote, an unresolved local thread and a small world rule example. Load only when expected value to this task is positive.

**Decorative:** broad city lore, three tangential NPC biographies, long descriptions of irrelevant places, old inactive work logs and duplicated passage bodies. Spend spare budget only if intentional player-selected richness and measured gain justify it.

The current `boundStorytellerContext` is a sound fail-closed baseline because it refuses to drop mandatory evidence. The missing improvement is **select before load** when possible, plus a manifest that proves actual final message inclusion. No “we loaded the library so the model knew it” claims.

### Selection and packing protocol

`CapturedContextManifestV1` should be a structured diagnostic/output of assembly (not an independent authority), with:
- story/actor/passage/accepted operation/current root identity and task/recipe/prompt version;
- required source IDs and reason, selected optional IDs and reason/score, explicit no-match/partial/stale;
- loaded exact content hashes/bytes, pruned sources with reasons, **actual final provider-message source handles and section hashes**;
- duplicate source overlap bytes, protected output/scheme overhead and total request bytes/token-count method;
- source subset used by final candidate and source changes actually published.

The manifest is recorded privately and redacted by default. If an evidence handle is omitted from the final packet after loading, it cannot be treated as model-visible. If a required piece cannot fit, return `context_too_large`/specific required-source hold before paying for a model call.

### SQL and CAS efficiency

**Observed:** `application/storyteller/context.ts` currently selects all `gameActivity` rows for the story and then filters to live states; `canonical-knowledge.ts` reads up to 64 eligible document bodies to determine catalogue/loading; `lexical-story-index.ts::buildLexicalStoryIndex` loads and indexes all eligible Markdown/source passage bodies each time exploration starts. These are potential O(history) I/O even if model receives a tiny final packet.

**Target:**
- Query **bounded active/nonterminal** activities by state/index/known IDs. Terminal event/detail history is read through event/source links when needed, not attached to every current turn.
- The canonical manifest stores enough **small metadata (identity, kind, title, byte length, relevant topics/linked IDs, hash, visibility, effective time)** to select candidates without reading each full object. Root publication can update that metadata or a rebuildable derivative index.
- Maintain a **root-hash/version-keyed lexical index** whose construction is amortized. A new root creates a new immutable index revision, with deterministic invalidation. Read-only current scoped hits may share physical immutable bytes but must never cross viewer authorization. Single worker/multi-replica startup strategies need local/proven cache layer, not assumed globally shared in-process Map.
- Fetch exact bodies only for selected handles and bounded sections; batch independent reads where safe. Persisted loaded evidence can be reused inside same operation but stale roots cannot mix.
- Separate **cache of immutable source/index** (safe cross-turn with auth gate) from **provider prompt cache** (provider-specific billed prefix) and **canonical source data** (not a cache at all).
- Benchmark 200/2000 scene, one-in-a-million missing identity, rare phrase, relationship after months, branch fork, nonhuman world, multilingual aliases, plus current SQL activity growth.

**Coordination:** ENG03 measurement and later short-lock capture own moving slow CAS outside SQL write locks. SA context changes may optimize queries/metadata and capture metrics but must not silently implement a new transaction pipeline.

## Tool interface for model-facing investigation

The model gets a **tiny semantic vocabulary**. Existing operations are a credible start:
- `ask_memory({intent:'evidence'|'possibilities',question})`: returns bounded candidates with identity/revision, source links, snippet, scoring/coverage.
- `read_memory({handle})`: exact current approved record or source passage, byte cap and provenance.

Possible future **read-only typed capabilities** after need proof:
- `inspect_known_entity({entityRef})` if current typed entity identity/relations cannot otherwise be compactly supplied;
- `inspect_rule_section({handle})` from an **already pinned** rule manifest when the task's authorized mechanic has unresolved detail;
- `compare_sources({sourceRefs})` for contradictory attributed claims, implemented deterministically as a source packet.

Do not expose arbitrary SQL, raw file paths, model/web browser, mutate-character, roll-dice, grant-item, create-world-event, schedule-task or other users' private stories. The application chooses query implementation and permission. Models ask in **domain terms**, not about DB tables or index algorithms. A single ask_memory may internally use several retrieval signals, each counted against bounded read/work budget.

**Tool result minimum:** `requestId, status(ok|no-match|partial|unavailable|stale|denied), source identity/revision, matched snippet/byte bounds, coverage and optional continuation handle`. Never silently return empty array for “index missing.” Repeat exact read of same immutable source within one operation is deduped; repeated query still consumes its declared application work budget if executed.

No standard model function-calling requirement: typed JSON `needs_context` is valid transport across providers. Native tool calls may be evaluated for better protocol reliability, not because a framework promises “agents.”

## Recall across months and content types

A long life needs more than 20 continuity notes. Keep a **small hierarchy of derived indexes** with exact source provenance:
- current active situation/actor facts (authoritative);
- identity/place/relationship/thread documents (descriptive, versioned, source-backed);
- source-linked continuity notes for small significant reminders;
- bounded episode cards over actual committed source segments, with specific participant/place/thing links and coverage; no mandatory episode per scene or fictitious “chapter”;
- optional temporal/relational/hybrid search views for difficult return queries;
- immutable original passages, receipts and events always recoverable.

**Document creation discipline:** after publication, create/revise a descriptive record only if later correctness depends on stable identification or meaningful changed relationship; don't store every noun or every model adjective. Historical connected v16 consequences produced a small clue note but **zero descriptive documents** across five responses: acceptance must test that a meaningful person/promised gift causes an appropriate record **and that a later turn actually finds and uses it**. It is not enough for validator to permit `documentChanges`.

A private direction such as “innkeeper may suspect the player's motives” is a **noncanonical idea**; a public scene saying “the innkeeper took the item” would require accepted game state if item transfer is mechanically relevant. Preserve uncertainty and player perspective.

## Multilingual, relational and hybrid retrieval: when to pay for them

The maintained synthetic oracle reported indexed field-lexical 9/12 retrieval passes, 6/12 assembly passes at 200 and 2000 scenes. This means **the simple index is useful but not enough**, especially for paraphrase, alias, relationships and broad synthesis. It does not prove that embeddings/graph/multiple models would help.

Improvement selection:
1. Fix obvious name/alias/current-vs-old and source-link handling in deterministic retrieval first; compare against the same oracle.
2. Add per-root index reuse and accurate partial coverage; measure query latency and rebuild time.
3. Test a **local** versioned embedding/lexical fusion on marked paraphrase cases, with no hosted provider spend, privacy and on-disk index compatibility.
4. Test small explicit relation traversal on multi-hop named people/objects, then optionally source-grounded episode cards.
5. Promote hybrid or relational routes only if recall rises materially without unacceptable precision/latency/maintenance regression in fixed budgets.
6. Reserve high-end optional source synthesis for genuinely broad queries, not every ordinary turn.

**Never** let an embedding vector or generated summary decide item ownership or whether a roll succeeded. It's a search hint only.

## End-to-end retrieval contract and proof

Use **six checkpoints**:
`source exists → source selected → exact loaded → actual final provider packet includes → result uses/cites relevant source → published effect/prose consistent → later return still correct`.
Record separate booleans and failure reason, never collapse to one `recall succeeded` flag.

Test cases: gift to NPC with later changed owner; two similarly named people; disputed rumor corrected; false secret decoy; branching/fork root; very old exact quote; 2000-scene low-drama return; current scene held for 40 passages; mixed-language person/place names; missing/corrupt CAS and index; high cost limit where required context cannot fit; repeated task after root changes; public vs DM-private separation.

**No default paid maintenance:** derived memory can be generated at already-paid necessary publication when adequate, or via explicitly budgeted optional jobs. Opening the Journal/Stories or reloading the browser cannot spend model money simply to make its memory current.
