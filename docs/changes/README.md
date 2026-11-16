# Code-bearing Changes | packet store (DOC01)

**Selection owner:** [work/changes/README.md](../../work/changes/README.md) — `pnpm repo:brief` reads Current change there.  
**This directory** still stores physical `open/` and `archive/` packets until G3 packet move completes.

**Layout:** non-terminal packets in [`open/`](open); Done/Cancelled in [`archive/YYYY-MM/<program>/`](archive/README.md). Closing a Change still `git mv`s here after Reconciliation ledger until the archiver targets `work/changes`.

**Architecture context:** [React/Next client architecture](../technical/client/architecture.md). **Standard:** [change work-unit](../../.agents/references/change-work-unit-standard.md). **Tooling:** `node scripts/repo-tools/archive-changes.mjs --dry-run|--apply`. **Compact ledger:** [work/changes/ledger/2026-11.md](../../work/changes/ledger/2026-11.md).

Current change: see [work/changes/README.md](../../work/changes/README.md) (DOC01 Selected; P6 deletion gated).

## Open packets

| Packet | State | Outcome |
| --- | --- | --- |
| [DOC01 documentation architecture](open/2026-11-16--doc01-documentation-architecture/CHANGE.md) | **Selected** — P6 soft-retire; hard delete gated | Rebuild canonical docs by subject/authority |
| [QA-SF01 storyteller fixtures](open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md) | **Blocked** | Restore honest focused Storyteller/story-resolution suites |
| [OBS00 live provider custody](open/2026-11-15--obs00-live-provider-custody/CHANGE.md) | **Blocked** (OBS00-B) | Production/default-worker current entitlement |
| [OBS04 finite-action E0](open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) | Proposed | First E0 game transition witness |
| [ENG03 short-lock context](open/2026-11-13--eng-short-lock-context/CHANGE.md) | Proposed | Full short-lock capture |
| [GM03 standing life](open/2026-11-13--gm-standing-life/CHANGE.md) | Proposed | Bounded standing routine |
| [GM07 delegated decision](open/2026-11-13--gm-delegated-decision/CHANGE.md) | Proposed | Consented fallback after deadline |
| [SA07 evidence tools](open/2026-11-14--sa07-evidence-tools/CHANGE.md) | Proposed (conditional) | Typed read operations for missing evidence |
| [S3a continuity report](open/2026-11-11--s3a-continuity-report/CHANGE.md) | Parked | Continuity evidence in local Story report |

## Where Done work went

Durable product/technical truth lives in [docs/product](../product/README.md) and [docs/technical](../technical/README.md). Terminal packets: [archive/2026-11](archive/2026-11/README.md) + [ledger](../../work/changes/ledger/2026-11.md).

## Selecting and converging

1. Set Current change in **work/changes/README.md** (or `none`).
2. Implement; fill Reconciliation ledger; archive via tooling; update STATUS when the demonstrated boundary changes.
3. Provider spend, DB reset and deploy remain separately authorized.
