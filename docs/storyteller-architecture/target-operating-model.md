# Target Storyteller operating model | bounded intelligence inside a truthful living world

**Status: selected long-term design target, 2026-11-14. Independent of the inherited POC's module arrangement.** All code changes remain separately owner-authorized. Authority: [original game vision](../vision.md), [constitution](vision-and-quality-constitution.md), [engine requirements](../engine-architecture/product-derived-requirements.md), [storytelling](../storytelling.md) and [usage/time](../technical/context-and-cost.md).

## Product-driven definition of a serious Storyteller

The game needs **a dependable creative decision-maker** that remembers a fictional life, understands the present, investigates the evidence actually needed, and proposes coherent next situations under the selected creative philosophy. It does not need a continuously running LLM mind, 30 agent tools, or a separate hallucinating agent for every shopkeeper.

**Desired target:** a task- and situation-sensitive **bounded Storyteller operation** whose work is proportional to uncertainty and value. A low-risk familiar exchange may use one model round. Reentry after months, a contested identity or a decisive consequential encounter may use a few focused search/read rounds. Long stretches of accepted work should call no model at all. An optional narrative director occasionally revisits existing source-linked private goals when the creative profile permits initiative and budget, without committing any world event.

The model should **never have less authority constraint on a richer tier**: more funding can buy attention/evidence/style, not free inventory, unauthorized actor decisions or stronger odds at dice.

### The two interacting loops, not one infinite chat

~~~text
LIVING WORLD LOOP (deterministic, durable, potentially weeks)
  Player or admitted world obligation / accepted activity boundary
  -> resolve admissibility + rules + frozen time/receipt
  -> schedule the next meaningful wake
  -> decide whether a narration/offer/report is actually necessary
  -> one bounded Storyteller operation when required
  -> validated publication + new authorized choices / facts
  -> player / approved routine / silence / next admitted event
  (may sleep with zero provider traffic indefinitely)

STORYTELLER OPERATION (ephemeral model conversation, durable task state)
  0. Capture exact world/actor/story/payer/source identity
  1. Select task purpose, mandatory evidence and effective bounded recipe
  2. Deterministic source/state retrieval + provenance/coverage
  3. Evaluate evidence sufficiency and optional research value
      sufficient -> final candidate
      missing / useful -> bounded ask/read with source-linked handles
      insufficient mandatory/too costly -> explicit held/blocked state
  4. Compose candidate using task-specific prompt + verified evidence
  5. Validate JSON, mechanics, narrative consistency and provenance
      safe repair if captured budget allows; never rewrite settled receipts
  6. Short authoritative publication fence -> passage/offer/notes or report
  7. Persist cost, outcomes, evidence-use and redacted evaluation telemetry
  DISPOSE provider request/thread. Keep canonical game life and operation receipt.
~~~

No player-action API is called by the Storyteller tool loop; the model is not a privileged alternate user. The typed outer operation is built on today's durable `generation` and `storyResolution`/consequence infrastructure unless replacement proves lower complexity and preserves old tasks.

## Six responsibility layers with distinct authority

| Layer | Job | Owner / state | No-go |
| --- | --- | --- | --- |
| **Game authority** | Current story, time, mechanics, item/actor/fact ownership, playable offers and effects | PostgreSQL + pure game rules | Model self-awarded outcomes |
| **Narrative/source authority** | Published passages, immutable canonical records, known vs private vs disputed claims, versioned active-scene scope | Immutable document roots + source-linked notes | Replacing canon with model summary |
| **Task authority** | Why Storyteller woke, exact accepted cause, what kind of result may publish, staleness/source fence | Application task admission/publication | Generic always-on agent |
| **Effective effort/funding authority** | Who pays, what route can do, how many rounds/reads/tokens/latency, repairs, background quota | Versioned policy intersection + captured task recipe | Tier name in prompt grants capability |
| **Investigation and creative work** | Read-only evidence questions, small candidate exploration, compose stage/story/offer | Short disposable model operation with controlled tools | Arbitrary SQL/files/Web or future knowledge |
| **Validation/observability** | Compare proposal against exact evidence/mechanics, record cost, latency, missing sources, accepted/published outcomes | Independent validators + redacted traces + human evaluation | Conflating schema green with enjoyable play |

A Storyteller profile sets **how it tells and initiates**, not the payer budget or model. A task recipe sets **how much investigative/composition work is eligible**, not whether a character can die. A model route sets **technical capacity/price**, not a user's game rules. Account entitlement/funding limits the whole operation but cannot define its fiction. These dimensions are orthogonal and intersect at task admission.

## Task catalogue as roles, not simultaneous subagents

Each task role has **one purpose, canonical input, permitted tools, output schema, publication target, latency class and failure semantics**. New roles are introduced for actual game needs, not aesthetic taxonomy:

| Task | When it occurs | Mandatory truth | Optional investigation | Publication |
| --- | --- | --- | --- | --- |
| **Opening Composer** | Explicitly requested draft opening, before Start | Reviewed premise, current package/rules and starting actor constraints | Read source world/rule package headings or selected identity when insufficient | Candidate only, never starts time |
| **Immediate Consequence Narrator** | Mechanical result already committed | Exact attempt, receipt, elapsed time, item/actor facts | Prior related facts, promise, current source | Current passage + fresh valid offers |
| **Contextual Dialogue / Continuation** | Selected conversational/situational choice | Current scene, prior accepted intention, known history/rules | Relevant person history and exact wording | Current passage + option proposal |
| **Controlling Interruption** | Admitted interruption/hold needing response | Cause/event, retained earned progress and permitted conditions | Why the event/participants matter | New current situation after publish |
| **Historical Reporter** | Accepted optional report required by captured policy | Frozen source event and chronology, no current offer | Source-relevant old details only | Report attached to original history, cannot supersede Now |
| **Evidence Investigator** | Subphase inside another task when needed | Root/version, exact question, visibility and remaining budget | ask/read only for missing relevant evidence | Private evidence packet, never directly story |
| **Continuity Curator** | When a committed scene establishes a durable significant detail | Source passage, identity, relationship, existing record/revision | Existing source and conflicting claims | Source-grounded descriptive record patches only |
| **Narrative Director (conditional future)** | At accepted scene boundaries/maintenance policy or explicit owner evaluation | Captured creative initiative, unresolved threads, canonical limits | Bounded source-linked creative alternatives | Private noncanonical possibility/direction, never automatic world effect |

**Do not automatically invoke all roles on every turn.** “Continuity Curator” can initially be the existing document/notes section of the same consequence result; splitting it into a paid job is only worthwhile if connected tests show value. Historical report is already distinct. Evidence Investigator is usually a bounded subphase in the **same generation operation**, not a second independently funded bot.

**Subagent policy:** default none. Later a specialist could answer one difficult scoped evidence question or generate alternate creative directions using a carved-out child envelope, but only after a discriminating comparison with deterministic retrieval + one serial model round. No recursive delegation, no private story data crossing scope, no autonomous story writes and no separate child budget recharge.

## Context and decision loop in a realistic scene

Consider a selected quiet-drama character speaking to an innkeeper about a gift given 40 scenes earlier.

1. **Current public/game state is mandatory:** speaker identity, current offered intent, relationship facts if typed, current item holder, active scene and current dialogue. No model search required for a current item holder.
2. **Direct source links:** a known memory card/relationship record points to the gift's committed transfer and prior meeting. Load exact related source if bounded.
3. **Need calculation:** the task prompt includes a question only if the model truly needs missing nuance (exact words, promise, prior emotional stance) to narrate faithfully; a cheap deterministic selector can decide the existing linked record is enough.
4. **Optional memory tool round:** `ask_memory` searches scoped current root for exact exchange; `read_memory` opens the recognized source; a missing search result yields partial/no-match, not a fabricated remembered phrase.
5. **Private comparison:** with high enough eligible creative effort and correct profile, the model may compare a subdued conversation vs a surprise recollection, citing real items. With low budget, it writes a simpler but coherent exchange using mandatory truth.
6. **Final proposal:** prose references the actual prior gift where justified; offers materially distinct intentions; no effect on item ownership unless the player accepts an admissible action.
7. **Publication:** checks unchanged scene/root/current offer, records source-linked descriptive changes and source passage, and atomically authorizes next actions. If stale, hold/redo only under captured policy, never overwrite newer canon.
8. **Later return:** retrieve source-backed relationship and event, not an ever-growing private model chat.

A more expensive profile may retrieve 2–3 additional sources or produce more nuanced dialogue. It cannot alter the actual gift transfer or invent a secret claimant as fact without separate world-authoring admission.

## Agency and authoring without omnipotence

**What the model may decide:** narrative emphasis, wording, whether a quiet moment deserves silence, admissible grounded opportunities, descriptive new identity/relationship text inside effective canon-invention policy, suggested optional art direction, private speculative possibilities for later.

**What the model may propose but code must admit:** finite process/choice plans, effects, item transfer, obligations, time, area/actor changes and transitions. Only typed supported mechanic families, validated against actor/rules/source/current situation and permission. No model-written fact transition without required declaration and effect.

**What the model must not decide:** deterministic dice/check results, forced player response, real-world scheduler, model provider key, payer, retry eligibility, unknown factual outcome, secret future world state becoming public, arbitrary permission escalation, raw SQL mutation, destruction of canon, private source disclosure.

**Legacy source tension:** the current system's hardcoded “never end character's life” is the *present nonlethal limitation* but not a universal game constitution. Future profile-specific risk requires a supported captured risk policy, not a more imaginative prompt; see GM mechanics separate.

## Adaptive decision protocol and stopping rules

**Policy decision at admission:**
- Determine task purpose and whether the source context is mandatory/complete.
- Compute effective budget as **intersection** of platform cap, account grant, payer funds/window, story-selected optional work, task minimum/maximum, model route capabilities and exact operation's remaining resources.
- Select smallest adequate **versioned recipe**: deterministic-only; one-shot; one-shot+limited repair; evidence-seeking 2–3 rounds; richer expert lane only if later evaluations demonstrate benefit.
- Use a **cheap deterministic need classifier first**: references to named known entities, unresolved source identity, time/provenance conflict, long absent scope, missing continuity evidence, known-vs-hidden ambiguity. A model round to decide if it needs a model round is not the default.
- The model may request another read *within* a preauthorized recipe; it cannot upshift its own route, allowance, creativity policy or latency.
- Preserve a **final-answer reserve** before optional research. At budget threshold stop exploration and do the final if required source is present; otherwise return a typed hold.
- Hard cap rounds, reads, indexed work, input/output/reasoning tokens, cumulative money and deadline. Every repair and optional specialist consumes the *same envelope*, never resets at a nested boundary.

**Stop classification:** completed valid candidate, no need for more evidence, exact source not found, tool/coverage incomplete, token/context too large, round/read/deadline exhausted, provider refusal, bounded invalid output, uncertain charged attempt, ownership/revision stale or required authority unavailable. Each maps to a distinct observable state; never generic “AI still thinking” forever.

## Session, compaction, plans and longer life

**Disposable provider conversation** is the preferred default. A new event creates a new task from canonical source; previous round messages are not blindly appended. Within a task, a compact working set (source IDs, exact read results and brief decision rationale/direction IDs) persists as structured operation state for restart/replay. A 2–3-round loop does not need provider-native transcript compaction; its context can be rebuilt on every model round.

A narrative **plan** may be worthwhile when selected initiative/duration demands it, but it must be **source-linked, private, revisable and noncanonical**, with explicit conditions/expiry/coverage. An unfulfilled plan is not an event; it does not spawn an NPC, move items, guarantee a plot beat or consume world time. A Storyteller should forget invalidated private ideas freely while never forgetting committed history.

A world may evolve in no-model intervals through admitted rules; one-way memory and structured derived indices allow long stories without a permanent agent process. Separate optional maintenance for stale retrieval metadata from creative new content. Do not schedule an LLM every X fictional minutes just because “the agent must be alive.”

## Quality control without sacrificing spontaneity

A validator should ensure grounded mechanics, provenance/visibility, no contradictory actor/item/time claims, complete requested intention and a coherent viable next action (or authentic held/quiet state). Do **not** require a generic LLM judge to rate excitement; the player's selected storyteller may prefer unresolved quietness.

Use bounded, task-specific repair for **structural** invalid output. For aesthetic dissatisfaction, record human evaluation and do controlled prompt/profile/route experiments; don't auto-spend another full model round just to make every paragraph more dramatic.

**Speculative vs published:** early prepared consequences remain private until exact settlement; a validator cannot treat a predicted success as true. Late historical report can be attached without changing the current scene. A failed provider attempt cannot advance fictional time or release a decision hold.

## Performance, reliability and scaling

Thousands of diverse users imply many mostly sleeping stories with occasional overlapping active operations. Costs scale with **admitted meaningful events**, not global wall time or repository size. A task queue must enforce per-story one controlling turn, account/provider concurrency, global spend, bounded backpressure and bounded QPS. Source index rebuild should be amortized by root hash, not repeated blindly for every story turn; cache/source data must be viewer-authorized even if physical CAS bytes are shared.

Do not hold a SQL row lock while calling a remote provider. ENG03 separately owns short-lock capture of source/version; this target defines what must be captured. The model can be slow; UI shows accepted/pending/failed/uncertain **without claiming fictional work continues because of model processing**. Typed error and missing-source recovery preserve last published passage and legitimate holds. Operator visibility may show costs without exposing private story content.

Production readiness requires ability to cancel/disable optional work without erasing committed mechanics, fail closed when funding gone, reconcile sent-but-unknown attempts without paying again, and continue old captured task versions after deployment. Current durable story/generation infrastructure is a foundation; no full replacement is justified until a selected alternative proves better gameplay and compatibility.

## Selected architecture posture

**Keep:** modular monolith, application-led deterministic state, immutable CAS + source links, one robust generation/cost lane, versioned profiles/tasks, strict local admission, Query/SSR client authority, outbox/durable worker.

**Change:** make evidence and creative effort genuinely task-aware, make retrieval economical and capable of revisiting lived nuance, separate task instruction/creative policy from hardcoded global taste, measure route caching/real costs, expose honest operational traces, and evaluate connected player lives rather than just JSON validity.

**Conditionally add:** stronger semantic/hybrid/relational retrieval, source-grounded episode/relationship summaries, private narrative director, specialized research child or high-reasoning route, only after matched quality/cost evidence.

**Willing to replace:** any current component that cannot express the selected end-state without corrupting authority or performance. Not willing to sacrifice causal truth or old living stories for a fashionable agent-framework diagram.

**Proof:** the same captured mechanics and player data produce distinctive, coherent, profile-faithful scene proposals with the **least needed investigative work**, and the model can leave ordinary life alone when nothing new should be narrated.
