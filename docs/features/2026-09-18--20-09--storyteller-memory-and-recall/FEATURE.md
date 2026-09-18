# Storyteller memory and situated recall

Status: Draft proposal. Investigation and design requested on 2026-09-18; bulk implementation and live inference are not authorized by this document.

## Intended outcome

A continuing life can accumulate places, people, possessions, promises and experiences without either replaying its entire history into every prompt or forgetting whichever detail leaves a recent-message window. Each DM invocation receives a small, task-specific working set, knows what relevant evidence is available, and can request bounded additional evidence. PostgreSQL and committed chronology remember the life; no immortal chat session or agent per NPC does so.

Memory is a gameplay dependency, not a later convenience. It must preserve ordinary achievements, relationships and constraints, not just dramatic plot points. The next immediate-action receipt refactor stays first, but longevity retrieval must be exercised before claiming a multi-day playable story.

## Inspected implementation boundary

Reviewed runtime: `48c3c564f8b8703234913f95dbf7a1b86f3fabf4`; local documentation base: `a3508b9`. Remote main still matched the runtime revision during this investigation.

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

These are responsibilities, not seven services. Reuse existing story passages, receipts, character state and item ownership. A small identity directory, episode records, entity/episode links and thread records are enough for the proposed extension. Do not duplicate authoritative inventory, quantities or abilities into mutable memory tables.

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

Known returning identities cause automatic recall; the DM must not first remember that it forgot to search. Sparse discovery hints cover likely nearby dependencies. An unrelated historical mystery cannot be guaranteed to surface spontaneously; raw searchable history and bounded model-directed recall provide a second chance, not omniscience.

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

- An episode covers a committed scene or a contiguous segment of a long scene. A new beat does not automatically require a new scene; a conversation lasting 200 turns still needs segment boundaries.
- Proposed initial segment trigger: scene closure, or 12 passages / 24 KiB of new raw prose since the last segment, whichever happens first. These are tuning values for offline evaluation, not game rules or proof that a provider call will fit.
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

## 6. Bounded recall before a final DM turn

No general framework or free-running agent is required. Extend the task-specific DM lifecycle with a small read-only recall protocol after deterministic retrieval is working.

| Operation | Input | Bounded result |
| --- | --- | --- |
| `search_memory` | Task-local known identity/place handles, optional topic text/time range, cursor | Candidate episode/thread headers, short snippets, match reason, coverage and expansion handles |
| `inspect_memory` | Returned episode/identity/thread handle and requested view | Current card at the captured state or an episode synopsis with provenance |
| `read_source` | Permitted source handle and bounded paragraph/range selector | Exact committed excerpt or receipt, its sequence/time and continuation metadata |

These may be represented by a provider-neutral structured `needs_context` result and application-dispatched reads rather than vendor tool calling. Their schemas are task-specific; no arbitrary SQL, filesystem, cross-story search or mutating tool is exposed.

Proposed execution envelope: normally one final generation; at most two additional model rounds and six total read operations per DM turn. Recall and schema/admission repair share the same three-round total; do not multiply a three-round agent by a separate repair allowance. At most one repair after invalid final output. A `needs_context` round is not a failed attempt and cannot publish prose or effects.

Each read returns at most 6 KiB; additional retrieved material retained across a task is capped at 12 KiB and must also fit the full request limit. Queries/results are cached by normalized query, task snapshot and cursor. Identical reads reuse the saved result without network/model activity, and still count against the operation limit so repeats cannot loop forever. Candidate page default: eight, hard cap: twelve. These are provisional ceilings, not permission to spend.

Each round freezes its actual request, completed result, tool reads and diagnostics before another begins. Budget reservation accounts for retransmitted input as well as new output. An uncertain provider dispatch stops the task; an outbox retry cannot grant new rounds. Retain the original committed action receipt throughout.

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

The initial storage recommendation is ordinary PostgreSQL beside existing story data:

- a story-scoped identity directory with type, aliases and stable identifying/visual anchors; existing items retain their authoritative holder record;
- scene/segment records referencing place and committed passage boundaries;
- immutable episode summary versions with source coverage and rebuild provenance;
- explicit entity/episode links and a small thread record with source-backed status;
- deterministic context manifests and recall-round artifacts in the existing task/generation lifecycle.

Do not build a universal EAV world database, a graph database, embeddings service or dozens of subtype tables. Add indexes for actual queries: story+identity, story+place+sequence, entity+episode, open thread+cues, chronological source range. PostgreSQL text search over committed prose and summaries is the initial fallback for details that were never promoted. Language/tokenization and alias coverage must be measured for the story text used; lexical retrieval is not promised to recognize every paraphrase.

The game engine owns mechanical transitions. The application owns identity admission, current-state projection, source scope, transaction boundaries and retrieval. The DM proposes narration, limited new scene information, episode cards and memory patches. Summary interpretation never becomes a competing state owner. Images receive a separate visible-scene projection, not the whole DM context or secret archive.

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
| Pineapple and microbe | Same composition/retrieval contract without mandatory human/economic/geographic fields |

Record expected relevant and forbidden handles for each case. Measure required-state inclusion (100% or an explicit hold), expected-memory recall, irrelevant payload share, stale/false/forbidden evidence, request bytes, rows/candidates examined, reads/rounds, assembly latency and spend per accepted turn. A deterministic fixture can establish inclusion and authority boundaries, not semantic retrieval perfection or enjoyable prose.

After offline acceptance and separately authorized funding, evaluate a small grounded return scene with real model output. Judge recognition, correct updated knowledge, exact possession, meaningful options, natural callback and honest uncertainty. Do not run a paid critic on every turn.

## Decisions and exclusions

Recommended design decisions: fresh per-task context; stored versus loaded memory separation; source-backed bounded episodes; automatic identity/scene recall first; small read-only recall second; receipt authority; one shared attempt/repair allowance; no automatic spending or model switching.

Still requiring agreement: implementation scope and phase ordering in PLAN.md. Record counts, budget allocation, segment thresholds and optional recall ceilings are proposed tuning defaults; implementation should preserve one versioned policy and evaluate them rather than scattering constants. Rich secret-world state, adversarial NPC beliefs, autonomous memory agents, full maps, image generation, vector search and entire-lifetime summaries are outside this feature.

## Owning specifications and research

Product: [continuity](../../continuity-and-consequences.md), [vision](../../vision.md), [benchmarks](../../playthroughs.md). Technical: [context and cost](../../technical/context-and-cost.md), [runtime](../../technical/storyteller-runtime.md), [data](../../technical/data.md). This proposal owns the unapproved extension; after agreement, fold its stable contracts into those specifications.

Research informs the design, not a claimed benchmark result for this game:

- [Lost in the Middle](https://arxiv.org/abs/2307.03172) found sensitivity to information position in evaluated long-context models; a large context window alone is not an evaluation of usable recall.
- [LongMemEval](https://arxiv.org/abs/2410.10813) separates extraction, cross-session reasoning, time, updates and abstention; those are useful independent axes for the longevity fixture.
- [Anthropic's context-engineering guidance](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) describes combining supplied context with just-in-time retrieval and discusses compaction tradeoffs. Our story-specific authority, transaction and budget rules remain application decisions.
