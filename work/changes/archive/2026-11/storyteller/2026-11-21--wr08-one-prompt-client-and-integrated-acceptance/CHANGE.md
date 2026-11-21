# WR08 | complete Play, first executable action and scripted Writer continuation

> **CURRENT OWNER-COMMISSIONED EXECUTION | PLANNER-READY (post-P3 audit 2026-11-21).** `TASKS.md` is the **authoritative executable queue**; `SOURCE-MAP.md` and `EXECUTION.md` contain verified P3-A/B/C owners, settled decisions and negative/fault proof. `POST-P3-EXECUTION.md` is the short route, and `PROOF.md` retains the old initial FAIL **plus a separate post-repair G0–G7 PASS**. Original pre-MA06A planning is historical, **not a blocked gate**. The owner has explicitly commissioned both Changes. From the live `origin/undertaking/storyteller-workshop`, create a separate linked worktree; complete T01–T04 including T03a, focused proof, archive and squash integration. WR04 may implement T01–T03 concurrently with WR08; **WR04 T04 waits for WR08's Worker/Temporal integration**. Do not touch `main`, run paid provider calls, enable a production flag or discard existing Git changes. A genuine security/SQL/cost contradiction returns precise evidence, not a generic re-planning stop.

**State:** Done (2026-11-21). Integrated on `undertaking/storyteller-workshop`. Not on `main`. Launch flag stays off by default. Provider spend: zero. Live model narration: not claimed. `pnpm test:longform`: NOT-RUN at this closure (disposable harness exists; this join used focused Web, Worker, and story-engine proofs).

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Stories home Play | `docs/product/experience/entry-and-onboarding.md` Stories home / Current POC honesty | changed: gated Play opens `/stories/launch`; drafts stay on `/stories/new` | `apps/web` stories pages and `stories-home-actions.tsx` | Web vitest 8/8 on home+launch form | disabled flag hides Launch; saved draft link remains | PROGRAM, OVERVIEW, catalog |
| Characterless choice | same experience doc | changed: `character:null` with `campaign.offer` uses existing actions PUT | `apps/web/src/features/play/view.tsx` | view + campaign-play vitest 26/26 | no resolutions PUT, no invented character sheet | N/A |
| First scripted offer | launch publication | changed: trusted `observe` narrative-intent, v2 interaction stays null | `launch-publication.ts`, `initialization.ts` | `wr08-opening-offer.test.mjs` 3/3 | choice.v1 rejected; stale root leaves no offer | N/A |
| Writer scene wake | worker/workflow | changed: `writer.scene.v1` → `writerSceneV1` scripted round + GA publish | worker dispatch, activities, workflows | `scripted-writer-scene.test.mjs` 4/4 | duplicate wake, missing store, uncertain hold | full worker package build still fails on pre-existing `storyteller-generation-evidence.test.ts` |
| History and fork | play UI | unchanged because existing history/fork tests already matched the contract | no T04 source edit | vitest 33/33 plus web typecheck | fork 404 sends no PUT; launch uncertain does not add a second PUT | N/A |

**Undertaking branch rule:** this Change belongs to **Storyteller Workshop**. Create `change/wr08-client` from the then-current `undertaking/storyteller-workshop` HEAD **before code edits**. Work through all T-IDs on this Change branch, then squash-integrate into the undertaking branch and delete the temporary branch; dedicated linked worktree mandatory even when alone; preserve the primary checkout's active branch. Do **not** merge this Change directly into `main`. Rebase/refresh from the undertaking branch before beginning if earlier WR work has landed.

**Original planning baseline (historical; current source re-audit in SOURCE-MAP):** GitHub `0d423b687c9a0a84d45dfe20823d7d313651ea25` (2026-11-21), broad code source from `09d5820bcafe`; recheck current HEAD/worktrees before editing. **Implementation owner: Cursor.** This packet is Proposed/unselected and conveys no authorization for paid provider, destructive DB, live cluster or external effects. [Program](../../../undertakings/storyteller-workshop/PROGRAM.md) · [Current queue](../../../QUEUE.md).

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


## Readiness finding (source audit 2026-11-21)

**Not authorized for Cursor PATCH:** WR04/WR06/WR07 contracts do not exist; launch typed hook/route, saved-draft migration, historical/fork payloads and executable scripted E2E are not frozen. The technical intent is preserved, but the packet's current child tasks must be replaced by verified, bounded algorithms with exact path/symbol ownership, commands and discriminating negatives. A ChatGPT planner must perform the repair, then independently re-audit G0–G7. Do not ask the paid Cursor parent to perform the missing design. Review does **not** mean any implementation tests passed.
