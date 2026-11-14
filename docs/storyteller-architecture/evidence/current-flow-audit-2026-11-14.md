# Current Storyteller execution trace | inspected source, not aspirational diagrams

**Evidence class: code inspection on 2026-11-14, branch `design/storyteller-agent-architecture-2026-11-14` based on `main`.** No new connected provider call, browser run, SQL run, benchmark or real bill was made in this review. Source behavior and historical proof are distinguished. Start with [product constitution](../vision-and-quality-constitution.md) and [capability judgment](agent-capability-audit-2026-11-14.md).

## Code ownership map

| Domain owner | High-value symbols | Authority |
| --- | --- | --- |
| Draft → opening | `packages/application/src/storyteller/openings.ts::createStorytellerOpenings.request/read` | Freeze versioned draft, selected profile, execution/usage and optional pinned start package |
| Start real story | `packages/application/src/storyteller/start.ts::startStorytellerCandidate`, `stories/start.ts::createStoryStart` | Validate reviewed generation; bootstrap current story, world/rules/clock/campaign |
| Legacy narrative choice | `packages/application/src/stories/resolution.ts::createStoryResolution.admit`, `storyteller/admission.ts::admitStorytellerResolution` | Owner/offer/revision/selection verification; admitted continuation |
| Mechanical campaign choice | `packages/application/src/campaign/actions.ts::createCampaignActions` | Exact current offer/path, accepted immediate plan, activity, duration, existing item holder |
| Timer/settlement | `campaign/action-executions.ts::settleActionExecution`, `campaign/activities.ts::settleActivity` | Deterministic game time, rolls/receipts/effects, interruption and permitted follow-ups |
| Consequence/report request | `campaign/narration.ts::preparePendingActionNarration/createConsequenceNarration` | Captured committed or pending evidence and required controlling narration |
| Context preparation | `application/src/storyteller/context.ts::loadStorytellerContext`, `canonical-knowledge.ts::loadCanonicalKnowledge` | Current SQL + current canonical root + notes, docs, world/rule catalogues, selections |
| Request compiler | `packages/storyteller/src/tasks/index.ts::requestFor/prepareStorytellerTask` | Frozen versioned two-message prompt/schema, bounded `contextManifest` |
| Durable generator | `application/src/storyteller/records.ts::insertStorytellerTask`, `runtime.ts::createStorytellerRuntime` | Generation/outbox/publication identity, replay and one process-local active generation |
| Model/loop | `application/src/storyteller/execution.ts::createStorytellerExecution`, `memory-exploration-controller.ts::runMemoryExploration` | Scripted, one-shot/repair or bounded memory model rounds |
| Tool dispatcher | `application/src/storyteller/memory-exploration.ts::createCanonicalMemoryExplorer`, `lexical-story-index.ts` | Read-only captured-root search, exact current document/source read |
| Provider and accounting | `storyteller/src/providers/openrouter.ts::createOpenRouterProvider`, `application/src/storyteller/budget.ts`, `memory-provider-runtime.ts` | Reviewed provider request/route, reserved and settled money/tokens, uncertain result |
| Publication | `application/src/storyteller/publication.ts::publishStorytellerResult`, `stories/passage-documents.ts` | Result validation, source/root/receipt fence, passage/offers/documents and holds |
| Recovery/read | `application/src/storyteller/recovery.ts::retryStoryteller`, `stories/reads.ts`, `campaign/reads.ts` | Same-generation permitted retry, player-visible current truth, SSE/GET/versioned read |

## Trace A: from a player's idea to an actual playable story

~~~text
Draft / Stories creation
  -> captured draft revision, premise/role/direction, selected profile
  -> optional mechanical seed, authorized plans, pinned world/rule package
  -> prepareAdmittedStorytellerTask(task='opening') + output schema
  -> SQL generation + draftOpening identity + outbox
  -> worker StorytellerRuntime.complete
     -> scripted fixture OR provider policy/check/dispatch/validation
     -> generation succeeded/failed/uncertain
  -> opening preview GET, candidate not yet game canon
  -> explicit Start(candidateId, expectedDraftRevision, campaign options)
     -> verify ownership/candidate/version/start package
     -> canonical bootstrap and first passage
     -> persisted story with captured profile+execution+usage and campaign state
  -> Now read of published passage and current authorized offer
~~~

**Observed source:** `storyteller/openings.ts::request` saves an immutable `opening` task before any transport, with optional `loadStartPackageKnowledge`, prepared mechanical opening seed and authorized plan references. `storyteller/start.ts::startStorytellerCandidate` checks latest candidate, frozen draft revision and Start options before `initializeCampaign` and publication. **Start itself is not a new Storyteller model call**, and opening preview is not a running life. Failed opening can be retried only within captured rules.

**Quality gap:** one valid generated opening does not establish that an arbitrary custom world has a coherent executable capability set. Prepared packages and today's mechanical plan families are still the boundary. Opening fiction is not permission to invent a new rule adapter. The profile is frozen from one of four registered JSON definitions in `packages/storyteller/src/profiles/index.ts`; adding a preset is data, not creating an agent role or new model.

## Trace B: selecting a choice in the current scene

There are **two legitimate historical entrances**, not one generic “send text to agent” path.

**Narrative `choice.v1` without a mechanical character:** `stories/resolution.ts::admit` locks owner story and delegates to `storyteller/admission.ts::admitStorytellerResolution`, verifies current publication, selected option, story revision and exact published source; finds any selected world/campaign source handles and prepares a `continuation` task. The selectable story choice does not directly grant effects. The admitted command is immutable, idempotent and enqueues generation.

**Mechanical `CampaignView.offer`:** `campaign/actions.ts::act` locks, dedupes command by operation ID, requires exact `expectedRevision`, `offerId` and full nested action `path`, validates stored private plan and `situationAuthorization`; checks prerequisites/overlap and permitted activity. For a finite attempt it stores `gameActionExecution` with captured duration and pending-resolution information if eligible, consumes the old offer, logs start, enqueues due action. For extended process it stores activity with deterministic work progress and due events.

**Crucial separation:** path browsing in React isn't a committed in-world action. A model suggestion is not an accepted action. Selecting an accepted plan is not yet successful completion. Real time spent reading/waiting for a provider is not automatically fictional work.

### Why some consequence generation can start early

`actionOverlapEligibility` permits `freezePendingActionResolution` only when no intervening controlling world obligation, item-transfer instability or unsupported process/resume semantics exist. The selected deterministic result can be privately modeled before the due boundary, but `publication.ts` requires the **matching settled receipt and projected-state digest**. Any early candidate without that receipt remains noncanonical.

**Failure mode to test:** an action settles before speculative generation produces output; the same operation/funding/receipt identity must reconcile, never narrate projected effects as already earned or buy a second speculative model call. ENG03-M and full conditional ENG03 touch this source; don't silently use the Storyteller program to refactor SQL locks.

## Trace C: clock, activity, interruption, provider waiting

~~~text
Accepted finite/extended work
   |
   +-> clock or scheduled boundary (no model every tick)
   |      |
   |      +-> deterministic successful/failed/partial settlement,
   |      |    receipt or activity event, effects, game-time frontier
   |      |
   |      +-> interruption from world obligation/item invalidation
   |
   +-> optional / required consequence or report intent (saved in DB)
          |
          +-> controlling: hold Storyteller-intent -> generation -> decision
          +-> historical: report tied to source event, no new current offer
          +-> quiet: no LLM call where authorized and no narration needed
~~~

The normal action and activity machinery decides what happened. `campaign/narration.ts` then builds task context from the **committed record**, not an ad-hoc prompt saying “did the attack work?” Controlling Storyteller model latency freezes the appropriate campaign domain holds. A report on old work can attach to history while the player is already elsewhere; it doesn't replace the current scene. The newer ENG09 item-holder interruption creates a source-linked consequence/hold rather than losing the only offer. **Model failure must not move an item or roll again.**

No persistent LLM is waking on every fictional hour. Temporal/worker/outbox scheduling is for sparse accepted boundaries and admitted generation tasks.

## Trace D: actual Storyteller task construction and what the model sees

**Under the current application context builder** `loadStorytellerContext` collects:

- immutable passage evidence: last 7 recent passages or full active scene window (bounded to 40) plus exact passages referenced by continuity notes;
- most recent current passage, selected action identity/label/intention, source-backed note patches;
- SQL item identities/holders, current character and story facts, captured settings, world time and conditions;
- activities: `SELECT gameActivity WHERE storyId` for all historical rows followed by JS filtering for relevant active states (cost smell despite ENG04 improvements to Now public reads);
- canonical document root: manifest, descriptor catalogue, selected descriptive records, recall cues, pinned world/rule library sections and omission/coverage traces where a canonical store exists.

**Context projection** `packages/storyteller/src/context/index.ts::contextRequestSections` sends a JSON user message with `sceneContext` (premise, loaded canonical references and catalogues, notes, prior evidence), `currentState` (current scene and mechanics), and `selectedIntention`. The system message in `tasks/index.ts` contains common authority instructions, task-specific instructions, and for non-opening/report continuation the note/scene/document-change rules. Output schema is generated and recursively narrowed against captured fact/quantity/evidence/handle state by `provider-schema-projection.ts`.

**Task is frozen and versioned:** `inputVersion:16`, `promptVersion:'storyteller.v16'` plus context manifest, `resources`, profile and provider request. This is **not** a provider chat thread; the model sees two request messages unless the optional exploration recipe composes a new round. Earlier task formats remain part of replay compatibility.

**Context-size policy:** `boundStorytellerContext` preserves required current/active-scene/notes evidence, drops optional documents, world/rule orientation and sections, then adds up to six optional recent passages; if required evidence still won't fit it throws `context_too_large`. This is safer than silently clipping an item fact, but **loads may already have incurred CAS and DB I/O before the packing decision**; selected-vs-actually-sent must be traced.

**Provider prompt tensions to evaluate:** universal literal “Never end the character's life” (today nonlethal risk, future richer risk must remain configurable); generic legacy 2–5 options even in quiet/tight contexts; consequence 0–6 plans and permission for zero when held; profile taskGuidance uses continuation for report/consequence; enormous output JSON schemas vs actual fiction. No claim that these necessarily ruin play until controlled tests.

## Trace E: what the engine calls an agentic loop

**Default ordinary task** from `prepareAdmittedStorytellerTask`: if provider and effective policy allow, it selects `repairable-turn.v1` (one first call, up to one explicit invalid-output repair), otherwise `single-turn.v1`. `creativeInput` is usually absent, so posture defaults to `off`. **No memory search/read model round in normal play** even if budget/tier theoretically supports it.

**Optional memory exploration** when an authorized caller supplies an enabled creative posture/recipe and canonical root:
1. `execution.ts::generate` builds `buildLexicalStoryIndex` for the captured root (currently reloads all eligible source/MD bodies for each invocation).
2. `runMemoryExploration` persists an operation-local artifact; checks captured task equality, model round, request/attempt hash and retained bounds.
3. A provider round returns **strict JSON** `needs_context` (up to six operations, at most two natural-language `ask_memory` questions), `ready_to_answer`, or the final wrapper. This is a genuine loop with application-owned dispatch, not OpenRouter native tool-calling.
4. `ask_memory` uses `LexicalStoryIndex.search`: field-weighted OR terms and bounded candidates/partial coverage. `read_memory` opens returned `m#` canonical record or `x#` exact source from the pinned manifest; source provenance `s#` isn't a read handle. Creative `intent:'possibilities'` still uses source-linked lexical retrieval, not a separate creative multi-agent.
5. Each model round is reserved/dispatched/settled with same parent funding envelope and a protected final answer. A final valid response contains the normal publishable scene plus private `evidenceUse` and at most eight evaluated creative directions. Controller stores/replays final candidate, then `execution.ts` saves generation output and ordinary `publication.ts` owns actual story commit.
6. Hard bounds: `memory-exploration.v1` 2–3 model rounds total (including final), up to 6 reads and 48 KiB retained read bodies, with 0/1 repair subject to round cap. No subagents, arbitrary SQL, web browsing, gameplay mutations or context compaction.

**Agent classification:** yes, an implemented **narrow goal/observe/search/read/finish controller** when that explicit recipe is selected. The generic Storyteller is not yet an adaptive domain-investigating, quality-aware autonomous game director.

## Trace F: transport, context window, cache and spending

`packages/storyteller/src/providers/openrouter.ts::buildOpenRouterRequest` emits a pinned OpenRouter chat-completions envelope: selected model/provider, strict JSON Schema or JSON-object fallback, buffered or SSE transport, max output tokens, **reasoning disabled explicitly** (`reasoning.enabled:false`), web/context-compression plugins disabled and no provider fallback. This avoids surprise web spend and uncontrolled reasoning, but **today's configurable model route cannot actually enable nonzero reasoning via this adapter** merely because an allowance has a `maxReasoningTokens` field.

`inspectOpenRouterRequest` reports SHA, actual serialized bytes, schema bytes, per-section hashes and potential shared prefix bytes. `estimatedInputTokens` is intentionally null without a compatible tokenizer. Provider usage captures prompt/completion/reasoning/cached/cache-write tokens when reported; **prefix overlap is not measured cache hit**. The payload appears to contain no explicit provider `cache_control` or persistent `session_id` routing. Caching depends on route/provider behavior; verify savings rather than assuming them.

`application/src/storyteller/budget.ts` independently reserves/captures cost at operation/run/account/usage windows, checks current dispatch authority, conservatively treats unknown attempts as uncertain and blocks unsafe extra spend. `memory-provider-runtime.ts` uses per-round attempts under same generation; final output reservation and byte/token caps are independent. Streaming buffers bounded response; transport result/timeout/cost ambiguity is not silently retried.

**A model's task chat is disposed of after the operation**. Every new turn reconstructs current state and selected history. No user-visible persistent agent transcript, no compaction needed by default under 2–3 rounds. Canonical sources, player visible passages, notes, descriptive records, activity history, generation tasks and private operation artifacts persist separately.

## Trace G: semantic validation and publication

`packages/storyteller/src/tasks/result-validation.ts::validateStorytellerResult` validates Zod output shape, provenance, current/arrival notes and plan semantic contracts, with an optional bounded private repair diagnostic. `publication.ts::publishStorytellerResult` takes an already saved generation, checks source passage/revision, canonical root commit, pending action receipt/projection when required, and game plan admission; then atomically publishes the next passage, story documents/notes and **fresh authorized** offer, transitions Storyteller hold to decision. A late historical report uses its own source hook instead of replacing current scene.

These checks are valuable, but **structural and rules validation cannot prove prose truth, character psychology, believable emotional payoff, faithful profile taste or sustained good play**. A single connected six-generation sample is not proof of such quality.

## Source-dependent risks found

| Severity | Observation | Diagnostic test before refactor |
| --- | --- | --- |
| High gameplay quality | Default one-shot, memory loop effectively off unless explicitly selected | Compare same frozen need with no-search / search recipe, actual final evidence use and user quality |
| High long-story economics | Canonical documents and source passages can be fetched in bulk before packet pruning; memory lexical index rebuilt per root/use | Provider-free I/O counter and warm/cold 200/2000-scene benchmark |
| High continuity | Descriptive document creation was absent in historical five consequences, despite note patches; later recall unproven | Receipt→record→selected→final request→published→later return chain test |
| High player-value | Task contract is mechanically strict but creativity and option variation depend mostly on prompt | Controlled paired quiet/comedy/eerie/consequence tests with objective and human taste |
| Medium context/cost | Full stored JSON schema/section overhead, rough byte ceilings, no verified exact token counter for OpenRouter | Raw packet sections/cache telemetry; no claim input tokens=bytes/4 |
| Medium throughput | `loadStorytellerContext` currently reads all `gameActivity` rows then filters; may occur under story SQL lock with CAS | ENG03-M and independent scoped query/IO audit, no duplicate SQL rewrite |
| Medium model configurability | Per-request reasoning disabled regardless of policy cap; route and task choice static | Model capability matrix and explicit route-only reasoning experiment |
| Medium persistence | Operation snapshots and model attempts persisted correctly; no higher-level narrative intent planning | Long-run story fixture where chosen initiative needs a private sourced direction |
| Medium tooling | Only ask/read memory, no typed current-state query or rule discovery during model rounds | First prove which missing questions aren't already supplied deterministically |
| Medium cache | Prefix overlap potential, cache usage recorded when provided, provider choice fixed; no actual cache hit guarantee | Same provider/config, measured warm/cold billed cache metrics |

**Evidence caution:** many older docs use phrases like “agent will” or “the memory loop now…” before the provider runner was connected. The inspected application source now has connected `memory-provider-runtime.ts` and `runMemoryExploration`. The correct current answer is not the historical screenshot of a one-shot call, nor the ideal architecture spelled in documentation.

## What this audit has not proved

No current real-world performance benchmark, actual cache discount rate, all-provider schema compatibility, no-cost continuous 15-turn campaign, tool use in a deployed hosted game, patient player enjoyment, broad-world reusable mechanics, correct multi-tenant billing or safe cloud worker cutover. Existing historical proof is reported by [connected POC evidence](../../engineering/connected-poc-proof.md) and [long-story retrieval evaluations](../../engineering/long-story-memory-and-retrieval.md); it must not be silently relabelled as fresh passing evidence.

**Next:** [capability judgment](agent-capability-audit-2026-11-14.md) separates architectural strengths from active deficiencies; [target model](../target-operating-model.md) defines what we actually want regardless of how much code must change.
