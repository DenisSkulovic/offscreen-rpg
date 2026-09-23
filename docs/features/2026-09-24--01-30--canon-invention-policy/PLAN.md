# Implementation plan

Feature: [Configurable canon invention policy](FEATURE.md)
Execution scope: deliberately dormant by the owner's 2026-09-24 direction. Activate after the typed-state outcome-coherence slice reaches a checkpoint and before any 30–50-turn private-world evaluation. Activation authorizes the provider-free phases below, not a paid model call.
Implementation owner: Cursor by default for implementation; Codex for design/review. Owner review remains the final product-language and play-quality gate.

## Phases

### I1 — Package ceilings and story-owned requests

- Outcome: world/start content and story settings can represent the complete authority chain without prompt text or scenario branches.
- Owners: `packages/documents/src/schema.ts`, world/start import and instantiation, `packages/contracts/src/campaign.ts`, application start/settings operations, checked-in content manifests and creation contracts.
- Add the five-domain matrix and ordered permission enum once in a shared contract. Extend the disposable world-package format with required ceilings; allow start packages to carry only narrowing overrides. Add the story-requested matrix to immutable settings revisions and resolve the strictest value per domain at Start/settings update. A package-free custom foundation must supply an explicit ceiling.
- Preserve exact pinned roots, settings revision semantics, lock behavior and retry identity. Reset incompatible POC data and update checked-in hashes rather than decoding both formats.
- Checks: focused document import/instantiation cases for narrower/equal/wider starts; settings cases for narrowing, permitted re-widening, locked rejection and exact retry; conventional and abstract start-package paths.
- Exit: no started campaign lacks an explicit effective matrix, and no content or story command can widen world authority.

### I2 — Task capture and descriptive admission

- Outcome: every generated task carries enforceable invention authority, and durable descriptive additions declare how they used it.
- Owners: application Storyteller context, `packages/storyteller/src/tasks/`, document-change schemas/validation, application admission/publication and packet inspection.
- Capture the effective matrix plus world/settings revisions in the immutable task and stable provider section. Extend create proposals with one domain and origin class: sourced promotion, compatible addition or broad invention. Project only captured-legal values into the provider schema. Validate source handles/evidence for promotions, reject additions above policy and persist passage/domain/permission provenance on admitted created records. Revisions keep existing identity and require evidence; they do not reset authority as new creations.
- Shared instructions explain the semantic boundary without changing tone or initiative. Do not parse narration, infer categories from paths/names, or claim that schema validation proves factual truth.
- Checks: strict famous-world anti-example, compatible minor-person/place creation, rejected deep-lore escalation, source-backed promotion under reference-only, stale settings/task retry, and an abstract world with no human assumptions.
- Exit: provider packets and publication agree on the same captured policy, and every durable invention has inspectable provenance.

### I3 — Creation and in-play controls

- Outcome: players can understand and select the policy without editing a matrix unless they choose advanced settings.
- Owners: draft/opening contracts, creation screens, settings editor/read projections and settings history.
- Add Canon-bound, Grounded expansion and Open world presets. Show the world ceiling, requested choice and effective result; explain capped cells. Preserve the advanced matrix in private drafts without triggering generation on edit. Locked stories include the policy in their pre-Start summary; editable stories apply revisions only to future tasks.
- Checks: prepared-world capped preset, package-free custom-world selection, advanced narrower override, locked-edit rejection and stale-tab conflict preservation.
- Exit: the player can predict whether an incidental NPC, minor place or new deep-lore fact is permitted before paying for generation.

### I4 — Connected evaluation

- Outcome: the feature is exercised on cases where it materially changes Storyteller behavior rather than merely appearing in JSON.
- Owners: Storyteller fixtures, request audit, Chamber held-packet tooling, connected POC/QA documentation.
- Compare three fixed cases: recognizable lore with unloaded tempting facts under Canon-bound; a sparse private setting that needs one useful local addition under Grounded expansion; an abstract world under Open world. Inspect exact held packets and validate candidates through the ordinary admission path without publishing into the comparison source.
- A later Sol probe may compare strict and grounded cases only after exact packets, route/cost verification and separate live authorization. One response per case is exploratory evidence, not reliability proof.
- Exit: provider-free paths prove wiring and rejection; owner review determines whether the controls are understandable and whether a bounded live experiment is worth its cost.

## Current checkpoint

- Current phase and exact next action: dormant before I1. Continue the active typed-state outcome-coherence slice. Activate I1 after that checkpoint and before sustained private-world play.
- Base/reviewed Git revision and relevant uncommitted changes: designed from `f4fad57`; this dossier and its index/progress links are the only planned working changes.
- Actual checks/results for this revision; checks not run: documentation-only preparation; no implementation checks are needed. Existing runtime still has no canon-invention field or enforcement.
- Unresolved findings/blockers: prose-level truth cannot be mechanically proven, so acceptance deliberately combines structural admission with exact traces and contrasting evaluation. This does not block I1.
- Provider spend and accounting certainty: no provider call, reservation or spend. Dossier preparation does not authorize live inference.

