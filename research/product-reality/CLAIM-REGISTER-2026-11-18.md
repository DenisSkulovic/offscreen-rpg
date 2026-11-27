# High-impact claim register | product maturity is not implementation status

**Not an inventory of every sentence.** This is an evidence-first pilot of claims that could misdirect a coding agent into building an impossible, uneconomic, or incompatible game. Source paths are relative to repository root at `ec8c652c5b0a`. The statuses in this table are an **auditor's proposed treatment**, not owner-ratified product edits. Read the owning source heading before changing it.

**Vocabulary**

- **Invariant (keep):** an authority/consent/cost constraint that must hold even in an impoverished POC. It may be selected without proving that the full game is fun.
- **Source-observed:** code path identifiable; offline tests or historic paid provider reports must be cited separately; no automatic quality claim.
- **Experience target (prove):** owner-favored product behavior; acceptance and economic feasibility not demonstrated.
- **Research hypothesis:** a plausible approach needing a comparative test or product decision. Being in a selected document is NOT enough to graduate it.
- **Illustration/stress test:** story example, *not* a required mechanics or release surface.
- **Horizon bet/park:** retained aspiration outside the current feasible slice.

| ID | Claim or implied commitment | Owner/source | Current evidence / problem | Proposed treatment |
| --- | --- | --- | --- | --- |
| PVR-01 | Player selection cannot silently write an outcome | `gameplay/actions-and-commitments.md#stable-meanings` | Bounded intent/admission/resolution exists; core causality | **Invariant, keep** |
| PVR-02 | Fictional time advances only under admitted work | `gameplay/time-and-autonomy.md#pace` | Solo source and arithmetic tests; no universal group time | **Invariant** with solo scope |
| PVR-03 | No model-chosen die faces or duplicated effects | `gameplay/rules.md#authority-split` | Typed checks/effects; source and tests reported | **Invariant** |
| PVR-04 | Spend is reserved and reconciled, not inferred free | `technical/storyteller/request-context-and-cost.md#budget-accounting` | Implemented simulated ledger, historical real provider attempt; account reconciliation unknown | **Invariant** plus evidence tiers |
| PVR-05 | The real game can be enjoyable with one solo character | `foundations/vision.md#first-playable-target` | Sustained human-reviewed live play absent | **Experience target, primary proof** |
| PVR-06 | Small friend party is *first* playable | `foundations/vision.md#first-playable-target` | Same page marks live shared acceptance Proposed/Blocked | **Horizon bet**; remove release implication pending acceptance |
| PVR-07 | A hundred actors can inhabit shared world | `foundations/vision.md#larger-shared-worlds` | No performance, consent, story concurrency or cost evidence | **Horizon bet** only |
| PVR-08 | D&D-inspired checks support meaningful action | `gameplay/rules.md#first-rules-subset-poc` | Checks/receipts in code, not proven satisfying long play | **Bounded target**: one ruleset, few action families |
| PVR-09 | Revised fifth-edition foundation works across every genre/body | `gameplay/rules.md#world-independent-foundation`; `gameplay/worlds-and-characters.md#flexible-settings-and-protagonists` | Form applicability is conceptually solved, gameplay and schema migration not demonstrated | **Research hypothesis** for generalized gameplay; keep form-neutral data discipline |
| PVR-10 | Fixed options can offer meaningful player agency | `gameplay/rules.md#choice-breadth-mechanical` | No free-text channel; validating choice interest is outside schema | **Experience target**; measure choice diversity, unexpected intents, frustration |
| PVR-11 | Storyteller authors local activities without re-inference | `gameplay/actions-and-commitments.md#prepared-local-life-while-the-storyteller-is-dormant` | Bounded opportunities present, general long-tail authored choices untested | **Experience target** with fallback and budget proof |
| PVR-12 | Ordinary time costs zero model tokens | `gameplay/time-and-autonomy.md#routine-execution-and-event-escalation` | Deterministic work can be zero calls; new scenes, novel dialogue and reports are not | **Invariant** only for supported operations; disallow blanket zero-cost-life claim |
| PVR-13 | Work, patrol, travel all fit one generic progression | `gameplay/actions-and-commitments.md#one-generic-progression-flow` | Common clocks/effects exist; domain-specific rules differ | **Hypothesis** for each new activity family |
| PVR-14 | An overnight plan can complete several routine actions | `gameplay/time-and-autonomy.md#bounded-plans-for-absence` | Queue permissions and failure policy still proposed | **Research hypothesis**; first POC allows only accepted finite work |
| PVR-15 | Strange developments can occur coherently during routine | `gameplay/time-and-autonomy.md#routine-execution-and-event-escalation` | Trigger/event choice quality and cost not proven in live run | **Hypothesis**; static scripted events first |
| PVR-16 | Personal autonomy chooses during absence | `foundations/vision.md#what-this-page-selects` | Explicitly withheld consent; potentially high product harm | **Park** pending a new owner decision |
| PVR-17 | A scene is a multi-turn situation, not every passage | `foundations/concepts.md#player-and-world-concepts` | Coherent vocabulary; scene-frame not full implemented lifecycle | **Invariant term**; source tier explicit |
| PVR-18 | Rich worlds don't require simulated NPC populations | `gameplay/continuity.md#sparse-world-progressive-materialization` | Promising low-cost principle; threshold needs real quality review | **Keep principle**; prove identity promotion |
| PVR-19 | Any consequential mentioned NPC/object becomes a durable record | `gameplay/continuity.md#sparse-world-progressive-materialization` | Deciding *when* correctness depends is contextual; current materialization incomplete | **Hypothesis** with false-promotion and missing-promotion tests |
| PVR-20 | Scene-frame contains actors, placements and atmosphere | `gameplay/continuity.md#places-scenes-and-cinematic-presentation` | Candidate `scene-frame.v1` proposed, no complete proof | **Research hypothesis** |
| PVR-21 | A route's distance and progress can be consistent | `gameplay/continuity.md#space-movement-and-maps` | No authoritative world-neutral spatial representation selected | **Hypothesis**, do not imply map implementation |
| PVR-22 | One coarse uniform 3D cube is suitable map unit | `gameplay/continuity.md#space-movement-and-maps` | Explicit candidate; no spatial acceptance or performance proof | **Horizon bet**, exclude POC |
| PVR-23 | A graph of places could be enough for first travel | `work/designs/open/spatial-play/README.md` and `gameplay/continuity.md` | Possible design alternative, not current product selection | **Experiment candidate**; compare graph vs no spatial engine |
| PVR-24 | Player can be mid-journey and change route coherently | `gameplay/time-and-autonomy.md#travel-duration-and-progress` | Movement/progress rule explicitly undesigned | **Hypothesis**; test one paused leg first |
| PVR-25 | Objects retain ownership and quantities | `gameplay/rules.md#authority-split`; `gameplay/continuity.md#possessions-and-exchanges` | Small item create/transfer and typed quantity effects, not general commerce | **Invariant** for currently typed things only |
| PVR-26 | A contextual bargain does not need an economy simulator | `gameplay/continuity.md#possessions-and-exchanges` | Mechanically plausible with specific effects | **Experience target** in one scenario |
| PVR-27 | Canonical Markdown files give Storyteller reliable memory | `gameplay/continuity.md#context-and-cost`; `storyteller/memory-and-continuity.md` | Durable sources are real; correct selection and model usage remain unproved | **Research hypothesis**; storage ≠ recall |
| PVR-28 | `ask_memory` / `read_memory` is a usable live agentic loop | `technical/storyteller/request-context-and-cost.md#recall-over-many-days`; `packages/storyteller/README.md` | Bounded controller exists; ordinary tasks tool-free; provider-driven exploration not general live default | **Source-observed plumbing, not game capability** |
| PVR-29 | Semantic knowledge graph improves game memory | `technical/storyteller/context-selection-and-recall.md#search-belongs-in-the-poc` | Not selected or proved; developer Cognee pilot is a different problem | **Research hypothesis**, do not vendor-shop without measured gain |
| PVR-30 | A promise made 40 scenes ago is recalled appropriately | `technical/storyteller/context-selection-and-recall.md#concrete-acceptance-flows` | Acceptance test specified, sustained live quality unproved | **Experience target**, hold until tested |
| PVR-31 | Narration preserves subtle emotional/nonverbal context | `foundations/concepts.md#player-and-world-concepts` | Correct goal; expensive to verify and context-sensitive | **Quality hypothesis**; human rubric needed |
| PVR-32 | Storyteller develops private future pressure without forcing it | `storyteller/behavior-and-quality.md#narrative-initiative` | Guardrails well specified; cohesive, context-aware live planning unproved | **Research hypothesis**, not a hard POC dependency |
| PVR-33 | Quiet and chaotic profiles have meaningfully different voice | `storyteller/profiles-and-settings.md`; `storyteller/behavior-and-quality.md` | Editor persists settings; scripted narrator repeats saved state; live differentiation unproved | **Experience target** with paired human test |
| PVR-34 | Players can set five-domain lore invention policies | `storyteller/profiles-and-settings.md#canon-invention-policy` | Detailed policy proposed, source editor does not expose it | **Hypothesis**, choose one simpler default for proof |
| PVR-35 | Player can change creative settings safely during work | `storyteller/profiles-and-settings.md#changes-during-play` | Versioning source exists, wider policy unproved | **Guard** with user-visible invariants |
| PVR-36 | The Living Book is the right visual metaphor | `experience/living-book-poc.md` | Owner-selected for POC; some code exists, no long reading validation | **Selected design target**, not solved UX |
| PVR-37 | Storyteller can control scene appearance economically | `experience/design-system-and-expression.md`; `technical/client/scene-direction-production.md` | Conditional DIR03; no live writer approval | **Hypothesis**, stop at deterministic display until proof |
| PVR-38 | Reader can understand hold, budget, retry and pause | `experience/play-and-decisions.md`; `experience/living-book-poc.md` | Usable status contracts and shell; human acceptance pending | **Experience target** |
| PVR-39 | A meaningful return after days is possible cheaply | `experience/return-and-journal.md` | Raw passage reader exists, valid summary/long-recall quality not proven | **Research target** with 1/7/30-day fixtures |
| PVR-40 | Timed response window and delegated default | `gameplay/time-and-autonomy.md#response-windows-and-absence` | General player policy explicitly not accepted | **Blocked future decision**, never imported from Chamber fixture |
| PVR-41 | Group pause/funding/concurrent decisions coherent | `gameplay/acceptance-scenarios.md`; `work/designs/backlog/shared-play/README.md` | Proposed/Blocked; not available | **Parked** |
| PVR-42 | Admin Player 360/support grants are production-ready | `admin/README.md`, `admin/player-360-and-support.md` | Explicitly *not* production powers | **Future operating proposal**, no current grant |
| PVR-43 | Multi-role Admin console is needed for POC | `admin/charter-and-personas.md` | Long-horizon product direction, not evidence of current user need | **Park** broad UI; keep minimal observability/kill switch |
| PVR-44 | A visitor can get the magic instantly without erasing real-time play | `foundations/vision.md#why-build-it` | UX/experience tension; no tested demo protocol | **Design hypothesis**, choose honest demo acceleration |
| PVR-45 | An unbounded rich Storyteller can be cheap via context engineering | `technical/storyteller/request-context-and-cost.md` | Document itself rejects this inference; hard ceilings and held state exist | **Disallow claim**; cap first, retrieve only as earned |
| PVR-46 | One successful paid inference proves broad feasibility | `STATUS.md`; `technical/storyteller/request-context-and-cost.md#three-different-caches` | One measured $0.023294 run; no representative distribution | **Disallow claim** |

## Required additions before a high-risk claim becomes a release contract

Each newly promoted claim names an exact owner heading and fills only fields relevant to its risk:

1. **Runnable scenario:** ten-line example with setup, player intent, expected durable state and a discriminating failure.
2. **Source authority:** what code owns what, and what the model may merely suggest.
3. **Incompatibility check:** which existing promises this changes (e.g. time, choice, no-auto decisions).
4. **Quality observation:** human answerable; not merely a valid JSON schema.
5. **Resource envelope:** number of provider rounds, request/output caps, retry/maintenance cost and a degraded-mode behavior.
6. **Disposition:** keep / narrow / defer / research / decline; a dated owner decision and source/evidence link.

A blanket `must` detection script will not settle any of this. Use the register to make important decisions inspectable, not to turn language analysis into a fake truth detector.
