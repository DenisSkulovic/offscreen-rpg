# Storyteller memory and situated recall

Status: Prepared for implementation; not implemented. The owner requested durable memory/exploration and canonical files, then explicitly requested implementation feature files on 2026-09-19. [Canonical storage](../2026-09-19--18-49--canonical-campaign-storage/FEATURE.md) owns persistence and creative bundles; this feature owns extraction, context selection, retrieval, exploration and admitted memory updates. The shared contract is [canonical files](../../technical/canonical-files.md). No paid services or live inference are enabled.

## Intended outcome

Follow [concepts](../../concepts.md): a scene can span many Storyteller turns; a passage records published narration; a memory segment is only a bounded source range. Existing episodic-memory terminology means this derived memory, not an episode of gameplay. No chapters or mandatory narrative arcs.

A continuing life can accumulate places, people, possessions, promises and experiences without either replaying its entire history into every prompt or forgetting whichever detail leaves a recent-message window. Each DM invocation receives a small, task-specific working set; an application-selected evidence-seeking recipe can request bounded additional evidence. A versioned campaign document library and the committed execution ledger remember the life; the model's conversation is disposable. Canonical documents own narrative knowledge, while exact mechanical state retains transactional authority.

Memory is a gameplay dependency, not a later convenience. It must preserve ordinary achievements, relationships and constraints, not just dramatic plot points. Direct action receipts are implemented. The next design boundary is the canonical document workspace, connected to a small playable return scene before claiming the POC demonstrates a remembering Storyteller.

## Inspected implementation boundary

Context assembly, note publication, profile loading and scene publication were re-inspected at `ae25c74`. Their storage remains database-backed except for the checked-in JSON creative profiles. No canonical campaign document store or searchable workspace is implemented.

| Existing owner | Implemented behavior | Long-story limitation |
| --- | --- | --- |
| Application `storyteller/context.ts` | Loads seven latest passages plus source passages of every retained note, all story items and current campaign settings under the story lock | No query by scene, returning identity, topic or unresolved commitment; all inventory rows are loaded |
| Storyteller `context/continuity.ts` | Up to 20 notes, 400 characters each, one to four sources each; up to eight create/update/retire changes per publication | One always-loaded list conflates persistent memory with current relevance; no cold archive/search for retired notes |
| Storyteller `context/index.ts` | Current passage and every note source are mandatory; adds up to six optional recent passages; errors if mandatory context does not fit | Up to 80 distinct old source passages can crowd out recent context; source citations force source text into every prompt |
| Storyteller `tasks/index.ts` | Captures exact immutable request and schema; limits complete serialization to 48 KiB | Current passage is repeated in `current` and `evidence`; manifest omission list covers loaded candidates, not missing relevant lifetime history |
| Application `storyteller/memory.ts` | Publishes validated note patches atomically with the relevant current/arrival passage | Good future-evidence boundary; provenance validation still does not establish summary truth |
| Storyteller `tasks/policy.ts` | Separately rejects a conservative byte-based input bound against the configured provider input allowance | Passing 48 KiB preparation does not imply fitting a smaller execution policy; no route-aware selection before capture |
| Application `storyteller/execution.ts` | Scripted or one provider dispatch per attempt; invalid result becomes a failure | No recall protocol; rejected output is not retained here as a useful diagnostic artifact for bounded repair |
| Tests | Source-backed old promise, recent-window retention, overflow, stale/future evidence and delayed arrival notes | They do not demonstrate dozens of places, hundreds of entities or discovery of an unpinned old episode |

These are inspected facts, not claims of newly implemented behavior. Existing [context and cost](../../technical/context-and-cost.md) already describes source-backed summaries and retrieval in principle; the missing part is an executable memory contract and a longevity fixture.

### Concrete pressure evidence

A dependency-free JSON-size probe using the current provider-facing evidence/note shape yielded 65,356 bytes for 20 short notes, each citing two distinct 1,500-character passages. That subset alone exceeds the 49,152-byte complete request limit. It excludes instructions, schema, current scene, profile, character and possessions. This is a synthetic size lower bound, not an executed application test or measured live playthrough.

One current passage with five 6,000-character paragraphs is within the passage field limits, but its current-plus-evidence projection alone is 60,216 bytes. Publication does not currently preflight whether a newly accepted passage and resulting notes will fit the next task. Thus a structurally accepted turn can leave its successor unable to prepare; this need not require a long campaign.

## Representative return flow

Early in the story, the player leaves a brass key with innkeeper Mira, damages the inn's western shutter, promises to repay a favor, and hears Mira claim the old bridge is unsafe. Forty scenes later, the player returns after learning the bridge was repaired.

Before asking the model anything, the context builder resolves the known inn and Mira and supplies: present authoritative state; the key's current holder; the still-open favor; persistent shutter damage; the last visit's episode card; and the newer bridge information with its actual source and knowledge status. It does not load the other 39 scenes or assert that Mira is present merely because she was present last time.

The DM can narrate recognition without inventing a new Mira. If the exact terms of the favor matter, it can inspect the bounded original exchange. An older summary cannot restore the key to the player or revert the repaired bridge. If the exchange never established a deadline, the DM cannot invent a remembered deadline. Not finding evidence permits uncertainty or a choice that does not depend on it, not fabricated recall.

In the microbe contrast, a previously encountered chemical environment and persistent adaptation replace the inn and acquaintance. The same current-state, identity, episode and source-retrieval contracts work without money, dialogue, a human calendar or mandatory geographic coordinates.

## 1. Memory layers and their authority

| Layer | Contents and lifetime | Retrieval and authority |
| --- | --- | --- |
| Committed state | Supported capabilities, quantities, item holders, consequential conditions/relations, current commitment/progress | Exact current projection; only admitted transitions change it. Never reconstruct balances from summaries |
| Scene working set | Current scene frame, active participants, significant props/blocking, recent beats, current intention and receipt | Small, rebuilt for each task; absence from this set never deletes state |
| Identity cards | Stable story-local ID, known names/aliases, kind, identifying anchors, links to relevant episodes and current state | Load for current/referenced entities. Stable descriptions are not an NPC's current location or mood |
| Episodic memory | Scene/segment synopsis, participants, outcomes, experiential detail, source range, relevant links | Searchable derived memory; useful context and a pointer to original evidence, not effect authority |
| Open threads | Promise, debt, clue, unresolved question or local objective; participants, status, cues and evidence | Due/scene-relevant threads are retrieved. Narrative threads are not mandatory quests or mechanical rules |
| Chronology and receipts | Original published prose, accepted choices and mechanical results | Durable primary evidence. Retrieved selectively and never replaced by summaries |
| Working prompt | Instructions and selected projections from the above | Disposable task input; not the store of truth |

These are responsibilities, not seven services or seven new table families. Narrative identities, episodes and threads become linked versioned documents; source passages remain recoverable originals. The execution ledger retains exact character state and item ownership. Directory/search metadata can be indexed in a database without making it the canonical owner of document bodies. See [file ownership](../../technical/canonical-files.md#one-owner-per-kind-of-truth).

### Identity, claims and knowledge

- Distinguish durable identity from a name. Two people called Mira must not merge. An alias becomes a lookup aid only after an admitted identity association; resemblance is not proof.
- Promote scene-local detail only when interaction, revisitation or state correctness needs continuity. Preserve its original scene-local reference in the promotion mapping; do not invent a duplicate acquaintance on return.
- Distinguish established fact, attributed claim, inference and unknown. A speaker's assertion proves that the claim was made, not that the bridge is broken.
- Record sequence/source and meaningful fictional time separately from ingestion or retrieval time. A mention today of an old event is not a new occurrence.
- Keep player/character knowledge separate from DM-only secrets. Initial recall is restricted to published, character-permitted history. Future secret-state retrieval needs a separate privileged projection; prompts alone cannot enforce secrecy.
- The new DM-turn result may establish permitted new scenery through an admitted scene update, but a summary or scene-frame patch cannot transfer an item, cure an injury or declare arrival. Those changes require the supported effect/process path.
- Provenance is not a semantic proof. Citing freshly generated prose must not launder an unsupported state change into truth via a note and then a later action.

## 2. A deterministic context builder, not a growing transcript

The application assembles each task from saved data. The model does not maintain a single lifetime conversation.

1. Authorize the story and capture the committed state, narrative revision, current receipt, settings and applicable rules in a short consistent transaction. Mechanical state can change before the next narrative passage; the receipt identity/state fence must be part of this capture, not just passage sequence.
2. Build cues from structured current-place/participant/item references, the selected action's referenced identities, unresolved threads, current activity and relevant deadlines. Do not rely only on parsing prose names.
3. Load exact mandatory state and applicable restrictions. Include compact complete capability IDs/availability and carried-item affordances within the supported POC bounds; do not hide a usable key or skill merely because it is not named by the player. For a larger catalogue, provide a complete bounded action-relevant index or hold explicitly; silently dropping unmentioned tools destroys agency.
4. Query episode/thread candidates using story-scoped identity joins, scene references and time/status filters. Bounded one-hop related identities may be included; no recursive world graph walk.
5. Rank optional candidates by current subject/action match, returning-place/person match, unresolved dependency, then recency. Use deterministic tie-breaks. Keep a small allowance for a relevant old relationship/achievement so dramatic and recent events cannot monopolize recall.
6. Pack whole records into section budgets, deduplicate source content, and capture an explainable manifest before model execution.

Known returning identities cause automatic recall; the DM must not first remember that it forgot to search. A compact orientation packet also exposes useful leads before composition. The DM can investigate a possible callback or relationship because it may enrich the next scene, not only because a validation error or missing prerequisite forces a lookup. An unrelated historical mystery cannot be guaranteed to surface spontaneously; searchable history and model-directed exploration improve discovery without promising omniscience.

Retrieval is a costed ladder, not one similarity query. Exact current state and admitted identity/thread/place links run first. Indexed lexical search handles names, quotations and rare terms; semantic candidates address paraphrase; bounded one-hop relation traversal supports multi-record returns; reranking spends extra work only on a small candidate pool; hierarchical or community synthesis is reserved for genuinely broad questions. Every route returns canonical identities and coverage evidence, then expands exact records/sources before consequential use. The detailed research basis and implementation sequence live in [Long-story memory, navigation and synthesis](../../engineering/long-story-memory-and-retrieval.md).

The same benchmark oracle evaluates every route. Each case names the information need and query mode, expected/acceptable/forbidden handles, current and historical versions, visibility/branch/time scope, required abstention behavior and fixed context budget. Retrieval recall alone is insufficient: measure stale/secret leakage, irrelevant bytes, source expansion, downstream context use, latency, rounds and attributable cost.

### What a useful small card contains

For Mira: identity handle, disambiguating description, last known relationship/interaction, relevant current relations, open favor, last-visit episode handle and provenance. For an item: identity, exact current holder/status, supported affordances, distinctive visual anchors and source handle. For a skill: supported identifier, applicability and authoritative proficiency, not a poetic summary of competence.

Cards may be rendered compactly as tables for inspection or as structured records in the request. They are generated by queries over committed state plus separately labelled narrative memory, not another LLM rewriting an NPC biography on every turn. Catalogue-wide tables of every person/place are not always-on prompt content.

## 3. Source references are not source text

The principal change to `bounded.v1` is separating provenance availability from prompt inclusion.

- Every memory artifact retains validated source references and explicit coverage in storage.
- Prompt projection includes a short memory card, source handles and coverage; original passages are optional expansions unless this particular decision requires them.
- A task-local handle manifest distinguishes metadata-only references, loaded summary bodies, loaded source excerpts and authoritative state records. The model cannot cite an unread source as evidence of its contents.
- A generated note based on a retrieved summary records that summary version as its derivation. Its transitive roots remain inspectable but are not falsely presented as sources the model read. Enforce the same authority tier; summaries never upgrade themselves into state.
- Source expansion returns bounded whole paragraphs with sequence and paragraph indices, not a whole lifetime transcript. Mark excerpts and available continuation explicitly. Mechanical receipts referenced by a decision are supplied separately so paragraph clipping cannot hide a spent resource.
- Large semantic chunks cannot be truncated silently. Return a narrower excerpt/structured receipt, request scope reduction or hold if required evidence still cannot fit.

Do not simply remove `boundStorytellerContext`'s evidence checks. Change the context, handle resolution, task-evidence and publication-validation contracts together. Mandatory overflow remains an explicit blocker; it must not roll back an already committed action.

## 4. Scene summaries without telephone-game drift

Keep summaries about bounded source episodes, not one constantly rewritten autobiography.

- A memory segment covers a bounded contiguous source range. One scene can require several such segments; a conversation lasting 200 turns continues normally across their storage boundaries.
- Initial segment trigger: a useful context change, or 12 passages / 24 KiB of new raw prose since the last segment, whichever happens first. This is a memory-maintenance boundary; it cannot require scene closure, pause gameplay or introduce a new decision. These are tuning values for offline evaluation, not game rules or proof that a provider call will fit.
- An episode card contains source range/hash, primary place, durable participants/items, important decisions, changed-state references, unresolved links and a few distinctive relational/sensory anchors. Preserve why something mattered, not only resource deltas.
- Mechanical deltas and identities are derived from admitted records. Narrative interpretations are proposed by the DM and labelled derived. No hidden personality rewrite or global numerical friendship score is required.
- Proposed cards are validated and become eligible only after their covered sources commit. A summary closing the previous scene cannot cite a prepared arrival.
- Store a stable sealed episode and a bounded recent raw tail. Do not repeatedly summarize the previous summary as the only evidence. Revisions/corrections are rebuilt from the bounded original source slice and receipts.
- Separate historic interpretation from current state: an episode can truthfully say the bridge was reported broken then, while the current card says a repair was later observed. A fulfilled promise leaves active retrieval but its historical episode remains searchable.

Normally propose a short episode card in an already-needed DM turn at a segment boundary; it is an additional cost in that call, not free work. An optional standalone summarization job can be added later under the same budgeting/attempt system, not an always-running memory agent.

Index lag is explicit: source coverage and `indexedThrough` identify what is searchable. Raw committed text and structured receipt/entity links must remain discoverable before narrative summaries finish. If a summary is invalid or unavailable, commit valid gameplay and required identity/source links, flag memory maintenance, and use bounded raw fallback. If uncovered mandatory scene material cannot fit, hold the next generation for maintenance; do not silently omit it. A missing decorative synopsis must never reroll mechanics.

## 5. Hints, threads and retrieval starvation

There is a difference between a globally due obligation and a dormant clue elsewhere.

- Always supply relevant imminent deadlines and active mechanical commitments; their clocks are enforced by code, not remembered by an LLM.
- Automatically load open threads connected to the current place, present people, selected intention or carried consequential items.
- Keep other open threads in storage with queryable participant/place/topic cues. Do not insert every unresolved thread into every prompt or delete threads to make space.
- Thread closure/update needs its own evidence and explicit status. Recency decay may reduce retrieval priority; it cannot forgive a debt, heal an injury or erase an unresolved promise.
- Include compact discovery hints for omitted but potentially relevant episodes, with a reason and a handle. Hints obey the same visibility filter as source bodies; even a hidden title can spoil a mystery.
- Limit candidate count and duplicate near-identical episodes. Retain diversity across directly relevant entities and temporal periods. A low-drama early favor can outrank yesterday's generic tavern chat.

The final result lists the handles on which consequential proposals depend. The validator can demand exact state/source access for a referenced prerequisite; it cannot prove that the model noticed every semantically relevant omitted memory. That residual recall problem is evaluated, not declared solved by a schema.

### Orientation packet: a small navigable index, not another summary dump

Provide `orientation.v1` before the first model round. It combines already-loaded authoritative context with compact pointers to material the DM might profitably explore. Proposed fields:

- `scope`: captured story/state, narrative sequence, visibility and memory-index coverage;
- `registrySlices`: small known-place/person/item/capability summaries, typed scope, explicit completeness and pagination handles;
- `leads`: target handle/kind, short supported cue, why it relates to the current scene, source/knowledge status and suggested allowed read;
- `capabilities`: exact available read operations, supported query modes, argument schemas, result kinds, limits and unavailable capabilities;
- `allowance`: remaining model rounds, reads, retained bytes and whether another generation can be funded.

Illustrative orientation, using only information the character is permitted to know:

| Lead or registry slice | Why supplied | Possible exploration |
| --- | --- | --- |
| Mira: prior shelter and an open favor; episode E12 | Known acquaintance at the revisited inn | Inspect the favor and original exchange before deciding whether a callback fits |
| Brass key: recorded holder Mira | Item mentioned in the current intention | Query exact current holder; inspect how it was left there |
| Two previously visited connected places; registry cursor R4 | Possible next directions from this place | Inspect the known connections; do not infer reachability or duration from the count |
| An earlier account uses related wording about shelter | Optional thematic lead | Search/inspect the episode; do not declare an identity or plot connection from similarity |

Counts are scoped facts, not model impressions: label exact count, lower bound or unknown; specify filters and captured revision. A page with eight entries is not proof that eight entries exist in total. Do not enumerate hidden people, secret exits or concealed threats through counts, labels or suggested reads. No whole-database count scan is required each turn; omit expensive optional totals and expose `hasMore`/a bounded cursor instead. Authoritative quantities such as owned currency come from state queries, never search-hit counts.

Provisional hint budget: at most eight leads and 2 KiB total inside the existing hint allocation, with up to two leads for optional relational/thematic discovery. Required facts are supplied directly rather than competing for these optional slots. Generate structural cues using IDs, admitted links, thread status and source metadata; do not add a model call solely to write enticing hints. Optional summaries/semantic candidates retain their weaker status.

Diversify leads across directly relevant subjects and time periods; deduplicate repeated references to one event. Do not promote a lead simply because the DM clicked it on previous turns, or repeat a dismissed decorative lead indefinitely. Manifest why each lead was selected. A supplied lead is an opportunity to inspect, not an instruction to force a quest, surprise or callback into this turn.

## 6. Bounded recall before a final DM turn

The target DM lifecycle is **orient → explore if useful → compose final turn → validate → publish**. Exploration occurs before final narration and option planning, not as a repair of an already chosen plot. A DM may inspect several leads, discover a new related handle and pursue it within the same bounded task. A simple fully grounded exchange can still finish without tool calls. No separate research agent, general framework or free-running loop is required.

| Operation | Input | Bounded result |
| --- | --- | --- |
| `query_registry` | Allowed entity kind and typed filters such as known place, holder or supported capability; cursor | Exact permitted records/quantities or a scoped page with count semantics, completeness and disambiguating handles |
| `search_memory` | Known handles or bounded free topic text, optional kind/time filters, cursor and supported search mode | Candidate episode/thread/raw-source headers, snippets, match reason, coverage and expansion handles; search is not limited to initial hints |
| `inspect_memory` | Returned episode/identity/thread handle and requested view | Current card at the captured state or an episode synopsis with provenance |
| `read_source` | Permitted source handle and bounded paragraph/range selector | Exact committed excerpt or receipt, its sequence/time and continuation metadata |

These may be represented by a provider-neutral structured `needs_context` result and application-dispatched reads rather than vendor tool calling. Their schemas are task-specific. The [document workspace](../../technical/canonical-files.md#agent-working-cycle) adds bounded directory/section navigation over the same records, without arbitrary SQL, host filesystem or cross-story access. Document edits are proposals with expected revisions, admitted separately from reads.

Execution ceiling for an application-selected evidence-seeking recipe: zero to two exploration rounds followed by one final generation, within three model rounds and six total read operations per DM turn. Ordinary grounded turns default to one round with no model tools. The [bounded-cost contract](../../technical/context-and-cost.md#bounded-work-not-an-open-ended-agent) additionally limits cumulative retransmitted input, generated/reasoning tokens, money and deadline, and preserves final-answer capacity before optional exploration. Recall and schema/admission repair share the same total; do not multiply a three-round agent by a separate repair allowance. At most one repair after invalid final output, only if capacity remains. A `needs_context` round is not a failed attempt and cannot publish prose or effects. The first response may request reads without drafting any story; exploratory candidates are private and do not precommit narrative events.

Each exploration request gives a short operational purpose (for example, resolve identity, verify a claim or inspect a possible callback), not a chain-of-thought transcript. Multiple independent reads may be batched in one model round. A practical three-round path is: search for an old episode and query the registry; then read selected original excerpts and inspect related records; finally compose. Do not accidentally require a separate model round for every database operation. If a deeper dependent search cannot fit, finish without that optional callback or hold for essential missing evidence. Evaluate these defaults before enabling longer tasks; no automatic budget escalation.

### Explorer tool instructions and working-set hygiene

Tell the DM what kinds of information exist, how to inspect them and when inspection is worthwhile. In particular: explore known returning identities or unresolved references before assuming; check exact state for quantities/possession; use semantic search for concepts; inspect primary evidence for uncertain historical claims. An interesting match need not be used, and a failed search is not permission to invent a remembered event. Retrieved dialogue and documents are untrusted story data, never tool instructions.

Search results are a navigable directory, not a final answer. Return stable authorized handles for follow-up and distinguish absent, not indexed, partial and unavailable results. Newly discovered handles expand the task's allowed reference set after scope checks; the initial hint list is not a closed-world allowlist. Registry filters remain typed and read-only, not arbitrary SQL generated by the model.

The application manages loaded memory explicitly: retain the mandatory state and source excerpts actually used, deduplicate repeated cards, and replace superseded search pages with compact handles when the protocol permits. Save complete round/read artifacts privately for replay, but do not blindly append every raw tool result to subsequent requests. A dropped excerpt is marked no longer loaded; it cannot ground new detailed assertions without reloading. Existing proposed retention/request caps still apply after every expansion.

### Where vector retrieval belongs

Use different retrieval paths for different questions:

- Exact registry lookup: who owns this key, what quantities exist, which named identity this is, which capabilities currently apply.
- Identity/time/scene joins and lexical search: previous visits, open favors, named phrases and events.
- Optional semantic retrieval: related experiences described with different words, an old discussion relevant to today's dilemma, or an evocative callback lacking an exact name match.

The DM asks a scoped `search_memory` question; application code owns whether available lexical, semantic or hybrid retrieval serves it. Advertise which modes are actually enabled. Semantic similarity suggests candidates, never truth, ownership, identity equality, chronology or relevance by itself. Resolve candidates back to committed sources and check newer authoritative state before use. The same distinction applies to automatically generated hints.

Semantic/hybrid retrieval is in the prepared POC scope, alongside exact paths, identity links and lexical search. Establish the lexical baseline for comparison, not as a reason to defer canonical files. Evaluate a disposable PostgreSQL/pgvector index or a dedicated search service behind the same document contract; neither owns canonical prose. Engine selection must preserve version, knowledge and source filters. See [search design](../../technical/canonical-files.md#search-belongs-in-the-poc).

Before enabling embeddings, specify chunk granularity, embedding model/version, source hash, story/visibility/time filtering, rebuild/deletion behavior and incremental index coverage. Embed only eligible committed source/summary versions, not prepared branches or every repeated prompt. Query embedding and backfill charges also count as inference; no hidden paid call inside an apparently read-only tool. Explicitly authorize the model/data destination and cost. When semantic search is disabled or lagging, report that and preserve lexical/raw-source access.

For evaluation, combine bounded exact, lexical and semantic candidate lists with deterministic deduplication and rank fusion; do not compare their raw scores as if they shared a calibrated scale. Retrieve within the authorized corpus and filter before exposing even snippets/counts. Assess both recall and noise using annotated paraphrase/alias/update cases. A larger vector index is not grounds for forcing more memories into the prompt.

### Execution limits and recovery

Each read returns at most 6 KiB; additional retrieved material retained across a task is capped at 12 KiB and must also fit the full request limit. Queries/results are cached by normalized query, task snapshot and cursor. Identical reads reuse the saved result without network/model activity, and still count against the operation limit so repeats cannot loop forever. Candidate page default: eight, hard cap: twelve. These are provisional ceilings, not permission to spend.

Each round freezes its actual request, completed result, tool reads and diagnostics before another begins. Budget reservation accounts for retransmitted input as well as new output. An uncertain provider dispatch stops the task; an outbox retry cannot grant new rounds. Retain the original committed action receipt throughout.

Independent extraction, query embeddings or reranking cannot hide behind a read-only tool or maintenance queue: they require explicit purpose attribution and admitted shared allowance. Default standalone model maintenance and runtime subagents are disabled. Apply [bounded-cost B1/B2](../2026-09-19--19-08--bounded-storyteller-cost/PLAN.md) before enabling multi-round execution. Document navigation subreads count in the same six-read ceiling; exposing another tool name does not increase it.

If the model requests more than the limit, return an explicit exhausted/partial signal. It may finish with well-supported options that do not depend on missing material; if essential evidence remains missing, hold with a recoverable reason. It must not confidently fill the gap with remembered-looking fiction. Merely widening the prompt or switching models is not an automatic fallback.

### Snapshot consistency

Use committed immutable passages no later than the captured narrative sequence. For mutable state, capture exact cards/current relations in the task or reject subsequent reads if the state fence changed. Do not implement historical state reads by filtering today's rows on an old timestamp. The direct-receipt design must expose a mechanical state fence or receipt pointer because narrative revision alone is insufficient between resolution and narration.

Summary artifacts have immutable versions and a separate memory-index watermark. A summary arriving later does not change game truth or silently alter a retry: the existing task retains its chosen artifact IDs/results; a fresh task may use newer summaries. Authorization and story deletion are still checked on every read. Future/prepared content is excluded even if it has a convenient generation ID.

## 7. Prompt budget and context manifest

Retain a complete serialized-request hard cap, initially 48 KiB, including instructions, schemas and any tool protocol. Aim below it, provisionally 32 KiB for ordinary one-round turns. This is a byte target, not a claim about tokenizer equivalence. Use the configured model's validated input/output allowances and the stricter financial reservation rule as additional constraints; output and any applicable reasoning allowance must fit the route's context capacity. No price or model route is selected here.

After fixed instructions/schema overhead is measured, provisionally divide remaining payload space: 40% current authoritative state/receipt, 20% current-scene raw tail, 20% relevant cards/episodes, 10% threads/hints and 10% recall headroom. These are allocation targets, not caps on mandatory truth. Mandatory material can borrow from optional slots. Drop optional texture, duplicate history and low-ranked cards before required state; if mandatory data still does not fit, reduce task scope or hold. Never silently switch paid routes.

Limit new narrative output and note/episode sizes so that the next turn is composable. Before publishing a generated scene/offer, perform a cheap next-context feasibility check using the proposed mandatory core and the actual task schema/rules overhead. Reject or bounded-repair a too-large narrative proposal without undoing its already committed receipt. This does not predict all future retrieval needs; it prevents known self-created overflow.

The private manifest records:

- state/receipt, narrative, settings, rules, visibility and memory-watermark fences;
- selected artifact versions/hashes and what was actually rendered;
- source coverage, loaded-versus-reference-only handles and index gaps;
- candidate reasons, deterministic ranking/ties and omission reasons;
- required/optional bytes by section, final request bytes, tokenizer estimate/bound and output allowance;
- remaining shared round/read allowance and final `complete`, `partial`, `missing_required` or `stale` status.

Keep this inspection accessible through existing artifact/QA facilities. Do not require a new trace dashboard before the memory behavior works. Neither a full manifest nor raw private memories belongs in the public player DTO.

## 8. Persistence and update ownership

Use a canonical document library for lore, identities, source-bounded memories, narrative threads and Storyteller guidance. Preserve exact transactional ownership for mechanical state, decisions, publication fences and spending. The [canonical-file contract](../../technical/canonical-files.md) owns the file layout, metadata, semantic-search contract, extraction rules, storage publication/recovery and export semantics; do not implement a competing content schema here.

The first local adapter stores immutable objects under ignored runtime data. A committed manifest names their logical paths and versions. Publication selects the manifest root atomically with related execution changes after object staging succeeds. Search/backlinks are rebuildable projections with explicit coverage. A bucket adapter can replace local storage without changing Storyteller tools. A temporary view of SQL sources is labelled a projection, followed by an explicit ownership transfer of narrative bodies; merely adding an export button does not complete file ownership.

The game engine owns mechanical transitions. The application admits identity/lore updates, protects source/knowledge scope and publishes document changes. The DM proposes narration, episode cards and sourced edits. Summary interpretation never grants mechanical effects. Images receive a separate visible-scene projection, not the whole DM archive.

## 9. Acceptance and evaluation

Use a fixture with 200 scenes, 40 locations, 120 recurring identities, 60 consequential items and 30 open/closed threads. Grow to 2,000 scenes by adding irrelevant history. These are synthetic data-growth probes, not a promise of simulated population or user-interface capacity. Materialize only encountered, relevant identities. The fixture can exercise proposed read models before all runtime generation exists; label that limitation.

| Probe | Required observation |
| --- | --- |
| Return to the inn after 40 scenes | Known identity, exact holder, persistent alteration and open favor included automatically |
| Same name, different person | Distinct identities; no ungrounded merge or transferred relationship |
| Old fact changed | Current card uses newer admitted state; old episode retains its historical meaning |
| Old rumor later disproved | Claim retains attribution; character knowledge changes only through learned evidence |
| Minor unindexed decorative detail becomes relevant | Search can locate a committed raw source or report insufficient evidence; no fabricated recall |
| Long single-scene conversation | Segmentation and raw tail remain bounded; unfinished local context survives |
| Summary failure or lag | Gameplay receipt survives; coverage gap visible; bounded raw fallback or explicit hold |
| Item/skill not mentioned by the action | Action-relevant capability index includes it; selection does not silently reduce agency |
| All mandatory constraints exceed budget | Named overflow with no provider dispatch and no lost mechanical result |
| Second story, secret title, prepared arrival | No cross-story/visibility/future data leaks through bodies, hints or metadata |
| State changes during retrieval | Captured consistent result or explicit stale rejection; no mixed inventory |
| Repeated query, provider uncertainty, replay | Bounded rounds/reads, saved results reused, no repeated paid dispatch or dice |
| History grows tenfold | Request stays within its fixed cap; no whole-history application scan; retrieval candidates and query work inspected |
| Relationship callback | Recall includes distinctive lived context, not only generic identity labels |
| Proactive pre-narrative exploration | First response requests evidence without drafting a scene; retrieved history changes the final options or relationship portrayal |
| Optional lead declined | DM can ignore an irrelevant lead and continue quietly; no compulsory callback or incident |
| Multi-hop discovery within bounds | Search reveals a new permitted handle, next round inspects it, final round composes; hints do not fence discovery to their initial IDs |
| Scoped counts and incomplete pages | Exact/lower-bound/unknown distinguished; hidden records do not leak via totals; quantities never inferred from search counts |
| Semantic paraphrase with misleading neighbor | Relevant episode retrieved when enabled; similar but contradictory/unrelated material is not promoted to truth |
| Dense conversation with few turns | Large participant/event density exercises budgets without inventing literary partitions |
| Disposable conversation and index | A new invocation reconstructs useful context from canonical documents plus exact state; rebuilding the index loses no narrative content |
| Document publication and export | A conflicting multi-file update cannot partially publish; a knowledge export preserves original evidence and does not pretend to replace the executable save ledger |
| Storyteller bundle revised | New tasks use the selected bundle revision; captured tasks retain their exact guidance and source versions |
| Pineapple and microbe | Same composition/retrieval contract without mandatory human/economic/geographic fields |

Record expected relevant and forbidden handles for each case. Measure required-state inclusion (100% or an explicit hold), expected-memory recall, irrelevant payload share, stale/false/forbidden evidence, request bytes, rows/candidates examined, reads/rounds, assembly latency and spend per accepted turn. A deterministic fixture can establish inclusion and authority boundaries, not semantic retrieval perfection or enjoyable prose.

After offline acceptance and separately authorized funding, evaluate a small grounded return scene with real model output. Judge recognition, correct updated knowledge, exact possession, meaningful options, natural callback and honest uncertainty. Do not run a paid critic on every turn.

## Decisions and exclusions

Implementation decisions: fresh per-task context; stored versus loaded memory separation; source-backed bounded episodes; automatic identity/scene recall first; small read-only recall second; receipt authority; one shared attempt/repair allowance; no automatic spending or model switching.

Implementation scope and dependencies are defined in PLAN.md. Counts, budget allocation, segment thresholds and recall ceilings are versioned initial tuning values. Implement within the prepared local/offline scope without reopening routine phase approval. Backend/model selection is an explicit Phase 5 deliverable; paid provisioning remains outside this scope. Rich secret-world simulation, adversarial NPC beliefs, autonomous memory agents, full maps, images and whole-lifetime resummarization are outside this feature.

## Owning specifications and research

Product: [continuity](../../continuity-and-consequences.md), [vision](../../vision.md), [benchmarks](../../playthroughs.md). Technical: [context and cost](../../technical/context-and-cost.md), [runtime](../../technical/storyteller-runtime.md), [data](../../technical/data.md). These documents own permanent contracts; this folder owns unfinished implementation and acceptance. Fold completed behavior and actual evidence into the permanent owners, then remove the feature folder when its scope is delivered.

Research informs the design, not a claimed benchmark result for this game:

- [Lost in the Middle](https://arxiv.org/abs/2307.03172) found sensitivity to information position in evaluated long-context models; a large context window alone is not an evaluation of usable recall.
- [LongMemEval](https://arxiv.org/abs/2410.10813) separates extraction, cross-session reasoning, time, updates and abstention; those are useful independent axes for the longevity fixture.
- [Anthropic's context-engineering guidance](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) describes combining supplied context with just-in-time retrieval and discusses compaction tradeoffs. Our story-specific authority, transaction and budget rules remain application decisions.
