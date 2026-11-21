# Storyteller Workshop

**State:** Active  
**Branch:** `undertaking/storyteller-workshop`  
**Started:** 2026-11-21  
**Integration base:** `main` at `34e2b4fd8d9d9967e13311da3a938460b1a02244`

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
| **D. Immutable scene-v2 historical truth** | **Active: WR05P2** | WR05S v2 document storage + selector SQL; WR05P1 sorted after-state SQL reader and pure continuity-note projector Done | WR05P2 completes v2-only schema fixes, stage→lock→actual-after-state equality, all publication branches, first-scene and active-work snapshots, v1-compatible historical read and negative transaction tests. **A v2 parser alone is not a published v2 scene** |
| **E. Writer playable opening contract + durable Launch identity** | **WR07N and WR07L Done; real Launch integration still pending** | WR07C and WR07M Done; old Writer rounds have custody/replay; Web Launch form is gated OFF by default | **WR07N Done/archived:** v2 final proposal now carries validated passage content and interaction. **WR07L Done/archived:** owner-scoped idempotent SQL ledger exists; no HTTP route, worker or story publication yet. Their integration does **not** yet create a Launch endpoint, wake a Worker or publish a first scene |
| **F. Direct Play end-to-end** | **Planned, not yet implemented** | Authentic frontend contract and existing engine/Writer services provide foundations | After D + E: WR07B must connect PUT/GET Launch authentication, captured source/Library, mission admission, authorized bounded Writer transport, durable outbox/worker replay, Game Authority scene-one commit and `ready` reconciliation. WR08 then ungates the public UI only after real tests. Both zero-provider scripted proof **and**, if authorized, bounded real-provider proof needed before claiming an operational LLM Storyteller |
| **G. Any-scene historical forks, including active work** | **Planned: WR06** | Legacy narrow/quiescent fork behavior; immutable Library-root sharing and v2 grammar/projection support in progress | Fork scene 37 after parent advances to 80; exact as-of source/notes/choices/fictional clock; remap child-local activity/action/offer/obligation/hold IDs and dependencies; avoid parent current-state leak, provider-job duplication and spend; prove replay/recovery and player interaction |
| **H. Real bounded delegated Writer research** | **Planned: WR04** | WR03 tools, Workdesk and attempt custody exist | Separate child contexts and independent attempt identities, inherited constrained read-only source grants, finite reserved spend, deterministic verified join, no child ability to edit canon or silently assume source claims. Optional per-scene, **but delivered or explicitly owner-deferred before declaring whole undertaking complete** |
| **I. Full product experience and long-form Storyteller acceptance** | **Planned: WR08 + integrated proof** | WR08A form/status built but hidden until real backend; established scripted memories and some old story tests | Direct Play from word/paragraph and version-pinned prepared preset, actual scene and reentry, current/history/fork screens, safety statuses; zero-cost scripted longer-lived campaign (target 200-scene diagnostic), source/continuity and authorized funding tests, UI/browser and controlled worker failures. Retire the compulsory wizard only after verified replacement |
| **J. Monorepo quality closure, compatibility retirement and landing** | **Final Gate open** | AST graph and code-health commands exist; structural moves completed without mandatory new services; MA06A recorded known code-health warnings and pre-existing provider-budget/browser failures | Re-run post-gameplay package graph, no new forbidden imports/cycles, accurate manifest exports/builds, explicit `@offscreen/application` residual ownership or retirement plan, focused finance/security/idempotency negatives, baseline failure triage, no untracked Change worktrees/branches, truthful product/technical docs and STATUS, landing to `main` and Undertaking retirement |

### Current execution window (refreshed after WR07N integration)

| Owner | Change | Concrete code write ownership | Completion impact |
| --- | --- | --- | --- |
| Cursor A | [WR05P2](../../changes/open/2026-11-21--wr05p2-v2-scene-publication/CHANGE.md) | Documents v2-only schema and Story Engine publication/history | Gate D; unlocks WR06 and WR07B first-scene |

**Completed this window:** [WR07N](../../changes/archive/2026-11/storyteller/2026-11-21--wr07n-writer-opening-scene-proposal/CHANGE.md) and [WR07L](../../changes/archive/2026-11/storyteller/2026-11-21--wr07l-durable-launch-ledger/CHANGE.md) integrated and archived. Its status is **Done for contract scope only**; neither Writer execution nor scene publication was proven by that Change.\n\n**Resource/integration rules:** separate linked worktrees, only one parent/custodian joins the undertaking at once, reconcile README/ledger/STATUS centrally, and never run multiple SQL migration suites against the same disposable DB. If any of the three has already landed at a later HEAD, update **Active → Done with its actual SHA/proof**, not on assertion. A changed CWD/worktree or archived title alone does not certify integration.

### Critical path and parallel work after this wave

```text
MA01–MA06A completed structural foundation
WR02–WR03 + WR05S + WR05P1 + WR07C + WR07M + WR08A completed foundations
             |
        WR05P2 (scene-v2) ------> WR06 (active historical forks) ----+
             |                                                      |
             +--> WR07B (real durable Launch) <-- WR07N Done + WR07L Done     |
                       |                                            |
                       +--> true Play UI and scripted acceptance ---+
                                                                    |
WR03 + Writer mission custody ------> WR04 (bounded research) ------+
                                                                    |
                      final monorepo/compat/graph closure <---------+
                                                                    |
                 end-to-end accepted --> merge to main --> retire dossier
```

**Near-term next owner for ChatGPT planning:** finish the **source-grounded WR07B packet** now that external DTO, mission, ledger and publisher contracts are chosen; then prepare WR06 active-fork remap maps against the *actual landed* v2 snapshot, and WR04 isolated research custody. These can be designed ahead of Cursor completion; only release a conflicting source packet once its predecessor is verified. The original WR04–WR08 packets predate the MA06A move, so their old source/T-ID instructions are **not safe to dispatch**.

### Meaning of “fully done” and genuine finish line

**Fully done is not “all packets archived” and not “green TypeScript.”** It means:

1. The user can create an authenticated story from a one-word prompt or prepared experience and reach an actual **persisted first playable scene**, including safe loss/retry/restart, source-root and provider-cost accountability.
2. Consequences and fictional time remain authoritative, every new scene has a faithful immutable v2 as-of record, and a player can view/fork an old scene **with still-active commitments**, without later parent-state contamination.
3. Writer missions genuinely use version-pinned Library/skills and optional bounded child research, obey private visibility, provider grants, finite spend and uncertain-delivery recovery; scripted tests pass and operational provider behavior is validated only with explicit funding authorization. Unfunded verification is recorded as unrun, not green.
4. The modular monolith reflects the accepted target in **real package/source dependency measurements**, remaining compatibility is purposeful and bounded, domain ownership and tests are comprehensible, and refactor-caused regressions are fixed. Pre-existing failures are triaged with precise acceptance implications, not silently waved through.
5. Documentation and ledgers reflect the tested result, remaining Change/Design artifacts are retired or explicitly disposed, the undertaking branch is reconciled and **merged to `main`** with no lost work, and the Undertaking dossier and extra long-lived branch are retired according to the recorded lifecycle.

**Standing scope rule:** completion of all five is required for a whole-undertaking Done claim. If the owner explicitly chooses to defer a major capability (especially WR04 or funded real-provider validation), record a narrowed acceptance contract and say **“closed with deferred scope”**, not “fully implemented.” Final cleanup is a bounded follow-up after gameplay stabilizes, not a license for another endless package reorganization.

**Delivery sequencing:** [Workshop program: Finish-line execution strategy](PROGRAM.md#finish-line-execution-strategy--outcome-waves-not-micro-refactors) groups the remaining work into **five product/architecture outcomes**, each deliberately larger than a function-move Change. This table owns evidence status; that program section owns how to reach it. The largest remaining goals are direct Play, active historic forks with UI, real funded Writer and independent research, one bulk compatibility/monorepo cleanup, and final integrated acceptance/landing. Do not multiply Change folders just to make the progress table move.

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
| WR04 | Delegated bounded writer research | Proposed |
| WR05 | Coherent scene publication | Proposed |
| WR06 | Fork active fictional state | Proposed |
| WR07 | One-prompt launch backend | Proposed |
| WR08 | One-prompt client and integrated acceptance | Proposed |

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
