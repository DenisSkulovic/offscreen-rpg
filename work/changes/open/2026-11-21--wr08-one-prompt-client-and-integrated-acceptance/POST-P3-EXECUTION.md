# WR08 | Complete real Play and reentry UX

**Status: CONDITIONAL, PLANNER-BLOCKED until P3-A's actual Writer-intent/scene continuation API is integrated and inspected. NOT a commission.** One complete user experience Change. Integration target undertaking/storyteller-workshop, never main. Existing old TASKS.md is historical.

## Result
Player enters from Play with one prompt or a valid pinned experience, sees honest launch status, reaches a persisted scene, selects a REAL authorized choice, waits/returns if needed, sees scene 2 and scene 3, visits history and forks an old scene into a playable child. No ghost choice buttons, fake ready, duplicated operation or compulsory draft wizard.

## Inspected source baseline (2026-11-21, before P3)
apps/web/src/features/stories/use-story-launch.ts handles stable PUT/GET status; story-launch-form.tsx exists; apps/web/src/server/story-launch-capability.ts is default OFF unless enabled. apps/web/src/features/play/history.tsx and fork-historical-scene.tsx offer existing fork UI. apps/web/src/features/play/ui/story-frame.tsx renders choices, but WR07B's Writer-v2 opening currently has interaction:null, intentionally preventing dead buttons. Existing authenticated Next route paths must be verified before changing navigation; do not guess a src/app route.

## Four substantive tasks within ONE Change
**T01 Normal Play entry:** From the actual authenticated pages/navigation, promote the existing launch hook/form as standard one-prompt entry when the actual backend is ready. Preserve legacy bookmarked drafts and existing stories. Do not show fake preset content without the pinned start-package API. Keep default-deny capability in unsupported deployments. Tests one-word entry, preserved draft, disabled/unconfigured backend and no mandatory wizard.

**T02 Real player choice:** Reuse P3-A's exact admitted-intent HTTP DTO/operation/status. Bind StoryFrame choices to stable idempotent operations and source offer/interaction/revision, not to invented client-side action consequences. Show pending/held/stale/failed/uncertain truthfully; repeated click/lost HTTP must not produce another operation. Prove scene1 -> choice A -> scene2 -> choice B -> scene3 with real authority and scripted transport.

**T03 Reentry and history:** Show current world state, admitted work/time, honest wait, historical as-of scene and real fork. Reuse StoryHistoryView and ForkHistoricalScene, preserve remapped child ID and suppress later parent text. Tests prolonged pending/reload, foreign owner, stale scene, rejected fork, narrative-only world with no fake character sheet.

**T04 Product acceptance + closure:** Focused Web hook/component tests and joined scripted user journey, negative no dead button/no unauthorized provider retry/no client-side private context leakage. Reconcile product status and human OVERVIEW, archive WR08, squash-integrate into undertaking and retire clean worktree. Do not enable public/paid mode without exact backend deployment evidence and user authorization.

## Parallel boundary and gates
WR08 owns apps/web authenticated entry pages, features/stories, features/play and Web-only tests. It does NOT modify Game Authority, Story Engine, Writer custody, DB, Contracts, worker or root exports. May run simultaneously with WR04 after P3 interfaces are actually frozen, with separate worktrees and serialized shared docs integration.

Independent readiness G0–G7 must verify actual P3-A command/status types, stable Web route files, replay contract, data loading and precise focused tests. This document alone is NOT READY and does not authorize execution. Never substitute a Web-only fake action.
