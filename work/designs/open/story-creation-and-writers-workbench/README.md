# Story creation and the Storyteller's writer's workbench

**Status:** active **investigation / unaccepted architecture**, begun 2026-11-20. **Source basis:** repository snapshot `09d5820bcafedbed7cf969fe228ee84f44ff2405`, read-only inspection. **No implementation, provider spending, or selected Change is authorized by these notes.**

**Question:** How do we replace the four-step setup wizard with immediate play from a prepared experience or one freeform Story Prompt, while giving the Storyteller a durable, coherent, appropriately bounded private creative workspace?

This dossier is the home for the continuing multi-conversation investigation. It is **not** a competing source of accepted product or technical law. A future chat should start with this page, check the source HEAD against the dated audit, then continue the unresolved design rather than restarting the discussion.

## Documents

- [SOURCE-AUDIT.md](SOURCE-AUDIT.md) — observed implementation and source-backed constraints at the inspected SHA.
- [DESIGN-NOTES.md](DESIGN-NOTES.md) — the player-facing intent, creator's library concept, competing setup architectures, authority and cost rules.
- [QUESTIONS-AND-EXPERIMENTS.md](QUESTIONS-AND-EXPERIMENTS.md) — decisions not yet taken, risk probes, and bounded evaluation design.
- [FILE-FIRST-LIBRARY-REVIEW.md](FILE-FIRST-LIBRARY-REVIEW.md) — Markdown-first Storyteller interface versus physical JSON/CAS and SQL control, filename discovery, authority and API boundaries.
- [INITIALIZATION-LIFECYCLES.md](INITIALIZATION-LIFECYCLES.md) — competing single-round and preparatory-workbench launch lifecycles, concrete preset/custom traces and failure matrix.
- [WRITER-SKILLS-EXPERIMENT.md](WRITER-SKILLS-EXPERIMENT.md) — workdesk metaphor, creative skills versus executable tools and cheap-model quality/cost experiments.
- [LAUNCH-BOUNDARIES-AUDIT.md](LAUNCH-BOUNDARIES-AUDIT.md) — source trace of draft, opening, start-package import, initial-root selection, first checkpoint and cost boundaries.
- [PREPLAY-WORKDESK-PROTOCOL.md](PREPLAY-WORKDESK-PROTOCOL.md) — candidate operation-local staging root, complete launch state model, A/B recipes, replay, visibility and failure invariants.
- [CANONICAL-ENTRYPOINT-RESOLUTION.md](CANONICAL-ENTRYPOINT-RESOLUTION.md) — deterministic standard-file selection, profile compilation, precedence, size budgets and provenance.
- [VERSIONED-LIBRARY-SOURCE-AUDIT.md](VERSIONED-LIBRARY-SOURCE-AUDIT.md) — measured-by-inspection differences between CAS reuse and full flat metadata manifests; source identity and the 256-revision limit.
- [PERSISTENT-LIBRARY-DAG-DESIGN.md](PERSISTENT-LIBRARY-DAG-DESIGN.md) — Git-like structural-sharing model for scene commits, forked Library roots, immutable source provenance and Workdesk staging; alternatives explicitly unaccepted.
- [PERSISTENT-INDEX-COMPARISON.md](PERSISTENT-INDEX-COMPARISON.md) — ranked index alternatives, reproducible synthetic flat-manifest vs toy persistent-tree comparison, and criteria to select production B+/radix.
- [HISTORICAL-SCENE-AND-PROVENANCE.md](HISTORICAL-SCENE-AND-PROVENANCE.md) — separate Library root, scene history, checkpoint and branch authority; exact citations, fork identity and migration risks.
- [SCENE-COMMIT-AND-ACTIVE-WORK-AUDIT.md](SCENE-COMMIT-AND-ACTIVE-WORK-AUDIT.md) — source-level gaps in v1 checkpoint eligibility, post-notes consistency, historical config and forked generated-choice admission.
- [SCENE-COMMIT-AND-ACTIVE-WORK-DESIGN.md](SCENE-COMMIT-AND-ACTIVE-WORK-DESIGN.md) — candidate post-publication scene tuple, separate state frontiers, ChoiceCapsule, active-work semantics and branch-safe rehoming.
- [FORK-COMPATIBILITY-AND-MIGRATION-GATES.md](FORK-COMPATIBILITY-AND-MIGRATION-GATES.md) — targeted provider-free falsification cases, v1/v2 coexistence and incremental migration/acceptance gates.
- [VERSIONING-ACCEPTANCE-VECTORS.md](VERSIONING-ACCEPTANCE-VECTORS.md) — scalable updates, long histories, divergent revisions, frozen profiles, fork security, checkpoint/GC and failure tests.
- [fixtures/README.md](fixtures/README.md) — three source-backed launch fixtures (Seyda Neen, BAH and conscious galaxy), expected snapshots, counterexamples, replay and clock-arrival matrix; design-only, no runtime tests.

## Owner's product direction (from conversation, not yet reconciled into canonical docs)

- A prepared experience offers **Play** immediately, with **Customize** as a secondary, optional route; a preset can consist of a pinned bundle of prewritten campaign-relevant documents, not merely a preset prompt.
- A custom experience has **one freeform Story Prompt**. It can be as minimal as `bah`, an abstract galaxy, or a multi-page carefully composed prompt. Character name, title and circumstances are not mandatory separate fields; a story need not contain a conventional character.
- Optional pills insert editable creative guidance into that prompt. Missing tone, personality and pace guidance should be handled by sensible defaults and/or bounded interpretation, not a mandatory form.
- No multi-step wizard and no obligatory human review form. The player should reach playable fiction as soon as an admitted launch can produce it. Background generation remains honest and recoverable; never claim instant completion.
- The initial experience should avoid prolonged real-time waits. **Dramatic rhythm is not mechanical clock pace.**

**Technical direction under investigation:** The Storyteller may be assigned a private **workbench preparation** mission, with an already-pinned player prompt and optional start-package library. The agent might organize a small initial working library before generating the opening; a separate paid setup turn is **an option, not a decision**. A profile may be versioned creative-guidance content such as `STORYTELLER_PROFILE.md`, injected into permitted captured tasks automatically instead of charging an extra discovery round.

## Authority boundaries to preserve

1. Game Authority and its publication/admission fence commit world/mechanical truth. The Storyteller produces bounded creative proposals; a document edit does not grant mechanical effects.
2. Distinguish **user intent**, **source canon**, **admitted campaign canon**, **storyteller-private possibilities**, **derived summaries**, **creative guidance**, **typed clock/safety/financial controls**, and **uncommitted drafts**. Not everything in an addressable file is a world fact.
3. Once admitted, tasks must preserve precise source/profile/settings revisions, spending identity, and read visibility. Crashes, retries, concurrent edits and forks must not silently change their source or repurchase a model response.
4. A playable opening must not require a character body, inventory, economy, quest or plotline, and preparation must not manufacture encyclopedias merely to populate folders.
5. Tool exploration should be purposeful and budgeted. A navigable library does not mean retrieving the whole library each turn, or running a setup model call for every start.
6. Authored external-world bundles require source-rights scrutiny. The Seyda Neen development fixture is not a cleared public product preset.

## Adjacent existing owners

- [Entry and onboarding](../../../../docs/product/experience/entry-and-onboarding.md) currently prescribes the staged creation flow. It is a **future reconciliation target**, not silently changed by this design.
- [Storyteller profiles and settings](../../../../docs/product/storyteller/profiles-and-settings.md) owns creative-control semantics; [versioned settings](../../../../docs/technical/storyteller/versioned-settings.md) owns captured configuration.
- [Canonical documents and packages](../../../../docs/technical/storyteller/canonical-documents-and-packages.md) owns start-package metadata, file authority, revision and publication.
- [Context selection and recall](../../../../docs/technical/storyteller/context-selection-and-recall.md) owns bounded injected material and optional discovery.
- [Operation and controller](../../../../docs/technical/storyteller/operation-and-controller.md) owns durable rounds, provider accounting and tool admission.
- [Player experience refoundation](../player-experience-refoundation/README.md), [first campaign readiness](../first-campaign-readiness-2026-11-20/README.md) and [canon invention policy](../canon-invention-policy/README.md) are related but **not replaced** by this dossier.

## Research sequence

- **I1 recorded:** inspect existing creation, profile, start-package, opening and bootstrap implementation; record the user's workbench hypothesis and its architectural costs.
- **I2 drafted 2026-11-20, not accepted:** compare A (single-round composition) vs B (separate Workdesk preparation) and conditional C; trace prepared preset, `bah`, abstract galaxy, pre-play staging, retry and first-scene root. See [INITIALIZATION-LIFECYCLES](INITIALIZATION-LIFECYCLES.md).
- **I3 protocol drafted, awaiting owner review:** prefer operation-local pre-play staging, distinguish persisted/staged/admitted/published roots, propose deterministic resolution of conventional entry documents, and identify source-only gaps (opening cannot publish documentChanges, profile guidance can be omitted, start bundles require rules). Read [LAUNCH-BOUNDARIES-AUDIT](LAUNCH-BOUNDARIES-AUDIT.md), [PREPLAY-WORKDESK-PROTOCOL](PREPLAY-WORKDESK-PROTOCOL.md) and [CANONICAL-ENTRYPOINT-RESOLUTION](CANONICAL-ENTRYPOINT-RESOLUTION.md).
- **I4 fixtures drafted, not executed:** concrete Seyda Neen / `BAH` / conscious galaxy vectors and failure cuts are specified under [fixtures](fixtures/README.md). Next: resolve open owner-level contract decisions, then formulate provider-free executable proof and blinded quality/cost experiments. No Cursor Changes or provider grants yet.
- **I5 versioning source audit + DAG proposal drafted 2026-11-20:** current document bodies are CAS-shared, but each canonical passage adds a source document and flat full manifests are O(N) per update/fork; historical source lookup has an explicit 256-manifest bound and documentId+revision citations are ambiguous across divergent forks. Prefer a benchmarked persistent bounded-fanout tree with scene-root references, not physical Git or full-library cloning. See [source audit](VERSIONED-LIBRARY-SOURCE-AUDIT.md), [proposal](PERSISTENT-LIBRARY-DAG-DESIGN.md), [tests](VERSIONING-ACCEPTANCE-VECTORS.md). No execution authorized.

**Do not** auto-select a Change, automatically dispatch a provider, or treat a proposed `STORYTELLER_PROFILE.md` path as an implemented runtime feature.

- **I6 index and scene-history comparison drafted 2026-11-20:** the [synthetic benchmark](PERSISTENT-INDEX-COMPARISON.md) confirms a metadata-write advantage for a toy bounded index, but not production correctness. [Historical-scene/provenance notes](HISTORICAL-SCENE-AND-PROVENANCE.md) separate branch-neutral Library roots, scene selectors, mechanical state, source hashes and owner-scoped access. B+ vs radix and active-work forks remain open.
- **I7 source audit + scene/fork protocol drafted 2026-11-20:** discovered pre-notes checkpoint skew, broad historical-row eligibility blockers, generated fork choice missing its source generation, and future historical profile drift. [Audit](SCENE-COMMIT-AND-ACTIVE-WORK-AUDIT.md), [candidate scene-commit contract](SCENE-COMMIT-AND-ACTIVE-WORK-DESIGN.md), [gated migration/tests](FORK-COMPATIBILITY-AND-MIGRATION-GATES.md). Next: typed ChoiceCapsule and complete post-state contract with one provider-free harness regression before implementation packets.
