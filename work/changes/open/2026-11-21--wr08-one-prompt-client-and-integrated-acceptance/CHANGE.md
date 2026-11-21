# WR08 | launch UX, history viewer and true integrated Storyteller acceptance

**State:** Proposed. **Kind:** implementation. **Dependencies:** WR04 + WR06 + WR07. **Outcome:** the user experiences the proper product: choose prepared **Play** or enter one Story Prompt, see real generation status, arrive at a playable scene, and inspect/fork past scene snapshots. Retire the obsolete creator wizard only after the new backend path works. Prove the integrated Writer can actually use skills, Library and research children.

**Undertaking branch rule:** this Change belongs to **Storyteller Workshop**. Create its isolated worktree/temporary branch from the current head of `undertaking/storyteller-workshop`; after acceptance, merge/reconcile the complete Change back into `undertaking/storyteller-workshop`, then remove the temporary branch/worktree. Do **not** merge this Change directly into `main`. Rebase/refresh from the undertaking branch before beginning if earlier WR work has landed.

**Planning baseline:** GitHub `0d423b687c9a0a84d45dfe20823d7d313651ea25` (2026-11-21), broad code source from `09d5820bcafe`; recheck current HEAD/worktrees before editing. **Implementation owner: Cursor.** This packet is Proposed/unselected and conveys no authorization for paid provider, destructive DB, live cluster or external effects. [Program](../../WRITER-IMPLEMENTATION-2026-11-21.md) · [Current queue](../../../QUEUE.md).

## Cursor first-screen route

**DEPTH=PATCH-L, Next web/integration owner.** Begin at `apps/web/src/features/stories/draft-editor.tsx`, `opening-preview.tsx`, and `draft-content.ts`, `apps/web/src/features/stories/{use-opening-generate,use-start-story}.ts`, `apps/web/src/features/play/{view,history}.tsx` and `apps/web/src/features/play/ui/campaign-play.tsx`. Inspect exact route page and current API client refs before modifying. **Do not treat a decorative “Play” card with the old wizard behind it as completion.**

## Product delivery

- Stories home presents prepared-experience cards and **Play** primary action; optionally **Customize** opens a single editable effective prompt with clearly pinned preset scope. Custom story is **one freeform Story Prompt**, optionally with light hints/chips. No required “role”, mandatory profile, character sheet, multi-step Review or post-generation Start click.
- One Launch status view honestly distinguishes working / blocked / uncertain provider spend / validation failure and offers safe resumption without automatic duplicate paid dispatch. A committed first scene opens immediately; loss/reconnect retrieves it by stable story identity. No invisible clock accrual without an admitted fictional action.
- Historical view shows the **exact passage, root/provenance and relevant state at that scene**, plus authorized source-document browser appropriate to the viewer's rights. Current scene and historical snapshots are visually distinct. **Fork scene** creates a child branch from that precise boundary; active-work/progress and copied choice are playable, not just rendered as a dead screenshot. Avoid exposing private Storyteller thoughts to player.
- Legacy draft/preview routes can have transition/redirect for real saved user content if needed. Remove obsolete mandatory flow and dead hooks after the new route is verified. Keep accessibility, responsive book UI and authorization intact.
- Present a small truthful activity indicator if the Storyteller is investigating or awaiting a child result. Don't expose raw prompt/hidden chain-of-thought/provider internals or make a user wait through mandatory editorial paperwork.

## Complete acceptance session

Run under the supported local stack (actual kind release when explicitly available/authorized) with **scripted provider/tool fixtures** plus strictly optional separately funded model tests. Full path: authenticated Play → captured preset/user intent → root-scoped writer tools, skill read, staged/revised Markdown → separately contextualized child research when appropriate → Game Authority published scene/state → current view → genuine action → historic review/fork during an active journey → new child continues while parent remains independent.

Three content journeys: **authored Seyda-like bundle** (fixture only; licensed public content must be cleared), **`BAH`**, **conscious galaxy**. Fourth **200-scene Mira/faction** continuity case requires the writer to discover an old fact, inspect source, use a skill, delegate a distinct research question and maintain later continuity. Do not count a scripted fixed response as demonstrating model creative quality; report separately functional and subjective creative tests.

**Negative:** stale source, cross-owner attempt, unreadable private note, wrong source-root evidence, lost HTTP after success, provider uncertain, unexpected active timer, second fork submission, missing/corrupt checkpoint, child cost cap exceeded. No double spend, no source leak, no half-scene, no clone-all Library. Test `pnpm --filter @offscreen/web test`, `pnpm --filter @offscreen/web typecheck`, application integration and appropriate kind smoke under normal environment permissions.

**Boundaries:** this packet owns client and integrated verification, **not** backend source design; if WR02–07 lack required semantics, stop with exact failed invariant and return to owning Change. No unapproved real provider dispatch or cluster-destructive tests. **Reconciliation:** `docs/product/experience/entry-and-onboarding.md`, `docs/product/gameplay/acceptance-scenarios.md`, Storyteller quality/continuity, client navigation, technical API docs, STATUS and evidence after actual proof. Archive WR08 only when **one direct Play, actual tool-using Writer, exact historical fork and meaningful choice** all work.
