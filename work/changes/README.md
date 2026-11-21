# Changes | active catalog

**Purpose:** index open, independently reviewable Change packets. This directory root is **not** a storage area for standalone roadmap, handoff, audit or program Markdown. [Current work](../QUEUE.md) alone owns the global selector; [work taxonomy](../WORK-TAXONOMY.md) distinguishes Changes from Designs/Tasks. Archived and historic outcomes belong in the [ledger](ledger/2026-11.md), [short-lived archive](archive/README.md) and exact Git history. No automatic execution follows from being listed here.

## Code craftsmanship implementation packets

The **unresolved architectural questions** live in the [Code Architecture Design](../designs/open/code-architecture-health/README.md); code implementation is owned by the individual packets here, not an extra dated program roadmap.

| Change | Scope / dependency |
| --- | --- |
| [CQ01](archive/2026-11/other/2026-11-21--cq01-admin-session-freshness/CHANGE.md) | Session timestamp rejection; Done on the undertaking branch |
| [CQ02](archive/2026-11/other/2026-11-21--cq02-admin-http-ownership/CHANGE.md) | Admin HTTP ownership; Done on the undertaking branch |
| [CQ03](archive/2026-11/other/2026-11-21--cq03-play-surface-readability/CHANGE.md) | Play readability; Done on the undertaking branch |
| [CQ04](archive/2026-11/other/2026-11-21--cq04-document-store-capability-guards/CHANGE.md) | Runtime capability guards; Done on the undertaking branch |
| [CQ05](archive/2026-11/other/2026-11-21--cq05-recurring-source-health/CHANGE.md) | Read-only structural source health checker; Done on the undertaking branch |

## Modular Monolith architecture program

[Domain ownership Design](../designs/open/code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md) · [Program schedule](../undertakings/modular-monolith/UNDERTAKING.md). A separate `undertaking/modular-monolith` branch would be the cleaner long-term home. Owner decision 2026-11-21: MA01–MA06 integrate on the active `undertaking/storyteller-workshop` branch, each from its own linked Change worktree. They stay off `main`. Listing a packet here does not commission it.

| Change | Architectural result | Readiness |
| --- | --- | --- |
| [MA01](archive/2026-11/other/2026-11-21--ma01-workspace-import-graph/CHANGE.md) | Manifest + source AST graph, runtime/type-only cycles and import rules | Done on `undertaking/storyteller-workshop` |
| [MA02](archive/2026-11/other/2026-11-21--ma02-cache-port-inversion/CHANGE.md) | Invert Redis adapter → application type dependency | Done on `undertaking/storyteller-workshop` |
| [MA03](archive/2026-11/other/2026-11-21--ma03-admin-package-extraction/CHANGE.md) | New Admin workspace with extracted campaign-holds schema, compatibility | Done (2026-11-21). `@offscreen/admin` owns the staff modules; application re-exports them. Disposable admin SQL 10/10. Target `undertaking/storyteller-workshop` |
| [MA04](archive/2026-11/other/2026-11-21--ma04-chamber-domain-decoupling/CHANGE.md) | Remove ordinary story authority's developer-fixture import | Done (2026-11-21). Stories no longer imports Chamber fixtures. Disposable story HTTP 4/4 and core 10/10. Target `undertaking/storyteller-workshop` |
| [MA05A](archive/2026-11/other/2026-11-21--ma05a-neutral-storyteller-kinds/CHANGE.md) | Remove two reverse imports by moving frozen generation-kind constants into Contracts | Done (2026-11-21). Kinds live in `@offscreen/contracts/storyteller-kinds`. Focused tests 1/1, 1/1, and ENG03 9/9. Target `undertaking/storyteller-workshop` |
| [MA05B](archive/2026-11/other/2026-11-21--ma05b-sql-outbox-port/CHANGE.md) | Move transaction/notice/enqueue SQL primitive into DB with exact Application compatibility | Done (2026-11-21). `@offscreen/db/outbox` owns enqueue. Identity 1/1. Disposable SQL 7/7. Target `undertaking/storyteller-workshop` |
| [MA05C](archive/2026-11/other/2026-11-21--ma05c-direct-db-outbox-imports/CHANGE.md) | 46 exact source imports move to DB-owned outbox port in one guarded utility edit, followed by joined proof | Done (2026-11-21). 46 files import `@offscreen/db/outbox`. Package builds passed. Old relative import search found nothing. SQL fixture not rerun. Target `undertaking/storyteller-workshop` |
| [MA05D](archive/2026-11/other/2026-11-21--ma05d-frozen-wake-sql-seam/CHANGE.md) | Replace two Campaign → Storyteller runtime reverse imports with stable read-only SQL facts | Done (2026-11-21). Topics live in `@offscreen/contracts/storyteller-notices`. Campaign `storyteller-wake.ts` owns the SQL readers. Disposable SQL 12/12. Target `undertaking/storyteller-workshop` |
| [MA05E](archive/2026-11/other/2026-11-21--ma05e-continuity-note-authority/CHANGE.md) | Relocate SQL continuity writer into Story Authority with strict legacy re-export identity | Done (2026-11-21). `stories/continuity-notes.ts` owns the SQL writer. Identity 1/1. Disposable scene publication 5/5. Target `undertaking/storyteller-workshop` |
| [MA05F](archive/2026-11/other/2026-11-21--ma05f-authority-start-retry-cohort/CHANGE.md) | Move start/retry SQL authority and retry decision policy in one coherent Change while retaining old runtime-path identity | Done (2026-11-21). Story Authority owns start, retry admission, and the retry gate. Identity 1/1. Publication context 5/5. Playable start 5/5. Target `undertaking/storyteller-workshop` |
| [MA05G](archive/2026-11/other/2026-11-21--ma05g-resolution-admission-authority/CHANGE.md) | Move resolution replay, locked commit, and task-record SQL into Story Authority while keeping off-lock preparation and the public factory | Done (2026-11-21). Identity 7/7. Notice-topic freeze 8/8. ENG03 lock measurement 2/2. Module graph has the existing intra-application cycle and no new package cycle. Target `undertaking/storyteller-workshop` |
| [MA06A](archive/2026-11/other/2026-11-21--ma06a-story-engine-package-cohort/CHANGE.md) | One coherent bulk extraction of stories, campaign, storyteller runtime and generations into `@offscreen/story-engine`, keeping compatibility | Done (2026-11-21). 134 modules, 134 forwarders, compatibility 4/4, notice freeze 8/8, ENG03 2/2. Module graph clear. Target `undertaking/storyteller-workshop` |
| [MA05](archive/2026-11/other/2026-11-21--ma05-authority-runtime-port-inversion/CHANGE.md) | Remaining tx-bound Story Authority → Storyteller-runtime inversion | Superseded (2026-11-21) by MA06A. MA05A–G are Done. Intra-engine capture edges remain. Not a completed dependency inversion |
| [MA06](open/2026-11-21--ma06-domain-package-migration/CHANGE.md) | Extract story-authority and Storyteller-runtime packages, retire application catch-all | **PLANNER-BLOCKED:** reserved A–D extraction stages; requires post-MA05 graph and exact file/export/consumer migration maps |

## Open packets

### Distributed gameplay, Kubernetes and developer experience

| Change | Current work item |
| --- | --- |
| [OBS04](open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) | Finite-action evidence |
| [DIST03](open/2026-11-19--dist03-game-authority-private-boundary/CHANGE.md) | Private Game Authority boundary |
| [K8S10](open/2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md) | Distributed fault/load harness |
| [K8S11](open/2026-11-19--k8s11-next-nest-live-edge-integration/CHANGE.md) | Next/Nest live edge |
| [TURN03](open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) | Full distributed forkable turn |
| [TURN04](open/2026-11-19--turn04-opt-in-real-provider-confirmation/CHANGE.md) | Opt-in live provider confirmation |
| [DXK08](open/2026-11-20--dxk08-fast-kubernetes-inner-dev-loop/CHANGE.md) | Fast Kubernetes developer loop |
| [DXK09](open/2026-11-20--dxk09-parallel-worktree-dev-stacks/CHANGE.md) | Parallel worktree dev stacks |

[DXK07](archive/2026-11/infrastructure/2026-11-20--dxk07-clean-clone-acceptance/CHANGE.md) is **Done for implementation**; full fresh-clone/Headlamp operator proof remains [DXK-FINAL](../tasks/open/2026-11-20--dxk-final-wsl-clean-room-acceptance/TASK.md). · [Implementation roadmap](../IMPLEMENTATION-ROADMAP.md) · [Current distributed source review](../designs/open/distributed-turn-poc/README.md) · [First-campaign readiness study](../designs/open/first-campaign-readiness-2026-11-20/README.md) · [current selection](../QUEUE.md). These source maps are dated; they do not supersede HEAD code or current Change states.

### Writer refoundation | WR02 and WR03 archived; WR04–WR08 require planner repair

| Change | Work item |
| --- | --- |
| [WR01](archive/2026-11/other/2026-11-21--wr01-accept-storyteller-and-fork-contract/CHANGE.md) | Product wiki (Done) |
| [WRD02](archive/2026-11/other/2026-11-21--wrd02-storyteller-library-technical-docs/CHANGE.md) | Storyteller/Library technical wiki (Done) |
| [WRD03](archive/2026-11/other/2026-11-21--wrd03-engine-fork-technical-docs/CHANGE.md) | Engine/fork technical wiki (Done) |
| [WRD04](archive/2026-11/other/2026-11-21--wrd04-wiki-navigation-and-validation/CHANGE.md) | Wiki reconciliation (Done) |
| [WR02](archive/2026-11/storyteller/2026-11-21--wr02-persistent-library-and-source-identity/CHANGE.md) | Persistent Library / source identity (Done) |
| [WR03](archive/2026-11/storyteller/2026-11-21--wr03-agentic-writers-workdesk/CHANGE.md) | Writer's Workdesk (Done) |
| [WR05S](archive/2026-11/other/2026-11-21--wr05s-scene-v2-storage-contract/CHANGE.md) | Scene-checkpoint v2 storage grammar and SQL versions 1–2 (Done). Publication still writes v1 |
| [WR04](open/2026-11-21--wr04-delegated-writer-research/CHANGE.md) | **PLANNER-BLOCKED:** context-specific Writer step/custody and child read-only spend gates not settled |
| [WR05](open/2026-11-21--wr05-coherent-scene-publication/CHANGE.md) | **PLANNER-BLOCKED:** v2 after-world-state schema, transaction projection and migration not fully settled |
| [WR06](open/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | **PLANNER-BLOCKED:** depends on WR05 and exact ID/FK/active-work remap |
| [WR07C](archive/2026-11/storyteller/2026-11-21--wr07c-launch-wire-contract/CHANGE.md) | Launch request and status parsers in `@offscreen/contracts/story-launch` (Done). This does not unblock WR07 |
| [WR08A](open/2026-11-21--wr08a-play-launch-surface/CHANGE.md) | One-prompt Launch form, safe persisted operation pointer, truthful status and gated route | **READY / OWNER-COMMISSIONED**, WR07C landed. Web-only, parallel with WR05S |
| [WR07](open/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | **PLANNER-BLOCKED:** request/route, SQL custody, GA scene-one and uncertain-replay contracts |
| [WR08](open/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) | **PLANNER-BLOCKED:** typed WR04/06/07 contracts and exact UI/E2E fixture not landed |

[Writer Undertaking program](../undertakings/storyteller-workshop/PROGRAM.md). **WR01 and WRD02–WRD04 are Done** and archived here; their canonical wiki rewrite is included. **WR02, WR03, WR05S, and WR07C are Done and archived on the undertaking branch. WR05S stores a v2 checkpoint and allows SQL versions 1 and 2; it does not publish scenes. WR07C publishes Launch request and status schemas and does not add an endpoint. WR04–WR08 have each failed the independent G0–G7 execution-readiness audit and are explicitly PLANNER-BLOCKED.** Their existing T-IDs are non-dispatchable until ChatGPT freezes missing designs and verifies successor source contracts. See the [program's corrected collision/dependency map](../undertakings/storyteller-workshop/PROGRAM.md). No Cursor investigation swarm or provider calls are authorized by a proposed Change. WR03 does not publish scenes and does not select WR04. No permission to dispatch paid models or mutate deployment follows from these statuses.

## Layout

- `open/YYYY-MM-DD--slug/CHANGE.md`: only unresolved or in-flight work. A Change marked Done/Cancelled is reconciled and moved out promptly.
- `archive/YYYY-MM/<program>/YYYY-MM-DD--slug/`: short-lived review staging for verified terminal packets, **not permanent storage**. After a normal seven-day review buffer, prune only with a full-SHA ledger pointer, owner/unique-evidence audit and repaired inbound links. See [archive policy](archive/README.md).
- `ledger/YYYY-MM.md`: concise durable dispositions; Git history stores the original full packet.
- A **Design** is not a Change. Unresolved research belongs in [work/designs/open](../designs/README.md), then is retired into the [design ledger](../designs/ledger/2026-11.md) and Git.

Review archive candidates with `pnpm repo:retirement` (read-only). No automated `git rm`; time alone is never a deletion grant.


**Old dated audit menus and handoffs are not active queues.** The original full contents are recoverable through Git at `4ee459b9acdc73c7f63674b697baeb9c7e685da4`; use current Change packets and Undertaking owners instead.
