# Domain authority | identities, facts, decisions and a durable causal spine

**Status:** first-pass target, not a replacement for existing database schemas. Inputs: [original concepts](../concepts.md), [continuity](../continuity-and-consequences.md), [product scenarios](product-derived-requirements.md). Current code is audited separately in [source audit](evidence/source-audit.md).

## Don't let “Story” become a 70-field God object

The platform needs a small **semantic model** even if the persistence layout uses several tables and immutable files:

| Concept | In the player's life | Its indispensable identity/authority | Does *not* imply |
| --- | --- | --- | --- |
| **Story** | One continuing fiction with rules, participants and source history | story ID, membership/owner, versioned policy, canonical root | One global simulated planet or narrator conversation |
| **Actor** | Player's character, NPC or other agency-bearing entity | story-local stable identity, controller/owner when applicable, capability state | Must be human, have HP, inventory or always be simulated |
| **Situation** | The present context and valid opportunities | source-backed scope, publication/revision, visibility, authorized offers | New situation with every LLM round |
| **Intention** | A thing the actor tries to do | immutable attempt/operation ID, actor, captured offer/interpretation and expected state | Guarantee of result |
| **Commitment** | Admitted work/journey/wait over time | activity/execution ID, terms, progress, time anchor and stop conditions | Always a job, always an ETA or always earns points |
| **Event/receipt** | Something that actually happened | unique cause/sequence, effective fictional time, source, typed changes | Every tick becomes a user-facing story beat |
| **Canonical descriptive fact** | Established person/place/relationship/lore | stable identity, version, visibility/authority and source links | An LLM sentence automatically creates a DB entity |
| **Storyteller turn** | One bounded preparation of current scene/options | generation/task ID and captured recipe/inputs/usage | Same as a scene, in-world action or fictional hour |
| **Rule package** | Specific world/game mechanics available to this story | pinned version + admitted capability definitions | Arbitrary untrusted code executed from a prompt |
| **Derived projection** | Journal, Now, recap, search result | viewer scope, source versions/cursor, rebuildable contract | Authority to mutate canon |

Create **typed** attributes for mechanics where needed, not an infinite JSON “world state” bag that any model can patch. Sparse worlds are a product feature; only identities that later correctness cares about need durable machine-readable records.

## Four kinds of statements must remain distinct

1. **Committed mechanic:** “The item transferred to Mara at fictional second 820.” Current inventory says Mara owns it, supported by a receipt/commit.
2. **Published source narration:** “The stranger said he was a watch officer.” It was said in canon, but the statement may be a lie.
3. **Attribution/interpretation:** “Mara suspects the officer works for the guild.” A belief or derived note, not a server-guaranteed fact.
4. **Unpublished/possible future:** private Storyteller plan, candidate scene or intended action. It must not leak into ordinary public state or become canon.

This distinction protects **creative surprise** and **mechanical fairness** simultaneously. A hidden villain can lie; the application cannot invent a hidden bank account debit from a sentence.

## Write-side authority pipeline

### A. Proposal

Storyteller proposes an interaction or the player proposes a future custom intention. Candidate identity, source and public/private fields are captured. **No** roll/resource transfer/time progression is authorized yet. The Storyteller may create new descriptive possibilities; a typed rule/effect validator decides which may be admitted mechanically.

### B. Admission

An actor/viewer authority check, offer version, current world conditions, rule-set revisions, resource ownership, consent, funding and temporal eligibility are all applied in an authoritative **transaction**. The selected action is frozen with a durable operation ID. Retries of the same operation cannot silently change the submitted body or pay for a second draw.

### C. Clock and rule settlement

At the correctly admitted effective game-time boundary, pure policy computes the result using **captured** rule version, eligible state, RNG evidence and effect vocabulary. The transaction writes durable receipt/event, current relevant state, consumed permission and any next authorized work; a worker replay sees the existing receipt.

### D. Narrative/knowledge publication

Source-grounded prose and **future offers** may be prepared in advance, but publication revalidates exact source and canonical root. Publication can be later than the action's effect. A failed passage must not undo a settled roll, give a free reroll or erase saved work. Descriptive changes need their own authority/visibility checks.

### E. Read projections

Authorized viewers see current situation, clocks/progress, Journal and knowledge through scoped DTOs. Cache or SSE may help deliver current truth, but cannot decide outcomes. Projected upcoming event ≠ already occurred event.

## One canonical business chronology, not necessarily full event sourcing

**Recommendation:** maintain a **durable causal ledger for player-meaningful committed events** (including source operation ID, actor, effective game time, story sequence and typed fact/effect references) alongside efficient current-state tables and immutable narrative objects. The log supports replay-for-diagnostics, history, notifications and return summaries; it does **not** automatically become the sole authoritative event-sourced write model.

**Why not pure event sourcing immediately?** The rules/content change frequently; reconstructing years of complex mechanical state from all historical event classes through new reducers may make schema evolution harder. Existing SQL state and receipts already protect strong transactions. A **causal event journal** plus current projections offers the important player truth without forced full-replay architecture.

**Guard:** don't build two competing canon ledgers. Define event identity/ordering and write it inside the same transaction as the state it describes; a report cannot create an alternate event. If recorded events are incomplete, the derived timeline must label coverage rather than invent a “full history.”

## Consequence semantics need more than quantity + fact

The target engine can eventually admit typed effects over **specific capabilities**:
- resources/quantities and bounded changes;
- item ownership and transfers;
- discovered identities/knowledge, with source/visibility;
- location/containment/relationship *when those concepts exist in the world*;
- form/capability changes with eligibility recomputation;
- damage/recovery for compatible combat/health rules;
- accepted obligation, promise or deferred consequence;
- spatial travel progress, but only if actual route mechanics are defined.

Not all are needed as new universal tables. A capability handler must say how its state is stored, who may change it, what evidence is required and what becomes visible. No executable model-authored SQL/scripts, and no always-on arbitrary entity simulation.

**Proof test:** a microbe's exposure changes through a supported check without ever creating a fake armor or wallet field. A wizard can transform only through a validated capability transition, not because narrator prose declared it happened.

## Story and actor revisions

Distinguish:
- **Story/world causal revision** for any accepted shared fact or situation change;
- **Actor-specific relevant state version** where independent actor changes eventually permit nonconflicting concurrency;
- **Published narrative sequence/root** for source chronology;
- **Public view version** for invalidation only;
- **Rule/content version** captured at action admission;
- **Individual operation ID** for exact retries;
- **Viewer-seen cursor** for a true “since last opened” recap.

One integer named `revision` cannot safely mean all of these. Current source separates some already; a future multiplayer design must articulate conflict scope before adding more independent counters.

## Causal transaction and crash examples

| Failure | Correct result |
| --- | --- |
| Browser resubmits the exact operation | The previous receipt/result is read, not a new action |
| Browser resubmits same ID with different body | Reject identity conflict; no partial mutation |
| Worker crashes before DB commit | Nothing committed; same admitted operation may be safely reattempted |
| Worker crashes after DB commit before reporting done | Duplicate delivery re-reads committed receipt, no second reward |
| Model dispatch uncertain | Preserve accounting uncertainty; no blind paid retry or reroll |
| Canonical object staged but SQL commit fails | Object remains unreferenced and can later be garbage collected; no phantom published root |
| SQL points to a missing object | Explicit read failure/repair, never narrate imagined content |
| Two actors contest the same item | Exactly one transfer wins through resource/actor authority; other receives a genuine conflict |
| A summary cites an outdated fact | Show attribution/version, retrieve current record before admitting action |

## Negative architectural tests

- Two publish attempts cannot produce different canonical passages for the same operation ID.
- A new character form can't accidentally inherit an inapplicable action.
- A past offer cannot be submitted after another participant changes the shared situation.
- Hidden Storyteller plans cannot enter public World/Journal projection through cache.
- An old report can't change a newly settled current situation.
- A new schema cannot reinterpret an old captured paid task as permission for extra spending.
- Re-reading a transcript cannot grant a resource or advance the world clock.
- The read model may be stale; stale read never means server-authorized write.

## What must be decided later

Precisely which **event identity/order taxonomy**, state ownership per new capability, shared-world actor serialization and alternate descriptions require implementation review. They should be selected from adversarial fixtures and current DB constraints rather than premade generic DDD hierarchies.
