# Storyteller Workshop

**State:** Active  
**Branch:** `undertaking/storyteller-workshop`  
**Started:** 2026-11-21  
**Integration base:** `main` at `34e2b4fd8d9d9967e13311da3a938460b1a02244`

**Supervisor / first read:** [**The big picture · accessible progress overview**](OVERVIEW.md). Read it before the ledger below; it tracks visible progress toward *both* Storyteller evolution and modular-monolith shaping, without requiring Change IDs or code knowledge. Mandatory refresh and supervisor presentation cadence: [Undertaking process](../README.md#required-supervisor-overview-first-class). The technical evidence and acceptance definitions remain below.

## Purpose

Re-found the Storyteller from a prompt-shaped component into a disciplined **writing system**: it has durable sources and a persistent Library, a bounded writer's workdesk, explicit research assistance, coherent scene publication, fork-aware active fictional state and a clean creation path from one prompt into an actual playable campaign.

**Storyteller Workshop** is intentionally broader than “Storyteller docs” and more specific than “Storyteller evolution.” The undertaking names the shared transformation that the WR/WRD Changes collectively serve.

## Whole-undertaking completion control | living ledger

**Current evidence snapshot: 2026-11-21, undertaking at `185bb42c138a73f77b0c5afe807a11bed702ddfc` when recorded.** This is the **single overall completion ledger** for the combined Storyteller Workshop **and** Modular Monolith program. [Writer implementation program](PROGRAM.md) owns packet-level sequencing; [Modular Monolith dossier](../modular-monolith/UNDERTAKING.md) owns the MA history and structural acceptance. Do not create a second global queue: [work/QUEUE.md](../../QUEUE.md) remains the only default current selection. A user-commissioned independent Change can execute without changing it.

**How to read the statuses:** **Done** means code/evidence is integrated into the undertaking branch for that *bounded stage*, not shipped to `main`. **Active** means owner-commissioned Cursor work, **not accepted evidence**. **Planned** means design/implementation remains; **Gate** is a full-undertaking end condition needing actual verification. A new packet is not progress by itself. These are deliberately **not percentages**: one later vertical integration may reveal more work than five small Changes. Update this table after each coherent Change-join or milestone, with receipt links and newly found gaps. Never turn a partial into Done because a test was planned.

| Full outcome | Current state | Evidence already achieved | What is still required for complete undertaking |
| --- | --- | --- | --- |
| **A. Safe Undertaking integration branch and repository process** | **Done for execution; final landing pending** | Worktree/Change policy established; all MA and recent WR Changes integrate into `undertaking/storyteller-workshop` and remain off `main` | One final authoritative reconciliation and squash/merge to `main`, branch retirement and dossier removal |
| **B. Modular-monolith structural ownership** | **Core extraction Done; final hygiene Gate open** | MA01–MA04, MA05A–G Done; MA05 parent explicitly Superseded; MA06A Done. `@offscreen/admin` and `@offscreen/story-engine` exist, `@offscreen/cache` uses neutral port, engine no longer depends on application; legacy API imports still resolve via forwarding exports | After gameplay interfaces stabilize: inspect actual module graph; remove/migrate unnecessary application deep reexports and callers without breaking tests; establish enforceable cross-package directions, read-write owner map, no production→developer back edge; close `MA06` disposition. Do **not** split authority/runtime into extra npm packages unless a real independent ownership/cycle requires it |
| **C. Persistent Library + bounded Writer foundations** | **Done for foundation; runnable Writer product still pending** | WR02 Library v2 and WR03 Writer mission/Workdesk Done; WR07C request/status contracts, WR07M pre-scene capture and WR08A gated browser form Done | Use real source pins/Workdesk/missions in direct Launch; validate Writer playable scene output and durable worker recovery; author real scripted and narrowly authorized provider proof |
| **D. Immutable scene-v2 historical truth** | **WR05P2, WR06, and the WR07B opening selector are Done on the undertaking** | WR05S v2 document storage + selector SQL; WR05P1 sorted after-state SQL reader and pure continuity-note projector Done | WR05P2 publishes and reads v2 checkpoints. WR06 forks one of those checkpoints into a child story. WR07B commits its clock-backed null-character opening through that same v2 selector |
| **E. Writer playable opening contract + durable Launch identity** | **WR07B first scene Done; P3-A scripted continuation/intent Done; full opening→action join awaits WR08** | WR07C and WR07M Done; old Writer rounds have custody/replay; Web Launch form is gated OFF by default | **WR07B Done/archived:** authenticated launch routes, one `story.launch.v1` wake, and one readable scene with interaction null. A `choice.v1` opening is rejected. Executable Writer-authored player choices are still not delivered |
| **F. Direct Play end-to-end** | **WR07B and P3-A/B scripted kernels integrated; WR08 PLANNER-READY for actual Web/Worker join** | Authentic frontend contract and existing engine/Writer services provide foundations | WR07B connects PUT/GET Launch authentication, captured source, mission admission, a scripted worker, and Game Authority scene-one `ready` reconciliation. The web flag stays off. A real provider proof is not done. Scene 2 is not done. WR08 still ungates the public UI |
| **G. Any-scene historical forks, including active work** | **WR06 Done on the undertaking** | v2 checkpoint fork, lineage handles, and history fork panel | Disposable SQL proves scene 37 forks after scene 80 exists: child scene 1, shared root, remapped offer/activity/obligation/action, original note source, no generation or outbox, replay, and no partial child on refusal. Web test proves one PUT and no scene-80 text in the scene-37 fork panel |
| **H. Real bounded delegated Writer research** | **WR04 Done, provider-free** | Explicit grant, child registry, shared operation cap, verified join | Live provider quality and funded spend are still not proved. Optional per scene |
| **I. Full product experience and long-form Storyteller acceptance** | **P3-C harness integrated; WR08 PLANNER-READY / commissioned, no runtime proof yet** | WR08A form/status built but hidden until real backend; established scripted memories and some old story tests | Direct Play from word/paragraph and version-pinned prepared preset, actual scene and reentry, current/history/fork screens, safety statuses; zero-cost scripted longer-lived campaign (target 200-scene diagnostic), source/continuity and authorized funding tests, UI/browser and controlled worker failures. Retire the compulsory wizard only after verified replacement |
| **J. Monorepo quality closure, compatibility retirement and landing** | **Final Gate open** | AST graph and code-health commands exist; structural moves completed without mandatory new services; MA06A recorded known code-health warnings and pre-existing provider-budget/browser failures | Re-run post-gameplay package graph, no new forbidden imports/cycles, accurate manifest exports/builds, explicit `@offscreen/application` residual ownership or retirement plan, focused finance/security/idempotency negatives, baseline failure triage, no untracked Change worktrees/branches, truthful product/technical docs and STATUS, landing to `main` and Undertaking retirement |

### Current next-wave handoff (post-P3 readiness repair, 2026-11-21)

**P3-A, P3-B, P3-C, WR08, and WR04 are integrated on the undertaking.** [WR04](../../changes/archive/2026-11/storyteller/2026-11-21--wr04-delegated-writer-research/CHANGE.md) delivers provider-free read-only research children and a verified parent join. [WR08](../../changes/archive/2026-11/storyteller/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) is the gated scripted Play path. Neither is a live-model proof. Not on main. See [human progress](OVERVIEW.md).

### Previous historical handoff (after WR05P2/WR07L; superseded)

| Owner | Change | Concrete code write ownership | Completion impact |
| --- | --- | --- | --- |
| Done this window | [WR07B](../../changes/archive/2026-11/storyteller/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | Scripted Launch publishes one readable scene and rejects clickable openings | Full player choice→next Writer scene remains the Living Writer gate |
| Cursor B | [WR06](../../changes/archive/2026-11/storyteller/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | Historical v2 rehoming, fork lineage and history/fork UI | Done on the undertaking. Not on main |

**Completed this window:** [WR07N](../../changes/archive/2026-11/storyteller/2026-11-21--wr07n-writer-opening-scene-proposal/CHANGE.md), [WR07L](../../changes/archive/2026-11/storyteller/2026-11-21--wr07l-durable-launch-ledger/CHANGE.md), and [WR05P2](../../changes/archive/2026-11/storyteller/2026-11-21--wr05p2-v2-scene-publication/CHANGE.md) are integrated/archived within their bounded scopes. WR05P2 recorded Documents 49 pass/0 fail/2 skipped, v2 unit 5/5 and checkpoint/fork focused 22/22; no paid provider call. **Resource/integration rules:** separate linked worktrees, only one parent/custodian joins the undertaking at once, reconcile README/ledger/STATUS centrally, and never run multiple SQL migration suites against the same disposable DB. If any of the three has already landed at a later HEAD, update **Active → Done with its actual SHA/proof**, not on assertion. A changed CWD/worktree or archived title alone does not certify integration.

### Critical path and parallel work after this wave

```text
MA01–MA06A completed structural foundation
WR02–WR03 + WR05S + WR05P1 + WR07C + WR07M + WR08A completed foundations
             |
        WR05P2 Done ---------> WR06 (active historical forks) ----+
             |                                                      |
             +--> WR07B (real durable Launch) <-- WR07N Done + WR07L Done |
                       |                                            |
                       +--> true Play UI and scripted acceptance ---+
                                                                    |
WR03 + Writer mission custody ------> WR04 (bounded research) ------+
                                                                    |
                      final monorepo/compat/graph closure <---------+
                                                                    |
                 end-to-end accepted --> merge to main --> retire dossier
```

**Near-term next owner for ChatGPT planning:** WR06 and WR07B have landed on the undertaking. Next planning is WR04 isolated research custody and the Living Writer choice route. The original WR04–WR08 packets predate the MA06A move, so their old source/T-ID instructions are **not safe to dispatch**.

### Meaning of “fully done” and genuine finish line

**Fully done is not “all packets archived” and not “green TypeScript.”** It means:

1. The user can create an authenticated story from a one-word prompt or prepared experience and reach an actual **persisted first playable scene**, including safe loss/retry/restart, source-root and provider-cost accountability.
2. Consequences and fictional time remain authoritative, every new scene has a faithful immutable v2 as-of record, and a player can view/fork an old scene **with still-active commitments**, without later parent-state contamination.
3. Writer missions genuinely use version-pinned Library/skills and optional bounded child research, obey private visibility, provider grants, finite spend and uncertain-delivery recovery; scripted tests pass and operational provider behavior is validated only with explicit funding authorization. Unfunded verification is recorded as unrun, not green.
4. The modular monolith reflects the accepted target in **real package/source dependency measurements**, remaining compatibility is purposeful and bounded, domain ownership and tests are comprehensible, and refactor-caused regressions are fixed. Pre-existing failures are triaged with precise acceptance implications, not silently waved through.
5. Documentation and ledgers reflect the tested result, remaining Change/Design artifacts are retired or explicitly disposed, the undertaking branch is reconciled and **merged to `main`** with no lost work, and the Undertaking dossier and extra long-lived branch are retired according to the recorded lifecycle.

**Critical new acceptance gate (source-audited 2026-11-21):** WR07N Writer-v2 opening `choice.v1` is *display-only*. Existing `storyteller/admission.ts` requires a legacy Storyteller generation, so Writer buttons cannot be clicked through the current route. WR07B may certify a durable **readable first scene** only, with no dead clickable offers; the later **Living Writer** macro Change must deliver a **world-neutral actual intent→scene-2→scene-3** path and genuine provider/research. The upcoming packet's playability correction is binding; see the wider design on planning branch `planning/workshop-outcome-waves` in `work/undertakings/storyteller-workshop/PLAYABILITY-SEAM-AUDIT.md`. This is not a reason to fabricate a legacy generation or humanoid character.

**Standing scope rule:** completion of all five is required for a whole-undertaking Done claim. If the owner explicitly chooses to defer a major capability (especially WR04 or funded real-provider validation), record a narrowed acceptance contract and say **“closed with deferred scope”**, not “fully implemented.” Final cleanup is a bounded follow-up after gameplay stabilizes, not a license for another endless package reorganization.

## What belongs here

The current Writer program is the core constituent set:

| Work | Role in the undertaking | Current disposition at undertaking start |
| --- | --- | --- |
| WR01 | Accept Storyteller and fork product contract | Done / archived |
| WRD02 | Persistent Library technical contract | Done / archived |
| WRD03 | Engine fork technical contract | Done / archived |
| WRD04 | Wiki navigation and validation reconciliation | Done / archived |
| WR02 | Persistent Library and source identity implementation | **Done / archived** |
| WR03 | Agentic writer's workdesk | Done / archived |
| WR04 | Delegated bounded writer research | Done, provider-free |
| WR05 | Coherent scene publication | Proposed |
| WR06 | Fork active fictional state | Proposed |
| WR07 | One-prompt launch backend | Done, scripted first scene, not on main |
| WR08 | One-prompt client and scripted first choice | **Done / archived**. Gated Play, scripted opening offer, writer.scene.v1 wake. Not on main. Live model not claimed |

The existing [Writer implementation program](PROGRAM.md) remains the detailed sequencing owner. This undertaking does not replace it.

## Integration provenance

This branch descends from the four-commit squashed integration previously named `storyteller-evolution-consolidated`.

That integration intentionally absorbed two noisy source histories without replaying them into the new branch:

- Storyteller documentation snapshot: `d500f8ceb0eee7c8f82c8ff5f2cc02273da86639` from the former `storyteller-evolution-electric-boogaloo` branch.
- Repository/design retirement snapshot: `f6d860301f098eb6b0dd326ebef99f8cbb1de4b5` from the former `maintenance/retire-work-graveyard-2026-11-21` branch.

The squashed integration commits preserve exact provenance back to those source SHAs. The old branch names are therefore not required for ongoing work once branch cleanup is complete.

## Explicit exclusions

This undertaking is **not** a generic bucket for every open Offscreen RPG packet. In particular, unrelated distributed-runtime/Kubernetes work, broad player-experience refoundation, economy/spatial/lifecourse proposals and repository-agent experiments do not join merely because they touch adjacent files.

If a prerequisite outside this scope is discovered, reference it as a dependency. Do not silently annex its entire program.

## Exit conditions

Move this Undertaking to **Landing** when:

1. the selected WR02–WR08 implementation scope intended for this wave has reached explicit terminal or intentionally deferred dispositions;
2. permanent product/technical docs describe the accepted result without relying on the Undertaking dossier as authority;
3. `work/QUEUE.md`, `STATUS.md`, `ROADMAP.md` and relevant ledgers no longer contain contradictory state;
4. repository health/tests required by the affected Changes are green or failures are explicitly documented;
5. no temporary source branch contains unique unreconciled work.

Close it when the coherent branch is merged to `main` or explicitly abandoned. Then delete `undertaking/storyteller-workshop` and remove this active dossier after preserving a compact disposition in Git history. Do not leave a permanent “completed undertaking” graveyard in HEAD.

## Branch policy for this undertaking

Target **long-lived** topology after Change integration: **two branches only**:

- `main`
- `undertaking/storyteller-workshop`

**Every commissioned WR Change MUST use one short-lived Change branch** created from the then-current `undertaking/storyteller-workshop` HEAD before implementation. Branch names: `change/wr02-library`, `change/wr03-workdesk`, `change/wr04-research`, `change/wr05-publication`, `change/wr06-fork`, `change/wr07-launch`, `change/wr08-client`. Parent and its children work within that branch without per-T-ID branches. Each commissioned WR Change uses a separate linked Git worktree even if no other chat is active. Preserve the user's primary checkout on its existing branch. When accepted, squash-integrate into `undertaking/storyteller-workshop`, verify, and delete the temporary branch/worktree. `main` is reserved for the later Undertaking landing. These transient Change branches do not contradict the two-long-lived-branches policy.
