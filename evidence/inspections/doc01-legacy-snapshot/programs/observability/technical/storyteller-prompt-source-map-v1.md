# Storyteller Prompt Source Map V1 | Exact instrumentation seams, not regex archaeology

**Status: source-mapped design, 2026-11-15; no application code authorized.** Target [context provenance](context-provenance.md), [evidence model](evidence-model.md), [protected storage](physical-evidence-storage-v1.md), [Admin workbench](../admin-investigation-experience.md). Actual code inspected from GitHub `main` at `7e15db38`. No live task/provider run, packet byte equality probe or complete code search executed.

## 1. A single current Storyteller request actually has three compiled layers

**Layer A: task source** from `packages/application/src/storyteller/{context,canonical-knowledge,task-admission}.ts` and, for ENG03 consequence purposes, `context-capture.ts` / `capture-materialization.ts`. This includes actual story/character/time/receipt source, canonical root/document selections, profile, execution and usage authority. It is validated into `StorytellerTask`.

**Layer B: model-neutral compiled request** from `packages/storyteller/src/tasks/index.ts::requestFor` and `prepareStorytellerTask`. A `storytellerTaskSchema` task stores `inputVersion:17`, `promptVersion:'storyteller.v17'`, resources, `context`, `contextManifest` and `request`. It is a **valuable historic source artifact**, not proof that all its upstream candidate decisions are preserved.

**Pre-live source correction (wave 4):** [default worker preflight](../evidence/live-worker-dispatch-preflight-2026-11-15.md) found that the OpenRouter adapter correctly shares a builder/JSON serializer, **but** `readStorytellerWorkerOptions` wraps it as `provider(task)` and drops the caller's `dispatch` override; default bootstrap also supplies no `dispatchAuthority`, which appears to deny paid sends. Therefore the entire configured worker path must be tested before calling the reviewed packet actual transmitted evidence. [OBS00](../../../../work/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md) is a **P0 source-based pre-live gate**, not a proven live billing incident.

**Layer C: actual provider packet** from `packages/storyteller/src/providers/openrouter.ts::buildOpenRouterRequest`. It projects structured output schemas for the provider, selects response format/streaming, model/provider restrictions, token limits and transport flags. `inspectOpenRouterRequest` currently computes body SHA/bytes and message/section hashes; `application/storyteller/dispatch-review.ts::prepareDispatchReview` persists `packet` and `packetSha256`. The exact bytes that the HTTP transport sends still require an **at-the-transport-edge equality proof** before the inspector advertises “byte-perfect sent request”.

~~~text
[Sources + effective config] --validated capture--> [StorytellerTask v17]
           \                                  |
            \ provenance decisions            v
             +------------------------> [requestFor: two messages + schema]
                                                 |
                                      [buildOpenRouterRequest]
                                                 |
                                [packet inspection/review persisted]
                                                 |
                                 [budget reserve/dispatch + HTTP]
                                                 |
                           [provider response / visible tool/model rounds]
                                                 |
                                 [validation / publication fence]
~~~

No “one process log string per step” is necessary if these functions return **source values plus bounded typed provenance decisions** to their owning application stages.

## 2. Explicit current compiler parts to identify

`requestFor` currently builds:

| Part key (proposed stable ID) | Actual source in `tasks/index.ts` | Content meaning | Attribution and preservation |
| --- | --- | --- | --- |
| `system/game-authority` | `rules` constant | Model cannot mutate game, tools forbidden unless recipe, no unearned facts/time/effects | Git build SHA + file path + stable part key + exact UTF-8 content SHA |
| `system/continuity` | `continuityRules` constant | Evidence-linked continuity notes, update/retire limits, arrival-private semantics | Same; only for task purposes where concatenated |
| `system/scene-scope` | `sceneScopeRules` constant | Continue vs restart current scene rules | Same; not part of opening/report system message |
| `system/document-changes` | `documentChangeRules` constant | Narrative lore/identity/relationship document evolution limits | Same; not included when branch omits it |
| `system/task-specific` | `taskRules` branch | Opening/continuation/consequence/pending/report/mechanical opening instructions, possibly interpolated evidence handles | Stable task-kind/branch code ID, input fragment hash, interpolation values and resulting content SHA |
| `user/task` | `requestFor(...).messages[1]` JSON object | Task kind in second message | Compiler version and task source |
| `user/profile` | Spreads `profile` and resolved `tasks[opening/continuation]` guidance | Selected tone/rhythm/surprise, chosen task guidance | Profile ID/revision + source JSON/preset + effective task guidance |
| `user/sceneContext` | `contextRequestSections(context)` | Premise, canonical documents/libraries, note evidence, prior passages | Every included source ID/root/notes provenance; bytes/omissions |
| `user/currentState` | `contextRequestSections(context)` | Mechanical opening or resolution, campaign settings, world time, current passage, items, active activities, world conditions | Frozen original SQL/campaign/game source, settings revision/actor, derived projection version |
| `user/selectedIntention` | `contextRequestSections(context)` | Selected accepted attempt/interaction | Accepted operation/offer/plan/receipt identity |
| `output-contract` | `z.toJSONSchema(...resultSchemas...)`, `constrain*` and `withhold*` | Provider output schema and policy-narrowing transforms | Schema ID/version, ordered transform names/versions, input and projected schema hash |

**Actual system message composition:** for opening/report, some middle system rules are omitted. Consequence task rules dynamically embed accepted evidence handles. The output schema undergoes task-conditional transforms (mechanical opening prerequisite/fact limits, consequence evidence handles, quantity-delta constraints and others). A flat `promptVersion='storyteller.v17'` alone cannot explain which branch/schema was used.

**Important reality check:** the current prompt components are **code constants**, not records editable by staff in a prompt database. Source provenance must therefore show actual package file + Git build and content hash. If a future Prompt Registry exists, an immutable registry row/editor/audit can become the component source. Never show “edited by Admin X” for an unchanged checked-in string.

## 3. Capture the decisions lost between source and final packet

### 3.1 Source candidate selection

In `application/storyteller/canonical-knowledge.ts::loadCanonicalKnowledge`:
- reads exact manifest at `rootHash` and checks campaign/rootRevision;
- filters eligible `.md` source entries (excludes developer-private), sorts by kind/path and takes bounded catalogue;
- resolves selected campaign document IDs + recall cues;
- decides inspect/load under document count/byte budgets;
- records some current `requestedDocumentIds / loadedHandles / omitted` and `cueResolution.trace`;
- loads pinned rule/world library orientation/sections.

**New compact provenance**: for each actually evaluated candidate, record:
`sourceId,kind,rootHash,sourceRevision,visibility,selectorId/version,eligible,chosen,loadAttempt,result,size,reasonCode`. Do not enumerate all possible documents in every world; only bounded evaluated catalogue candidates and mandatory required handles. A missing body should not be marked “omitted by budget” when the real cause was source missing or no permission.

### 3.2 Context bounding and omissions

In `storyteller/context/index.ts::boundStorytellerContext`:
- validates source evidence uniqueness/future revisions and required notes/active-scene evidence;
- reduces optional context until provider request fits the exact serialized byte ceiling;
- may remove selected campaign documents, library orientation/sections or optional passages;
- returns a bounded context.

In `storyteller/tasks/index.ts::prepareStorytellerTask`, `contextManifest` stores `policyVersion:'bounded-scene.v3'`, scene range/required handles and `omittedSequences` for some passages.

**New proof:** record a **bounded ordered decision ledger** for context assembly: source item ID and role, original candidate bytes, selected/loaded state, each optional item tried/removed, final-included status and source reason (e.g. `document-context-limit`, `loaded-then-pruned`). The ledger is tied to the **exact final packed task/request hash**. A single `omittedSequences` array does not carry full byte/reason/context source provenance.

**Do not reassemble and compare via text search after the fact.** The selected compiler function should emit `{preparedTask, provenanceManifest}` from the **same** immutable input and decisions. The manifest is an output of deterministic assembly logic, not a second pass over possibly changed world state.

### 3.3 Effective settings / prompt origin

The current campaign has revisioned `campaign_settings(revision, settings, profile)`, player command identities, `story.storyteller` and `execution/usage`. `storyteller/profiles/index.ts` imports and validates JSON definitions, with profile ID/revision and selected task guidance. There can also be user presets (`storyteller_preset`).

**Capture separately**:
- frozen effective creative profile (ID/revision/hash), underlying file/preset source, code build and task guidance branch;
- `campaign_settings.revision` plus the original actual settings command that created it when identifiable, and the *effective* merged values used by the turn;
- captured execution/usage policy and recipe from `task-admission.ts`, and **final live dispatch tightening** as a distinct authority;
- canonical root/revision and rule/world package section identities used by the compiler;
- if experiment/feature flag service is absent, report `not-configured` rather than a fabricated control variant;
- provider adapter and output-schema transform versions, model route/price version and selected source policy.

**Source override chain matters**: show default → profile → selected preset/player settings → current task context → dispatch restriction. An old task may be admitted with a previous profile while funding changes before it actually dispatches. The inspector must show the *captured creative state* and the *later current spending authorization* separately.

## 4. Suggested narrow function signatures, no implementation claim

Keep the compiled task as the existing immutable validated type. An additive structured result makes provenance a **first-class byproduct**:

~~~ts
type PreparedTaskWithProvenance<T extends StorytellerTask> = {
  task: T; // exactly the current validated domain task, unchanged semantics
  provenance: {
    version: 1;
    generationId: UUID | null; // before persistence can be absent
    sourceSnapshotRef: SourceRef;
    sourceDecisions: SourceDecisionV1[];
    promptComponents: PromptComponentV1[];
    effectiveConfig: EffectiveConfigProvenanceV1;
    compiler: { name: string; version: string; buildId: string };
    providerNeutralRequestSha256: SHA256;
    coverage: 'exact-source' | 'partial';
  };
}
~~~

This is **not** permission to change every exported caller immediately. Initially instrument one purpose (e.g. one committed consequence) using a test adapter, prove equality with uninstrumented task/packet, then migrate one owner at a time. Avoid expanding ENG03 capture DTOs by inventing a second lifecycle coordinator; the provenance sidecar is tied to the **same G**.

For full provider dispatch, attach a second `PromptDispatchProvenanceV1` linking task/request hash → projected output schema → actual packet SHA, ordered component map and attempt ID. Do not attach a new fake generation just to record prompt compilation.

**Source-map precision levels:**
- `source-object`: can prove which source object/revision supplied the value.
- `request-field`: can prove a JSON pointer/message index in final prepared packet.
- `exact-byte`: can prove content range/byte hash in **the final serialized bytes**, with correct escaping/order.
- `inferred`: an explanation guessed from current source; never offered as a forensic fact.

**Start at request-field precision** for structured JSON; upgrade to byte spans only after the serializer can emit them deterministically. Scanning the final UTF-8 packet for duplicate substrings is *not* a trustworthy byte-range source map.

## 5. Transport-edge equality check

`inspectOpenRouterRequest` currently uses `buildOpenRouterRequest`, serializes the returned body with `JSON.stringify`, and computes SHA-256 and message/`userSections` size/hash metadata. This is a strong starting point.

**Proof required:** instrument the actual OpenRouter provider HTTP boundary to capture the **exact body string/bytes immediately before send**, and compare to the saved `storyteller_dispatch_review.packet` using the *same* stable serializer, model/route/schema and attemptId. Record:
- pre-send body SHA, byte length, protocol and selected model/response format;
- `storedReview.packetSha256`;
- equality verdict with timestamp/build/attempt;
- if unequal: **do not send**, mark held/superseded/error as dictated by existing dispatch-review policy. Do not silently “fix” the review body to match a new send.

**Security:** no Authorization headers, tokens, cookies, credential URLs or raw player content in OTel spans/logs. The full body is in the protected native evidence owner, with separate retention/access. An application-level prepared packet can be identical across two attempts but they remain **distinct attempt IDs and financial lifecycles**.

**Provider uncertainty:** recorded E1 send intent/dispatch does not prove provider receipt or charge; preserve actual reported usage and uncertainty, not fabricated zeros. A retry after timeout cannot assume the previous transport was unsent.

## 6. Tool/agentic round source map

The current ordinary task can be **one-shot**; some tasks use `memory-exploration.v1` and `memory-exploration-controller.ts`. A strict round record includes:
- parent G, recipe and round/attempt identity, model request envelope and packet hash;
- requested tool operations (`inspect_memory`, `read_source`, creative search where supported), exact bounded handles and selected root/revision;
- actual tool observations, read counts/bytes, source hash, error/omitted status and safe reasons;
- any subsequent model packet and final source-inclusion decisions;
- provider output/usage/validation state; actual model round count.

Do **not** invent an internal “thoughts” stream. Expose recorded questions, tool calls, observations, submitted output and deterministic application decisions; hidden model reasoning isn't accessible unless the provider explicitly returns permitted visible reasoning content. A hypothetical “why did the model choose that?” explanation generated later is a **post-hoc interpretation**, not historic evidence.

## 7. Exact first proving fixture

One provider-disabled **committed consequence** with:
1. frozen character/clock/receipt and story source G;
2. one profile file definition + one campaign settings revision;
3. pinned rules/world root; two relevant passages and one optional note;
4. one candidate source selected and loaded, then omitted by request byte bound;
5. one source guaranteed final-included;
6. an output/schema projection and no provider send;
7. validation or a synthetic stored candidate and a publication fence.

Expected inspector result:
- “We used profile P revision 2 from Git build B; task rule was consequence branch; campaign setting R was effective at capture.”
- “Source p7 was required and included; source p5 was eligible and loaded then pruned; **model did not receive p5** because final request omitted it.”
- “This exact packet had SHA H and was **prepared**, not sent to a paid provider.”
- “Output validation/publication state is recorded separately; no time/roll was recomputed.”

**Negative variations:** old profile same display name with different hash; rule-schema transform changes; missing source after Stage 1; stale root before promotion; duplicated delivery; provider bytes differ from review body; corrupted generated output; no model tools yet UI must not draw a fake loop.

## 8. Implementation boundary and stop conditions

Expected narrow owners:
- `storyteller/context/index.ts::boundStorytellerContext / contextRequestSections`;
- `storyteller/tasks/index.ts::requestFor / prepareStorytellerTask`;
- `application/storyteller/canonical-knowledge.ts / task-admission.ts`;
- `storyteller/providers/openrouter.ts::buildOpenRouterRequest / inspectOpenRouterRequest`;
- `application/storyteller/dispatch-review.ts` and memory round owners;
- forensic evidence catalog and tests **only after** physical storage/access contracts accepted.

**Do not** move game command authority into prompt builder; do not change prompt content merely to make it easier to instrument; do not rewrite the Storyteller public task union or ENG03 capture coordinator; do not introduce paid provider calls; do not feed untrusted prompt strings to a log exporter.

**Ready gate:** reproduce the exact prepared packet before/after provenance instrumentation and prove bit-for-bit equality with current behavior; confirm the first instrumentation points do not change task acceptance, output schema, source selection, cost or publication. Then approve only one bounded code-bearing Change.
