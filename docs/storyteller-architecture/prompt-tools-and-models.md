# Prompt, tools and model transport | small, versioned, source-grounded interfaces

**Status: selected desired architecture, 2026-11-14.** Parent [operating model](target-operating-model.md), [current source audit](evidence/current-flow-audit-2026-11-14.md), [context](context-and-retrieval.md) and existing [task compiler](../../packages/storyteller/src/tasks/index.ts). No source, provider or prompt migration authorized by this document.

## Prompt compilation is a product contract

Separate **game authority**, **the task**, **the captured creative identity**, **relevant world/rules**, **the current moment**, and **optional historical evidence**. A task-specific prompt is a compiled artifact, not one ever-growing dungeon-master paragraph.

| Layer, stable → changing | Contents | Owner / invariant |
| --- | --- | --- |
| P0: world truth | Game canons, no unearned time/items/rolls, privacy and evidence permissions | Platform/game design; cannot be changed by profile or paid tier |
| P1: task contract | Task kind, allowed final output, source/citation use, exact schema, tools if any | Versioned task compiler/validator |
| P2: creativity | Tone, dramatic rhythm, initiative, surprise style/frequency, risk/canon-invention bounds | Captured story/player Storyteller profile, distinct from resource grants |
| P3: pinned rules/world | Applicable rule fragment, world library, exact authority and permitted actions | Pinned source root and accepted campaign authority |
| P4: present | Current passage, accepted intention/receipt, actor/holds/current game time | Frozen event/task source |
| P5: relevant past | Specific established memories, source-linked relationships, older words | Optional source selection, bounded by task need |
| P6: investigation feedback | Compact source hits/exact reads, coverage/omission, remaining rounds/reads | Operation-local, not canonical fiction |

**Physical order:** stable instruction and schema where useful for provider prefix caching, followed by specific changing facts. Yet a bloated universal system prompt can be worse than a small task-specific one despite better prefix overlap. Prioritize actual useful context and measured cost.

## Prompt errors to remove from common authority

- Current common prompt says **“Never ... end the character's life.”** That is the present nonlethal mechanical limitation, not eternal product policy. The future should say obey the **captured supported risk policy**; any irreversible harm requires typed mechanics and legitimate permission. This does not turn on lethal play today.
- Legacy continuation text requires **2–5 options** regardless of situation. The constitution allows a quiet/no-offer moment, one feasible attempt and dramatic multi-choice situations when appropriate. The supported output schema and actual game admission decide available actions. No compulsory excitement or heroic quest.
- Current profile task guidance uses continuation guidance for consequence and report. Preserve fallback compatibility, but consider optional explicit task guidance for distinct responsibilities only if evaluation shows a difference.
- Massive plan instructions are sent on tasks with different needs. Compile only relevant rule capabilities and output variants while retaining strict provenance and mechanical validation.
- “Cannot execute tools” must distinguish **game mutations**, always prohibited, from the explicitly admitted read-only **memory exploration** phase. No provider-side access to the machine, database or external browsing.

### Target task-specific prompt contracts

**Opening:** reviewed premise, who/what player is, permitted world/starting mechanics, authored start conditions, no story clock advances; output a reviewable *candidate*, not running life.

**Consequences:** exact committed receipt/roll/effects/time and source; narrate only what happened, then propose valid distinct next intentions. A failed persuasion cannot magically grant social success. Mechanically forbidding identical spam is GM04, not just prompt.

**Dialogue:** current active conversation, attributed claims, relevant person relationships and selected intent, allowed quiet response or follow-up; never force a novel climax each turn.

**Interruption:** exact cause and retained or unearned work; scene must show legitimate hold/choice and never claim interrupted work finished.

**Report:** frozen historical source and original time, no new current choice or game effect. Late report cannot replace current Now.

**Evidence investigator:** concise typed reason for missing information, requests scoped read operations, returns exact source. It does not publish fiction.

**Optional private director:** one purpose and source-linked candidate narrative directions; no automatic NPC moves, plot force or spending permission.

Prompt profile quality is evaluated separately from parse validity. A valid JSON object with bland or contradictory choices is still a poor Storyteller.

## Model-facing tools: few, semantic, bounded

**Initial approved read vocabulary** remains two operations:
- **ask_memory(question, intent)**: at most two concise evidence/possibility queries per round; returns candidate leads, current-root source IDs, snippet, relevance and coverage.
- **read_memory(handle)**: exact approved current-root descriptive record or published passage, with bounded bytes and proven source identity.

**Proposed optional extensions, only after measured need:** read a pinned rule section when a required mechanic's applicable excerpt is missing; inspect an already-known identity/relationship from frozen source; compare two attributed sources for a contradiction. The application can implement these through existing direct, lexical, local hybrid or explicit-link mechanisms without exposing low-level storage operations.

**Never expose** arbitrary SQL, universal file-read, web search, shell command, item transfer, dice roll, user account, grant adjustment or uncontrolled subagent spawn. A model's read request is not a player action and cannot grant world-state authority.

Every tool has a **versioned schema, work/time/byte limit, capture identity, authorization/visibility check, source provenance, deterministic no-match vs partial vs stale vs denied status, retry/idempotence policy and useful error language**. The transport may use strict JSON needs_context envelopes; native provider function-calling is an optimization experiment, not required to be a real agent.

**Model sees a stable conceptual vocabulary, not backend machinery.** A query for “What did I promise this person before leaving?” should not require knowing which SQL table or lexical index contains it. A semantic operation may fan out across existing deterministic read primitives, but all work counts against one admitted task envelope.

## Disposable model threads, not a permanent conversation

For each accepted game event, the application builds a **new captured Storyteller task** with full source/operation/creative/resource authority. If investigation runs, its **operation-local** snapshots hold compact read results and evidence-use references across 2–3 rounds. The model does not receive a permanent transcript of every historical turn, and no model session is needed when the story is quiet.

Each provider call is assembled again from mandatory current facts, relevant source and the permitted working set, not an ever-growing append-only chat. At completion the operation's model messages can be disposed of according to retention/audit policy. Game history persists through verified passages, mechanics, canonical records and source-linked notes, not chat memory.

**Compaction remains off by default.** A three-round agent doesn't need native server-side transcript compression. If a future separately approved task requires longer deliberation, deterministic repacking comes first; any model summary/compaction is private temporary working material, never canon or authoritative memory. After compaction, source IDs and current rules must still be verified.

**Subagents default to none.** A bounded specialist could later investigate one independent source question using a child slice of the *same* operation allowance, returning a source-linked summary to the parent. That must beat deterministic retrieval and serial model work in a matched evaluation. Do not create one LLM per NPC or a recursive manager-worker network.

## Model route capability manifest

A route is not a tier name. Its captured server-side capability record must describe:
- exact provider/model/endpoint/version, JSON Schema strictness, JSON-object fallback, schema size limits, native tools and streaming support;
- model context, maximum generated tokens, possible reasoning tokens and whether output/reasoning share a ceiling;
- timeout, priority/flex service class, provider fallbacks and whether capability is enforced or advisory;
- price version and categories: ordinary input, cache read, cache write, output, any reasoning and overhead; trustworthy response usage;
- provider errors: refusal, invalid schema, output cut-off, partial stream, confirmed unbilled failure, ambiguous/possibly billed result;
- allowed privacy/caching semantics and locality where relevant.

**Current code:** the OpenRouter request always contains reasoning disabled, no web or context-compression plugin and provider fallback denied. A route policy containing a reasoning budget does **not** currently enable reasoning. Keep disabled as safe baseline; add carefully tested capped reasoning only on models with verifiable stop/billing semantics. Do not treat hiding reasoning text as disabling the bill.

**Default routing:** no provider/model swap just because an AI generated lengthy output. Effective task recipe and route capabilities are intersected at admission; unsupported hard schema or price/category uncertainty rejects dispatch or uses an **explicitly captured approved** alternative. Never let the model select a new route or payer.

## Three different caches

| Cache | Key | Where its truth ends |
| --- | --- | --- |
| **Canonical source/retrieval** | Story root hash, index version, scope and model-independent read rules | Immutable bytes and derived search; viewer permission still required |
| **Provider prompt prefix** | Identical actual rendered prefix, provider/model/endpoint-specific | A possible provider discount; validate via actual reported cached/write tokens and billed cost |
| **Identical response replay** | Full task, source/operation/route versions and idempotency identity | Only for genuinely identical accepted work, not a cross-story prose cache |

The existing request audit computes potential shared prefix bytes and leaves estimated input tokens/observed cache hit tokens **null** unless verified. That is the correct honesty standard. A larger common prefix is not a cache hit; a cache write may itself cost money; different routes may handle cache keys differently. Prefer smaller useful prompts, deduped sources and stable ordering before chasing implicit cache tricks.

A future explicit cache-control marker or sticky provider session must be reviewed for route support, privacy, cost and source identity; do not copy another provider's JSON field without verifying actual adapter behavior.

## Failure, repair and safety contract

All model-derived context, dialogue, canonical memory and user-authored world prose are **data**, not executable platform instructions. A model cannot increase round/read/money/latency allowance, convert private knowledge to public, reroll mechanics, change actor permissions or submit another player command.

The validator checks concrete plan effects/requirements/receipt use/source/visibility and structural schema. Bounded repair can fix an invalid candidate under the *same admitted operation* only when money and round allowance remain; it cannot change the accepted player intention or grant an unverified outcome. A sent-but-uncertain attempt is never automatically rerun as free.

A public Storyteller task's final narrative must not expose internal evidence packets, private creative directions, model/system prompts or unseen future obligations. Full raw provider prompts are access-controlled development artifacts, not ordinary operator analytics or client-visible StorySnapshot.

## Proof before promotion

- Snapshot exact task packet: show each prompt layer, stable/dynamic SHA/bytes, required source IDs, output contract and selected source use.
- Model-injected false instructions in a canonical document cannot change authority, reveal private policy or obtain new read tools.
- Same frozen actor and story with ordinary one-shot vs memory investigation: result/extra cost measured; ask_memory only used when meaningful information need exists.
- Provider cold/warm checks report actual cached token categories or say unavailable. Compare billed cost per accepted useful result, not hypothetical token savings.
- Native vs structured tool protocol only changes transport, never source/permission semantics; two independent provider routes are verified separately if advertised.
- No hidden paid fallback, automatic retry of uncertain work, or infinite compaction. Historical task versions still decode after changes.
- Different narrative directions produce intentionally different but equally authorized scenes, without changing their dice/clock/item outcomes.

**Optimization objective: useful grounded choices and memorable consequences per bounded unit of model cost and time, not maximum model calls per story.**
