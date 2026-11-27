# Pre-play Workdesk protocol | staged library, opening, and activation

**Status:** specific *candidate* architecture, 2026-11-20. **Not ratified and not a Cursor Change.** Based on [SOURCE-AUDIT](SOURCE-AUDIT.md) and [LAUNCH-BOUNDARIES-AUDIT](LAUNCH-BOUNDARIES-AUDIT.md). The title “Workdesk” refers to a **mission-local creative workspace**, not a new human-facing setup screen and not an unrestricted actual filesystem.

## Working recommendation

**Prefer an operation-owned, immutable pre-play staging root over a published but inactive campaign canon root.** Stage documents so the Storyteller can read them in a later admitted invocation, but do **not** install that root as `story.documentRootHash` until a valid first passage/state boundary can be committed.

This follows the pattern already visible in `stageStoryBootstrapDocuments`: CAS writes may happen before the SQL transaction; only the transaction's selected references make the result publicly authoritative. It also follows the existing documented difference between a passage, checkpoint and canon root.

**Why this over “create a campaign at setup”**: a campaign with a visible root but no passage, scene checkpoint, mechanic authority, or notion of what a fork means multiplies intermediate gameplay states and read permissions. It makes abandonment and retries harder. The Workdesk should exist because a launch is underway, not because the player has already begun living in a fictional world.

## Three distinct roots or source sets

1. **Pinned source inputs**: authored preset package/world/rule roots plus raw verbatim user intent and any applicable defaults/preferences captured at admission. An authored preset bundle remains immutable/reusable; player customization never rewrites that source package.
2. **Operation-local Workdesk**: a versioned staging manifest whose content-addressed documents are only accessible through the owner-authorized Launch. It may contain copied/adapted orientation, proposed creative interpretation, provisional identities/threads, and clearly marked *private possibilities*. Its effective contents are *not yet published campaign canon*, regardless of what authority a proposal requests.
3. **Published campaign root**: the Game Authority selects a final admitted manifest consistent with passage 1 and any supported checkpoint/mechanical state, plus document/source provenance. Only this root becomes the normal campaign Library for later tasks.

**Important terminology:** “stored” means the blob/manifests exist. “Staged” means their identity is captured under a Launch. “Admitted” means validation/permissions accepted the proposed semantics. “Published” means the Game Authority installed the actual campaign root/state at a valid boundary. None of those words is interchangeable.

### Do we need a new database table?

Not necessarily. A launch needs at least one durable owner-bound record/selector for `launchId`, exact input capture, task states, selected stage identity, cost/settlement, failure class and eventual story identity. The existing `generation`, `storytellerOperation`, `storytellerAttempt` and receipts may provide much of this, but their schemas currently assume a single task kind and draft-opening source. Determine whether to extend those or introduce one small Launch coordinator. **Do not** introduce per-document creative-content SQL tables, and **do not** store duplicate full Markdown bodies in multiple row blobs.

If stage manifest references change, persist **which hash was accepted** (or reconstruct it deterministically from an immutable captured result). It cannot be an in-memory pointer surviving only while the worker is alive.

## End-to-end state model (proposed)

```text
Player: Play(PresetRef or Prompt)
   |
   v
CAPTURED
  - stable launch ID, intended story ID, owner
  - exact user prompt, source roots, settings/profiles, cost policy
  - no paid attempt yet
   |
   v
PREPARING (OPTIONAL)
  - deterministic seed of source library/entrypoints
  - optional bounded Storyteller preparation task
  - validated result -> operation-local staged root
  - no published story/passage/clock
   |
   v
READY_TO_COMPOSE
  - frozen Workdesk root and required effective guidance
   |
   v
COMPOSING
  - Storyteller opening task against captured sources and staged root
  - deliver and settle exactly once; proposed documents/scene/options
   |
   v
READY_TO_ACTIVATE
  - validate proposal, construct final root and passage
  - validate mechanical state, optional checkpoint/obligation semantics
   |
   v
SQL PUBLICATION TRANSACTION
  - lock/select input identity, story, root, passage, state/receipts
  - when supported, checkpoint matches the selected root
   |
   v
PLAYABLE
  - first scene shown; ordinary context and gameplay may resume
```

`HELD`, `FAILED` and `UNCERTAIN` are durable, **distinct** outcomes from admitted paid/preparation work. A retry is not automatically a fresh paid operation. `PREPARING` can be omitted for a complete preset and may use zero model calls. `READY_TO_COMPOSE` is a logical state, not necessarily another database row or network endpoint.

### The actual user-facing behavior

Prepared preset: **Play** launches the captured preset. **Customize** edits a single effective prompt while preserving authored package references and compatibility checks. No questionnaire, profile menu or “Review your setup” page.

Custom prompt: user enters `bah` or any admitted-length text and presses **Play**. A local loading/progress view can explain that the opening is being prepared; it should not force the player to read or approve internal documents. Failed, uncertain and resumable work can be shown honestly, with permitted recovery actions.

Optional progress UI is not the same as a configuration wizard. Do not claim an opening has been published before the transaction succeeds.

## When should we run a separate preparation model turn?

**No universal mandatory setup call.** First compare two explicit test recipes:

- **Recipe A, grounded opening**: capture source, deterministically expose small required documents, invoke once, obtain scene plus *bounded* proposed initial documents; Game Authority validates and installs everything together.
- **Recipe B, prepare then compose**: capture source, invoke a bounded `prepare-workdesk` task returning a restricted set of proposed documents and/or a short direction; validate and stage those; next admitted invocation receives their exact root and writes the scene.

Recipe B can provide useful coherent context when the prompt is expansive or underspecified. But it may cost more and encourage needless planning. A rich, curated preset should usually skip preparation inference; the harness can orient it deterministically.

An adaptive router is **not yet selected**. “The LLM decided to think longer” is not a valid spending grant. The two recipes must retain explicit task/operation budgets and selected skill/profile hashes.

### What setup may propose (initial narrow contract)

A preparatory Storyteller task may:
- Read the pinned original prompt, applicable authored Library, required creative guidance and available permitted sections.
- Produce **zero or a few** proposed `.md` files, e.g., an orientation note, minimal stable premise/setting interpretations, and an optional private direction or list of uncertain possibilities.
- Explicitly report **no further preparation needed** when authored source is already sufficient.
- Return structured proposed document operations plus provenance/explanations, not an executable shell script, raw SQL or a blob of hidden reasoning.
- Name any desired opening dependencies by exact pinned handles so the next task can automatically receive the needed material.

A prep result **must not**: publish passage 1, schedule obligations, accelerate clock, manufacture inventory, assign spending privileges, declare a private hypothesis settled truth, or require a fixed set of maps/characters/plot outlines.

If the task proposes a new profile file, it should be a lower-trust *candidate creative guidance* subject to explicit policy about who can change the effective profile. One preparation step must never silently rewrite its own captured personality halfway through.

### Snapshot and deterministic replay

Inputs captured on admission:
`launchId`, `storyId`, `ownerId`, `effectivePromptHash`, `authoredPromptHash?`, `presetRoot?`, exact source world/rule references, frozen effective profile/skill identities and injection content, typed clock/mechanics/invention limits, model route/resources, operation ID, and permitted document-root baseline.

Before an external provider attempt, persist the **exact normalized request** (not just mutable paths). After response, persist the normalized delivery and settlement evidence. Preparation output should be schema-validated, then stored as immutable proposed documents with deterministic IDs (for example, launch ID + proposal index/path). Materialized stage manifest carries expected root, revision, changed handles and provenance.

On restart:
- If no attempt dispatched, resume same captured operation.
- If settled delivery exists, reconstruct the identical staged files without paying again.
- If sent but delivery not known, mark **uncertain**; do not re-dispatch automatically.
- If workdesk stage exists, compose using its pinned root, not a newly interpreted or updated preset.
- If final passage/publication succeeded but HTTP response was lost, return the existing story/scene, no duplicate passage, schedule or charge.

A *separate* approved repair attempt must fit already captured resource limits; do not quietly create a new operation with a fresh budget.

## Publication and failure invariants

1. An operation-owned staged root never appears through normal `readRoot(storyId)`, never authorizes play, never increments story time, and is not a valid historical fork source.
2. Only the owning Launch and its admitted Storyteller tasks may read staged documents. Every read resolves one captured root; never search all unpublished Workdesks or other users' campaigns.
3. Physical CAS object persistence before a SQL transaction is allowed; failed publication leaves **unselected objects** to controlled retention/GC, not phantom canon.
4. The selected first passage, root, applied mechanics and any valid scene checkpoint must describe one coherent point in time. Some current starts do not create a checkpoint. Do not fake one; define a first-iteration unsupported case explicitly.
5. Preset/campaign document copies preserve original source provenance. Model-invented facts are marked as invention, not falsely attributed to an authored world document.
6. Private possibilities are versioned but `noncanonical` and never satisfy mechanical preconditions.
7. Concurrency: a new prompt/preset/profile revision cannot contaminate an in-flight captured task. Two Play submissions with the same idempotency ID must return the same launch; two different IDs require an explicit policy on concurrent drafts/campaign creation.
8. **First-scene completeness** must be validated. A narrative opening may use narrative choices; a mechanical opening needs supported action/interaction contracts. A galaxy is not forcibly given humanoid HP/inventory or an invalid offer.
9. No Write-then-Guess: tool writing must be a deterministic proposal + engine adoption step with a root fence. A hidden model-side “save document” call is not a publication boundary.

## Compare two storage approaches

| Design | Benefit | Cost/risk | Preliminary judgment |
| --- | --- | --- | --- |
| Operation-local staging manifest | Source and candidate work may persist without creating live story; simpler abandonment and fork semantics; naturally reusable CAS storage | Needs an owner-bound stage selector and special read authorization | **Preferred for a first prototype** |
| Inactive campaign root in live story row | Existing document reads may appear reusable without a separate namespace | Adds story with no first scene/checkpoint, possible route leakage and unclear historical fork/read semantics | Do not select without compelling evidence |

A staging manifest might reuse validated document envelopes/entries but needs an explicit **staging identity or wrapper** so the code cannot mistake it for a committed `offscreen.manifest.v1`. That wrapper is *control metadata*, not a new creative JSON knowledge base. Exact schema and whether a new table is necessary remain open.

## Focused provider-free proof targets

- Preset with authored source documents and profile: no unnecessary setup paid round, captured source/body hashes stable; first scene derives from pinned sources.
- `bah` and galaxy with no character or inventory: neither is rejected solely because fields are absent; unsupported mechanics fail honestly.
- Crash after prep delivery but before stage pointer: deterministic reconstructed stage root.
- Crash after stage pointer but before opening: opening receives the identical staged root.
- Crash after opening delivery but before SQL commit: publication reuses the delivered result exactly once.
- Same ID retry versus different ID/new prompt; stale preset/profile root; cross-owner stage-read denial; collision between root names.
- Start with active obligation/offer: no imaginary checkpoint or fork capability; no duplicate scheduling.
- Rejected document/path/role proposal: no published contamination; recoverable error and bounded repair rules.

**Design gate still open:** exact stage-state persistence, profile/intent authority, target first-scene checkpoint semantics and measurable A-versus-B storytelling improvement. Do not write implementation Changes until these are reconciled with canonical product and technical owners.
