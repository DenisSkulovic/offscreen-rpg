# Work changes | selection queue

**Selection owner** for `pnpm repo:brief`. Packets live here (`open/` + `archive/`).

Current change: none

**Current status:** HAR02 is Done at [archive/2026-11/other/2026-11-17--har02-retrieval-comparison](archive/2026-11/other/2026-11-17--har02-retrieval-comparison/CHANGE.md) (`pnpm repo:retrieval-compare`; same SHA only; proposal and dirty hits do not pass). HAR01 is Done at [archive/2026-11/other/2026-11-17--har01-source-receipts](archive/2026-11/other/2026-11-17--har01-source-receipts/CHANGE.md) (`pnpm repo:brief --json`; local SHA and dirty paths; no remote fetch). WIKI08 is Done at [archive/2026-11/other/2026-11-16--wiki08-content-quality-gates](archive/2026-11/other/2026-11-16--wiki08-content-quality-gates/CHANGE.md) (`pnpm wiki:content-health`; named stale instructions repaired; capture and telemetry stay proposals; claim list is an author draft). WIKI07 is Done at [archive/2026-11/other/2026-11-16--wiki07-retrieval-by-heading](archive/2026-11/other/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md) (`pnpm wiki:find` / `pnpm wiki:read`; three independent reads; no gameplay source and no provider call). WIKI06 is Done at [archive/2026-11/other/2026-11-16--wiki06-knowledge-lifecycle](archive/2026-11/other/2026-11-16--wiki06-knowledge-lifecycle/CHANGE.md) (ratified-target versus realization rule; `pnpm wiki:change-guard`; no gameplay source and no provider call). WIKI05 is Done at [archive/2026-11/other/2026-11-16--wiki05-benchmark-validity](archive/2026-11/other/2026-11-16--wiki05-benchmark-validity/CHANGE.md) (`wiki.static.v2`; v1 preserved; no live agent). WIKI04 is Done at [archive/2026-11/other/2026-11-16--wiki04-navigation-and-authority](archive/2026-11/other/2026-11-16--wiki04-navigation-and-authority/CHANGE.md) (74/74 canonical pages reachable; capture and telemetry remain proposals). WIKI03 is Done at [archive/2026-11/other/2026-11-16--wiki03-isolated-agent-evaluation](archive/2026-11/other/2026-11-16--wiki03-isolated-agent-evaluation/CHANGE.md) (fake harness only; no live agent run). WIKI02 is Done at [archive/2026-11/other/2026-11-16--wiki02-static-retrieval-and-hopper](archive/2026-11/other/2026-11-16--wiki02-static-retrieval-and-hopper/CHANGE.md). WIKI01 is Done at [archive/2026-11/other/2026-11-16--wiki01-markdown-graph-health](archive/2026-11/other/2026-11-16--wiki01-markdown-graph-health/CHANGE.md). DOC04 is Done at [archive/2026-11/other/2026-11-16--doc04-shadow-knowledge-retirement](archive/2026-11/other/2026-11-16--doc04-shadow-knowledge-retirement/CHANGE.md). DOC03 is Done at [archive/2026-11/other/2026-11-16--doc03-knowledgebase-truth-and-lifecycle](archive/2026-11/other/2026-11-16--doc03-knowledgebase-truth-and-lifecycle/CHANGE.md). DOC02 is Done at [archive/2026-11/other/2026-11-16--doc02-knowledge-authority-reconstruction](archive/2026-11/other/2026-11-16--doc02-knowledge-authority-reconstruction/CHANGE.md). DOC01 remains Done at [archive/2026-11/other/2026-11-16--doc01-documentation-architecture](archive/2026-11/other/2026-11-16--doc01-documentation-architecture/CHANGE.md). Terminal Change archive stays intact.

## Open packets

| Packet | State | Outcome |
| --- | --- | --- |
| [HAR03 semantic retrieval pilot](open/2026-11-17--har03-semantic-retrieval-pilot/CHANGE.md) | **Proposed (opt-in)** | Test Grepai natural-language code search and QMD Markdown search vs existing tools, no automatic install |
| [HAR05 portable ChatGPT wiki index](open/2026-11-17--har05-portable-snapshot-index/CHANGE.md) | **Verifying** | Export exact-HEAD headings, link-omission inventory and sanitized dirty paths; local repo test pending |
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
