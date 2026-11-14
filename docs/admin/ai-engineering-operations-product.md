# AI & Engineering Operations | execution truth, quality and cost

**Status:** Proposed product workspace, 2026-11-14; owner review required. **Owns:** investigation, operational understanding, incident management and quality/cost interpretation for Storyteller and related AI-backed work. **Not:** selecting an agent framework, inventing a loop in current code, authorizing provider calls, implementing telemetry or defining runtime technical contracts. References: [Storyteller constitution](../storyteller-architecture/vision-and-quality-constitution.md), [target operating model](../storyteller-architecture/target-operating-model.md), [game concepts](../concepts.md), [Commercial](commercial-operations-product.md) and [Gameplay](gameplay-worlds-product.md).

## 1. Product promise

Engineering should be able to determine **what work the system was supposed to do, what evidence and constraints it had, what it actually attempted, what got committed/published, how much it cost, and how any failure affected the player**.

AI quality is not HTTP availability alone. A successful 200 response can narrate unearned items, ignore relevant history or violate a selected Storyteller profile. Conversely, zero model calls during an authorized quiet activity may be precisely correct operation.

The console must never fabricate a "model agent loop" because a product spec expects agents. Its view should truthfully represent whatever task stages and model rounds can be evidenced. The desired target is a **bounded, task-sensitive Storyteller operation** inside the separate authoritative living-world loop, not a permanently running omniscient AI.

## 2. The observability units must be named correctly

| Unit | Business meaning | Must not be conflated with |
| --- | --- | --- |
| Accepted player command | Player or delegated authority chose a valid intention | Model request |
| Mechanical execution / receipt | Durable authority over progress, result or fictional time | Passage or payment |
| Storyteller task | One bounded admitted creative/investigative job with a purpose | One model round or one game hour |
| Model round | Individual provider request/response; a task may have zero, one or several | Whole Storyteller turn |
| Evidence read / investigation step | Source-bounded retrieval under task permission | Free authoritative game action |
| Candidate/proposal | Model-authored, not yet accepted content/effect | Committed world fact |
| Validation outcome | Application accepted/rejected proposal under rule/source limits | Prose quality score |
| Publication | Valid narrative or report becomes current for permitted viewers | Mechanical settlement or provider callback |
| Cost/usage event | Provider-side and account-side measurable resource effects | Successful customer experience |
| Incident | Coordinated abnormal condition with impact and mitigation | Every individual exception |

Storyteller turns, passages, scenes, model rounds, reports and events have distinct meanings in the existing game vocabulary. The Admin must use those meanings. A task can fail after spending provider money; a settled mechanical result can remain awaiting narration; a derived historical report cannot become the current playable offer.

## 3. Surfaces and navigation

| Surface | Job | Most useful actor |
| --- | --- | --- |
| Reliability Overview | Health by player-facing operation, queue/worker conditions, error classes, delay and unknown status | Engineering, on-call |
| Execution Explorer | Find exact task/command/round by stable reference, version, outcome or time | Engineer, specialist Support |
| Task Timeline | See captured cause → evidence → model work → validation → publication | Engineer, AI specialist |
| Evidence Inspector | Understand which sources were admissible, available, used, missing or stale | AI specialist, authorized reviewer |
| Cost & Effort Explorer | Correlate task purpose/recipe, rounds, retries, token estimates/actuals and results | AI Ops, Finance |
| Quality Review | Compare mechanical validity, continuity and human-perceived profile fidelity | Game Design, Product, AI evaluation |
| Incident Workspace | Coordinate blast radius, mitigations, handoff, communications and verification | On-call, LiveOps, Support |
| Model/Release Comparison | Understand outcomes by named route, configuration, target population and time | AI Ops, LiveOps |

The source entity and permission scope stay consistent across Gameplay, Player 360, Commercial and LiveOps. An engineer can link a technical execution into a Support case without copying unredacted player content into general notes.

## 4. Task timeline: what "why did this happen?" should show

A strong per-task narrative answers:
1. **Cause and admitted identity:** why did the task begin; which campaign/participant, command, event or maintenance reason justified it?
2. **Captured commitments:** applicable world/rules state, source revision, Storyteller profile, task purpose, funding and relevant version.
3. **Evidence sufficiency:** what was already provided, what was retrieved or not retrieved, where coverage was partial and what visibility constraints applied.
4. **Work actually performed:** model route and each evidenced round/tool step, including whether the task used no additional investigation.
5. **Proposals and gates:** candidate generation, validation/rejection, bounded repair or abstention/hold, with reasons that are safe to show.
6. **Authoritative outcome:** mechanical receipt (if any), published passage/report identity, staleness or blocked publication.
7. **Customer and economic impact:** what the player saw, whether gameplay remains held, allowance effect, provider expense, internal diagnostics and follow-up.

An execution timeline may show **unknown/not instrumented** instead of inventing missing steps. In particular, an expensive AI round must not be reported as proof of meaningful investigation or high creative effort.

### Levels of evidence disclosure

- **Tier A, operational aggregate:** attempts, outcomes, delays, costs and error classes without personal content.
- **Tier B, scoped task summary:** IDs, sequence, versions, evidence coverage/provenance and redacted outcome.
- **Tier C, sensitive context:** raw prompts, source passages, participant-private material and model replies, purpose-limited and audited.
- **Tier D, restricted secrets or nonessential credentials:** not exposed as general Admin debugging data at all.

A capability to view a trace is not a capability to read full prompt payloads. The system should help diagnose most failures without Tier C.

## 5. Reliability: measure player outcomes and internal conditions separately

Recommended dimensions:
- **Admission integrity:** was a request accepted exactly under valid gameplay, access and spending limits?
- **Mechanical settlement:** did the accepted rule/time result complete correctly, without duplicates or stolen progress?
- **Narration readiness:** did the required task reach valid publication without new unauthorized effects?
- **End-to-end usability:** did the authorized player actually receive the resulting view/choice?
- **Cost control:** did the task and any retries remain within approved exposure, including uncertain provider attempts?
- **Recovery:** after crash, timeout or lost acknowledgement, could the original operation be inspected and continued safely?
- **Quality:** was the result faithful to evidence, rules and player-selected Storyteller, with appropriate uncertainty?

Show distinct operation classes; an opening preview, required consequence, historical report and optional background curation have different stakes. A speculative model "quality" indicator must not hide verified mechanical failures.

**Never present missing telemetry as zero.** A budget dashboard with stale accounting should disclose uncertainty and use conservative controls where necessary.

## 6. Investigating an agentic operation seriously

The long-term target is not "call LLM, hope for the best". The operator experience should expose, when available:
- the legitimate task goal and available bounded tools;
- deterministic evidence supplied before model inference;
- whether the model sought additional relevant evidence and why;
- which source handles were actually read, and relevant gaps;
- whether investigation stopped because evidence was sufficient, because limits were reached, or because of a fault;
- proposal, validation, rejection, repair and publication result;
- cost/latency trade-off against a cheaper adequate route.

**Importantly, zero optional tool calls can be a correct and efficient decision.** The product should not reward fake agentic activity, extra steps or verbose traces.

For the present POC, these are desired future observations. Availability of a field must be grounded in actual instrumentation at technical design time.

## 7. AI cost and player funding are different accounting views

An operation can have:
- a commercial allowance reservation or consumed entitlement unit;
- one or more provider model rounds with uncertain or actual spend;
- internal retry/recovery or diagnostic costs;
- a player-visible outcome that may be success, failed, pending or never published.

A single "AI credits spent" counter loses essential truth.

An AI Ops view can show estimated tokens/spend, provider-reported data, task-level aggregation, late corrections and uncertainty. Commercial owns the policy of **what a customer is charged/allowed**. AI Ops owns the explanation of **what technical work occurred and why**. Each can open the same causal record.

Distinguish cost **per model call**, **per admitted task**, **per published turn**, **per successful player-facing outcome**, and **per active user**. Denominators matter enormously.

A model optimization should be evaluated together with continuity, accepted outcomes and player satisfaction. Spending less while causing more failed or boring sessions is not an unqualified win.

## 8. AI quality: three separate review lenses

### A. Objective mechanical/source correctness
Rules and receipt fidelity, no inventory duplication, legitimate time, permission/visibility compliance, source grounding, no uncommitted claims presented as settled fact.

### B. Storyteller fidelity and narrative continuity
Did tone, creativity, narrative agency and context selection fit the selected profile and campaign? Did recurring relationships and meaningful earlier facts remain coherent? Was optional creative investigation useful?

### C. Player-perceived quality
Actual player feedback, abandonment, frustration, delight and qualitative review of moment, sequence and longer life. A contemplative story is not inherently underperforming because it lacks combat.

A valid evaluation system shows sampled coverage, human judgment where appropriate, profile/context, confidence and disagreements. There should be no single universal **fun score** treated as objective fact.

## 9. Incident response as a cross-team product flow

**Example: model update produces much slower and costlier turns.**

1. An alert identifies the affected task types, release or model route and reliable observed window. An on-call engineer opens one incident, not many disconnected bug threads.
2. Engineering follows verified execution records: model rounds, retries, errors, evidence depth, publication statuses and funding outcomes.
3. LiveOps sees affected cohorts/configuration and can propose a targeted stop or rollback under its separate authority.
4. Finance examines actual and estimated cost exposure; Support sees affected customer symptoms and impacted cases.
5. Authorized staff act according to a bounded mitigation procedure. A stop of *new* paid dispatch is not a claim to cancel all external charges already in flight.
6. The incident records what was attempted, authorized, verified, still unknown, and which customers need remedy.
7. Recovery is measured at the gameplay outcome level, not merely a lower HTTP error rate.

**Incident classification** should separate cost overrun, data disclosure, rules/canon violation, provider outage, degraded latency and subjective narrative regression. These may need very different responders.

## 10. False-positive and failure cases

- A player is quietly working for hours; lack of model calls is expected, not agent outage.
- Mechanical work settled, narrator failed; show valid receipt plus pending passage, never reroll the action.
- Provider timeout after charge uncertainty; do not automatically replay a model task and charge twice.
- An operation had one model call; do not display fictional planning or tool steps to make it look more "agentic."
- The model requested irrelevant evidence; a redacted trace can reveal inefficient context use without disclosing private prose.
- A task produced syntactically valid output but narrates an unearned reward; this is a correctness incident, not success.
- An engineer has trace access but lacks another participant's private narrative permission; raw prompt remains blocked.
- A sandbox experiment consumed internal model budget; no customer allowance is reduced.
- A global dashboard shows unknown/stale spend; do not imply the platform remains safely under budget.
- A rollback reduces future failures but does not undo prior corrupt publications; game repair remains a separate action.

## 11. Owner decisions still open

AD-P05: raw prompt/private evidence policy; AD-P10: configuration and task version adoption; AD-P11: standard metrics, observation windows and business definitions; AD-P15: on-call emergency controls; AD-P16: Chamber interoperability; AD-P22: cost attribution and funded uncertainty; AD-P25: quality-review governance and what counts as actionable regression.

No observability implementation, storage/indexing scheme, provider policy or alert threshold is selected here.
