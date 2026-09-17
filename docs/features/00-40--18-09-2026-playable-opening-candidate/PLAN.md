# Implementation plan

Feature: [Playable opening candidate](FEATURE.md)

Execution scope: implement this feature only. Stop before adding story Start or selected-choice resolution.

Implementation owner: Cursor.

Reviewer: ChatGPT/Codex after the implementation is committed and pushed.

## Phase 1 — Persist and review a playable opening candidate

Status: Complete

### Outcome and dependencies

Replace the current prose-only scripted opening path with a deterministic, persisted playable opening candidate using the already implemented `preparePlayableOpening`, `playableProposalSchema`, `validatePlayableResult` and `playablePresentation` boundaries.

Use the existing:

- draft ownership/revision checks;
- generic `generation` lifecycle;
- `draft_opening` latest-generation link;
- transactional outbox;
- Temporal scripted-opening workflow;
- preview polling/recovery behavior.

Do not redesign those mechanisms.

### Owning components

Expected primary files:

- `packages/ai/src/playable.ts`
- `packages/ai/src/playable-proposal.ts`
- `packages/contracts/src/openings.ts`
- `packages/server/src/openings.ts`
- `packages/server/src/scripted-openings.ts`
- `apps/web/app/stories/opening-preview.tsx`
- relevant AI/server/API/browser integration tests
- `docs/progress.md`
- `docs/features/README.md`

Touch other files only when required by compile/test fallout from the contract change.

Do not modify story initialization, chamber resolution or Temporal timing behavior in this phase.

### Required implementation shape

#### 1. Give playable-opening generation input an explicit runtime schema

`preparePlayableOpening(...)` already constructs the correct immutable request artifact.

Add/export a Zod schema for the persisted playable-opening artifact that validates that structure.

It must validate at least:

- `inputVersion: 1`
- `promptVersion: 'playable.v1'`
- `task: 'opening'`
- `source.draftId`
- `source.draftRevision`
- request messages
- request output JSON schema

Do not weaken this to `z.unknown()` merely to satisfy `createGenerations`.

Keep provider request data server-side.

Prefer defining/reusing a small shared request-artifact schema if it makes `opening.ts` and `playable.ts` cleaner, but do not create a new package or abstraction layer solely for this feature.

#### 2. Change the opening generation definition to the playable contract

The active opening-generation operation should use:

- the playable opening artifact schema as `generation.input`;
- `playableProposalSchema` as `generation.output`.

When requesting an opening:

- load and lock the owned draft exactly as today;
- preserve current retry/conflict/busy rules;
- call `preparePlayableOpening(...)` with the saved draft snapshot;
- persist that exact prepared artifact;
- preserve `draftOpening` linkage and dispatch behavior.

Do not allow the request body to supply scene content, proposal data, prompt text or storyteller instructions beyond what already exists in the saved draft.

The old prose-only `openingOutputSchema` should no longer define the output of the active scripted preview path.

#### 3. Replace the scripted fixture output

Replace the current fixed prose output in `scripted-openings.ts` with one deterministic valid `PlayableProposal`.

Use a tiny neutral scenario suitable for arbitrary test purposes. It does not need to adapt intelligently to the premise: this remains an offline fixture.

The fixture must contain:

- valid `passageContentSchema` content;
- `next.kind = 'choice'`;
- a prompt;
- at least two options;
- stable unique option IDs;
- visible labels;
- distinct non-empty `intention` strings.

Keep the fixture version/kind stable and explicit. Because the stored generation contract changes incompatibly, use a **new generation kind**, for example:

`opening.playable.scripted.v1`

and a matching outbox topic if the topic identifies the operation kind.

Do not silently reinterpret already stored `opening.scripted.v1` records as the new schema.

No compatibility migration for old local fixture records is required.

#### 4. Expose only player-facing presentation

Evolve `packages/contracts/src/openings.ts`.

The preview contract should no longer expose `opening: string | null`.

A successful preview should instead expose a nullable player-facing candidate/presentation containing:

- scene `content`;
- choice `interaction`.

Reuse existing story/interaction schemas rather than inventing duplicate shapes.

The interaction exposed to the browser must include option IDs and labels but **must not include `intention`**.

`scripted-openings.ts` should convert successful stored output through `playablePresentation(...)` before building the public preview DTO.

Do not return:

- raw `PlayableProposal`;
- provider/system prompts;
- stored request data;
- option intentions.

Pending/running/failed/uncertain previews return no candidate presentation.

#### 5. Update the preview UI

Update `OpeningPreviewPanel`.

Change the explanatory copy so it accurately describes a deterministic playable candidate rather than a prose-only sample.

For a successful candidate render:

- the scene content in the same readable textual style used by story scenes where practical;
- the interaction prompt;
- the option labels.

The choices are preview-only in this feature.

Do **not** make the option buttons start or advance anything.

They may render as non-interactive list/cards/buttons with disabled semantics, whichever produces the smallest clear implementation.

Keep:

- generate/retry behavior;
- pending polling;
- stale warning;
- reload links;
- auth/error handling.

Do not add a Start button.

#### 6. Preserve hidden intentions for the next feature

Add focused test evidence proving both sides of this contract:

- persisted successful generation output retains each option's `intention`;
- the HTTP/public opening preview does not expose those intentions.

This distinction is important. Do not strip intentions before storing the generation output.

#### 7. Update tests rather than deleting difficult coverage

Adapt the existing opening generation/integration/browser tests to the new contract.

At minimum cover:

- request from owned current draft;
- saved playable artifact source revision;
- asynchronous scripted completion;
- valid playable output;
- latest/reopen retrieval;
- stale candidate after draft edit;
- duplicate/retry semantics already covered by the current opening suite;
- hidden intention not exposed publicly;
- browser renders scene + visible options.

Do not rewrite unrelated story/chamber tests just to make this change easier.

### Contracts and invariants

- Full storyteller proposal is persisted.
- Public preview is a projection of that proposal.
- Hidden intentions stay server-side.
- The exact saved draft revision remains the generation source.
- Request IDs remain idempotency identities.
- New requests cannot bypass existing busy/conflict handling.
- Temporal only dispatches fixture work; it does not become story state.
- No live inference.
- No paid calls.
- No story row is created in this feature.
- No option is resolved in this feature.

### Targeted checks

Run the smallest relevant set first, then the repository gates affected by the change.

Expected checks:

1. AI package tests
   - validates playable opening artifact/proposal behavior.

2. Contracts tests/typecheck
   - proves public preview shape.

3. API opening integration tests
   - proves persistence, async completion, staleness and API projection.

4. Browser opening-preview test
   - proves visible candidate rendering/reopen behavior.

5. `pnpm typecheck`

6. `pnpm lint`

7. Existing story/chamber integration suite if changed shared contracts cause any story-facing compile/runtime impact.

8. `pnpm format:check`

If a check fails because of pre-existing unrelated debt, identify it explicitly rather than weakening/removing the check.

### Documentation updates

On successful implementation:

- add this active feature to `docs/features/README.md` while implementation/review remains active;
- update the opening-related row and current assessment in `docs/progress.md` so it states:
  - a persisted playable opening candidate is now connected;
  - its hidden intentions are retained;
  - story Start from that candidate remains unimplemented.

Do not claim the story lifecycle is connected yet.

Do not rewrite unrelated roadmap sections.

### Exit condition

Phase 1 is complete when:

- a saved draft produces a persisted deterministic playable proposal through the existing asynchronous generation path;
- the browser can leave/reopen and review its scene and visible choices;
- stale revision behavior remains correct;
- hidden intentions are demonstrably stored but not exposed;
- relevant tests and quality checks pass;
- no story is started and no live provider is contacted.

Commit and push the completed phase as one coherent feature commit or a very small logically ordered set.

Then stop.

Do not proceed to story Start in the same implementation turn.

## Current checkpoint

- Current phase and exact next action: Phase 1 complete. Commit and push this slice, then stop. Do not start story Start. Reviewer: ChatGPT/Codex after push.
- Base/reviewed Git revision and relevant uncommitted changes: implemented on `main` from `26eb2212aff26b164a822a365c50d478240a26e6` with the playable-opening contract, fixture, preview UI and docs.
- Actual checks/results for this revision; checks not run: AI package tests 10/10; contracts tests 6/6 including public preview without intentions; API `tsc`; web `next typegen` + `tsc --noEmit` and production `next build`; eslint on changed TS files with `--max-warnings 0`; `python scripts/check_docs.py` (37 files, 0 broken links); `apps/api` `auth.integration.js` 22/22 including openings HTTP and Chromium preview (DATABASE_TEST_URL=`offscreen_auth_test`). Story/chamber integration not rerun: shared story endpoints were not changed. Full `pnpm typecheck`/`pnpm lint`/`pnpm format:check` not run because pnpm was unavailable on PATH; package `tsc`/eslint/prettier were used instead.
- Unresolved findings/blockers: none for this phase. Existing local `opening.scripted.v1` records are not migrated.
- Provider spend and accounting certainty: zero provider spend. All checks used the deterministic fixture; no OpenRouter/live adapter path was invoked. Cumulative account usage was not queried.