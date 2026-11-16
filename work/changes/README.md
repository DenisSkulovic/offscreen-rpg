# Work changes | selection queue

**DOC01 selection owner** for `pnpm repo:brief`. Packets live here (`open/` + `archive/`).

Current change: [DOC01 Rebuild the documentation knowledge architecture](open/2026-11-16--doc01-documentation-architecture/CHANGE.md)

**Current status:** DOC01 Selected — P6 soft-retire; hard delete gated by [no-loss gate](open/2026-11-16--doc01-documentation-architecture/P6-NO-LOSS-GATE.md). G3 packet root move **done**.

## Open packets

| Packet | State | Outcome |
| --- | --- | --- |
| [DOC01 documentation architecture](open/2026-11-16--doc01-documentation-architecture/CHANGE.md) | **Selected** — P6 gated | Rebuild canonical docs by subject/authority |
| [QA-SF01 storyteller fixtures](open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md) | **Blocked** | Restore honest focused Storyteller/story-resolution suites |
| [OBS00 live provider custody](open/2026-11-15--obs00-live-provider-custody/CHANGE.md) | **Blocked** (OBS00-B) | Production/default-worker current entitlement |
| [OBS04 finite-action E0](open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) | Proposed | First E0 game transition witness |
| [ENG03 short-lock context](open/2026-11-13--eng-short-lock-context/CHANGE.md) | Proposed | Full short-lock capture |
| [GM03 standing life](open/2026-11-13--gm-standing-life/CHANGE.md) | Proposed | Bounded standing routine |
| [GM07 delegated decision](open/2026-11-13--gm-delegated-decision/CHANGE.md) | Proposed | Consented fallback after deadline |
| [SA07 evidence tools](open/2026-11-14--sa07-evidence-tools/CHANGE.md) | Proposed (conditional) | Typed read operations for missing evidence |
| [S3a continuity report](open/2026-11-11--s3a-continuity-report/CHANGE.md) | Parked | Continuity evidence in local Story report |

## Layout

| Path | Role |
| --- | --- |
| [open/](open/) | Non-terminal packets |
| [archive/](archive/README.md) | Done / Cancelled by month + program |
| [ledger/](ledger/) | Compact closed-work index |

**Standard:** [change work-unit](../../.agents/references/change-work-unit-standard.md). **Tooling:** `node scripts/repo-tools/archive-changes.mjs --dry-run|--apply`. Legacy stub: [docs/changes/README.md](../../docs/changes/README.md).
