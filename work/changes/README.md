# Changes | active catalog

**Integration provenance (2026-11-21):** squashed [documentation d500f8ce](https://github.com/DenisSkulovic/offscreen-rpg/commit/d500f8ceb0eee7c8f82c8ff5f2cc02273da86639) and [housekeeping f6d86030](https://github.com/DenisSkulovic/offscreen-rpg/commit/f6d860301f098eb6b0dd326ebef99f8cbb1de4b5) over [main 34e2b4fd](https://github.com/DenisSkulovic/offscreen-rpg/commit/34e2b4fd8d9d9967e13311da3a938460b1a02244). Source branches preserve their full incremental history. `main` is unchanged.

**This is the working queue directory, not a history book.** Current selection belongs only to [work/QUEUE.md](../QUEUE.md); a packet listed here may be Proposed, Ready, Blocked, or temporarily awaiting verification. Its own `CHANGE.md` determines its actual state. This catalog is **not** authorization to run it.

**History:** [monthly Change ledger](ledger/2026-11.md) · [short-lived packet archive](archive/README.md) · [full historical catalog as it stood before pruning](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/README.md). For exact archived source, use that Git revision and the ledger's program/leaf; historical narratives should not be copied into this active index.

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

[DXK07](archive/2026-11/infrastructure/2026-11-20--dxk07-clean-clone-acceptance/CHANGE.md) is **Done for implementation**; full fresh-clone/Headlamp operator proof remains [DXK-FINAL](../tasks/open/2026-11-20--dxk-final-wsl-clean-room-acceptance/TASK.md). · [Implementation roadmap](../IMPLEMENTATION-ROADMAP.md) · [Current distributed source review](../designs/open/distributed-turn-poc/README.md) · [First-campaign readiness study](../designs/open/first-campaign-readiness-2026-11-20/README.md) · [Cursor backlog handoff](CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md). These source maps are dated; they do not supersede HEAD code or current Change states.

### Writer refoundation | documentation completed, WR02 selected

| Change | Work item |
| --- | --- |
| [WR01](archive/2026-11/other/2026-11-21--wr01-accept-storyteller-and-fork-contract/CHANGE.md) | Product wiki (Done) |
| [WRD02](archive/2026-11/other/2026-11-21--wrd02-storyteller-library-technical-docs/CHANGE.md) | Storyteller/Library technical wiki (Done) |
| [WRD03](archive/2026-11/other/2026-11-21--wrd03-engine-fork-technical-docs/CHANGE.md) | Engine/fork technical wiki (Done) |
| [WRD04](archive/2026-11/other/2026-11-21--wrd04-wiki-navigation-and-validation/CHANGE.md) | Wiki reconciliation (Done) |
| [WR02](open/2026-11-21--wr02-persistent-library-and-source-identity/CHANGE.md) | Persistent Library / source identity |
| [WR03](open/2026-11-21--wr03-agentic-writers-workdesk/CHANGE.md) | Writer's Workdesk |
| [WR04](open/2026-11-21--wr04-delegated-writer-research/CHANGE.md) | Bounded research assistants |
| [WR05](open/2026-11-21--wr05-coherent-scene-publication/CHANGE.md) | Coherent scene publication |
| [WR06](open/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | Active-fiction fork semantics |
| [WR07](open/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | One-prompt launch backend |
| [WR08](open/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) | Creation UI and integrated acceptance |

[Writer implementation program](WRITER-IMPLEMENTATION-2026-11-21.md) · [ChatGPT permanent-wiki handoff](WRITER-DOCS-CHATGPT-HANDOFF-2026-11-21.md). **WR01 and WRD02–WRD04 are Done** and archived here; their canonical wiki rewrite is included. **WR02 is selected for Cursor implementation. WR03–WR08 remain Proposed/unselected and dependency-gated.** Cursor should create the mandatory `change/wr02-library` implementation branch from the current `undertaking/storyteller-workshop` HEAD, implement WR02 there, and squash-integrate accepted work back into the undertaking branch. No permission to dispatch paid models or mutate deployment follows from these statuses.

## Layout

- `open/YYYY-MM-DD--slug/CHANGE.md`: only unresolved or in-flight work. A Change marked Done/Cancelled is reconciled and moved out promptly.
- `archive/YYYY-MM/<program>/YYYY-MM-DD--slug/`: short-lived review staging for verified terminal packets, **not permanent storage**. After a normal seven-day review buffer, prune only with a full-SHA ledger pointer, owner/unique-evidence audit and repaired inbound links. See [archive policy](archive/README.md).
- `ledger/YYYY-MM.md`: concise durable dispositions; Git history stores the original full packet.
- A **Design** is not a Change. Unresolved research belongs in [work/designs/open](../designs/README.md), then is retired into the [design ledger](../designs/ledger/2026-11.md) and Git.

Review archive candidates with `pnpm repo:retirement` (read-only). No automated `git rm`; time alone is never a deletion grant.

## Distributed architecture laboratory (new, 2026-11-19)

The current engineering and release sequencing is in [work/IMPLEMENTATION-ROADMAP.md](../IMPLEMENTATION-ROADMAP.md), the [distributed design dossier](../designs/open/distributed-turn-poc/README.md), and the explicit open DIST03/TURN03/K8S10/K8S11 packets. Prior proposals for a RabbitMQ→Temporal bridge were cancelled because they lacked an admitted independent consumer. They are **not** prerequisites for TURN03. Historical decision receipts are preserved in the [2026-11-20 Git catalog](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/README.md).

## DISTURN | First service-extraction bundle (planned 2026-11-19)

See the [distributed program](../designs/open/distributed-turn-poc/README.md), current [DIST03](open/2026-11-19--dist03-game-authority-private-boundary/CHANGE.md), and [archive ledger](ledger/2026-11.md). Completed ARCH/DIST baseline contracts are in canonical technical documents; do not replay archived packet prose as an active assignment.

## DISTURN | Scene-state and canonical-knowledge bundle (planned 2026-11-19)

Source-level state/knowledge authority belongs to [technical engine](../../docs/technical/engine/authority-and-transitions.md), [canonical documents](../../docs/technical/storyteller/canonical-documents-and-packages.md) and the active [TURN03](open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md).

## DISTURN | Campaign bootstrap bundle (planned 2026-11-19)

Use [current campaign lifecycle contract](../../docs/technical/engine/lifecycle-and-compatibility.md), [first-campaign readiness](../designs/open/first-campaign-readiness-2026-11-20/README.md) and the [Change ledger](ledger/2026-11.md); archived BOOT packets are history.

## DISTURN | Storyteller execution and publication bundle (planned 2026-11-19)

The selected/current division is [Storyteller operation](../../docs/technical/storyteller/operation-and-controller.md), [publication](../../docs/technical/storyteller/generation-and-publication.md) and [TURN03](open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md). Full Writer refoundation is the separate [WR roadmap](WRITER-IMPLEMENTATION-2026-11-21.md).

## DISTURN | Final application release and full POC acceptance (planned 2026-11-19)

Use [TURN03](open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md), [K8S10](open/2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md) and [K8S11](open/2026-11-19--k8s11-next-nest-live-edge-integration/CHANGE.md) as the explicit acceptance owners. They are not automatically selected.

## DISTURN | Reconciled next execution schedule (2026-11-19)

The historical detailed sequence remains in [the pinned Git catalog](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/README.md). Always read [current implementation roadmap](../IMPLEMENTATION-ROADMAP.md) and [QUEUE](../QUEUE.md) before assigning work.

## Source audit remediation | 2f45deed (2026-11-19)

The original audit and packet-link narrative is [retained in Git](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/README.md). The living source route is the [distributed dossier](../designs/open/distributed-turn-poc/AUDIT-2026-11-19--2f45deed.md) and current packet-specific source files.

## Change-queue lifecycle consolidation (HK09, 2026-11-19)

Only [QUEUE](../QUEUE.md) selects active work; [work taxonomy](../WORK-TAXONOMY.md) separates Changes, Tasks, Designs and evidence. Historical packet statuses live in the [monthly ledger](ledger/2026-11.md). Full packet bodies stay in Git after retirement, not in this catalog.
