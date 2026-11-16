# OBS03 source review | Real prompt sidecar, but not yet exact transport or full selector provenance

**Evidence class:** static source review of GitHub `main@4e932da`, 2026-11-15, after [OBS03 code completion](obs03-prompt-provenance-2026-11-15.md). No tests were run by this review and no provider was called. This is a **quality and scope analysis**, not an assertion OBS03 failed its originally approved provider-disabled first-slice tests.

## 1. What is genuinely implemented

- `storyteller_prompt_provenance`, a strict `PromptProvenanceManifestV1` and `buildConsequencePromptProvenance/persistPromptProvenance`.
- Sidecar stored for **consequence/pending-consequence** on same G at Stage-2 promotion; a G held before readiness has no fake completed packet manifest.
- Compiler code-component catalogue with stable keys, content hashes, profile ID/revision/hash and model-neutral task/request SHA.
- Source decisions derived from existing `contextManifest` required/omitted passages and `canonicalKnowledge` document catalogue/selection.
- Versioned redacted metadata with no raw prompt bodies; source says compiled task and OpenRouter inspector hashes remain unchanged under instrumentation.
- Existing generation status and source records remain authoritative. No provider calls/funding/unrelated task purposes introduced by OBS03.

This is a useful first **source-anchored metadata inventory**. It does not yet make the actual model transport fully transparent or create a universal prompt editor.

## 2. Scope boundary of the actual V1 schema

| OBS03 manifest field or behavior | What it can prove | What it **does not** prove |
| --- | --- | --- |
| `components[].included` derived from `includedForTasks.includes(task.task)` | Code catalogue expects component in that task-kind branch | That a specific component's exact bytes/field were present in **the final provider packet for each attempt** |
| `compiledRequestSha256 = hashJson(task.request)` | Hash of the validated model-neutral compiled request under this algorithm | Exact wire-serialized OpenRouter request SHA, including per-round dispatch overrides |
| `sourceDecisions` built from `task.context.canonicalKnowledge.catalogue`/`documentSelection.omitted` | Selected/fetched/loaded/omitted metadata already present in final captured task | Every **earlier** candidate considered/rejected, selection ranking/score or transformation reason, if not recorded upstream |
| `contextManifest.omittedSequences` with `context-bound-omitted` | Passage omitted from selected bounded context | Exact earlier content of that omitted passage or all alternative sources that contained equivalent fact |
| `effectiveSettings.profileId/profileRevision/profileContentSha256` | Captured effective Storyteller profile identity/content | Full player `campaign_settings` revision, accepted setting command/overrides, staff editor, independent **current** dispatch authority |
| `compilerBuildId = OFFSCREEN_BUILD_ID || 'local-dev'` | Configured build identity when provided | Exact historical Git SHA in environments using generic fallback |
| `captureStatus` promoted/ready | Manifest exists at promotion stage | Actual paid dispatch occurred or provider received body |
| `exactRequestComparison:'sidecar-additive'` | Sidecar generation does not change compiled request in tested pilot | Observed byte-for-byte equality of reviewed packet vs socket-facing transport |
| `persistPromptProvenance...onConflictDoNothing(generationId)` | Single manifest per G when duplicate promote repeats | Detecting a **different** manifest for the same G; no conflict validation by semantic payload |
| One row keyed by `generationId` | Per-G consequence provenance | **Different** repaired or memory exploration model-round request bodies with unique attempt IDs |

**Important:** these are *natural scope limits* of the pilot, not reasons to throw the sidecar away. The new [evidence claims standard](../technical/evidence-claims-and-quality-v1.md) gives the correct language: “expected-by-compiler-branch”, “present in captured task”, “included in exact dispatched packet (verified)” are **different predicates**.

## 3. No accidental inference about authorship

The sidecar knows profile ID/revision and the Git-backed component catalogue. It **does not** create a database prompt-management system and should not claim a specific Admin edited a code constant. A richer origin chain from repo Git/build and actual player setting commands is designed in [configuration lineage](../technical/configuration-lineage-and-experiments-v1.md), but not implemented by OBS03.

For source/flag variations, no general experiment service was established by inspection; future captured AB assignment/version data remains **not-configured/unknown** until a real evaluator records it.

## 4. Next measurable quality bar, not a mega-redesign

- For a **specific attempt/round**, the final model packet/transport hash must be linked to the source manifest G and any per-round overlay. OBS00-A already forwards per-round `dispatch`; OBS00-B independent current usage authority remains blocked.
- To assert the model actually saw one section, take the real **final serialized packet** and map its fields/components with source hashes and exact attempt/round ID. A task-wide catalogue boolean is not enough.
- To explain **why** a source was excluded, the selector/packer must emit actual bounded source decisions *when they occur*; don't rerun today's selector and call the result history.
- For code/profiles/settings, prove exact Git build/version, source path, `campaign_settings` revision and accepted command lineage where present; a generic `local-dev` build is partial evidence.
- Same G + same idempotent manifest with **different** source/task/request hashes should raise an integrity conflict or source inconsistency, not be silently ignored. Existing unique key is useful but not a proof of payload equality.
- Private content remains gated and expires under a separate approved policy; a source hash alone doesn't grant raw body access.

## 5. Negative acceptance examples

1. A v17 consequence with context source included in captured task but not final repair request: G metadata must **not** say the model saw it in that repair round.
2. Two G share promptVersion but code Git/content hash differs: compiler source identity must distinguish them.
3. Old player creative settings R3 vs updated R4: future config lineage must show effective rev and accepted authoring command, not only a profile name.
4. A canonical catalogue entry is marked not-evaluated because its body wasn't loaded: don't infer the selector “rejected” it globally.
5. One G has two provider attempts with different output schemas: per-round packet provenance must distinguish them.
6. Provenance sidecar input repeated identically: exactly one idempotent row; conflicting same-G source SHA should produce detectable inconsistency.
7. Raw protected packet expired: provenance may remain as lawful metadata, but inspector must not reconstruct private bytes from current prompt templates.
8. Provider never sent because no current entitlement authority: no “sent to model” claim from the mere existence of provenance row.
9. An internal model response has no citation to included source: **uncited**, not automatically `model-ignored`.
10. Corrupted source/content hash, unknown task schema or unavailable Git build: explicit partial/unsupported provenance.

## 6. Disposition

**OBS03 remains Done for its documented first pilot.** The broader exact packet/source/editor/config provenance destination is **not** Done; implement additional producer-stage evidence only in later independently approved scope. [OBS05](../../../changes/archive/2026-11/observability/2026-11-15--obs05-evidence-claim-truth/CHANGE.md) can prevent the existing fixture diagnostic overclaim now. [OBS02-H](../../../changes/archive/2026-11/observability/2026-11-15--obs02-h-stage-integrity/CHANGE.md) addresses separate real stage accuracy issues; OBS00-B still blocks normal paid transport authority.

Do **not** turn this review into unscoped “fix all prompts” code. It is an evidence-quality checklist for future source-specific Changes and the developer Context Inspector.
