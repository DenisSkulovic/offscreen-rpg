# Work changes | selection queue

**Selection owner** for `pnpm repo:brief`. Packets live here (`open/` + `archive/`).

Current change: none

**Current status:** [DOC05](archive/2026-11/other/2026-11-18--doc05-reconcile-time-status/CHANGE.md) through [DOC11](archive/2026-11/other/2026-11-18--doc11-engine-authority-mechanics/CHANGE.md) are Done. [WIKI09](archive/2026-11/other/2026-11-18--wiki09-change-impact-contract/CHANGE.md), [WIKI10](archive/2026-11/other/2026-11-18--wiki10-contract-dependency-edges/CHANGE.md), and [WIKI11](archive/2026-11/other/2026-11-18--wiki11-impact-closure-and-proof/CHANGE.md) are Done. [HK02](archive/2026-11/other/2026-11-17--hk02-repository-doc-integrity/CHANGE.md), [HK06](archive/2026-11/other/2026-11-17--hk06-maintenance-inventory-and-lifecycle/CHANGE.md), [HK07](archive/2026-11/other/2026-11-17--hk07-dependency-aware-freshness/CHANGE.md), and [HK08](archive/2026-11/other/2026-11-17--hk08-maintenance-feedback-and-status-convergence/CHANGE.md) are Done. BOOK01 and BOOK02 stay open. Completed packets live in the [archive](archive/README.md) and the [November ledger](ledger/2026-11.md). This queue is the open list, not a second archive.

## Open packets

**Documentation-impact design:** [source audit, target and validation](../designs/open/documentation-impact-system/README.md). The three-plane model is accepted for this sequence and is not product canon. [WIKI09](archive/2026-11/other/2026-11-18--wiki09-change-impact-contract/CHANGE.md), [WIKI10](archive/2026-11/other/2026-11-18--wiki10-contract-dependency-edges/CHANGE.md), and [WIKI11](archive/2026-11/other/2026-11-18--wiki11-impact-closure-and-proof/CHANGE.md) are Done. HK02, HK06, HK07, and HK08 are Done. The landed maintenance gate checks routes and freshness.

**Canonical content refoundation:** [editorial audit and waves](../designs/open/documentation-editorial-audit/README.md). **DOC05 through DOC11 are Done. DOC12–DOC24 remain Proposed until selected.** Their Code planes explicitly remain unchanged; Cursor may edit only the named canonical Markdown owners and affected links once a single packet is selected. DOC05 handles factual time status, DOC06 acceptance ambiguity, DOC07–DOC10 product foundations, DOC11–DOC16 engine/Storyteller technical contracts, DOC17–DOC18 experience/client, DOC19–DOC20 platform, DOC21–DOC23 Admin/forensics and DOC24 lab/whole-corpus acceptance. S0 does **not** decide shared-play scope. [Change standard](../../.agents/references/change-work-unit-standard.md) now recognizes documentary and executable work.

**Repository housekeeping:** [source-grounded audit](../designs/open/repository-housekeeping/AUDIT-2026-11-17.md) and [preventive maintenance design](../designs/open/repository-housekeeping/PREVENTION-SYSTEM.md). **Prevention track:** [HK02](archive/2026-11/other/2026-11-17--hk02-repository-doc-integrity/CHANGE.md), [HK06](archive/2026-11/other/2026-11-17--hk06-maintenance-inventory-and-lifecycle/CHANGE.md), [HK07](archive/2026-11/other/2026-11-17--hk07-dependency-aware-freshness/CHANGE.md), and [HK08](archive/2026-11/other/2026-11-17--hk08-maintenance-feedback-and-status-convergence/CHANGE.md) are Done. **Cleanup track:** HK01 is blocked after the 2026-11-18 recovery audit. HK05 waits for UI03. HK03 and HK04 remain conditional. No blanket deletion.

**Visual-system implementation program:** [Phase 3 execution map](../designs/open/player-experience-refoundation/phase-3/README.md). UI01 → UI02 → UI03 → UI04 → UI05 → UI06 → UI07; UI08 conditional; DIR01 after UI03, DIR02 after DIR01 audit, DIR03 blocked pending explicit quality/spend approval. **No UI or DIR packet is selected; execute one at a time only upon owner instruction.**

| Packet | State | Outcome |
| --- | --- | --- |
| [DOC12 Chronology, calendar and tick precision](open/2026-11-18--doc12-engine-chronology-calendars/CHANGE.md) | **Proposed (unselected)** | Documentation-only; chronology, calendar and tick precision |
| [DOC13 Lifecycle, recovery and source ownership](open/2026-11-18--doc13-engine-lifecycle-recovery/CHANGE.md) | **Proposed (unselected)** | Documentation-only; lifecycle, recovery and source ownership |
| [DOC14 Actual vs selected controller, prompts and publication](open/2026-11-18--doc14-storyteller-controller-prompts/CHANGE.md) | **Proposed (unselected)** | Documentation-only; actual vs selected controller, prompts and publication |
| [DOC15 Canon and retrieval vs model request context](open/2026-11-18--doc15-storyteller-memory-context/CHANGE.md) | **Proposed (unselected)** | Documentation-only; canon and retrieval vs model request context |
| [DOC16 Captured settings and paid provider custody](open/2026-11-18--doc16-storyteller-settings-provider/CHANGE.md) | **Proposed (unselected)** | Documentation-only; captured settings and paid provider custody |
| [DOC17 Player experience and living Book product contract](open/2026-11-18--doc17-product-experience/CHANGE.md) | **Proposed (unselected)** | Documentation-only; player experience and living book product contract |
| [DOC18 Client rendering, state and accessibility contracts](open/2026-11-18--doc18-client-tech-contracts/CHANGE.md) | **Proposed (unselected)** | Documentation-only; client rendering, state and accessibility contracts |
| [DOC19 Data/persistence, caching and delivery truth](open/2026-11-18--doc19-platform-persistence-delivery/CHANGE.md) | **Proposed (unselected)** | Documentation-only; data/persistence, caching and delivery truth |
| [DOC20 Platform identity, spend, notifications, deployment](open/2026-11-18--doc20-platform-governance-operations/CHANGE.md) | **Proposed (unselected)** | Documentation-only; platform identity, spend, notifications, deployment |
| [DOC21 Admin product charter and proposed permission boundary](open/2026-11-18--doc21-admin-product-charter/CHANGE.md) | **Proposed (unselected)** | Documentation-only; admin product charter and proposed permission boundary |
| [DOC22 Staff authorization, console reads and audit](open/2026-11-18--doc22-admin-technical-authorization/CHANGE.md) | **Proposed (unselected)** | Documentation-only; staff authorization, console reads and audit |
| [DOC23 Evidence, forensics, telemetry and retention status](open/2026-11-18--doc23-observability-evidence-retention/CHANGE.md) | **Proposed (unselected)** | Documentation-only; evidence, forensics, telemetry and retention status |
| [DOC24 Lab proof taxonomy and editorial comprehension evaluation](open/2026-11-18--doc24-lab-and-corpus-acceptance/CHANGE.md) | **Proposed (unselected)** | Documentation-only; lab proof taxonomy and editorial comprehension evaluation |
| [UI01 Design system](open/2026-11-17--ui01-semantic-tokens/CHANGE.md) | **Ready (unselected)** | Platform/Book/scene semantic token foundation; conservative existing appearance |
| [UI02 Design system](open/2026-11-17--ui02-accessible-primitives/CHANGE.md) | **Ready after UI01** | Shared Action + SystemNotice without changing action ownership |
| [UI03 Design system](open/2026-11-17--ui03-book-composition/CHANGE.md) | **Ready after UI02** | BookSurface/NarrativeFlow/DecisionGroup composition |
| [UI04 Design system](open/2026-11-17--ui04-book-contents-navigation/CHANGE.md) | **Ready after UI03** | Low-chrome accessible Now/Journal/Stories contents |
| [UI05 Design system](open/2026-11-17--ui05-stories-library-unification/CHANGE.md) | **Ready after UI02** | Reuse platform roles in Stories library |
| [UI06 Design system](open/2026-11-17--ui06-entry-create-unification/CHANGE.md) | **Ready after UI05** | Reusable visual foundation in Welcome/Create |
| [UI07 Design system](open/2026-11-17--ui07-design-system-evidence/CHANGE.md) | **Ready after UI03/05/06** | Curated Storybook, a11y and viewport proof |
| [UI08 Design system](open/2026-11-17--ui08-motion-language/CHANGE.md) | **Conditional (after UI07 review)** | Meaningful accessible motion; no dependency by default |
| [DIR01 Storyteller direction](open/2026-11-17--dir01-appearance-roundtrip-proof/CHANGE.md) | **Ready after UI03** | Provider-free public appearance saved-read-to-Book proof |
| [DIR02 Storyteller direction](open/2026-11-17--dir02-validated-publication-attachment/CHANGE.md) | **Conditional (after DIR01)** | Exact-source validated deterministic publication attachment |
| [DIR03 Storyteller direction](open/2026-11-17--dir03-storyteller-art-direction-author/CHANGE.md) | **Blocked: spend/quality acceptance** | Optional model-authored V1 scene direction only after proven writer |
| [BOOK01 Living Book reader shell POC](open/2026-11-17--book01-reader-shell-poc/CHANGE.md) | **Ready (open, not current)** | First V1-compatible book-like Play shell; no page-curl, final styling or new engine/API |
| [BOOK02 original Journal reader](open/2026-11-17--book02-original-journal-reader/CHANGE.md) | **Ready (open, not current)** | Compact saved-passages overview and exact original passage reader on existing history cursor |
| [HAR05 portable ChatGPT wiki index](open/2026-11-17--har05-portable-snapshot-index/CHANGE.md) | **Verifying** | Export exact-HEAD headings, link-omission inventory and sanitized dirty paths; local repo test pending |
| [QA-SF01 storyteller fixtures](open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md) | **Blocked** | Restore honest focused Storyteller/story-resolution suites |
| [OBS00 live provider custody](open/2026-11-15--obs00-live-provider-custody/CHANGE.md) | **Blocked** (OBS00-B) | Production/default-worker current entitlement |
| [OBS04 finite-action E0](open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) | Proposed | First E0 game transition witness |
| [ENG03 short-lock context](open/2026-11-13--eng-short-lock-context/CHANGE.md) | Proposed | Full short-lock capture |
| [GM03 standing life](open/2026-11-13--gm-standing-life/CHANGE.md) | Proposed | Bounded standing routine |
| [GM07 delegated decision](open/2026-11-13--gm-delegated-decision/CHANGE.md) | Proposed | Consented fallback after deadline |
| [SA07 evidence tools](open/2026-11-14--sa07-evidence-tools/CHANGE.md) | Proposed (conditional) | Typed read operations for missing evidence |
| [HK01 retire unsupported local repair CLI](open/2026-11-17--hk01-retire-local-repair-helper/CHANGE.md) | **Blocked (evidence gate, 2026-11-18)** | The CLI is the only saved-evidence settlement for an already-uncertain local attempt. It stays until a supported replacement exists |
| [HK03 Storyteller integration test boundaries](open/2026-11-17--hk03-storyteller-test-boundaries/CHANGE.md) | **Proposed / QA-SF01 baseline gate** | Characterize then split 5,232-line nested integration suite without losing tests |
| [HK05 Play import compatibility shims](open/2026-11-17--hk05-play-compatibility-shims/CHANGE.md) | **Ready after UI03 (unselected)** | Delete two redundant Play reexports after canonical import/mocks move |
| [HK04 Chamber launcher seams](open/2026-11-17--hk04-chamber-launcher-seams/CHANGE.md) | **Proposed / safety gate** | Separate mode planning from privileged boot and preserve all provider/DB denials |
| [S3a continuity report](open/2026-11-11--s3a-continuity-report/CHANGE.md) | Parked | Continuity evidence in local Story report |

## Layout

| Path | Role |
| --- | --- |
| [open/](open/) | Non-terminal packets |
| [archive/](archive/README.md) | Done / Cancelled by month + program |
| [ledger/](ledger/) | Compact closed-work index |

**Standard:** [change work-unit](../../.agents/references/change-work-unit-standard.md). **Tooling:** `node scripts/repo-tools/archive-changes.mjs --dry-run|--apply`.
