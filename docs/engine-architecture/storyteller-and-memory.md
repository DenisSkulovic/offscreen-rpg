# The Storyteller and long-lived memory | creativity subordinate to a coherent life

**Status:** first-pass independent target, design only. **Product authority:** [vision](../vision.md), [storytelling](../storytelling.md), [continuity](../continuity-and-consequences.md), [gameplay](../gameplay.md). **Source to challenge:** [Storyteller runtime](../technical/storyteller-runtime.md), [memory research](../engineering/long-story-memory-and-retrieval.md), [canonical files](../technical/canonical-files.md), [source audit](evidence/source-audit.md).

## The product's genuinely difficult AI problem

A good AI dungeon master does not simply produce vivid paragraphs. It understands **what kind of game the player agreed to play**, discovers the relevant past and present, proposes consequential possibilities, admits uncertainty, remembers specific little details when they become relevant, and never violates deterministic effort or existing commitments.

This is a **sparse, stateful, creative adjudication system**. It should feel imaginative, not omnipotent; consistent, not rigid; lively, not obsessed with generating prose; and cheap enough that a six-month story does not require a database full of expensive forgotten model calls.

## The Storyteller's five distinct responsibilities

| Responsibility | Player's experience | Engine boundary | What AI is not authorized to do |
| --- | --- | --- | --- |
| **Orient** | The story remembers where I am and who matters | Build an exact, source-grounded context within a captured recipe | Treat every similar name as the same person or infer secret canon |
| **Interpret** | My intention is understood, including unusual actions | Candidate interpretation, clarification and typed proposal | Decide I succeeded or grant a new ability |
| **Compose** | The world presents a vivid scene and meaningful choices | Bounded scene and option proposal, source citations/handles | Bypass active decision/clock authority |
| **Judge creatively** | Situations, plausible motivations, event possibilities and trade-offs surprise me | Private authored proposal; validator admits allowed new descriptive/rule facts | Rewrite committed rolls, own entity transfers or execute script |
| **Remember** | An ordinary earlier promise or gift changes a later encounter | Source-backed identity/relationship/episode retrieval and verified publication | Replace missing evidence with plausible-sounding “memory” |

A single provider API call might participate in several responsibilities. **The contracts are separate even if the selected implementation combines them**, because they differ in authority, cost, evidence and retry semantics.

## A bounded narrative loop, not an infinite autonomous agent

\`\`\`text
Accepted situation / event boundary
           |
    source/identity orientation
           |
    recognize task purpose + context gaps
           |
  optional bounded discovery/read rounds
           |
  prepare candidate scene/options/knowledge patches
           |
  validate public/private format + fiction/rules authority
      / reject or hold \                             /
                 commit/publication
                       |
     current scene, playable offered intentions,
        updated canonical source references
\`\`\`

The current code already implements several pieces of this: versioned Storyteller profiles, captured immutable task/request artifacts, bounded multi-round memory exploration, differentiated report vs current scene, funding/usage fences and canonical publication. **Do not throw those away** to install a popular multi-agent framework. Instead verify that the pieces actually compose into a coherent *long-lived AI DM*.

## Exact authority: source vs fiction vs mechanics

- The stranger says “I never met Mara.” That is **published speech**, possibly untrue, and may conflict with objective history intentionally.
- The player *gave Mara a brass key*, and the server committed the transfer. That is a **mechanical fact** with a unique identity.
- The narrator can describe Mara absentmindedly touching the key, if still possessed and contextual.
- The narrator cannot say “You got the key back” and make it true without an admitted action/effect.
- A private clue can appear in Storyteller context without appearing in the player's World/Journal view, under an explicit audience/knowledge policy.
- A later recap can say Mara claimed something, but cannot claim that same statement was verified.

The engine needs **provenance and epistemic labels**, not a simplistic “true/false” flag per paragraph.

## Why memory is not a vector database

The player might ask or the Storyteller might need to know:

| Need | Right evidence path |
| --- | --- |
| Who owns the key **now**? | Current typed state, exact item identity and latest receipt |
| Did the player ever promise to return it? | Lexical/source search, identity alias, original passage/statement |
| Who is this stranger? | Registered identity + aliases + scope, source-link and permission |
| Has our friendship changed? | Verified interactions and applicable relationship policy, not a single generated scalar |
| Where can the player currently go? | Valid current location/authorization and current offered opportunities |
| What thematic callback suits this scene? | Relevance-ranked episodes/threads plus source inspection |
| What happened while I was away? | Ordered committed events plus known viewer-seen baseline, not sentiment search |
| Can a guard know the secret? | Actor/player visibility and knowledge scope, not semantic similarity |

**Different questions have different retrieval semantics.** A dense vector search may find a thematically similar anecdote but cannot certify current ownership or permissions. The retained system can combine exact registry lookup, structured queries, lexical candidates, relational links, source excerpts, then semantic retrieval when it adds measurable recall.

## The memory contract we would build toward

Six layers, not necessarily six storage services:

1. **Immutable primary evidence:** published source passages, exact committed rolls/effects, accepted actions/permissions, captured world/rule versions. Never editable by a summary.
2. **Current mechanical/authorization projection:** a narrow SQL-authoritative snapshot, not a long prose reconstruction.
3. **Durable identities and descriptive canon:** promoted characters/places/objects/threads, source citations, revision and visibility. Created sparingly when continuity needs them.
4. **Episode and relationship cards:** source-linked derived records to accelerate memory, never mechanically authoritative in isolation.
5. **Rebuildable indices:** lexical and eventually semantic/graph candidates, individually versioned and safely scoped.
6. **Bounded task context:** task-specific orientation, the exact relevant sources, explicit omissions and guaranteed inclusion of indispensable evidence into the **final provider request**.

A long-lived story should remain reconstructible with the context window emptied and with derived memory caches deleted. If any important fact exists **only** in the last model conversation, the platform is broken.

## Distinguish retrieval, packing and actual use

A common failure: the memory tool retrieves the correct encounter; the adapter packs it but drops it because the request is too large; the model answers without it; the trace still boasts “memory retrieved successfully.”

We need **source tracing across all stages**:
- recognized need, identity and query;
- candidate source list, exact versions and authorization;
- selected source bytes and required/optional priority;
- final actual serialized message/request inclusion (not just buffer preparation);
- model output referencing or applying correct source;
- publication checks for contradiction and unsupported effects.

This is a *quality/causality contract*, not a reason to log every private player paragraph into OpenTelemetry.

## Active-scene continuity and long chronology are different jobs

A tense five-minute exchange can consist of six Storyteller turns. Its exact most recent dialogue, tone and implied interpersonal meaning may matter more than a broad 20-year summary. Pin enough of the **same active scene** to maintain voice and intentions, while using canonical older knowledge to retrieve notable antecedents.

An ordinary two-week interval has different needs. Don't cram every shift into prompt. Supply current state, standing commitments, relevant repeated interactions and compact episodes, then open the originals on demand.

**Failure modes:** losing the last quoted line, merging two people with the same name, falsely remembering a transaction, inventing relationship advancement, or making a quiet worker suddenly the chosen hero because the model prefers high drama.

## Creator direction, provider route and autonomy are three independent axes

- **Creative profile:** tone, narrative initiative, thematic interests, risk storytelling within accepted policy.
- **Model/provider route + budget:** what inference is affordable and authorized.
- **Autonomy policy:** what *the character may do without the human responding* and when to stop.

A “Chaotic Storyteller” cannot spend resources or kill somebody outside the captured rule/consent. “Cheaper model” must not change the game rules. A higher creative risk setting cannot make a forbidden action valid.

The Storyteller can propose a strange legitimate consequence; only validated rules/accepted campaign risk turn it into committed state.

## Generating fresh options vs meaningful agency

Today, authored offered plans are validated and often fixture-specific. To serve the dream:
- Offer 1–N **distinct** meaningful intentions (not five paraphrased rerolls).
- Persist attempt history/changed context, so repeating a failed check can have meaningful costs/eligibility.
- Consider supported custom-intention interpretation with review/admission, where the player may say “I try to crawl underneath the bench” or “I ask a different question” even when not offered.
- No model response grants direct effects or authority; preserve the exact attempt and current offer revision.
- A proposed custom intention can be rejected clearly without inventing a failure in fiction.

**The most important future semantic-quality tests** aren't “valid JSON.” They are **distinctness, feasibility, continuity fidelity, earned-time fidelity, plausible surprise, fair consequence and agency**.

## Canonical documents: valuable, but don't make them a second bank ledger

Markdown is useful for human-readable lore, identity notes and long-lived Storyteller orientation. Content-addressed versioned manifests are valuable for export and proof. But current mutable mechanics, held commitment, authorization and spend reservations belong behind transactional authority.

**Architecture decision to challenge further:** the older canonical-files migration target proposes structured documents becoming owners for many kinds of state. That may be appropriate for **versioned snapshots/exports/portable read models**, not necessarily for the hot live clock and scarce item ownership. This requires an explicit decision before refactoring storage.

Use versioned descriptive root and mutable SQL state with an **atomic publication reference** rather than secretly relying on two separate stores to commit at once.

## Model/provider infrastructure and costs

The loop should support:
- one captured finite recipe per task, with allowed output tokens/rounds/reads/latency;
- separate per-account/story/global allowance and fair queueing;
- provider timeout with **uncertain** status rather than blind paid retry;
- same model/prompt/rule version pinned for a captured operation, unless explicit new admission;
- low-cost scripted/offline rehearsals and exact packet review;
- human opt-in for costly evaluations;
- optional reports/summaries that may defer while legal ongoing work continues.

Do not run a model every scheduler tick, for each NPC or for a trivial public GET. The cheapest model call is often the one the engine doesn't need.

## Evidence and metrics that actually matter

A ten-scenario provider-free suite is a useful mechanical baseline, but quality needs richer human-grounded corpora:

| Test | Observation | Failure |
| --- | --- | --- |
| Quiet six-month life | Same known person still recognized, actual equipment and promises consistent | Generic prose overwrites history |
| Source needle | Find a promise buried 300 passages earlier | Retrieval finds clue but final message omits it |
| Identical names | Two characters “Mara” in different places | Wrong identity/possession association |
| Spoken lie | NPC claims prior action never happened | Source speech treated as objective mechanic |
| Irrelevant history | Distinct recent event matters more than 50 pages of lore | Prompt overflow or arbitrary context |
| Microbe scenario | Generated choice fits available capabilities | AI proposes weapon/tool from fantasy habit |
| Scarcity | Ask model to grant 100 coins in dialogue | Result bypasses rule/receipt |
| Provider failure | Settled effect, narration unavailable | Reroll or double spend |
| Low budget | Story can progress through permitted quiet work | Unnecessary paid wake |
| Human creativity | Player wants to play another session voluntarily | Valid JSON but dull experience |

Capture provider model/version, sampled input class, actual cost, task retries, hallucination/contradiction rates, source usage and observer notes. **Never report “creative quality proven” from a single fixed benchmark.**

## Source-level seam to inspect next

- `packages/application/src/storyteller/context.ts` and `canonical-knowledge.ts`: where authoritative current state and optional documents are combined.
- `memory-exploration-controller.ts`: bounded rounds, persist/replay, missing/failing source behavior; large but not necessarily incohesive.
- `evidence-packing.ts` + `packages/storyteller/src/context/index.ts`: do selected facts reach the *actual final request*?
- `execution.ts` and `budget.ts`: immutable attempt/cost boundary, uncertainty path.
- `publication.ts` and `stories/passage-documents.ts`: source/version fence, descriptive patches, player-known/private handling.

**Target outcome:** a source-accurate encounter on a returning player's first session after many weeks, with a deterministic mechanics receipt and honest cost. That's the Storyteller's benchmark.
