# Changes | active catalog

**Purpose:** index open, independently reviewable Change packets. This directory root is **not** a storage area for standalone roadmap, handoff, audit or program Markdown. [Current work](../QUEUE.md) alone owns the global selector; [work taxonomy](../WORK-TAXONOMY.md) distinguishes Changes from Designs/Tasks. Archived and historic outcomes belong in the [ledger](ledger/2026-11.md), [short-lived archive](archive/README.md) and exact Git history. No automatic execution follows from being listed here.

## Code craftsmanship implementation packets

The **unresolved architectural questions** live in the [Code Architecture Design](../designs/open/code-architecture-health/README.md); code implementation is owned by the individual packets here, not an extra dated program roadmap.

| Change | Scope / dependency |
| --- | --- |
| [CQ01](open/2026-11-21--cq01-admin-session-freshness/CHANGE.md) | Session timestamp rejection; security review |
| [CQ02](open/2026-11-21--cq02-admin-http-ownership/CHANGE.md) | Admin HTTP ownership; after CQ01 |
| [CQ03](open/2026-11-21--cq03-play-surface-readability/CHANGE.md) | Play readability; avoid WR08 overlap |
| [CQ04](open/2026-11-21--cq04-document-store-capability-guards/CHANGE.md) | Runtime capability guards; avoid WR06 overlap |
| [CQ05](open/2026-11-21--cq05-recurring-source-health/CHANGE.md) | Read-only structural source health checker |

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

### Writer refoundation | WR02 and WR03 archived

| Change | Work item |
| --- | --- |
| [WR01](archive/2026-11/other/2026-11-21--wr01-accept-storyteller-and-fork-contract/CHANGE.md) | Product wiki (Done) |
| [WRD02](archive/2026-11/other/2026-11-21--wrd02-storyteller-library-technical-docs/CHANGE.md) | Storyteller/Library technical wiki (Done) |
| [WRD03](archive/2026-11/other/2026-11-21--wrd03-engine-fork-technical-docs/CHANGE.md) | Engine/fork technical wiki (Done) |
| [WRD04](archive/2026-11/other/2026-11-21--wrd04-wiki-navigation-and-validation/CHANGE.md) | Wiki reconciliation (Done) |
| [WR02](archive/2026-11/storyteller/2026-11-21--wr02-persistent-library-and-source-identity/CHANGE.md) | Persistent Library / source identity (Done) |
| [WR03](archive/2026-11/storyteller/2026-11-21--wr03-agentic-writers-workdesk/CHANGE.md) | Writer's Workdesk (Done) |
| [WR04](open/2026-11-21--wr04-delegated-writer-research/CHANGE.md) | Bounded research assistants |
| [WR05](open/2026-11-21--wr05-coherent-scene-publication/CHANGE.md) | Coherent scene publication |
| [WR06](open/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | Active-fiction fork semantics |
| [WR07](open/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | One-prompt launch backend |
| [WR08](open/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) | Creation UI and integrated acceptance |

[Writer Undertaking program](../undertakings/storyteller-workshop/PROGRAM.md). **WR01 and WRD02–WRD04 are Done** and archived here; their canonical wiki rewrite is included. **WR02 and WR03 are Done and archived on the undertaking branch; WR04–WR08 remain Proposed/unselected and dependency-gated.** Before any successor commission, refresh its source anchors against the landed writer mission. WR03 does not publish scenes and does not select WR04. No permission to dispatch paid models or mutate deployment follows from these statuses.

## Layout

- `open/YYYY-MM-DD--slug/CHANGE.md`: only unresolved or in-flight work. A Change marked Done/Cancelled is reconciled and moved out promptly.
- `archive/YYYY-MM/<program>/YYYY-MM-DD--slug/`: short-lived review staging for verified terminal packets, **not permanent storage**. After a normal seven-day review buffer, prune only with a full-SHA ledger pointer, owner/unique-evidence audit and repaired inbound links. See [archive policy](archive/README.md).
- `ledger/YYYY-MM.md`: concise durable dispositions; Git history stores the original full packet.
- A **Design** is not a Change. Unresolved research belongs in [work/designs/open](../designs/README.md), then is retired into the [design ledger](../designs/ledger/2026-11.md) and Git.

Review archive candidates with `pnpm repo:retirement` (read-only). No automated `git rm`; time alone is never a deletion grant.


**Old dated audit menus and handoffs are not active queues.** The original full contents are recoverable through Git at `4ee459b9acdc73c7f63674b697baeb9c7e685da4`; use current Change packets and Undertaking owners instead.
