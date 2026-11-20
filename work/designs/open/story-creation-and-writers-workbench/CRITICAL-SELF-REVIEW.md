# Critical self-review | stop architectural inflation

**Status:** independent adversarial review of our own **unaccepted** design dossier, 2026-11-20. This is a correction and triage note, NOT a new ratified architecture, Cursor Change, executed application test, or provider quality evaluation. **Code basis:** supplied repository snapshot `09d5820bcafe`; current GitHub design HEAD before this review `4aea6555`. Source was re-opened, rather than relying on previous chat conclusions.

## Owner correction: keep the agentic heart

**Read [AGENTIC-WRITER-POC.md](AGENTIC-WRITER-POC.md) alongside this review.** The anti-slop conclusion was at risk of overcorrecting toward a one-shot model with a growing input packet. That **does not** satisfy the desired game. The Storyteller must eventually navigate the versioned Library, actively research unknowns, consult narrow writer skills, prepare and reread its own draft notes, and occasionally delegate independent source investigations to read-only model contexts. Those are substantive product capabilities, not decorative subsystem names. The initial POC must demonstrate at least a real tool-using Workdesk loop; a delegated-research experiment belongs on its path. Reuse the existing durable multi-round memory controller, root-fenced reads and publisher rather than inventing generic orchestration for its own sake.

The 256-manifest bound is **not** the Storyteller's model context limit. It is inside `readManifestHistory()` in the **separate document read/edit service**. The current `createCanonicalMemoryExplorer()` checks current-root entries directly and never calls that history walker. Keep the working retrieval surface while fixing the legacy history-read design.

## Verdict

The product direction remains sensible: **Play directly; accept one freeform Story Prompt; use a versioned, navigable Library; retain exact history and fork isolation; separate literary proposals from Game Authority.** The surrounding architecture discussion is too large and too confident relative to runnable evidence. At this point the dossier contains **24 files, about 243 KB**, while its proposed new storage/launch/choice systems have **no executable end-to-end proof**. Adding more design documents without discriminating tests is now a process failure.

**Decision rule for the next turns:** stop naming subsystems and stop producing Change packets until we can state (a) one failing/rejected source-level behavior, (b) the least invasive repair candidates, (c) one provider-free test that distinguishes them. Keep source facts separate from ambitions.

## What survives adversarial review

| Proposition | Current judgment | Why |
| --- | --- | --- |
| One Story Prompt; immediate Play; optional preset customization | **Keep as owner-selected product intent.** | The current 4-step wizard imposes irrelevant fields, and a nonhuman story should not require an invented human. Still needs accepted product/contract reconciliation. |
| Canonical files as Storyteller's primary creative interface | **Keep.** | Existing document/manifest, scoped reading and `creative-guidance` substrate support it. Conventional paths are ergonomic, not permission grants. |
| Immutable content objects + exact historical root/branch isolation | **Keep as a correctness requirement.** | Existing CAS and v1 checkpoint/fork implementation show a workable foundation. There must be no whole-document copy per scene. |
| Narrative Library and exact mechanical state must agree at a historical boundary | **Keep.** | The selected long-term technical target already says this. No extra “scene superstructure” is needed merely to repeat it. |
| Optional writer's Workdesk metaphor and a tiny focused skill | **Keep as hypotheses only.** | No evidence yet that using these words or a separate skill improves model quality/cost. Do not install a skill framework before an A/B. |

## Overengineering and unsupported confidence to retract

1. **`CompletePostState` as a named architecture was premature.** The concrete source problem is narrow: `stageSupportedContinuationCheckpoint` captures `current.continuityNotes`; `commitStoryContinuation` checks/inserts that staged checkpoint **before** `publishStorytellerNotes` changes those notes in the same SQL transaction. This can make the historical checkpoint pre-notes relative to the published passage. **First remedy to test:** calculate the expected continuity patch deterministically before staging; compare/commit against that exact result, preserving lock/fence behavior. Only generalize to a state projection if several real categories require the same mechanism.
2. **`ChoiceCapsule` as a new artifact was premature.** Current fork clears `sourceGenerationId`, while generated-choice admission needs it to find saved output and hidden intentions. This is a plausible executable fork failure, but the first options are: (A) an authorized immutable *provenance reference* to existing saved result, without claiming new spend ownership; (B) a minimal selected-intention payload persisted with the passage/checkpoint. **Test both; do not add another database and content-root type before proving a need.**
3. **Selecting a persistent B+ tree now would be architecture theater.** V1 has a 4096-entry manifest cap and a 1 MiB CAS-object cap. Our 10,000-file toy extrapolation lies outside those existing limits; it exercises only existing-key replacements and ignores insertion/deletion, prefix listing, network calls and tree-rebuild overhead. The study supports further measurement, not a production selection. A path-compressed trie, sharded manifest or smaller source-history fix may be sufficient.
4. **We exaggerated the 256-history problem's immediate scope.** `readManifestHistory()` currently runs in `readDocument()` and manual `admit()` (with root/source validation). The mere existence of 257 published passages does **not by itself prove** that their ordinary publication fails. It may break those historical/read/edit paths, so reproduce *those* paths before calling it a universal long-play blocker.
5. **“Every scene forkable” was repeated as if it follows from immutable roots.** V1 checkpoints deliberately exclude active obligations, offers, holds and certain activity states. Preserving a narrative Library root doesn't solve those executable states. First get sound historical *review*, then exact quiescent *fork*, then prove one rehomeable active category. It may be reasonable to state that some unsettled external outcomes cannot be forked immediately.
6. **Mandatory pre-opening planning and canonical file proliferation have no evidence.** A richly authored preset should need zero paid setup turns, and `BAH` might be better served by a single well-grounded opening. Do not demand extra lore files as an output metric or impose a universal 2-call setup pipeline.
7. **A `Storyteller profile compiler` may be too grand a label.** The immediate requirement is deterministic exact-path/kind resolution of a bounded creative-guidance document and capture of its bytes/hash in the admitted task. A special compilation language, merge framework or extra service is unproven.
8. **One giant `SceneCommit` object is not automatically required.** Existing SQL story/passage/document/checkpoint selectors can likely carry a coherent tuple. The first task is to prove (and fix if needed) their joint invariants, not create a duplicate authoritative event hierarchy because we drew it.
9. **Our experiment descriptions aren't execution evidence.** Previous “fixtures” are prose test vectors. No actual source importer/Storyteller run on `BAH`, conscious galaxy, or the future `STORYTELLER_PROFILE.md` convention was demonstrated. Never report them as passing fixtures.

## Concrete source checks and proof plan

| Rank | Reproducible question | Minimal check | Pass/fail signal |
| --- | --- | --- | --- |
| **P0** | Does scene-2 checkpoint preserve newly published continuity notes? | Extend `packages/application/test/scene-checkpoint-publication.test.mjs` case with `gary-watch`; **read back the immutable checkpoint**, not only the live row | Compare exact post-publication notes/canon passage; a mismatch demonstrates temporal skew |
| **P0** | Can a copied generated option actually be selected after a fork? | Extend the existing historical-fork or generated-opening test with **submission of a forked choice**, not only inspection of button ID | A branch-owned resolution is admitted without claiming the parent's paid attempt |
| **P1** | Does a completed historical obligation unnecessarily block a quiescent checkpoint? | Disposable DB fixture with `world_obligation.state='fired'` vs `pending`; observe `checkpointIsBlocked` effect | Distinguish intentional v1 conservatism from actual active-work state |
| **P1** | Which supported document path reaches the 256-manifest cap? | Provider-free 257-chain fixture; call `readDocument` and document `admit`, **not** just `append passage` | Exact error and operation boundary; choose smallest remedy |
| **P2** | Are document tree rewrites a real product bottleneck? | Measure normal first-play and long-play distribution of documents/revisions, actual object bytes and S3 operations | Choose v2 index only if expected scale justifies complexity |
| **P2** | Does a separate creative setup mission improve stories? | Under a separately approved budget compare one-round vs two-round results, using opening **and next-scene** evaluation | Quality gain sufficient to justify money and latency |

No runnable code for these new assertions was committed in this review. The supplied lean ZIP has **no installed Node dependencies**, and `node scripts/repo-tools/wiki-health.mjs --json` returned **NOT-RUN (exit 3)**. Do not claim a green test suite.

## Another serious finding: our own prior archive move broke incoming links

In the supplied `09d5820bcafe` snapshot, a lexical scan finds **405 occurrences** of `archive/2026-11/other/` across **73 Markdown files**, plus **771 occurrences in the generated `WIKI-INDEX.json`**. Some code-test strings also contain the old path. A direct check against current GitHub `main` confirms a broken link in `docs/technical/storyteller/canonical-documents-and-packages.md`: archived ARCH02 lives under `architecture/`, not `other/`.

This is an actual repository-maintenance regression following the earlier archive reorganization. **Do not confuse raw occurrences with 405 independently validated broken Markdown links:** some may be historical text, references to the singleton that remains in `other`, or links whose targets were already missing. It nevertheless defeats our earlier claim that the archive had been fully reconciled.

**Required separate mechanical remediation:** build a map from existing archived leaf names to the *current* category; rewrite only proven moved references in tracked source Markdown (not code-test fixtures); validate every destination, including suffix `TASKS.md` versus `CHANGE.md`; regenerate `WIKI-INDEX.json` using its actual generator rather than naïve substring-editing indexed previews; run docs/wiki link checks on a **full repo checkout**. The supplied lean ZIP intentionally omits archive payloads, and the local wiki checker lacks installed dependencies. **This audit does not mark the 405/771 occurrences repaired.** Avoid a sweeping blind replacement.

## Immediate design posture

**Stop constructing the perfect storage engine on paper.** Start with focused provider-free regression probes P0 and P1, keep v1 immutable objects and existing transaction fences, repair proven skew/choice admission, then return to a truly measured storage choice. The original UX goal, direct Play with one prompt, remains visible and should not disappear behind infrastructure research.

**Proof gate for the next implementation Change:** attach source anchors, one executable red→green behavior, an explicit no-new-tool/no-new-table default, and an honest reason if a new artifact or SQL schema is necessary. Cursor should execute a bounded fix, not infer a new architectural program from this dossier.
