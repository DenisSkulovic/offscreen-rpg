# Open decisions and bounded experiments

**Status:** investigation backlog, not selected engineering Changes. The goal is to discriminate between competing designs, not to manufacture confidence by adding more files.

## Decision log

| Question | Current working answer | What could change it? |
| --- | --- | --- |
| Should the player fill four setup steps? | **No**, owner explicitly rejects this product flow; preserve immediate preset Play and one freeform prompt for custom. | UX evidence might justify an optional advanced editor, not a required wizard. |
| Is a Storyteller profile a versioned document? | **Plausible target.** Existing `creative-guidance` and bundle contract support the substrate; runtime still captures strict JSON profiles. | Need a precise resolver/snapshot and a contrast with existing typed settings. |
| Should core profile instructions be injected automatically? | **Likely yes** for a bounded, pinned core; examples and large background can remain on demand. | Input-token measurements and source-priority tests. |
| Must setup be a separate model call? | **Undecided.** Compare one-round output plus initial document proposals with a separate preparation round. | Blind quality evaluations and actual latency/cost difference. |
| Is a pre-first-scene workbench already committed canon? | **Undecided; caution.** No first-scene checkpoint exists yet. | Failure/restart/fork protocol design and Game Authority ownership review. |
| Does every story need a planned plot? | **No.** A private direction can be absent, tentative, or explicitly “no grand arc”. | Long-play evaluations in directed and emergent fiction. |
| Can the agent write any file it imagines? | **No.** Documents are admitted, typed and revision-fenced; model proposes changes only within scoped permissions. | New supported document types require an explicit contract. |
| Can a creative pacing pill set clock speed? | **No.** Mechanical pace is typed and separate; product default requires an explicit decision. | Time/UX experiments determining what new players find tolerable. |

## Next investigation: launch lifecycle

For each scenario trace: original prompt; preset/world/rule pins; resolved creative guidance; initial workspace identity; tasks and cost; proposed documents; validation; first scene/checkpoint/root; failure and retry behavior; settings changes; later fork eligibility.

1. **Prepared Seyda Neen:** pinned authored documents plus optional profile, user presses Play without modifying anything. What is loaded automatically? What is cloned vs referenced? What is copyrighted fixture-only?
2. **Custom `bah`:** no character/setting constraints. How much invention is permitted? Which defaults are deterministic? How does the Storyteller choose a useful immediate situation without inventing false user intent?
3. **Conscious galaxy:** no human body, inventory or standard location. Does any input, candidate schema or bootstrap implicitly require a humanoid? Can a scene and meaningful choice be valid without one?
4. **Contradictory customization:** a prepared world's start defines an arriving prisoner; user requests being a timeless cosmic observer. Should this be a custom branch, refusal, or explicit replacement of the start? Never silently mix incompatible authority.
5. **Crash and race:** setup artifact exists but model crashes; provider delivered output without acknowledgement; concurrent edit occurs; package revision changes; first scene published but response lost. Does retry reproduce the same captured result exactly once?
6. **Future fork:** start/root and first scene commit must not import unrelated parent/sibling future knowledge.

## Candidate quality/cost comparison (no live dispatch authorized)

Hold source packages, prompts, task contracts, maximum budget and scoring rubric fixed. Compare:

- A: one grounded opening task proposing minimal setup documents alongside first scene.
- B: bounded preparation operation followed by a separately grounded opening task.
- C later only if A/B show a strong capability gap: conditional extra work based on observable complexity.

Assess outputs blind for: attractive first situation; coherence; originality without empty purple prose; player agency; suitable options; fidelity to supplied world and user prompt; no involuntary plot railroading; nonhuman compatibility; useful setup artifacts; continuity hooks; recovery; input/output tokens; real dispatch spend; elapsed time; number of reads/writes/rounds. Do **not** equate the larger token count with quality.

Stop/rollback signals: preparation regularly adds low-value or contradictory files; opening becomes slower with no visible story gain; cost doubles without clear wins; hidden world facts become prematurely committed; a model must read its own basic profile via unnecessary tool calls; provider failures lose work or duplicate charges.

## Specific unanswered design questions

- Is one Story Prompt persisted verbatim as a **user-intent source document**, a pinned launch input, or both? What are the authority/visibility and prompt-injection constraints?
- Which exact `creative-guidance` document takes precedence when a reusable world, authored start, user-created preset and later settings revision all define a voice? How are collisions reported?
- If the effective profile is synthesized from many texts, what exact **compiled snapshot** is retained with a task and checkpoint? Do we need a readable core plus structured companion fields?
- Which data belongs in a preparation result versus a proposed first-scene result? Can one structured response contain both without blurring approval?
- Who validates and publishes a preparation-only draft manifest? Can it be staged without making the story active, and how is it garbage-collected if abandoned?
- Which canonical documents, if any, are mandatory before opening? Could a prepared start already be sufficient with **zero** setup writes?
- How does the agent locate a relevant document efficiently after 200 scenes? Which required context is injected without searches, and which evidence gets selected by bounded navigation?
- How should typed time/pace, consent, characterless interactions and world invention permissions be defaulted without burdening the player with forms?
- How do we present loading, paid generation failure, held state and resume without showing a setup-review page?
- What is the actual rights and content-policy distinction between local licensed/development fixtures and publishable prepared experiences?

## Future acceptance gates (only after decisions)

1. Product owner agrees on player-facing behavior and confirms updated accepted contracts in `docs/product/`.
2. Technical owner diagrams initial root lifecycle and preserves game-authority, revision, fork, retry and budget fences in `docs/technical/`.
3. Small provider-free fixtures prove minimal prompt / authored bundle / nonhuman start and safe resumability.
4. Human-reviewed optional paid quality/cost experiment under separately approved funding.
5. Only then create **bounded, dependency-ordered Change packets**, avoiding UI edits that assume unresolved backend contracts.

## Specific protocol findings (2026-11-20; **unaccepted**)

- **Proposed staging choice:** Workdesk documents live under an owner-authorized Launch and a pinned **operation-local staging root**, not the published story root. Only a later Game Authority transaction commits the first scene, passage, admitted knowledge and supported checkpoint. See [PREPLAY-WORKDESK-PROTOCOL](PREPLAY-WORKDESK-PROTOCOL.md).
- **Opening output gap:** `openingProviderResultSchema` currently preserves only scene data; provider openings cannot simply publish their own proposed document edits. The output/adoption boundary needs explicit changes if preparation documents are to survive.
- **Profile resolution gap:** current `loadStartPackageKnowledge` relevance selection puts `creative-guidance` after other kinds under an 8-document/12 KiB context cap, so `STORYTELLER_PROFILE.md` has no guaranteed automatic injection. Need a role-based resolver with separate reserved budget. See [CANONICAL-ENTRYPOINT-RESOLUTION](CANONICAL-ENTRYPOINT-RESOLUTION.md).
- **Arbitrary bundle gap:** start-package schema currently requires a rule-package reference. Decide whether world-neutral bundles may omit it or need a distinct explicit no-mechanics rule contract; don't counterfeit fantasy mechanics.
- **Prompt limit gap:** draft premise SQL length is 6,000 characters. A longer Story Prompt needs an explicit size-admitted capture without silent truncation.
- **Checkpoint honesty:** opening checkpoints do not cover all mechanical starts today. The new launch protocol must not pretend a nonexistent first-scene checkpoint makes a fork possible.

**Next conversational starting point:** resolve the few remaining protocol choices using three provider-free fixture traces (ready preset, `bah`, cosmic observer), including an interruption between preparation and composition. Then decide the minimal accepted owner contract before any Cursor Change packet. No model-spending experiment or implementation is authorized here.

## Fixture pressure-test update (2026-11-20; design, not runtime proof)

[Fixture laboratory](fixtures/README.md) records current source inputs, expected pre-play state, prohibited invented defaults and cross-cutting recovery vectors. The three fixtures sharpen several decisions:

- **Prepared authored starts:** existing Seyda Neen source has five documents but no `STORY_PROMPT.md` / `STORYTELLER_PROFILE.md`. New file roles require explicit authored data and validated manifest resolution; do not claim present behavior works.
- **BAH:** a one-word, minimally specified custom prompt needs an admitted original-world invention default, not obligatory form completion. There is no reason to *require* a paid worldbuilding pass or a character sheet.
- **Conscious galaxy:** a non-mechanical narrative choice can potentially fit the existing playable schema, but universal actor mechanics and rule-free prepared bundles are not currently solved. Time scale in narration and typed clock advancement must be kept separate.
- **New gap:** one-click Play eliminates human review *and* the current later Start action. We must explicitly handle **scene publication versus confirmed player arrival** and prevent invisible consequential time accrual after lost HTTP delivery.
- **Evaluation:** preparation value must be judged through opening **and second-scene** quality and correct evidence reuse; a large number of new files is not a success metric.

**Next investigation:** choose the minimum launch/admission contract, authorized original-world invention defaults, role resolution policy and no-hidden-clock principle; then decide if a small first executable Change can be sliced without prematurely implementing the entire Writer's Library.

## Critical versioning/fork constraint | 2026-11-20

The owner explicitly requires **Git-like historical and branch semantics with structural sharing**, **not** whole-Library copies per scene. Source review finds that the v1 system shares unchanged content object hashes, but reserializes a full flat array of manifest entries per document revision and per checkpoint fork, reads entire manifest history with a 256-manifest limit, and identifies source references only by document UUID plus local revision (which can collide on divergent branches). This is a **real architectural scaling and provenance issue**, not only a future performance tweak.

- [Versioned Library source audit](VERSIONED-LIBRARY-SOURCE-AUDIT.md) separates existing CAS reuse from full-flat metadata copying and fork limitations.
- [Persistent Library DAG design](PERSISTENT-LIBRARY-DAG-DESIGN.md) proposes structurally shared persistent path index with immutable document hashes and scene-root tuples. It does **not** select a particular tree algorithm without benchmarks.
- [Versioning acceptance vectors](VERSIONING-ACCEPTANCE-VECTORS.md) specify 1,000+ revisions, 10,000 docs in one folder, divergent documentId@2, no-op scene/root reuse, forks/history authorization, Workdesk stages, GC and state checkpoints.

**Sequence constraint:** Before implementing general writable Writer's Workdesk or unlimited scene forks, reconcile/source-proof source identity, root reachability and long-history indexing. A separate state-checkpoint performance/active-work design may be needed; versioning Markdown alone cannot recreate all mechanical truth. The root tuple is selected under the existing Game Authority transaction boundary. Product/tech owners must ratify the target before Cursor Changes.

**Additional verified source nuance:** `stageStoryPublicationDocuments` appends one new `source-passage` file on supported Storyteller publication even with zero lore edits. Therefore normal narrative advancement generally adds one document/version to the Library, and the proposed efficient path is a one-leaf persistent-tree update, **not** an unchanged root after every scene. Only document-free transitions can retain the root. The fixed 256-history walk is correspondingly more consequential.

## Index and historical-scene gate | 2026-11-20, unaccepted

- **Recommended to benchmark, not yet chosen:** a bounded-byte persistent **path-ordered B+ tree** versus a path-compressed radix tree. A reproducible standard-library synthetic experiment shows much less metadata serialization for repeated existing-file edits, but omits insertion/deletion, durability, network/storage costs and crash recovery; it is *not* production evidence. [Comparison and research script](PERSISTENT-INDEX-COMPARISON.md).
- **Historical consistency contract:** the shared Library tree root must not hash in campaign/branch identity, scene number or mutable history; the separately admitted scene boundary points to the root, exact relevant engine checkpoint, creative/rule pins and passage. Forks need their own operational identities while sharing inherited knowledge objects. [Scene/provenance design](HISTORICAL-SCENE-AND-PROVENANCE.md).
- **Critical technical trap:** a newly created document cannot include the hash of the Library root that includes the document itself; use hash-qualified source objects plus acyclic, separately committed reachability/authorization evidence.
- **Configuration audit risk:** historical fork currently chooses checkpoint premise but source live-row storyteller/execution/usage fields. Those fields appear effectively stable in inspected code, so this is **not a proven bug**; future profile editing and policy changes must explicitly distinguish historical creative pins from newly granted operational budgets.
- **Remaining before implementation:** test true insertion/deletion and deterministic rebalancing, capture root membership and cross-branch source references, design active-work state fork scope, ensure v1 checkpoint/read compatibility and explicitly reconcile source authority. No Change packets or storage migration authorized.
