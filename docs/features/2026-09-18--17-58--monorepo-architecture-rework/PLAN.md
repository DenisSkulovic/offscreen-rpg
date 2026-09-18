# Monorepo architecture rework plan

Feature: [Monorepo architecture rework](FEATURE.md)
Execution scope: Approved on 2026-09-18. Implement phases in order without compatibility shims or unrelated gameplay changes.
Implementation owner: Codex or a cheaper implementation model; Codex reviews each ownership boundary.

## Phase 1 — Establish the game boundary

Outcome: pure game authority has one framework-free package before the DM loop adds more mechanics.

Owning changes:

- Create `@offscreen/game` with explicit exports for checks, effects, offers, ticks and settings.
- Move pure implementations from `packages/server/src/rules` and authoritative game schemas from `@offscreen/contracts/campaign` and `action-content`.
- Keep HTTP/view command projections in `contracts`; update Storyteller and application imports.
- Add import-boundary rules for `game`, `contracts`, browser and infrastructure packages.
- Delete the old definitions atomically; do not re-export them from their former modules.

Checks: compile `game`, `contracts`, `storyteller/ai` and application/server packages; run only the small pure rule/contract checks that exercise moved authority. Do not broaden into application integration checks unless a behavior changes.

Exit: one definition owns each game value; no pure rule imports the database, API, provider or scheduler.

Status: Complete.

## Phase 2 — Give the Storyteller an honest package

Outcome: `@offscreen/storyteller` communicates the product boundary and separates profiles, context, tasks, planning, providers and fixtures internally.

Owning changes:

- Rename `packages/ai` and its package name atomically.
- Group existing modules under capability directories with explicit public indexes.
- Keep OpenRouter isolated under `providers` and offline scripts under `fixtures`.
- Update imports and package exports without an `@offscreen/ai` compatibility alias.

Checks: compile the package and its direct consumers; run focused Storyteller contract tests. No provider calls.

Exit: the package exposes Storyteller capabilities, contains no database/application imports, and the old package name is absent.

Status: Complete.

## Phase 3 — Rebuild the application package internally

Outcome: the flat server package becomes a capability-organized application layer.

Owning changes:

- Rename `packages/server` to `packages/application` atomically.
- Move its 44 root modules into drafts, stories, campaign, generations, storyteller, outbox and developer-tools directories.
- Introduce a small public index for each capability and update API/worker imports to those facades.
- Move Chamber fixtures/inspection and QA catalogue/runtime under `developer-tools`.
- Keep transaction helpers local to the capability that owns their invariants; document the few intentional cross-capability transaction calls.

Checks: compile application, API and worker directly. Use one focused offline integration or Chamber smoke only if file moves affect composition. Known unrelated errors do not trigger cleanup work.

Exit: no production source remains at the application source root and no `@offscreen/server` import or package exists.

Status: Not started.

## Phase 4 — Separate deployable composition from development tooling

Outcome: API, worker and Chamber have honest dependency graphs.

Owning changes:

- Group Nest controllers/providers by capability under `apps/api/src/modules` and keep the root module as composition.
- Keep Temporal Activity bindings and relay/bootstrap code inside worker capability folders.
- Move the local Chamber process launcher into `tools/chamber` and add the tools workspace pattern.
- Remove API's development dependency on worker; the tool package owns API/web/worker orchestration.

Checks: inspect Turbo's package graph and compile each deployable independently. Launching the manual Chamber is the focused behavioral proof.

Exit: API build has no worker/workflow dependency, and Chamber still creates its isolated authenticated session without provider access.

Status: Not started.

## Phase 5 — Thin the Next.js route tree

Outcome: route files express routing/data boundaries while feature code is easy to locate.

Owning changes:

- Move story creation/list/play logic to `apps/web/src/features/stories` and play/campaign capabilities.
- Move Chamber and QA presentation to `src/features/developer-tools`.
- Move truly cross-feature browser transport/session helpers to a narrowly named `src/lib` module.
- Keep route-local loading/error/page/layout files in `app`; do not create a UI package.

Checks: web typecheck/build if existing unrelated failures allow it; otherwise review imports and exercise the Chamber/player routes manually during the next normal POC run.

Exit: substantial feature components and hooks no longer accumulate in route folders, and browser imports remain inside allowed packages.

Status: Not started.

## Phase 6 — Align documentation and remove obsolete structure

Outcome: repository documentation, export maps and developer commands describe the actual structure.

Owning changes:

- Update architecture, data, Storyteller runtime, development and delivery documents.
- Update root scripts, Turbo outputs/dependencies and workspace patterns.
- Remove superseded feature folder and any empty old directories.
- Confirm there are no compatibility aliases, stale package names or broken documentation links.

Checks: `git diff --check`, focused documentation link check, package/import search and one package-graph inspection. Broader checks remain optional.

Exit: a new coding agent can determine the owner and allowed dependencies of a change from the repository entrypoint and target layout.

Status: Not started.

## Current checkpoint

- Current phase and exact next action: Phase 2 is complete; rename and capability-organize `@offscreen/server` as `@offscreen/application` in Phase 3.
- Base/reviewed Git revision and relevant uncommitted changes: Phase 2 started from `68b3c90` on `main`; the atomic Storyteller package rename, capability exports, consumer imports and permanent documentation updates are ready to commit.
- Actual checks/results for this revision; checks not run: the Storyteller build and all 22 focused package tests passed; API build passed. Server build reaches only the same two pre-existing `exactOptionalPropertyTypes` errors in `story-command-policy.ts`. No integration/browser suite or provider call was run.
- Unresolved findings/blockers: none for Phase 2. The `planning` capability will be created when the playable DM slice introduces its contracts; no empty placeholder module or invented runtime was added.
- Provider spend and accounting certainty: no provider calls; spend $0.
