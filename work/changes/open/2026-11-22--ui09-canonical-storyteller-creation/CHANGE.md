# UI09 | Canonical Storyteller creation surface

**State: SOURCE-DESIGNED, READY AFTER CURRENT UNDERTAKING HEAD RECHECK.**  
**Kind:** implementation · **Profile:** CONTRACT · **Reference branch:** `undertaking/storyteller-workshop`  
**Planner baseline:** `e07c0d0051fe25f212a4a4f4bd3f817045c957fa`; **remote source recheck:** `e7ebb1d8c31c5462edc8626776b9b4530d51d471` (relevant Web/product/client files verified unchanged from inspected snapshot `bc562b77663472c8cccdd1bb68f79a00bddb619a`).  
**Authority:** `docs/product/experience/entry-and-onboarding.md` (“Prepared experience: Play first”, “Custom experience: one Story Prompt”, “Launch and first arrival”); `docs/technical/client/interaction-contracts.md`; `docs/technical/engine/lifecycle-and-compatibility.md`.

## Goal

Make the **default authenticated new-story UI match the selected Storyteller product model** instead of the legacy four-step job-application-style draft wizard.

`/stories/new` becomes the canonical launch surface:

- a **custom story** starts from one freeform **Story Prompt**; title, character name, profession/role, profile and review are not required;
- a **prepared experience**, when an authoritative preset is supplied to the surface, is **Play-first** with optional **Customize** rather than a reconstruction wizard;
- queued/running/uncertain/held/failed/ready launch recovery continues to use the existing durable `StoryLaunchRequest` / `StoryLaunchStatus` identity and never creates a second PUT after ambiguity;
- successful readiness links directly to the playable story; there is no generated-preview / separate Start ceremony in the canonical route.

The existing `DraftEditor` remains a **legacy saved-draft compatibility editor** at `/stories/[id]`. UI09 does not delete saved drafts or migrate their data.

## Explicit product/UI decisions

1. `/stories/new` is the single primary creation entry from Stories home. Do **not** route new users into `DraftEditor`.
2. `/stories/launch` becomes a compatibility redirect to `/stories/new`; the UI must not expose two competing “new story” routes.
3. Retire `STORY_LAUNCH_ENABLED` from Web creation routing. The current target launch contract is not an experimental alternate UX anymore on this undertaking branch.
4. Stories home has one primary **Create a story** action. Remove the duplicate conditional “Play from a prompt” navigation/action.
5. Custom creation shows one prominent Story Prompt and one explicit launch action. No progress stepper, title field, character field, role/premise stage, Storyteller stage, or review stage.
6. Optional supported controls belong under **Customize** and remain secondary. UI09 may expose only controls already represented by `StoryLaunchRequest.hints`; it must not invent new settings or require them.
7. Prepared experiences are rendered only from authoritative `StoryLaunchPreset` inputs carrying the exact `presetId` + `presetRootHash`. A prepared card can **Play** with an empty custom prompt; optional Customize may add `customPrompt` / supported hints before Play.
8. **Do not fabricate prepared experiences.** The current source has no authoritative player-facing prepared-experience catalogue that yields launchable Library roots. Do not reinterpret the legacy mechanical opening catalogue or start-package world/rule hashes as `presetRootHash`. If `presets=[]`, the canonical surface remains a truthful custom Story Prompt entry and does not show fake disabled content cards.
9. Existing saved drafts continue to open in `/stories/[id]` and retain current save/conflict/opening-preview compatibility behavior. They are not the new-story funnel.
10. UI09 does not change API/GA/Worker/provider behavior, spend policy, launch idempotency, story data, draft schemas, or the play reader.

## Ownership / write scope

Primary source ownership:

- `apps/web/app/(authenticated)/stories/new/page.tsx`
- `apps/web/app/(authenticated)/stories/launch/page.tsx`
- `apps/web/app/(authenticated)/stories/page.tsx`
- `apps/web/src/features/stories/stories-home-actions.tsx`
- `apps/web/src/features/stories/story-launch-form.tsx`
- `apps/web/src/features/stories/story-launch.css`
- focused tests adjacent to those files
- retire `apps/web/src/server/story-launch-capability.ts` + test if no remaining caller exists after source recheck

Reconciliation-only docs after behavior is proven:

- `apps/web/src/features/stories/README.md`
- `apps/web/app/README.md`
- current-runtime honesty paragraphs in `docs/product/experience/entry-and-onboarding.md` and `docs/technical/engine/lifecycle-and-compatibility.md` **only where they still describe the old default/gate**
- `STATUS.md` / undertaking ledger only to the extent required by normal Change closure; do not rewrite unrelated completion percentages.

**Must not edit:** `apps/api/**`, `apps/game-authority/**`, `apps/worker/**`, `packages/story-engine/**`, `packages/contracts/src/story-launch.ts`, DB/migrations, Kubernetes, provider credentials/policy, saved-draft schemas, or play-reader behavior.

## Dependencies / concurrency

No product decision is pending. UI09 consumes already-landed Story Launch contracts and Web hook behavior.

Because TURN03 is currently using the integrated Web/auth surface for cold-kind proof, UI09 may be **implemented in its own linked worktree now**, but the integration custodian should join UI09 only after TURN03 has either completed or recorded its final legitimate blocker/receipt, so a UI route change does not perturb an in-flight proof environment. WR10/MA12 source ownership does not overlap this packet after latest-head recheck.

Current source drift rule: before edits, compare the named route/form/home symbols to the current undertaking HEAD. If Story Launch contracts or route ownership materially changed, stop and return the exact changed symbol rather than re-planning in Cursor.

## Acceptance

UI09 is Done only when all are true:

- `/stories/new` renders the canonical Storyteller creation surface, not `DraftEditor`.
- the rendered custom path contains **Story prompt** and no title/character/progress/review requirements;
- Stories home exposes one primary new-story path to `/stories/new` and no feature-gated duplicate launch CTA;
- `/stories/launch` redirects to `/stories/new` for compatibility;
- custom prompt launch still produces exactly one immutable PUT operation, keeps prompt out of session storage, recovers ambiguous/uncertain status by GET only, and links only validated `ready` status to `/play/:storyId`;
- a supplied prepared preset can Play without a custom prompt and sends the exact `presetId`/`presetRootHash`; Customize remains optional and cannot silently change the frozen request after submission;
- a saved draft still renders through `/stories/[id]` / `DraftEditor`; UI09 has not deleted compatibility behavior;
- no source/test contains a default-off Story Launch gate for the canonical new-story route;
- no paid provider call is made for UI09 proof.

See `SOURCE-MAP.md`, `EXECUTION.md`, `TASKS.md`, and `PROOF.md`.
