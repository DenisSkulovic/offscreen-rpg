# Playable DM adjudication loop plan

Feature: [Playable DM adjudication loop](FEATURE.md)
Status: Paused at owner-requested experience review. Existing offline implementation remains; do not continue feature expansion until the agency/taste proposal is reviewed. No live provider calls are authorized.

## Design trace

The invariant is that the DM may propose judgment while application code owns admission, dice and committed effects. Authored benchmarks prove visible agency, changing facts, constrained options and independence from money, employment, human anatomy and geography. They are content records, never runtime branches. Long work and travel are excluded because their progress semantics remain under review.

This plan replaces the remaining implementation scope formerly split between contextual-option agency and the D&D repair checkpoint. Implemented behavior stays documented in permanent specifications; Git retains the earlier plans.

## Phase 1 — Correct contracts and separate public/private offers

Outcome: one immutable offer identity owns a public option projection and private immediate-action plans.

Owning components:

- `packages/contracts`: public offer/receipt schemas and private proposal schemas where shared;
- `packages/db`: clean baseline tables for offer plans, planning operations and steps;
- `packages/application`: persistence and admission boundaries.

Work:

- replace `action.definition` lookup into a global authored action array with an offer-local private plan lookup;
- define `immediate-action.v1`, automatic/check resolution and bounded outcomes;
- define scoped fact declarations/effects without introducing an entity census;
- keep private DCs/outcome branches out of story snapshot DTOs;
- fence plans by offer ID, story ID and captured narrative revision;
- remove duration fields from this immediate contract rather than setting them to zero.

Exit: a forged public request cannot supply or alter mechanics, and stale offer selection cannot roll.

## Phase 2 — Pure validation and adjudication

Outcome: deterministic code can validate a proposed package and resolve a selected admitted action exactly once.

Work:

- validate identities, evidence handles, prerequisites, supported skills/abilities, DC bounds and effect vocabulary;
- derive character modifiers server-side;
- commit automatic or checked outcomes, receipts and facts atomically;
- preserve command idempotency across retry;
- return structured proposal diagnostics suitable for both tool output and application logs.

Exit: normal, rejected and retried selections are understandable without model execution.

## Phase 3 — Generate one complete DM turn

Outcome: one bounded task turns committed evidence into consequence narration and a newly admitted private offer.

Work:

- replace consequence selection from `resolution.offer` with a `dm-turn.v1` result containing scene prose, continuity changes and zero to four proposed immediate plans;
- include the supported immediate-action schema, DC guidance, current character/state, prior receipt and bounded evidence directly in the captured request;
- validate every proposed plan with the normal deterministic validator before publication;
- allow one separately captured repair generation after structural or admission rejection, then hold explicitly;
- preserve the existing generation/publication fence and accounting boundaries;
- implement scripted DM-turn outputs through the same task/result/publication path.

Exit: offline execution proves committed receipt → generated scene/private plans → deterministic admission → saved publication across retry/restart boundaries.

### Deferred extension: tool-using planning

Do not build a generic multi-round tool runner before the browser proves three worthwhile dynamic rounds. The first rules/state/evidence payload is intentionally small enough to capture directly. `inspect_rule`, `read_evidence` and multi-step validation become justified when measured prompt size, missing evidence or failed repairs demonstrate a retrieval problem. Their proposed authority limits remain useful design constraints, but they are not on the shortest POC path.

This does not defer memory engineering indefinitely. The [memory and recall proposal](../2026-09-18--20-09--storyteller-memory-and-recall/PLAN.md) identifies current raw-source overflow and missing archival access. Its first slice separates provenance from prompt loading after direct receipts; scene/identity retrieval and narrowly bounded pre-narrative exploration follow before long-story acceptance. The owner requested compact system hints and read tools for investigating relevant history before narration, including optional relational callbacks, not only missing-evidence repair. A successful three-round loop does not establish continuing-life memory.

## Phase 4 — Connect opening and consequence planning

Outcome: mechanical opening review and every committed immediate consequence use the same planner contract.

Work:

- change mechanical opening content from a fixed action list to a character/rules/fact seed;
- run the planner while preparing the opening candidate, expose only its public scene/options in review, and capture its private plans with that candidate;
- copy the reviewed candidate's exact private plans into the story at Start, then admit the same planning contract after each committed result;
- publish scene prose and offer plans together under the story revision fence;
- feed saved dice/effects/facts into the next planning context;
- retain a legitimate held state when planning yields no action.

Exit: there is no application-policy branch that chooses the next pineapple or microbe options.

## Phase 5 — Player-visible vertical loop

Outcome: the browser supports a coherent three-round immediate playthrough.

Work:

- present planning/pending/failure/held states;
- render public option intention and derived risk/commitment copy;
- show selected intention, saved roll, committed effects and new scene/options;
- keep retry bound to the same operation; disable stale buttons after snapshot refresh;
- remove developer wording that calls current options “authored” once the path is genuinely generated.

Exit: pineapple and microbe acceptance paths work through creation, selection, dice, consequence and fresh options with an offline source.

## Phase 6 — Focused review and POC gate

Review normal selection, invented mechanic, stale offer, invalid final result, crash after saved round, crash before publication and retry after committed roll. Use focused local checks only when helpful. Do not run paid inference.

After offline acceptance, stop and review the actual play experience. A live-model evaluation is a separate owner-authorized gate with a small scenario set and explicit spending reconciliation. Do not expand into long-running processes merely because immediate play works.

## Current checkpoint

The owner requested review, planning and implementation toward an offline-verifiable POC. The [offline acceptance contract](../../engineering/offline-poc-acceptance.md) records the dependency order, task responsibilities and manual matrix. A preliminary context correction narrows provider schemas per task and rejects conflicting current/future evidence; it does not implement any DM phase.

Phase 1's public/private offer boundary is implemented. `immediate-action.v1` has no duration field and supports an automatic outcome or one ability check. Public leaves contain only an attempt marker; `game_offer` owns the story/revision-fenced private plans. Selection resolves the leaf through that record instead of reopening a global authored definition array. Both reviewed openings and consequences persist generated private plans behind a public projection. Scenario identities, inhabitants, prose and capability choices must not appear in generic TypeScript control flow.

The remaining Phase 1 contract item is scoped declaration of a new character/situation fact. Current plans can require and update only facts or quantities already declared on the character; do not let the planner invent fact writes until that boundary is specified and persisted.

Phase 2 has started with a pure structured proposal validator. It reports bounded diagnostics for shape, captured evidence, declared prerequisites/effects, unavailable abilities, undeclared skills and unsupported situational modifiers. Fixture admission exercises the same policy. Every sheet retains the selected D&D ability scores while its current form declares which abilities and skills apply. The planner will eventually propose those declarations from the premise and committed state; deterministic code validates them and never infers them from a named species or world.

Authored mechanical openings and the offline narrative graph now live in schema-validated JSON content. The generic loader resolves arbitrary catalogue IDs, the API exposes content summaries and the client renders that catalogue; no shared contract, policy version or runtime branch names a scenario. The old premise-word and profile conditionals have been replaced by data lookup. This separation is preparatory work, not generated world understanding.

Direct exactly-once adjudication, bounded emergent state and the offline opening/consequence planning contracts are implemented. Mechanical opening capture now supplies character and story facts without an admitted offer; the task proposes fresh private plans, review projects only public labels, and Start stores those exact plans. Consequence publication independently repeats deterministic admission and atomically stores the new passage, public offer and private plans. Plans that are structurally valid but unavailable in captured state are rejected. The owner paused implementation after recognizing that the scripted opening and consequence repeatedly offer generic assess actions and therefore cannot establish the intended DM experience. Next: review [Storyteller agency and taste](../2026-09-19--00-26--storyteller-agency-and-taste/FEATURE.md), agree its canonical three-round flow, then replace the generic fixture before claiming browser acceptance. Capability-changing transformations remain separate admitted state changes. Scope later trace work to the same DM-turn lifecycle. No schema compatibility layer is required; discarded pre-POC artifacts are reset.

All authored examples use the same plan/admission/resolution contract. Neither task specialization nor context validation assumes a currency, human calendar, movement mode, profession, species or setting. Activity-progress design remains outside this authorization. No provider spend is authorized.

Verification: game tests pass 16/16. Storyteller tests pass 25/25, including fresh opening/consequence plans and rejection of fabricated evidence, unsupported abilities and duplicate plans. Storyteller and application builds plus web typecheck pass. The API integration suite specifies three consecutive generated mechanical rounds and compiles, but could not run because the local Docker engine—and therefore PostgreSQL/Temporal—was unavailable. More importantly, that test checks persistence and fresh offer identities but not the feature requirement that a saved roll/fact meaningfully changes later options. Consecutive worthwhile browser rounds remain unverified. Provider spend: $0; cumulative account usage unverified.

## POC acceleration audit — 2026-09-18

The repository has enough general infrastructure for the first playable loop. The present risk is not missing architecture; it is allowing infrastructure work to delay the first unscripted three-turn game. This checkpoint narrows the dependency chain:

1. commit an immediate action and its receipt independently of narration;
2. permit bounded state to emerge through outcomes;
3. generate one complete DM turn containing narration and fresh private plans;
4. play three consecutive rounds in the browser;
5. only then connect one meaningful real-time commitment.

The durable tool-agent runner, trace UI expansion, generalized process families, combat, spatial modelling and additional setting controls do not block those five steps.

### Why direct adjudication is the first edit

The former path translated an `ImmediateActionPlan` into a zero-duration `gameActivity`, applied the outcome through `settleActivity()`, appended a generic mechanical passage and prepared narration in the same transaction. The direct receipt implementation establishes that:

- context preparation cannot roll back an authoritative die or its effects;
- automatic and checked actions share one durable resolution receipt;
- an immediate action creates no activity record and consumes no time;
- the later DM turn can publish one consequence passage without a mechanical placeholder beat.

The target boundary is:

**select stored plan → revalidate → roll at most once → apply typed effects → save action receipt → consume offer → commit → prepare/generate DM turn → publish one new scene and offer**

The receipt is reality. Narration is a recoverable presentation of that reality. A failed or retried generation may delay the next scene but must never undo or repeat the action.

### Implemented slice: direct immediate adjudication

This slice is implemented independently of generated planning, new fact declaration and long-running time.

#### Product behavior

- Selecting an admitted immediate option commits exactly one automatic/check outcome.
- Both automatic and checked actions create a durable receipt.
- The selected offer is consumed immediately; stale buttons cannot execute another action.
- The player can reload after the commit and see that resolution is pending or failed without receiving a reroll.
- Consequence-task preparation is admitted only after the mechanical transaction commits.
- Successful publication creates one narrative consequence passage and the next offer. Do not append a generic mechanical passage first.

#### Suggested ownership

- `packages/game`: add a pure immediate resolver that accepts an admitted plan, current character and injected d20 source, and returns the selected outcome, optional roll and next character. It performs no persistence.
- `packages/db`: replace the zero-duration activity's role with one `game_action_receipt` record (prototype schema may be reset). Capture operation/story/offer/action identity, base narrative revision, selected public intention, immutable plan or plan reference, outcome kind, optional roll, applied effects and a preparation/publication state or equivalent link.
- `packages/application/src/campaign/actions.ts`: own the story lock, command replay, offer/plan fences, availability recheck, pure resolution call, receipt/effect persistence, offer consumption and durable follow-up enqueue.
- `packages/application/src/campaign/narration.ts`: accept a committed receipt ID in a separate transaction, capture context, and idempotently admit the consequence task. It must not rerun resolution.
- `packages/application/src/campaign/activities.ts`: retain only genuine elapsed-time activities. Remove immediate-action knowledge from it.
- `packages/contracts` and web play UI: expose a small resolution state (`pending`, `failed`, or available next offer) and a public receipt projection. Never expose the unused outcome branch or private plan.

Do not use `gameRoll` as the only receipt: an automatic action still happened, and narration/recovery needs its selected intention, outcome text and effects. A roll may be embedded in or linked from the action receipt; avoid maintaining two competing accounts of the same resolution.

#### Transaction and retry invariants

- Lock the story before checking command replay, revision, offer and plan.
- Persist character changes, receipt, offer consumption, command receipt and outbox follow-up in one transaction.
- Do not call context construction, task preparation, provider code or Storyteller validation inside that transaction.
- Repeating the same operation ID returns the committed result without rolling or enqueueing twice.
- A different operation against the consumed offer conflicts before rolling.
- Follow-up admission is idempotent by action receipt identity.
- Publication remains fenced to the receipt's base narrative revision. A preparation/publication failure leaves the receipt inspectable and retryable.

#### Focused acceptance

- controlled success and failure each save one die and apply one outcome;
- an automatic plan saves a receipt with no die;
- duplicate command, stale revision, stale offer and unavailable prerequisite never produce an additional receipt or roll;
- forced context-preparation failure occurs after the receipt transaction and cannot undo it;
- reload between receipt commit and task admission shows a coherent pending state;
- consequence retry uses the original receipt and publishes at most one passage;
- no `gameActivity` row is created for an immediate action;
- no paid provider call is made.

### Implemented slice: bounded emergent state

An outcome can now establish bounded story truth that did not exist at story creation. This was added after the direct receipt boundary so every declaration retains its receipt provenance.

The explicit declaration field does not change `fact.set.v1` into an upsert. A declaration has a stable normalized identifier, bounded boolean/string value, evidence handles, receipt provenance, a total count cap and duplicate/conflict rules. Existing character-fact updates remain a distinct operation so a typo cannot create state.

`character.facts` continues to represent character-owned conditions. Durable situation/world truth lives in a separate capped `campaign.storyFacts` collection. This first generated loop deliberately supports durable story facts only; transient scene state and expiry belong to the later scene-frame design rather than a misleading `scope` label in one eternal character bag.

Quantity prerequisites use `quantity >= N` at the same admission boundary. A plan such as “pay 5 silver” is rejected before selection when only 3 exist, rather than relying on final character parsing to discover a negative balance.

### DM-turn contract after receipts and facts

Evolve the current consequence task rather than creating a second planner followed by a narrator. One task should return:

- consequence scene content grounded in the committed receipt;
- continuity-note changes with existing evidence rules;
- zero to four public option projections;
- the matching private `immediate-action.v1` plans, including both possible outcome branches;
- an explicit held reason when no supported action is feasible.

Application code revalidates the full result against captured evidence, current capabilities, prerequisites, quantity bounds, effect vocabulary and the still-current narrative revision. Publication stores scene, offer and private plans atomically. The model never rolls, applies effects or publishes directly.

One bounded repair attempt is enough for the POC. Persist the rejected output and structured diagnostics, then submit those diagnostics with the same captured authority snapshot. If repair fails, hold visibly. Do not hide an unbounded agent loop behind the word “retry.”

### Scene-frame follow-up: situated continuity before visual generation

The generated DM loop will need more than free prose to answer where the action is occurring, who is present and which objects or spatial constraints matter. Add a bounded `scene-frame.v1` after direct receipts and emergent facts work, either with the first generated DM turn or as the immediately following slice. Do not pull it into the direct-adjudication diff.

The contract should distinguish:

- a durable place identity from temporary weather, light and scene dressing;
- a scene from the individual action-resolution beats occurring inside it;
- authoritative presence, possession and meaningful spatial relations from cinematic emphasis;
- durable people/items from temporary descriptive participants and props;
- a same-scene update from departure, timed travel and arrival.

The smallest useful frame contains a place reference or bounded temporary place description, fictional time/conditions, referenced durable participants, salient durable objects, a bounded list of lightweight spatial relations, current focus and atmosphere. It does not contain coordinates, pathfinding, camera settings or a complete inventory of everything mentioned in prose.

The DM may propose the next scene frame. Application code validates durable references and mechanically consequential relations before publication. Returning to a known place combines its stable identity and saved changes with the new scene conditions; it does not reuse stale weather, cast or mood automatically.

Illustration generation later derives `visual-frame.v1` from the committed scene plus creative settings. Candidate presentation fields include shot size, angle, subject/focus, foreground/background composition, lighting, palette, mood and identity/environment reference anchors. This derived frame may change without changing the fiction. A close-up cannot move an item, introduce a participant or prove that a narrated event happened.

Acceptance for the first scene-frame rehearsal:

- three consecutive actions can remain in one place and scene while focus/blocking changes;
- movement creates an explicit new scene rather than silently rewriting location text;
- returning to a prior place restores its stable anchors and persistent changes but allows different conditions and participants;
- an item transferred or left behind constrains later offers correctly;
- pineapple and microbe use the same frame without assuming terrestrial geography or human anatomy;
- an image prompt can be derived without exposing private action branches or converting camera choices into authority.

The owning product boundary is [places, scenes and cinematic presentation](../../continuity-and-consequences.md#places-scenes-and-cinematic-presentation). Map topology, exact travel geometry, generalized entities and image generation remain separate follow-ups.

### Quality constraints the structural schema cannot enforce

The first live evaluation should judge these separately from JSON validity:

- options are materially different intentions, not paraphrases;
- impossible actions are omitted rather than assigned a theatrical DC;
- DCs are calibrated consistently from explicit anchors;
- failure changes the situation or cost instead of saying “nothing happens”;
- the narration honors the actual roll and effect without retroactive compensation;
- knowledge stays asymmetric: the character cannot act on hidden evidence;
- ordinary, low-drama choices remain available when plausible;
- prior facts alter later options and are called back naturally;
- the DM does not manufacture urgency merely because a turn occurred.

Scripted tests can prove authority, retry and persistence. They cannot prove these qualities. After three offline rounds work, run a tiny separately authorized live comparison on one grounded human scenario and the microbe contrast, and inspect every captured task/result/receipt before expanding the architecture.

### Product benchmark for the first enjoyable rehearsal

Keep pineapple and microbe as contract tests. Add one grounded low-fantasy fixture only when the generated DM-turn path exists: arrival near a town in bad weather, a small declared resource quantity, one obligation, night approaching and several ordinary options. The test is whether scarcity, information, checks and later real time create attachment without a compulsory quest. It must use the same generic contracts; no town, coin or human branch belongs in application code.

The POC gate is not “the agent framework runs.” It is: three consecutive choices that were not authored in a catalogue, one saved result materially changes the next offer, reload/retry cannot rewrite reality, and the player wants to click a fourth time.
