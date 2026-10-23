# Implementation plan

Feature: [Story mode Vvardenfell continuity](FEATURE.md).
Execution scope: the approved local Story, maintained-start and continuity phases. The current route is S3; inspecting old sessions does not authorize another provider call.
Implementation handoff: prepared by Codex for Cursor; no agent/task is dispatched automatically. One implementation owner per slice. The October 23 investigation updates the diagnosis and design, not runtime behavior.

## Phases

### S1 — Honest local Story mode — implemented

Loopback Story mode uses ordinary player pages/APIs, fixed local identity and dedicated persistent database/document storage without Chamber controllers or OAuth setup. Headless commands support explicit creation, selection, observation and retry. Model execution policy is independent; mutating play commands require explicit live confirmation.

### S2 — Maintained Vvardenfell start library — implemented

The pinned world/start/rule packages include immediate geography, Sellus/Socucius identities, release thread and private direction. Generic application code consumes those documents and the mechanical seed without scenario-name branches. Start creates an inspectable campaign root.

### S3 — Progressive entity continuity — current

The intended boundary remains mention → registered identity → continuity-relevant state → mechanically active state. Materialize only what future correctness needs, with source-linked changes admitted atomically with passages. The microbe/abstract benchmark must remain valid without people, geography or social state.

**Diagnosis, corrected October 23:** v16 responses did create/update a clue note. No descriptive documents were proposed, and departure supplied no document recall cues. No return occurred. Mechanical tasks already receive retained notes and active-scene cues. The missing mechanical dependency field is a real capability gap, but cannot alone explain or repair absent document creation. See [raw-response evidence](../../engineering/connected-poc-proof.md#memory-reinspection--2026-10-23) and the [engine model](../../engineering/engine-model.md).

**Selected outcome:** a current admitted continuity record reaches the later mechanical consequence that explicitly depends on it, or preparation stops with an inspectable reason before provider dispatch. No cap increase, hidden retrieval call, reroll or new social/combat simulation. The [canonical dependency contract](../../technical/canonical-files.md#mechanical-continuity-dependencies--s3-design) owns semantics and failure behavior; the phases below own execution.

#### S3a — Make the causal baseline inspectable — nearest slice

Outcome: distinguish a missing write from a missing selection or packed-out record before changing the handoff.

1. Extend the existing `tools/chamber/scripts/story-session-report.mjs` summary narrowly: separate result note/document **patches**, retained note identities/source references, current document identities/revisions, publication status and final request loaded/omitted dependencies. Inspect existing fields first; reuse them rather than building a trace explorer. Default output contains metadata, not raw private prose. Read-only queries must not enqueue work or dispatch a provider.
2. Preserve the existing v16 artifacts. When Docker/PostgreSQL is available, inspect only the saved story; do not launch a live worker to reconstruct it. Join generation/publication identities and current note state. If artifacts are missing, label that fact and use a fresh provider-free case; do not invent historical state.
3. Through ordinary application operations and the existing fake-provider harness, capture two small cases: a note-only flow whose empty later patch preserves memory across restart, and a source-linked document create/revise followed by an unrelated offer and a dependent return. Capture state, selected IDs and the final packet at each boundary. Establish the current missing-handoff behavior rather than patching database state to fake it.

Files to inspect: the existing session report; application `storyteller/memory.ts`, `publication.ts`, `admission.ts`, `context.ts`; Storyteller `context/continuity.ts`; the relevant case in `tools/api-integration/test/start-package.integration.ts` or `storyteller.integration.ts`. Search symbols before opening whole files. Runtime exercises/checks are optional under repository policy; if unavailable, retain the source-inspected baseline and state exactly which causal observations remain missing.

Exit: an inspection can distinguish proposal, publication, retained memory and final input. Record one compact evidence row per boundary in the permanent proof/QA owner. Do not call missing descriptive records proof of failed note memory. No provider calls are needed.

#### S3b — Required dependency selection and final packing

Depends on S3a's observability and the canonical contract. Implement an explicit required-document channel through application context loading and Storyteller request packing. Resolve exact IDs from the current manifest before filling the optional 64-entry catalogue; count required entries within existing limits. Preserve complete required bodies through final packing or produce a stable pre-dispatch context blocker. Existing optional narrative hints/cues retain their semantics.

Acceptance cases: a valid required ID outside the old first-64 slice; updated current version of the same identity; foreign/missing or oversized record; whole-request pressure; zero dependencies. Inspect the **final request**, not only the selection trace. Body/read/byte caps stay bounded. Failures after settlement preserve the receipt and do not create a provider attempt or repeat effects. This closes a source-inspected limitation; do not present it as the cause of the six-generation run's absent document proposals.

#### S3c — Carry dependencies from offer through accepted work

Depends on S3b. Reuse narrative references' captured handles/same-result create-index semantics, but keep durable metadata in the application layer, separate from the pure game plan/effect vocabulary. At publication validate and resolve IDs atomically with the new offer/root. Copy selected dependencies into accepted action/activity metadata. Cover pending and settled finite consequences, process follow-up/report, retained activity resume and each accepted sequence step; do not silently support only one resolution variant.

Owning boundaries: Storyteller task/result contracts; application `storyteller/publication.ts`, `campaign/persistence.ts`, `campaign/actions.ts`, `campaign/narration.ts` and activity/report paths; `packages/db/src/schema/campaign.ts` and the single disposable baseline migration if storage changes. Keep public options free of private dependencies. Unknown handles/change indices reject publication; valid same-result creates and later revisions retain stable identity. Reuse existing narrative admission resolution instead of introducing a second identity algorithm.

Exit: the S3a document case reaches the final consequence packet using the current version; duplicate delivery/stale publication cannot change accepted work or resolve an old positional handle to a different record. Empty dependencies and the abstract benchmark remain valid. The ordinary-life process must retain context without generating narration at every progress boundary. These contrasts preserve creative neutrality and avoid mandatory social entities.

#### S3d — Progressive materialization and return

Use the maintained Socucius interaction through unrelated play, departure and return. Demonstrate a source-linked change and the later task's current record after the original exchange is outside the active scene. A record merely preseeded in the start package does not establish that a meaningful new interaction was recorded. Also preserve the separate note-only case.

If a real model still proposes no needed record, inspect its exact packet, supported schema and publication result under the [tuning procedure](../../skills/storyteller-tuning/SKILL.md). Existing instructions already ask for meaningful promotion. Diagnose a missing instruction, conflicting task, unsupported proposal, admission failure or model noncompliance before tuning; do not add the same instruction reflexively. S3b/c establish carriage, not automatic materialization. FEATURE's remaining promotion requirements remain open until evidenced.

### S4 — Connected play and evidence — waiting on S3

Drive at least five turns through ordinary commands with selected choices, mechanics, elapsed time, canonical change and later recall. Scripted evidence establishes wiring only. After structural evidence, separately admitted live play resumes the [10–15-turn POC proof](../../engineering/connected-poc-proof.md), with per-attempt reconciliation and no silent scripted fallback.

The fixed-second implementation's remaining live acceptance is owned here: exercise meaningful timed work and continuation under one captured profile and a legitimate contrasting profile, preserving exact duration/reward authority. Owner enjoyment and profile adherence remain unproved; consolidating the completed timing implementation does not waive them. Compare bounded exploration only when a turn actually lacks useful evidence.

Keep the compact evidence ledger in the permanent proof/QA owners. When all scoped acceptance is met, fold durable limits into permanent docs and remove this folder.

## Current checkpoint

- **Phase/next edit:** S3a. Narrowly extend the existing session report to distinguish proposed patches, retained notes/current documents, publication and final packet coverage. Then use the ordinary provider-free harness for note-only and document-backed restart/return cases. No new trace framework.
- **Inspected source:** gameplay `fc00d13`; documentation base `0c05006`; October 23 source/raw-response investigation. No runtime behavior changed in that investigation.
- **Evidence:** v16 shows correct timed work and short conversation, clue-note create/update patches, zero descriptive document proposals and departure without recall cues. No return turn. [Correction and identities](../../engineering/connected-poc-proof.md#memory-reinspection--2026-10-23).
- **Following slices:** S3b required exact selection/final packing → S3c durable offer/execution carriage → S3d materialization/return. [Canonical contract](../../technical/canonical-files.md#mechanical-continuity-dependencies--s3-design) defines ownership and failure behavior. Empty/social-free cases remain valid; sidecar success alone is insufficient.
- **Verification/limits:** source and saved artifacts inspected; no new gameplay run or broad checks. Docker status was unavailable, so historical database note state and generation/publication linkage were not freshly queried. Start only needed provider-free infrastructure when exercising the harness; preserve private evidence first.
- **Blocker:** stopped Docker limits database/runtime reinspection, not the report implementation or contract work. No unresolved product decision blocks the bounded slice.
- **Spend:** no provider calls; current external balance unverified. S4 live acceptance remains separately bounded/reconciled.
