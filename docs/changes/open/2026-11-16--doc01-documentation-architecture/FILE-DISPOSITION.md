# DOC01 | Exhaustive baseline file-disposition register

**Every file is listed, but dispositions are provisional until its content is inspected.** Git tree snapshot `8cec56e1262e5493020d9da2ba163264398ad667` (2026-11-16); 483 files, 6510447 bytes. This is a **complete path/size census**, NOT a claim that 483 document bodies have received a full semantic comparison. It prevents files from silently disappearing during Cursor's subsequent atom-by-atom rewrite.

A route is an intended **knowledge bucket**, not a one-file-to-one-file move. A source can split into product, technical, ADR and evidence atoms. File deletion requires the source section ledger, known consumer references, content-equivalence/convergence checks, and explicit disposition. No auto-pruning based on identical titles or a high similarity score.

### Provisional operation distribution

| Operation | Files | Git bytes |
| --- | ---: | ---: |
| ADR/CURATE | 1 | 6922 |
| ASSET REVIEW | 3 | 1813698 |
| CURATE | 4 | 93278 |
| EXTRACT | 100 | 727787 |
| EXTRACT/EXPIRE | 6 | 122835 |
| EXTRACT/RETIRE | 25 | 260520 |
| HISTORICIZE | 4 | 28910 |
| MERGE | 2 | 15498 |
| MOVE | 9 | 47149 |
| PRESERVE/DRAFT | 2 | 13053 |
| PROMOTE | 113 | 1399382 |
| PROMOTE/SPLIT | 5 | 76040 |
| RECONCILE | 33 | 624144 |
| RECONCILE/ADR | 21 | 244096 |
| RETIRE | 1 | 703 |
| REVIEW | 2 | 24032 |
| REWRITE | 6 | 75615 |
| REWRITE/RETIRE | 6 | 49272 |
| SPLIT | 10 | 151386 |
| SUMMARIZE | 1 | 10818 |
| SUMMARIZE/RETIRE | 111 | 531863 |
| TRIAGE | 18 | 193446 |

### Baseline path manifest

| Source | Git bytes | Provisional action | Target bucket |
| --- | ---: | --- | --- |
| `docs/changes/archive/2026-11/admin/2026-11-14--admin-game-ai-diagnostics/CHANGE.md` | 3769 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/admin/2026-11-14--admin-grant-policy/CHANGE.md` | 2550 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/admin/2026-11-14--admin-operator-shell/CHANGE.md` | 2473 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/admin/2026-11-14--admin-player-safe-reads/CHANGE.md` | 2363 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/admin/2026-11-14--admin-staff-access-review/CHANGE.md` | 3446 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/admin/2026-11-14--admin-staff-session/CHANGE.md` | 2877 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/admin/2026-11-14--admin-support-case-anchors/CHANGE.md` | 4086 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/admin/2026-11-14--admin-usage-exposure/CHANGE.md` | 3619 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-bench-execution/CHANGE.md` | 2841 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-clock-entropy/CHANGE.md` | 2851 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-connected-rig/CHANGE.md` | 3280 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-controlled-faults/CHANGE.md` | 3268 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-inspection-deltas/CHANGE.md` | 3322 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-launcher-modes/CHANGE.md` | 3270 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-mechanics-coverage/CHANGE.md` | 4219 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-packet-lab-integration/CHANGE.md` | 3287 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-qa-bridge/CHANGE.md` | 3301 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-replay-comparison/CHANGE.md` | 3365 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-run-evidence/CHANGE.md` | 3303 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-run-orchestrator/CHANGE.md` | 3069 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-sandbox-materializer/CHANGE.md` | 3325 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-scenario-catalogue/CHANGE.md` | 3242 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-state-specimens/CHANGE.md` | 2830 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/chamber/2026-11-12--chamber-workbench/CHANGE.md` | 3484 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng-authoritative-item-transfer/CHANGE.md` | 10899 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng-bounded-current-reads/CHANGE.md` | 4212 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng-item-interruption-reentry/CHANGE.md` | 6331 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng-memory-final-request/CHANGE.md` | 2223 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng-optional-actor-capabilities/CHANGE.md` | 2246 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng-provider-world-effect-gate/CHANGE.md` | 5123 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng-shared-cas-store/CHANGE.md` | 4735 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng-workflow-versioning/CHANGE.md` | 3922 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-13--eng03-lock-measurement/CHANGE.md` | 5320 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-14--eng03-committed-action-capture/CHANGE.md` | 2561 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-14--eng03-narrow-pending-capture/CHANGE.md` | 9541 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-15--eng03-c1-provisional-recovery/CHANGE.md` | 3899 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/eng/2026-11-15--eng03-c2-interrupted-action-capture/CHANGE.md` | 4300 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--gm-custom-intent-admission/CHANGE.md` | 5248 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--gm-custom-intent-proposal/CHANGE.md` | 5352 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--gm-offer-distinctness/CHANGE.md` | 5276 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--gm-return-event-projection/CHANGE.md` | 5413 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--gm-viewer-read-position/CHANGE.md` | 6156 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--pf-entry-continuity/CHANGE.md` | 5335 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--pf-journey-proof/CHANGE.md` | 2631 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--pf-player-home/CHANGE.md` | 5760 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--pf-public-portal/CHANGE.md` | 4758 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--pf-scripted-preview/CHANGE.md` | 5696 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--px-atmospheric-media/CHANGE.md` | 6527 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--px-expressive-choices/CHANGE.md` | 6950 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--px-media-composition-and-capabilities/CHANGE.md` | 8575 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--px-presentation-core/CHANGE.md` | 6423 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--px-presentation-lab/CHANGE.md` | 6597 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--px-surface-contrast-and-viewport/CHANGE.md` | 5751 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--px-workbench-fidelity/CHANGE.md` | 6437 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-adaptive-context/CHANGE.md` | 5181 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-commitment-truth/CHANGE.md` | 6073 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-guided-creation/CHANGE.md` | 4966 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-intention-actions/CHANGE.md` | 5737 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-motion-feedback/CHANGE.md` | 5159 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-narrative-stage/CHANGE.md` | 7201 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-offscreen-planner/CHANGE.md` | 10030 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-public-demo/CHANGE.md` | 5394 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-return-journal/CHANGE.md` | 4979 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-story-library/CHANGE.md` | 4447 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-story-shell/CHANGE.md` | 7143 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/experience/2026-11-13--ux-visual-evidence/CHANGE.md` | 3105 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md` | 9684 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md` | 8908 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs01-operation-coverage/CHANGE.md` | 8770 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs02-h-stage-integrity/CHANGE.md` | 2763 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs02-runtime-storyteller-evidence/CHANGE.md` | 4018 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs03-prompt-provenance/CHANGE.md` | 2747 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs05-evidence-claim-truth/CHANGE.md` | 1984 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md` | 11386 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/observability/2026-11-15--obs07-support-situation-ui/CHANGE.md` | 9537 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/other/2026-11-13--live-scene-presentation-wire/CHANGE.md` | 6071 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/README.md` | 10826 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa01-operation-trace/CHANGE.md` | 3986 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa02-prompt-constitution/CHANGE.md` | 3893 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa03-context-efficiency/CHANGE.md` | 3793 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa04-root-index-reuse/CHANGE.md` | 3475 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa05-evidence-lineage/CHANGE.md` | 3706 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa06-adaptive-recipe/CHANGE.md` | 4417 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa08-model-route-capabilities/CHANGE.md` | 4308 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa09-continuity-materialization/CHANGE.md` | 3983 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa10-loop-failure-lifecycle/CHANGE.md` | 3539 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa11-playability-harness/CHANGE.md` | 3868 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/storyteller/2026-11-14--sa12-controlled-live-evaluation/CHANGE.md` | 4702 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-11--web-campaign-composition/CHANGE.md` | 4356 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-11--web-play-command-lifecycle/CHANGE.md` | 4585 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-11--web-play-refresh-lifecycle/CHANGE.md` | 4058 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-11--web-play-route-recovery/CHANGE.md` | 4142 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-11--web-server-read-boundary/CHANGE.md` | 4515 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-11--web-snapshot-identity/CHANGE.md` | 4339 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-11--web-test-foundation/CHANGE.md` | 4532 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-chamber-qa-isolation/CHANGE.md` | 5471 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-ci-budget/CHANGE.md` | 4777 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-context-navigation-check/CHANGE.md` | 5416 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-draft-editor-lifecycle/CHANGE.md` | 4250 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-fast-feedback-toolchain/CHANGE.md` | 4149 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-import-type-guardrails/CHANGE.md` | 4185 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-opening-start-recovery/CHANGE.md` | 4485 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-pagination-navigation/CHANGE.md` | 4141 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-private-route-evidence/CHANGE.md` | 4897 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-resolution-operation-receipts/CHANGE.md` | 4968 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-settings-presets-lifecycle/CHANGE.md` | 4211 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-sse-backend-invalidation/CHANGE.md` | 4508 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-sse-query-client/CHANGE.md` | 4303 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-storybook-state-workbench/CHANGE.md` | 4328 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/2026-11/web/2026-11-12--web-tanstack-query-hydration/CHANGE.md` | 5200 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/archive/README.md` | 631 | SUMMARIZE/RETIRE | work/changes/ledger/YYYY-MM.md + Git history |
| `docs/changes/open/2026-11-11--s3a-continuity-report/CHANGE.md` | 4103 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/open/2026-11-11--s3a-continuity-report/PLAN.md` | 2411 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/open/2026-11-13--eng-short-lock-context/CHANGE.md` | 5313 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/open/2026-11-13--gm-delegated-decision/CHANGE.md` | 6701 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/open/2026-11-13--gm-standing-life/CHANGE.md` | 6376 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/open/2026-11-14--sa07-evidence-tools/CHANGE.md` | 3607 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md` | 6884 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md` | 7165 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/open/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md` | 4589 | MOVE | work/changes/open/<same-id>/ |
| `docs/changes/README.md` | 3390 | REWRITE | work/changes/README.md |
| `docs/engineering/agentic-systems-field-manual.md` | 40759 | CURATE | research/storyteller/ |
| `docs/engineering/ai-development-system.md` | 13665 | PROMOTE |  .agents/{rules,skills,references}/ |
| `docs/engineering/audits/chamber-gap-2026-11-12.md` | 21079 | EXTRACT | evidence/inspections/ |
| `docs/engineering/audits/react-next-gap-2026-11-11.md` | 18696 | EXTRACT | evidence/inspections/ |
| `docs/engineering/audits/react-next-gap-2026-11-12.md` | 32234 | EXTRACT | evidence/inspections/ |
| `docs/engineering/audits/README.md` | 1445 | EXTRACT | evidence/inspections/ |
| `docs/engineering/chamber-program.md` | 10818 | SUMMARIZE | work/changes/ledger + docs/technical/lab/ |
| `docs/engineering/code-navigation.md` | 8921 | REWRITE | package source-adjacent README or evidence/inspections/ |
| `docs/engineering/code-quality.md` | 17987 | REVIEW | docs/runbooks/ or .agents/ or research/ |
| `docs/engineering/coding-agent-evaluation.md` | 16092 | PROMOTE |  .agents/{rules,skills,references}/ |
| `docs/engineering/coding-agent-knowledge.md` | 8140 | PROMOTE |  .agents/{rules,skills,references}/ |
| `docs/engineering/coding-agent-target-standard.md` | 9772 | PROMOTE |  .agents/{rules,skills,references}/ |
| `docs/engineering/connected-poc-proof.md` | 32534 | SPLIT | evidence/runs/ + docs/product/gameplay/acceptance-scenarios.md + docs/runbooks/ |
| `docs/engineering/engine-model.md` | 16168 | REWRITE | package source-adjacent README or evidence/inspections/ |
| `docs/engineering/evidence/documentation-convergence-2026-11-15.md` | 5700 | EXTRACT | evidence/inspections/ |
| `docs/engineering/evidence/documentation-convergence-chatgpt-handoff-2026-11-15.md` | 1662 | EXTRACT | evidence/inspections/ |
| `docs/engineering/frontend-execution-playbook.md` | 23707 | PROMOTE |  .agents/{rules,skills,references}/ |
| `docs/engineering/long-story-memory-and-retrieval.md` | 31102 | CURATE | research/storyteller/ |
| `docs/engineering/offline-poc-acceptance.md` | 11209 | SPLIT | evidence/runs/ + docs/product/gameplay/acceptance-scenarios.md + docs/runbooks/ |
| `docs/engineering/qa-journeys.md` | 34429 | SPLIT | evidence/runs/ + docs/product/gameplay/acceptance-scenarios.md + docs/runbooks/ |
| `docs/engineering/README.md` | 6045 | REVIEW | docs/runbooks/ or .agents/ or research/ |
| `docs/engineering/storyteller-tuning.md` | 11313 | CURATE | research/storyteller/ |
| `docs/engineering/targets/chamber-laboratory.md` | 23791 | PROMOTE | docs/technical/{client,lab,engine}/ |
| `docs/engineering/targets/react-next.md` | 35112 | PROMOTE | docs/technical/{client,lab,engine}/ |
| `docs/engineering/targets/README.md` | 2116 | PROMOTE | docs/technical/{client,lab,engine}/ |
| `docs/history/initiatives/2026-09-24--01-30--canon-invention-policy/FEATURE.md` | 6742 | PRESERVE/DRAFT | work/designs/open/canon-invention-policy + product/gameplay |
| `docs/history/initiatives/2026-09-24--01-30--canon-invention-policy/PLAN.md` | 6311 | PRESERVE/DRAFT | work/designs/open/canon-invention-policy + product/gameplay |
| `docs/history/initiatives/AUDIT-2026-11-11.md` | 11505 | HISTORICIZE | work/changes/ledger + Git history |
| `docs/history/initiatives/PARKED-2026-11-15.md` | 7922 | HISTORICIZE | work/changes/ledger + Git history |
| `docs/history/initiatives/README.md` | 2100 | HISTORICIZE | work/changes/ledger + Git history |
| `docs/history/initiatives/RETIRED-2026-11-11.md` | 7383 | HISTORICIZE | work/changes/ledger + Git history |
| `docs/history/legal/rules-attribution.md` | 665 | PROMOTE | NOTICE.md |
| `docs/history/minutes/2026-11-11.md` | 26215 | EXTRACT/EXPIRE | work/sessions + docs/decisions + docs/product or technical |
| `docs/history/minutes/2026-11-12.md` | 71042 | EXTRACT/EXPIRE | work/sessions + docs/decisions + docs/product or technical |
| `docs/history/minutes/2026-11-13.md` | 6614 | EXTRACT/EXPIRE | work/sessions + docs/decisions + docs/product or technical |
| `docs/history/minutes/2026-11-14.md` | 11707 | EXTRACT/EXPIRE | work/sessions + docs/decisions + docs/product or technical |
| `docs/history/minutes/2026-11-15.md` | 4087 | EXTRACT/EXPIRE | work/sessions + docs/decisions + docs/product or technical |
| `docs/history/minutes/README.md` | 3170 | EXTRACT/EXPIRE | work/sessions + docs/decisions + docs/product or technical |
| `docs/history/README.md` | 703 | RETIRE | none; update docs/README.md |
| `docs/operations/development.md` | 39709 | REWRITE | docs/runbooks/ |
| `docs/operations/README.md` | 182 | REWRITE | docs/runbooks/ |
| `docs/product/foundations/concepts.md` | 10686 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/foundations/game-rules.md` | 13344 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/foundations/gameplay.md` | 12607 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/foundations/vision.md` | 14584 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/journeys/player-experience.md` | 10567 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/journeys/playthroughs.md` | 19066 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/journeys/story-creation.md` | 11653 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/journeys/time-and-autonomy.md` | 19841 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/README.md` | 1884 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/storytelling/continuity-and-consequences.md` | 16030 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/storytelling/storyteller-settings.md` | 12565 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/product/storytelling/storytelling.md` | 16872 | RECONCILE | docs/product/{foundations,gameplay,experience,storyteller}/ |
| `docs/programs/admin/access-and-governance-product.md` | 15282 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/ai-engineering-operations-product.md` | 13907 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/authority-and-delegation.md` | 10685 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/authority-operating-policy.md` | 15166 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/command-center-product.md` | 11967 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/commercial-operations-product.md` | 15481 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/cross-workspace-product-review.md` | 10655 | EXTRACT | docs/decisions/ + work/designs/ + evidence/inspections/ |
| `docs/programs/admin/decisions-and-readiness.md` | 22895 | EXTRACT | docs/decisions/ + work/designs/ + evidence/inspections/ |
| `docs/programs/admin/domain-capabilities.md` | 12715 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/evidence/ad01-staff-session-2026-11-14.md` | 1428 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/admin/evidence/ad02-grant-policy-2026-11-14.md` | 1133 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/admin/evidence/ad03-player-safe-reads-2026-11-14.md` | 945 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/admin/evidence/ad04-operator-shell-2026-11-14.md` | 1941 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/admin/evidence/ad05-game-ai-diagnostics-2026-11-14.md` | 1500 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/admin/evidence/ad06-usage-exposure-2026-11-14.md` | 1219 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/admin/evidence/ad07-staff-access-audit-2026-11-14.md` | 1266 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/admin/evidence/ad08-support-case-anchors-2026-11-14.md` | 1034 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/admin/gameplay-worlds-product.md` | 14897 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/growth-and-insights-product.md` | 13682 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/handoff/cursor-first-wave.md` | 3737 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/admin/implementation-program.md` | 6697 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/admin/live-operations-product.md` | 15115 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/operations-and-workflows.md` | 11628 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/operator-journeys-and-interaction-contracts.md` | 11193 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/personas-and-workspaces.md` | 8762 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/player-360-and-entities.md` | 10477 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/player-360-service-blueprint.md` | 14607 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/product-acceptance-and-scope.md` | 9204 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/product-adversarial-review.md` | 14981 | EXTRACT | docs/decisions/ + work/designs/ + evidence/inspections/ |
| `docs/programs/admin/product-charter.md` | 7810 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/product-policy-decision-brief.md` | 10118 | EXTRACT | docs/decisions/ + work/designs/ + evidence/inspections/ |
| `docs/programs/admin/README.md` | 8880 | REWRITE/RETIRE | docs/product or technical topic routers |
| `docs/programs/admin/support-and-customer-success-product.md` | 15506 | PROMOTE | docs/product/admin/ |
| `docs/programs/admin/technical/action-approval-and-audit.md` | 10386 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/architecture-decisions.md` | 7870 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/architecture-review-2026-11-14.md` | 4915 | EXTRACT | evidence/inspections/ |
| `docs/programs/admin/technical/control-plane-boundaries.md` | 10782 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/core-v1-contracts.md` | 10610 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/first-wave-design-decisions.md` | 8665 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/frontend-and-operator-experience.md` | 9818 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/operations-economics-and-releases.md` | 10820 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/read-models-and-privacy.md` | 11565 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/README.md` | 5055 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/security-and-verification.md` | 10176 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/technical/source-baseline-2026-11-14.md` | 10751 | EXTRACT | evidence/inspections/ |
| `docs/programs/admin/technical/staff-identity-and-policy.md` | 11422 | PROMOTE | docs/technical/admin/ |
| `docs/programs/admin/trust-and-privacy-product.md` | 15298 | PROMOTE | docs/product/admin/ |
| `docs/programs/engine/architecture-program.md` | 16719 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/engine/decisions/actor-identity-and-ownership.md` | 4556 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/canon-compatibility-and-migration.md` | 6637 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/context-capture-and-locks.md` | 8909 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng03-capture-migration-sequence.md` | 8577 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng03-committed-action-capture-v1.md` | 36894 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng03-instrument-before-refactor.md` | 5985 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng03-interrupted-action-capture-v1.md` | 13900 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng03-measurement-and-capture-contract.md` | 7221 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng03-narrow-capture-v1.md` | 33057 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng03-provisional-recovery-v1.md` | 10596 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng05-shared-cas-contract.md` | 8948 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng06-temporal-compatibility-policy.md` | 6057 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/eng09-interrupted-action-consequence.md` | 12387 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/first-gameplay-slice.md` | 7089 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/prediction-dependency-fences.md` | 8626 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/decisions/world-capability-kernel.md` | 9541 | RECONCILE/ADR | docs/technical/engine/ + docs/decisions/ |
| `docs/programs/engine/domain-authority.md` | 10647 | PROMOTE | docs/technical/engine/ |
| `docs/programs/engine/evidence/causal-transition-review.md` | 11607 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/eng03-c1-committed-capture-2026-11-14.md` | 2080 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/eng03-c1r-provisional-recovery-2026-11-15.md` | 1655 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/eng03-c2-interrupted-capture-2026-11-15.md` | 2565 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/eng03-lock-measurement-2026-11-14.md` | 1890 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/eng03-narrow-capture-2026-11-14.md` | 2217 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/eng09-interruption-playability-probe-2026-11-13.md` | 2135 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/final-readiness-review.md` | 7858 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/independent-challenge.md` | 11230 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/postwave-implementation-review.md` | 13667 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/read-growth-and-availability.md` | 11564 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/source-audit.md` | 17796 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evidence/verification-strategy.md` | 11755 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/engine/evolution-and-release.md` | 13084 | PROMOTE | docs/technical/engine/ |
| `docs/programs/engine/handoff/decision-queue-2026-11-13.md` | 5335 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/engine/handoff/first-engine-wave.md` | 9097 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/engine/handoff/pipeline-design-2026-11-15.md` | 8752 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/engine/handoff/postwave-cursor-handoff.md` | 7384 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/engine/implementation-program.md` | 11283 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/engine/module-boundaries.md` | 10865 | PROMOTE | docs/technical/engine/ |
| `docs/programs/engine/product-derived-requirements.md` | 11291 | MERGE | docs/product/gameplay/ + docs/technical/engine/ |
| `docs/programs/engine/README.md` | 8380 | REWRITE/RETIRE | docs/product or technical topic routers |
| `docs/programs/engine/scale-and-load.md` | 12806 | PROMOTE | docs/technical/engine/ |
| `docs/programs/engine/storyteller-and-memory.md` | 14681 | PROMOTE | docs/technical/engine/ |
| `docs/programs/engine/target-engine.md` | 11549 | PROMOTE | docs/technical/engine/ |
| `docs/programs/engine/time-and-execution.md` | 10110 | PROMOTE | docs/technical/engine/ |
| `docs/programs/engine/world-and-rules.md` | 9344 | PROMOTE | docs/technical/engine/ |
| `docs/programs/experience/decisions/gm01-custom-intent-policy-v1.md` | 13742 | RECONCILE/ADR | docs/product/{experience,gameplay}/ + docs/technical/engine/ + docs/decisions/ |
| `docs/programs/experience/decisions/gm03-bounded-routine-v1.md` | 9665 | RETAIN PROPOSAL | work/designs/open/ + docs/product/gameplay/ (only approved aspects) |
| `docs/programs/experience/decisions/gm04-failed-approach-v1.md` | 7255 | RECONCILE/ADR | docs/product/experience/ + docs/technical/engine/ + docs/decisions/ |
| `docs/programs/experience/decisions/gm06-viewer-open-baseline-v1.md` | 13646 | RECONCILE/ADR | docs/product/experience/ + docs/technical/client/ + docs/decisions/ |
| `docs/programs/experience/decisions/gm07-consented-default-v1.md` | 10808 | RETAIN PROPOSAL | work/designs/open/ + docs/product/gameplay/ (only approved aspects) |
| `docs/programs/experience/evidence/chamber-ux-validation-bridge.md` | 10490 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/comparative-game-research.md` | 11716 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/current-ui-source-audit.md` | 11034 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/design-readiness-review.md` | 9920 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/gm01-custom-intent-2026-11-15.md` | 1476 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/gm02-custom-intent-admit-2026-11-15.md` | 1082 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/gm04-failed-approach-2026-11-15.md` | 791 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/gm06-visit-checkpoint-2026-11-15.md` | 1067 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/human-ux-study-protocol.md` | 11492 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/independent-challenge.md` | 6755 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/platform-entry-journey-proof-2026-11-13.md` | 1485 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/presentation-post-px-review-2026-11-13.md` | 14159 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/public-projection-capability-map.md` | 12780 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/reference-review.md` | 7647 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/renders/ux01-story-frame-1440.png` | 107187 | ASSET REVIEW | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/renders/ux01-story-frame-375.png` | 119677 | ASSET REVIEW | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/ux11-visual-evidence-2026-11-13.md` | 1622 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/evidence/validation-plan.md` | 6838 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/experience/flows/creation-and-first-run.md` | 8193 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/key-journeys.md` | 5150 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/notifications-and-reentry.md` | 7591 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/offscreen-handoff.md` | 9692 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/portfolio-first-contact.md` | 9800 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/preview-to-play.md` | 12545 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/return-and-memory.md` | 6661 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/settings-and-controls.md` | 4650 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/shared-story-collaboration.md` | 8852 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/flows/ten-hour-journey.md` | 8860 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/foundations/composition-experiments.md` | 12053 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/foundations/design-decisions.md` | 9144 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/foundations/experience-thesis.md` | 8213 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/foundations/living-world-contract.md` | 9566 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/foundations/mechanics-reassessment.md` | 9361 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/foundations/storyteller-experience-quality.md` | 9911 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/foundations/temporal-philosophy.md` | 10437 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/foundations/vision-reconciliation.md` | 9183 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/handoff/first-cursor-wave.md` | 10437 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/experience/implementation-program.md` | 13503 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/experience/mechanics-evolution-program.md` | 9268 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/experience/patterns/autonomy-and-absence.md` | 6689 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/patterns/choice-surface-decision-rules.md` | 10968 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/patterns/committed-event-feed.md` | 9398 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/patterns/decision-delegation.md` | 10297 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/patterns/free-intent-future.md` | 6545 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/patterns/interaction-grammar.md` | 9454 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/patterns/narrative-presentation.md` | 9159 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/patterns/state-and-attention.md` | 11790 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/patterns/time-and-truth.md` | 9778 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/platform-ecosystem.md` | 23738 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/platform-entry-implementation-program.md` | 11006 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/experience/platform-journeys-and-states.md` | 18938 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/presentation-calibration-program.md` | 10735 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/experience/presentation-implementation-program.md` | 11685 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/experience/prototypes/harbor-gold-session.md` | 11846 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/programs/experience/prototypes/public-demo-script.md` | 11290 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/programs/experience/prototypes/world-shape-tests.md` | 9897 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/programs/experience/README.md` | 8516 | REWRITE/RETIRE | docs/product or technical topic routers |
| `docs/programs/experience/spaces/information-architecture.md` | 8110 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/spaces/journal-world-you.md` | 5906 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/spaces/living-stage-blueprint.md` | 18266 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/spaces/meaningful-life-activities.md` | 9159 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/spaces/now.md` | 12934 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/spaces/player-home-blueprint.md` | 15256 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/spaces/public-portal-blueprint.md` | 14019 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/spaces/stories-library.md` | 4025 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/system/accessibility-and-voice.md` | 6229 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/system/component-strategy.md` | 7836 | SPLIT | docs/product/experience/ + docs/technical/client/ |
| `docs/programs/experience/system/interaction-copy.md` | 10365 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/system/live-presentation-projection.md` | 8174 | SPLIT | docs/product/experience/ + docs/technical/client/ |
| `docs/programs/experience/system/motion.md` | 6242 | SPLIT | docs/product/experience/ + docs/technical/client/ |
| `docs/programs/experience/system/presentation-language.md` | 14084 | PROMOTE | docs/product/experience/ |
| `docs/programs/experience/system/presentation-media-and-motion.md` | 13662 | SPLIT | docs/product/experience/ + docs/technical/client/ |
| `docs/programs/experience/system/presentation-runtime.md` | 16350 | SPLIT | docs/product/experience/ + docs/technical/client/ |
| `docs/programs/experience/system/visual-direction-and-tokens.md` | 10897 | SPLIT | docs/product/experience/ + docs/technical/client/ |
| `docs/programs/observability/admin-investigation-experience.md` | 20733 | PROMOTE/SPLIT | docs/product/admin/ + docs/product/experience/ + docs/technical/observability/ |
| `docs/programs/observability/admin-investigator-interactions-v1.md` | 16784 | PROMOTE/SPLIT | docs/product/admin/ + docs/product/experience/ + docs/technical/observability/ |
| `docs/programs/observability/design-program.md` | 31565 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/00-SAFETY-AND-BOOT.md` | 5008 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/01-CONNECTED-CAMPAIGN.md` | 8188 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/02-FORENSIC-CAPTURE.md` | 8928 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/03-FAULTS-AND-RETRIES.md` | 7382 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/04-OBS06-OBS07-ADMIN.md` | 8553 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/05-CONDITIONAL-LIVE-AGENT.md` | 10632 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/06-FINAL-FORENSIC-HANDOFF.md` | 7370 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/CHECKPOINT.md` | 2562 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/EVIDENCE-CONTRACT.md` | 8057 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/FINAL-HANDOFF.md` | 8336 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/README.md` | 3079 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/RUN-LOG.md` | 11196 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S1-CAMPAIGN-IDS.json` | 3166 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S2-LEDGER.json` | 6492 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--connected-forensic-trial/S3-FAULT-MATRIX.json` | 3166 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--post-trial-safety/CHECKPOINT.md` | 3437 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--post-trial-safety/FINAL-HANDOFF.md` | 6223 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/observability/evaluations/2026-11-15--post-trial-safety/README.md` | 1339 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evaluations/2026-11-15--post-trial-safety/RUN-LOG.md` | 5380 | EXTRACT | evidence/runs/ |
| `docs/programs/observability/evidence/assets/obs07-support-situation-synthetic.png` | 1586834 | ASSET REVIEW | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/current-source-inventory-2026-11-15.md` | 19285 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/independent-connected-trial-review-2026-11-15.md` | 14629 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/live-worker-dispatch-preflight-2026-11-15.md` | 10859 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/mutation-writer-audit-2026-11-15.md` | 22207 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs00-a-dispatch-forward-2026-11-15.md` | 1195 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs00-c-provider-wire-equality-2026-11-15.md` | 13010 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs00-l-local-story-trial-guards-2026-11-15.md` | 6824 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs01-operation-coverage-2026-11-15.md` | 1198 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs02-execution-stages-2026-11-15.md` | 1357 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs02-h-stage-integrity-2026-11-15.md` | 1064 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs02-stage-integrity-review-2026-11-15.md` | 7326 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs03-prompt-provenance-2026-11-15.md` | 1138 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs03-provenance-quality-review-2026-11-15.md` | 8282 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs05-evidence-claim-truth-2026-11-15.md` | 1098 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs06-case-scoped-situation-read-2026-11-15.md` | 7735 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs06-support-situation-source-audit-2026-11-15.md` | 14148 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/obs07-support-situation-ui-2026-11-15.md` | 9885 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/private-content-retention-inventory-2026-11-15.md` | 19959 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/qa-sf01-storyteller-integration-2026-11-15.md` | 7497 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/verification-and-sizing-protocol.md` | 14718 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/evidence/writer-closure-and-sequence-2026-11-15.md` | 14732 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/observability/handoff/CURSOR-FORENSIC-TRIAL-START-HERE-2026-11-15.md` | 10114 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/observability/handoff/first-forensic-wave.md` | 13233 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/observability/handoff/obs06-support-investigator-2026-11-15.md` | 10831 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/observability/handoff/post-trial-next-cursor-wave-2026-11-15.md` | 11888 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/observability/handoff/wave5-evidence-quality-2026-11-15.md` | 8452 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/observability/player-replay-experience-v1.md` | 12812 | PROMOTE/SPLIT | docs/product/admin/ + docs/product/experience/ + docs/technical/observability/ |
| `docs/programs/observability/product-policy-recommendations-v1.md` | 14127 | PROMOTE/SPLIT | docs/product/admin/ + docs/product/experience/ + docs/technical/observability/ |
| `docs/programs/observability/product-vision.md` | 11584 | PROMOTE/SPLIT | docs/product/admin/ + docs/product/experience/ + docs/technical/observability/ |
| `docs/programs/observability/README.md` | 13250 | REWRITE/RETIRE | docs/product or technical topic routers |
| `docs/programs/observability/references.md` | 10104 | CURATE | research/ |
| `docs/programs/observability/technical/architecture-challenge-and-decisions-v1.md` | 17151 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/archive-codecs-and-evolution-v1.md` | 14999 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/capture-transaction-protocol.md` | 19098 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/committed-transition-capture-v1.md` | 12302 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/configuration-lineage-and-experiments-v1.md` | 14654 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/context-provenance.md` | 18043 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/evidence-claims-and-quality-v1.md` | 12862 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/evidence-model.md` | 18483 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/forensic-access-and-read-contract-v1.md` | 14703 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/forensic-turn-capsule-v1.md` | 14796 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/investigation-read-models-v1.md` | 17495 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/otel-bootstrap-and-correlation-v1.md` | 14692 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/physical-evidence-storage-v1.md` | 24299 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/protected-artifact-store-v1.md` | 14973 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/reconstruction-algorithm-v1.md` | 16592 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/replay-retention-and-privacy.md` | 20147 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/storyteller-prompt-source-map-v1.md` | 18054 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/support-situation-and-why-v1.md` | 17156 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/telemetry-and-operations.md` | 15784 | PROMOTE | docs/technical/observability/ |
| `docs/programs/observability/technical/temporal-frontiers-and-coverage-v1.md` | 12601 | PROMOTE | docs/technical/observability/ |
| `docs/programs/README.md` | 877 | REWRITE/RETIRE | docs/product or technical topic routers |
| `docs/programs/storyteller/architecture-alternatives.md` | 6922 | ADR/CURATE | docs/decisions/ or research/storyteller/ |
| `docs/programs/storyteller/context-and-retrieval.md` | 15064 | PROMOTE | docs/technical/storyteller/ |
| `docs/programs/storyteller/effort-cost-and-lifecycle.md` | 15133 | PROMOTE | docs/technical/storyteller/ |
| `docs/programs/storyteller/evaluation-and-playability.md` | 14137 | PROMOTE | docs/product/storyteller/ |
| `docs/programs/storyteller/evidence/agent-capability-audit-2026-11-14.md` | 17296 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/current-flow-audit-2026-11-14.md` | 20864 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa01-operation-trace-sample-2026-11-14.md` | 2391 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa02-prompt-constitution-2026-11-14.md` | 1847 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa03-context-efficiency-2026-11-14.md` | 1509 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa04-root-index-reuse-2026-11-14.md` | 1447 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa05-evidence-lineage-2026-11-14.md` | 1536 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa06-adaptive-recipe-2026-11-14.md` | 1787 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa08-model-route-capabilities-2026-11-14.md` | 1498 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa09-continuity-materialization-2026-11-14.md` | 1453 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa10-loop-failure-lifecycle-2026-11-14.md` | 1892 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa11-playability-harness-2026-11-14.md` | 1673 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa12-gate1-paid-luna-2026-11-14.md` | 2783 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/evidence/sa12-live-comparison-dry-run-2026-11-14.md` | 1130 | EXTRACT | evidence/{inspections,runs}/ or tests/snapshots/ |
| `docs/programs/storyteller/handoff/cursor-first-wave-2026-11-14.md` | 5564 | EXTRACT/RETIRE | work/changes ledger + Git history |
| `docs/programs/storyteller/implementation-program.md` | 11306 | EXTRACT/RETIRE | work/{changes,designs}/ + docs/decisions/ |
| `docs/programs/storyteller/prompt-tools-and-models.md` | 13615 | PROMOTE | docs/technical/storyteller/ |
| `docs/programs/storyteller/README.md` | 9369 | REWRITE/RETIRE | docs/product or technical topic routers |
| `docs/programs/storyteller/target-operating-model.md` | 18839 | PROMOTE | docs/technical/storyteller/ |
| `docs/programs/storyteller/vision-and-quality-constitution.md` | 12044 | PROMOTE | docs/product/storyteller/ |
| `docs/progress.md` | 4207 | MERGE | STATUS.md |
| `docs/questions.md` | 10053 | SPLIT | docs/product + docs/decisions + work/designs |
| `docs/README.md` | 7245 | REWRITE | docs/README.md |
| `docs/technical/architecture.md` | 15360 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/calendars-and-world-time.md` | 18762 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/canonical-files.md` | 62033 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/chamber-lab-protocol.md` | 19235 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/client-and-identity.md` | 15792 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/committed-time.md` | 17688 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/context-and-cost.md` | 51469 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/data.md` | 34617 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/delivery-and-validation.md` | 24958 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/execution.md` | 29525 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/notifications.md` | 7163 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/persistence-and-caching.md` | 4057 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/playthroughs/batman.md` | 8613 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/beacon.md` | 10273 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/cargo.md` | 6065 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/execution-language.md` | 11042 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/greywake-memory.md` | 12578 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/harbor-session.md` | 12706 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/local-opportunities.md` | 13578 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/nonhuman.md` | 7647 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/poc.md` | 14079 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/README.md` | 7046 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/red-mountain.md` | 8522 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/spongebob.md` | 9837 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/storyteller.md` | 19356 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/vvardenfell.md` | 10453 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/playthroughs/wizard.md` | 8618 | TRIAGE | docs/product/gameplay/acceptance-scenarios.md or tests/scenarios/ |
| `docs/technical/provider-dispatch-review.md` | 13830 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/README.md` | 4554 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/rules-and-activities.md` | 30999 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/solo-gameplay-contract.md` | 19946 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/story-lifecycle.md` | 21802 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/story-settings.md` | 9905 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/storyteller-runtime.md` | 35625 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/ticks-and-tags.md` | 9539 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |
| `docs/technical/usage-policy.md` | 17586 | RECONCILE | docs/technical/{platform,engine,storyteller,client,admin,observability,lab}/ |

## Content review gate for Cursor

For each source, capture `path@SHA#heading`, the **question answered**, atomic claims/choices, acceptance state, dated/undated evidence, incoming references, target heading(s), action (promote / merge / evidence / draft / retire), and reason. Review cross-document contradictions before declaring equivalence. New target headings must carry the normative substance even if the old source text is retired. Sensitive, explicitly owner-retained or unresolved content requires owner-directed preservation.

**No semantic duplicates have been asserted solely because a filename or a program name matches.** The documented contradictions and ownership collisions in [AUDIT-BASELINE.md](AUDIT-BASELINE.md) were checked against actual file openings; this manifest covers paths not all their paragraphs.
