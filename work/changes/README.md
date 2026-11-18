# Work changes | selection queue

**Selection owner** for `pnpm repo:brief`. Packets live here (`open/` + `archive/`).

Current change: none

**Current status:** [DOC05](archive/2026-11/other/2026-11-18--doc05-reconcile-time-status/CHANGE.md) through [DOC24](archive/2026-11/other/2026-11-18--doc24-lab-and-corpus-acceptance/CHANGE.md) are Done. [WIKI09](archive/2026-11/other/2026-11-18--wiki09-change-impact-contract/CHANGE.md), [WIKI10](archive/2026-11/other/2026-11-18--wiki10-contract-dependency-edges/CHANGE.md), and [WIKI11](archive/2026-11/other/2026-11-18--wiki11-impact-closure-and-proof/CHANGE.md) are Done. [HK02](archive/2026-11/other/2026-11-17--hk02-repository-doc-integrity/CHANGE.md), [HK06](archive/2026-11/other/2026-11-17--hk06-maintenance-inventory-and-lifecycle/CHANGE.md), [HK07](archive/2026-11/other/2026-11-17--hk07-dependency-aware-freshness/CHANGE.md), and [HK08](archive/2026-11/other/2026-11-17--hk08-maintenance-feedback-and-status-convergence/CHANGE.md) are Done. BOOK01 and BOOK02 stay open. Completed packets live in the [archive](archive/README.md) and the [November ledger](ledger/2026-11.md). This queue is the open list, not a second archive.

## Open packets

**New wiki explorability and missing-knowledge audit (2026-11-18, source `781c2fc`):** [Measured findings, coverage map and proposed system](../designs/open/wiki-discovery-coverage/README.md). **WIKI12–WIKI17 + DOC25–DOC41** are prepared, all **Proposed and unselected**; they supersede no completed DOC05–DOC24 packet. Prioritize WIKI12 and WIKI16 (authority-safe search and new-file/split guard), with DOC25 as an independent narrow text repair. DOC26–41 explore source-backed new guides and deliberately unratified product-domain decisions. Do not take a proposal page as authorization for a mechanic, staff grant, data retention policy or provider spend. **Current change stays `none`.**

**Documentation-impact design:** [source audit, target and validation](../designs/open/documentation-impact-system/README.md). The three-plane model is accepted for this sequence and is not product canon. [WIKI09](archive/2026-11/other/2026-11-18--wiki09-change-impact-contract/CHANGE.md), [WIKI10](archive/2026-11/other/2026-11-18--wiki10-contract-dependency-edges/CHANGE.md), and [WIKI11](archive/2026-11/other/2026-11-18--wiki11-impact-closure-and-proof/CHANGE.md) are Done. HK02, HK06, HK07, and HK08 are Done. The landed maintenance gate checks routes and freshness.

**Canonical content refoundation:** [editorial audit and waves](../designs/open/documentation-editorial-audit/README.md). **DOC05 through DOC24 are Done.** Their Code planes explicitly remain unchanged; Cursor may edit only the named canonical Markdown owners and affected links once a single packet is selected. DOC05 handles factual time status, DOC06 acceptance ambiguity, DOC07–DOC10 product foundations, DOC11–DOC16 engine/Storyteller technical contracts, DOC17–DOC18 experience/client, DOC19–DOC20 platform, DOC21–DOC23 Admin/forensics and DOC24 lab/whole-corpus acceptance. S0 does **not** decide shared-play scope. [Change standard](../../.agents/references/change-work-unit-standard.md) now recognizes documentary and executable work.

**Repository housekeeping:** [source-grounded audit](../designs/open/repository-housekeeping/AUDIT-2026-11-17.md) and [preventive maintenance design](../designs/open/repository-housekeeping/PREVENTION-SYSTEM.md). **Prevention track:** [HK02](archive/2026-11/other/2026-11-17--hk02-repository-doc-integrity/CHANGE.md), [HK06](archive/2026-11/other/2026-11-17--hk06-maintenance-inventory-and-lifecycle/CHANGE.md), [HK07](archive/2026-11/other/2026-11-17--hk07-dependency-aware-freshness/CHANGE.md), and [HK08](archive/2026-11/other/2026-11-17--hk08-maintenance-feedback-and-status-convergence/CHANGE.md) are Done. **Cleanup track:** HK01 is blocked after the 2026-11-18 recovery audit. HK05 waits for UI03. HK03 and HK04 remain conditional. No blanket deletion.

**Visual-system implementation program:** [Phase 3 execution map](../designs/open/player-experience-refoundation/phase-3/README.md). UI01 → UI02 → UI03 → UI04 → UI05 → UI06 → UI07; UI08 conditional; DIR01 after UI03, DIR02 after DIR01 audit, DIR03 blocked pending explicit quality/spend approval. **No UI or DIR packet is selected; execute one at a time only upon owner instruction.**

| Packet | State | Outcome |
| --- | --- | --- |
| [WIKI12 Section-level proposal/selected search truth](open/2026-11-18--wiki12-section-authority-provenance/CHANGE.md) | **P0 · Proposed, unselected** | Section-level proposal/selected search truth |
| [WIKI13 Real typed dependencies beyond WIKI10 pilot](open/2026-11-18--wiki13-selected-contract-neighborhoods/CHANGE.md) | **Proposed, unselected** | Real typed dependencies beyond WIKI10 pilot |
| [WIKI14 Question routers and claim-local links](open/2026-11-18--wiki14-question-routes-and-incontext-links/CHANGE.md) | **Proposed, unselected** | Question routers and claim-local links |
| [WIKI15 Actually run a provider-free semantic retrieval exam](open/2026-11-18--wiki15-heldout-knowledge-task-exam/CHANGE.md) | **After WIKI12–14 · Proposed** | Actually run a provider-free semantic retrieval exam |
| [WIKI16 Plan and validate CREATE/SPLIT/MERGE/MOVE/RETIRE](open/2026-11-18--wiki16-document-shape-lifecycle/CHANGE.md) | **P0 · Proposed, unselected** | Plan and validate CREATE/SPLIT/MERGE/MOVE/RETIRE |
| [WIKI17 Flag new source surfaces lacking a knowledge owner](open/2026-11-18--wiki17-knowledge-coverage-trigger/CHANGE.md) | **After WIKI16 · Proposed** | Flag new source surfaces lacking a knowledge owner |
| [DOC25 Remove stale DOC01/P3 headings and phantom route](open/2026-11-18--doc25-stale-doc-archeology/CHANGE.md) | **Proposed, unselected** | Remove stale DOC01/P3 headings and phantom route |
| [DOC26 Create world/rule/start package authoring guide](open/2026-11-18--doc26-content-authoring-guide/CHANGE.md) | **After WIKI16 · Proposed** | Create world/rule/start package authoring guide |
| [DOC27 Create public HTTP identity/error/receipt contract](open/2026-11-18--doc27-http-boundary-guide/CHANGE.md) | **After WIKI16 · Proposed** | Create public HTTP identity/error/receipt contract |
| [DOC28 Create safe uncertain-provider/worker recovery runbook](open/2026-11-18--doc28-uncertain-work-recovery/CHANGE.md) | **After WIKI16 · Proposed** | Create safe uncertain-provider/worker recovery runbook |
| [DOC29 Create honest backup/restore readiness runbook](open/2026-11-18--doc29-release-recovery-readiness/CHANGE.md) | **After DOC28 · Proposed** | Create honest backup/restore readiness runbook |
| [DOC30 Index selection rationale without fabricated ADRs](open/2026-11-18--doc30-decision-provenance-index/CHANGE.md) | **Proposed, unselected** | Index selection rationale without fabricated ADRs |
| [DOC31 Map product-domain gaps and deliberate non-universal rules](open/2026-11-18--doc31-gameplay-domain-coverage-map/CHANGE.md) | **After WIKI16 · Proposed** | Map product-domain gaps and deliberate non-universal rules |
| [DOC32 Unratified livelihood/economy coverage decisions](open/2026-11-18--doc32-livelihood-and-economy-scope/CHANGE.md) | **Conditional · Proposed** | Unratified livelihood/economy coverage decisions |
| [DOC33 Unratified progression/injury/death policy map](open/2026-11-18--doc33-character-lifecourse-policy/CHANGE.md) | **Conditional · Proposed** | Unratified progression/injury/death policy map |
| [DOC34 World-neutral location and movement ownership](open/2026-11-18--doc34-space-travel-and-location/CHANGE.md) | **Conditional · Proposed** | World-neutral location and movement ownership |
| [DOC35 Shared-party control and consent matrix](open/2026-11-18--doc35-shared-play-consent-matrix/CHANGE.md) | **Conditional · Proposed** | Shared-party control and consent matrix |
| [DOC36 Player privacy/export/deletion lifecycle design](open/2026-11-18--doc36-player-data-lifecycle/CHANGE.md) | **Conditional · Proposed** | Player privacy/export/deletion lifecycle design |
| [DOC37 Split product playthrough benchmarks if justified](open/2026-11-18--doc37-acceptance-benchmark-split/CHANGE.md) | **After WIKI14/16 · Proposed** | Split product playthrough benchmarks if justified |
| [DOC38 Split canon/package vs retrieval ownership if justified](open/2026-11-18--doc38-storyteller-knowledge-contract-split/CHANGE.md) | **After DOC26/WIKI16 · Proposed** | Split canon/package vs retrieval ownership if justified |
| [DOC39 Split local development from high-risk rehearsals](open/2026-11-18--doc39-runbook-retrieval-split/CHANGE.md) | **After DOC28/WIKI16 · Proposed** | Split local development from high-risk rehearsals |
| [DOC40 Proposed content rights and attribution review](open/2026-11-18--doc40-content-rights-attribution/CHANGE.md) | **Conditional · Proposed** | Proposed content rights and attribution review |
| [DOC41 App-specific trust boundary technical owner](open/2026-11-18--doc41-platform-trust-boundary-map/CHANGE.md) | **After DOC27/28 · Proposed** | App-specific trust boundary technical owner |
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
