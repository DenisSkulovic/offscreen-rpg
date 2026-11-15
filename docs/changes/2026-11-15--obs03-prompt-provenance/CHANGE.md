# OBS03 | One real consequence G retains its exact prompt-component and source provenance

**State: Proposed, NOT Ready.** **Kind:** one purpose-specific Storyteller compiler/selector instrumentation Change, strict small provenance persistence and provider-disabled equality tests. **No prompt rewrite, provider spend, raw-archive retention migration, new public task union or gameplay mechanics.** **Dependencies:** ENG03-C1/C2 same-G capture and owner-approved OBS02 stage identity or equivalent real runtime linkage. Product/technical authorities: [prompt source map](../../observability/technical/storyteller-prompt-source-map-v1.md), [context contract](../../observability/technical/context-provenance.md), [archive codecs](../../observability/technical/archive-codecs-and-evolution-v1.md), [source custody](../../observability/technical/protected-artifact-store-v1.md).

## Cursor first screen

> **Result:** for one actually admitted consequence generation G, an authorized diagnostic reader can answer **which code-backed instruction, Storyteller profile, campaign settings revision, pinned canon/root and selected/loaded/pruned evidence** formed its final compiled task request. Every claim has a stable source ref/reason and checksum. Instrumentation must make **no change** to task/request/output schema or serialized bytes.
>
> **Current code to inspect:** `packages/storyteller/src/tasks/index.ts::requestFor/prepareStorytellerTask`; `context/index.ts::contextRequestSections/boundStorytellerContext`; `packages/application/src/storyteller/{canonical-knowledge,task-admission,context-capture,capture-materialization}.ts`; `providers/openrouter.ts::buildOpenRouterRequest/inspectOpenRouterRequest`; current `storytellerTaskSchema v17` and `generation.input`. Preserve `pending-consequence` and interrupted/committed capture compatibility.

## One bounded source/prompt contract

**Proposed `PromptProvenanceManifestV1`**, strict schema, compact metadata, keyed by **the same generation G**:

~~~text
generationId; sourceKind='consequence'; compilerBuildId; promptVersion;
taskInputSha256; compiledRequestSha256; schemaVersion; captureStatus;
components[] {
  stableComponentKey; purpose; originKind; originSourceId;
  immutableRevision; originBuildId; contentSha256; included|omitted;
  finalMessageIndex; finalFieldPointerOrNull; reasonCodeOrNull
};
effectiveSettings {
  campaignSettingsRevision; profileId; profileRevision; profileContentSha256;
  capturedExecutionPolicySha; capturedUsagePolicySha;
};
sourceDecisions[] {
  sourceKind; sourceHandle; sourceRevision; capturedRootHash;
  eligible|selected|fetched|loaded|included|omitted|not-evaluated;
  reasonCode; sourceBodyHashOrNull; finalFieldPointerOrNull;
};
coverage { stagesRecorded; missingStages; exactRequestComparison };
~~~

This is a **design schema sketch**, not valid DDL. Use bounded arrays, hash lengths and closed enums. Do not put source document bodies, player prose, raw prompts, API keys, private hidden character plans or unbounded tool observations into this metadata record. An Admin role with only `ai.operation.read` must **not** automatically obtain this private provenance manifest.

**Source origin rules:**
- Code constants `rules, continuityRules, sceneScopeRules, documentChangeRules` and task-specific `taskRules`: repo file + Git build + named part + content hash, not fictitious DB editor.
- Profile from JSON definition or saved preset: exact ID/revision/definition hash, selected `taskGuidance`, known actual source/preset row. Editor may be unknown.
- `campaign_settings`: actual revision and **effective** values as of capture, not today's mutable settings pointer.
- Canonical source: pinned root and exact manifest/document/section IDs; bounded selector candidate state and factual omission reason.
- Final packet: the actual compiled request fields/messages, not string regex over concatenated prose; source pointer when byte offsets not reliably emitted.
- Absent experiment/flag system: `not-configured`. Do not assign every turn a fake “control” variant.

## Implementation sketch and source-bound stages

1. **Baseline first:** serialize one existing consequence G fixture/task/compiled request/packet using current code. Store its SHA/byte length as the negative reference (no source edits yet). Include v15/v16 old-reader and pending-C1/C2 fixtures.
2. **Pure compiler instrumentation:** emit `{task,manifest}` or an equivalent sidecar from the same deterministic compiler decisions. Return **exact same task object shape/content** as before. Measure no additional CAS reads or source selection changes.
3. **Selector reasons:** emit bounded candidate/inclusion/omission facts **during the actual `loadCanonicalKnowledge` and `boundStorytellerContext` paths**. Preserve required note/scene evidence, selected vs fetched vs included. If an old path lacks candidate enumeration, record `unknown/unobserved` rather than inventing a negative.
4. **Persist once for G** after source/capture materialization and before eligible dispatch/publication, with one unique/hashed idempotency key. Reuse the existing same-G Stage2/Stage3 short SQL fence. Do not insert a second generation, outbox or orchestration workflow.
5. **Verification:** assert task, `contextManifest`, two messages, output-schema projections and `inspectOpenRouterRequest` body SHA are **bit-for-bit unchanged** for instrumented vs original path. The provenance is additive.
6. **Read only after authorization:** a test-only diagnostic projection may show metadata without raw strings; full Admin context explorer and new staff grant are separate Changes.

**Important source quality:** some `contextManifest` omissions exist today and `canonicalKnowledge` already records `cueResolution.trace` and `documentSelection.omitted`. **Reuse** those facts where complete instead of storing a second contradictory decision log. Add detail only where the source path loses causal explanation.

## Acceptance and negative matrix

| Fixture | Expected |
| --- | --- |
| Old code constant vs new constant with same promptVersion | Different Git/content SHA, original historic G still points to old build |
| Same profile name but changed revision | Correct profile origin/revision/hash, no accidental “latest” |
| Campaign settings changed after context admission | G retains original effective revision and selector output |
| Required passage chosen and included | Correct source ID/manifest hash and final request field pointer |
| Optional source selected, loaded then removed for size | Explicit `loaded→omitted` and actual final packet excludes body |
| Source never among evaluated candidates | `not-evaluated/unknown`, not fabricated rejected-by-policy |
| Repeated identical prose in two distinct documents | Two source IDs, stable mapping, no substring ambiguity |
| Provisional capture G held before ready | No fake completed task/packet/attempt provenance |
| Duplicate same-G materialization/outbox wake | Exactly one final manifest per logical task/SHA; no new generation, cost or roll |
| Schema/recipe compiler branch differs (opening/report) | **Out of V1 pilot**, not incorrectly decoded as consequence |
| Provider output schema transform | Original compiled request SHA unchanged; future actual-wire equality remains a separate gate |
| Malicious player text inside source/prose | Data only, no prompt instruction privilege or log/export leak |
| Canonical CAS unavailable or root changed | Honest gap/stale; never fetch "latest" to fabricate original |
| Raw candidate/body access by Support | Denied; no hidden field in S1 DTO |

**Proof:** zero-provider deterministic tests, exact before/after task+packet hashes, one persisted redacted manifest with source refs, document/source selector negative suite, p50/p95 size and stage latency, old-generation read regression. No paid live call or global broad test required.

## Hard exclusions and Ready gate

Do not generalize every ENG03 purpose, rewrite engine prompts, select a new agent framework, import LangChain/Langfuse, add free-text provider eval, implement prompt editing UI, persist every source body redundantly, add unbounded traces or create a new global event bus. Do not store raw private content in `storyteller_operation_trace` or OTel attributes.

**Ready only when:** owner accepts one-purpose provenance pilot, current-source recheck confirms exact G/Stage2 compatibility, OBS02 or equivalent identity/coverage stage exists, persistence shape and privacy scope are reviewed, and explicit code authorization names this Change. No code or paid provider activity authorized by this Markdown.
