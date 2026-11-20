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
- **I3 in progress:** decide whether standard named Markdown entry documents become reserved hooks, how core profile/prompt content is pinned and auto-injected, what proposed writes mean, and whether narrow writer skills beat matched-token baselines. See [FILE-FIRST-LIBRARY-REVIEW](FILE-FIRST-LIBRARY-REVIEW.md) and [WRITER-SKILLS-EXPERIMENT](WRITER-SKILLS-EXPERIMENT.md).
- **I4:** design minimal quality/cost probes; only after product/technical reconciliation prepare bounded executable Changes for Cursor.

**Do not** auto-select a Change, automatically dispatch a provider, or treat a proposed `STORYTELLER_PROFILE.md` path as an implemented runtime feature.
