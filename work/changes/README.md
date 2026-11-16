# Work changes | selection queue

**DOC01 selection owner** for `pnpm repo:brief`. Packets live here (`open/` + `archive/`).

Current change: none

**Current status:** DOC01 **Done** — archived at [archive/2026-11/other/2026-11-16--doc01-documentation-architecture](archive/2026-11/other/2026-11-16--doc01-documentation-architecture/CHANGE.md). No code-bearing Change selected (valid).

## Open packets

| Packet | State | Outcome |
| --- | --- | --- |
| [DOC02 canonical knowledge reconstruction](open/2026-11-16--doc02-knowledge-authority-reconstruction/CHANGE.md) | **Proposed (independent audit/design; not selected)** | Repair duplicate authority, legacy snapshots, skeletal contracts and ChatGPT retrieval; **keep completed Change archive** |
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

**Standard:** [change work-unit](../../.agents/references/change-work-unit-standard.md). **Tooling:** `node scripts/repo-tools/archive-changes.mjs --dry-run|--apply`.
