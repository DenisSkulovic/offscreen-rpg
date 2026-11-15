# Product destination | Understand every real incident without recreating it

**Status: proposed integrated product target, 2026-11-15.** Distinguish accepted goals from first-wave proposed details before implementing. Product owners: [game continuity](../continuity-and-consequences.md), [Admin](../admin/product-acceptance-and-scope.md), [Support](../admin/support-and-customer-success-product.md), [AI and Engineering operations](../admin/ai-engineering-operations-product.md), [Chamber](../engineering/targets/chamber-laboratory.md).

## 1. The product promise

A legitimate observer should be able to ask **“What happened to this story, at this moment, according to which data and instructions, and why did the system take that particular path?”** The answer should appear as a coherent interactive exploration, not a wall of application logs, SQL queries or a disconnected list of model messages.

The player should be able to revisit **their own published story** as a sequence of actual recorded scenes, choices and consequences. Support should quickly explain a stuck or inconsistent game without reading protected internals. A developer should investigate the exact old source state, rule version, context assembly, model output, validator and publication outcome **even when today’s code and prompt have changed**.

The system should make novel bugs cheaper to understand than to reproduce. It should never make old player-private text universally visible to staff just to make debugging convenient.

## 2. Distinct human investigations

| Persona | Starts with | Must discover in minutes | Requires separate scope |
| --- | --- | --- | --- |
| **Player** | A story, chapter-like location or date | Published scenes, their own accepted choices, actual effects and time progress; replay without new effect | Only own/authorized participant perspective |
| **Support L1** | Ticket + verified account/campaign | Current status, latest successful action, missing or pending narration, expected wait, source-linked safe error, escalation path | Authorized case and player/campaign metadata; narrative content not assumed |
| **Support specialist** | Suspected continuity or item problem | Source-backed chronological event trace, when a hold happened, what changed, affected scene and reproducible issue bundle | Case-purpose restricted historical content only when approved |
| **Developer** | Ticket, incident, generation ID or trace link | Exact old input/task, effective instructions and config, source read/omit decisions, tool/model rounds, validation, state before/after, promotion/publication fences | Explicit technical evidence capability; sensitive body access separate and audited |
| **SRE / incident responder** | Latency alert, queue backlog or cost spike | Cross-service spans, Temporal/outbox/DB/CAS bottleneck, impacted operations and release correlation | Operational metadata; game prose not necessary |
| **Trust / Privacy** | Data complaint or suspicious access | Which staff viewed protected content, which artifacts existed and were disclosed, erasure/legal-hold state | Trust-only scope, not broad game control |
| **Product / game designer** | Regression or play-quality report | Grounded choice/outcome sequence, model/style/version cohort, outcome rates and controlled comparison | Aggregated/pseudonymized by default; individual content only with a legitimate purpose |

The **same underlying evidence** feeds all views, but different projections and permissions produce different screens. A Support employee should not need to learn `traceparent`, Temporal, or JSONSchema to answer “Did the repair finish and why didn’t the scene update?”

## 3. Golden journeys and “done” criteria

### G1. Customer's story is stuck after an action

Support searches an exact player/case/campaign reference and sees:
- A readable “Now” state: last published passage, current decision, running/held/paused action, real/fictional time, with freshness.
- An event timeline of accepted intention → game time → mechanical receipt → Storyteller task → provider review/round → validation → publication, with missing/skipped stages explicit.
- A trustworthy explanation: “The action settled, but narration could not publish because the source scene changed,” backed by captured IDs and status.
- A case-linked escalation package with **scope-limited link to the same evidence**, not a copied dump of secrets.

**Proof:** two hostile fixtures distinguish (a) unearned work vs actually finished work without prose, and (b) stale publication vs never dispatched model; neither results in invented payment or duplicate action.

### G2. Developer examines one wrong turn

One click from a generation or scene opens a **Turn Workbench** with synchronized horizontal timeline, scene before/after, state diff, source graph and Storyteller operation tabs. The engineer can answer:

- What exact player command, selected option and source revision led to this turn?
- Which story/campaign settings **were effective then**, not current settings now?
- Which prompt instruction/profile/world/rule sections, version/creator/approval and code release supplied each block?
- Which documents were eligible, selected, fetched, pruned, absent or actually included in final request? **Why?**
- What byte-exact provider packet was sent, which route/model/token ceilings and rounds were used, and what did provider actually report?
- What output was validated/rejected, which mutation was admitted, what was published, and which authority fence stopped a stale candidate?

A useful first-run test: show an old failed recall and prove the viewer can tell “document existed but was not selected” from “selected and loaded, then removed by packet budget” from “included but model ignored it.” These are fundamentally different bugs.

### G3. Incident crosses services and days

Developer opens a command ID and follows linked HTTP acceptance, SQL commit, outbox notice, Temporal workflow/run/activity, CAS read, model attempt, publication and SSE/client invalidation, even if multiple process traces expired or sampled out. Show actual causal links plus time and retry transitions; do **not** fake one continuous long-running OpenTelemetry span over an eight-hour activity.

### G4. Player replays yesterday

The player enters **Story Replay**, navigates published scenes/decisions/time and observes the original scene content and recorded outcome. Replay **does not** grant options, draw dice, call the model, spend currency or change the live campaign. It can visualize a previous outcome even when the current world has moved on. Hidden plans, unvisited future branches and internal provider messages remain invisible. Historic participant-specific perspective matters for future shared stories.

### G5. Developer reproduces a historic failure safely

From an authorized incident, create a **sanitized diagnostic export** for Chamber containing pinned fixture/code/rule versions, deterministic input, recorded RNG/time/external responses and a coverage manifest. Run against current code in an isolated sandbox to compare policy/validator behavior. This is **not** production “time travel”, not replay in the live campaign and never automatic provider re-invocation. If required historical dependencies are missing, mark reproduction incomplete, not successfully deterministic.

### G6. Protected narrative access and erasure

A staffer with only metadata permission sees the existence/state of a model operation, not its prompt. To inspect an individual narrative, an authorized operator supplies an eligible purpose/case and optional step-up/approval; the read is attributable and time-bounded. Erasure removes eligible bodies and generated indexes across tiers, while immutable minimal security audit may be retained only where legally justified. Replay honestly reports unavailable protected history.

## 4. First-class interaction ideas

**Cross-filtering** is a central UI behavior: select a scene, highlight its causal chain; select a model round, highlight the source blocks that entered it; click a changed actor fact, show who/what committed it; select a config version, compare previous effective version and downstream turns. Every visual node opens a human-readable explanation with exact source IDs available on demand, not as default noise.

A good investigation view has **three cognitive depths**:

- **Overview:** “The player tried to move an item; its holder changed during the wait; the action was interrupted, and a new scene remained pending.”
- **Diagnosis:** show source/receipt timeline, actual changed facts, missing proof, affected generations, cost/funding/hold.
- **Forensics:** inspect captured envelopes, validated sections, raw input/output where lawful, stable IDs, hashes, code artifacts, SQL source revisions, trace/log/metrics pivots.

Each depth should expose what is unknown, partial, simulated or redacted. No role should have to extract comprehension from unformatted JSON to do routine work.

## 5. Five product quality bars

1. **Causal completeness:** every accepted operation has a durable linkable identity to its real result or documented unresolved state. Child traces and optional rich bodies may be missing, but the primary history must say so.
2. **Historical fidelity:** a replay or frozen turn uses original recorded facts/outputs, not current model prompts, current settings or a later source alias.
3. **Human usability:** Support can answer common cases without raw logs; developer can inspect a prompt provenance chain and true state delta with a bounded number of purposeful interactions.
4. **Access safety:** staff-facing narrative, secret configuration and raw model packet access is explicit, limited and audited; denied deep links never leak existence or content.
5. **Economic sustainability:** high-volume quiet ticks are summarized/aggregated while significant transitions and paid model attempts get rich evidence; storage growth, ingestion failures and budget are observable.

## 6. Non-goals and explicit challenges

- Not a permanent recording of every instruction inside a model’s hidden internal reasoning. Retain **actual transmitted input, visible tool calls/observations, submitted decisions, optional provider-returned reasoning only if legitimately exposed and policy-permitted**, and deterministic application-side decision traces. Never fabricate hidden chain-of-thought.
- Not an indiscriminate SQL change log or a new global event-sourcing rewrite of the game.
- Not a generic “run arbitrary prod SQL” developer console, unscoped “view as player”, screen recording, or ticket content used to elevate access.
- Not a reason to store player secrets permanently or send raw prompts to every telemetry vendor. Privacy is a design dimension of observability, not its enemy.
- Not automatic deterministic reproduction of a nondeterministic model response. **Playback of recorded output** is exact; **regeneration** is a controlled new experiment with potentially different output.
- Not a promise of exhaustive historical recovery from a pre-instrumentation POC. Missing evidence must remain visibly missing.

**Owner product acceptance still needed:** exact replay audience/retention, escalation permissions for private narrative access, and the acceptable storage/cost budget. The recommended direction above is specific enough to inform technical design without silently granting staff permissions or permanent retention.
