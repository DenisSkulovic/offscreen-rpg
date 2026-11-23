# Source map
Baseline `ed0837d0531be4050b40d9b2485b5759ef479fea`; actual post-Documents HEAD pending. Line anchors are snapshot observations, not current execution proof.

## admin
- Source: `packages/contracts/src/admin.ts` → `packages/admin-interface/src/admin.ts`
- Import: `@offscreen/admin-interface/admin`
- Current imports: `zod`
- Exports: `adminSelfV1Schema`, `AdminSelfV1`, `adminErrorV1Schema`, `AdminErrorV1`, `adminAccessDecisionV1Schema`, `AdminAccessDecisionV1`, `adminGrantScopeSummaryV1Schema`, `AdminGrantScopeSummaryV1`, `adminStaffAccessV1Schema`, `AdminStaffAccessV1`, `adminAuditEventV1Schema`, `AdminAuditEventV1`, `adminAuditPageV1Schema`, `AdminAuditPageV1`, `caseSubjectLinkV1Schema`, `CaseSubjectLinkV1`, `caseSummaryV1Schema`, `CaseSummaryV1`, `caseSummaryPageV1Schema`, `CaseSummaryPageV1`, `caseCreateRequestV1Schema`, `CaseCreateRequestV1`, `caseAssignRequestV1Schema`, `CaseAssignRequestV1`, `caseStatusUpdateRequestV1Schema`, `CaseStatusUpdateRequestV1`, `ADMIN_BOOTSTRAP_PACKAGE_ID`, `ADMIN_BOOTSTRAP_PACKAGE_VERSION`, `adminSubjectRefV1Schema`, `AdminSubjectRefV1`, `playerSummaryV1Schema`, `PlayerSummaryV1`, `adminReadEnvelopeV1Schema`, `AdminReadEnvelopeV1`, `playerSearchHitV1Schema`, `PlayerSearchHitV1`, `playerSearchPageV1Schema`, `PlayerSearchPageV1`, `playerSummaryEnvelopeV1Schema`, `PlayerSummaryEnvelopeV1`, `campaignMetadataV1Schema`, `CampaignMetadataV1`, `campaignMetadataPageV1Schema`, `CampaignMetadataPageV1`, `redactedOperationV1Schema`, `RedactedOperationV1`, `redactedOperationPageV1Schema`, `RedactedOperationPageV1`, `redactedOperationEnvelopeV1Schema`, `RedactedOperationEnvelopeV1`, `usageStatusV1Schema`, `UsageStatusV1`, `usageStatusEnvelopeV1Schema`, `UsageStatusEnvelopeV1`, `SUPPORT_REASON_CODES`, `supportReasonCodeSchema`, `SupportReasonCode`, `supportEvidenceGapSchema`, `SupportEvidenceGap`, `supportSafeRefV1Schema`, `SupportSafeRefV1`, `supportSafeFailureCodeSchema`, `supportSituationV1Schema`, `SupportSituationV1`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/admin/test/admin-player-reads.test.mjs` | 7 |
| `packages/admin/test/admin-usage.test.mjs` | 4 |
| `packages/admin/test/admin-cases.test.mjs` | 4 |
| `packages/admin/test/admin-diagnostics.test.mjs` | 14 |
| `packages/admin/test/admin-audit.test.mjs` | 11 |
| `packages/admin/src/session.ts` | 13 |
| `packages/admin/src/situation-reads.ts` | 38 |
| `packages/admin/src/diagnostics-reads.ts` | 21 |
| `packages/admin/src/audit-reads.ts` | 9 |
| `packages/admin/src/case-writes.ts` | 13 |
| `packages/admin/src/player-reads.ts` | 9 |
| `packages/admin/src/usage-reads.ts` | 11 |
| `apps/web/src/server/admin-actor.ts` | 8 |
| `apps/web/src/lib/admin-transport.ts` | 27 |
| `apps/web/src/features/admin/usage-lookup.test.tsx` | 5 |
| `apps/web/src/features/admin/case-queue.tsx` | 5 |
| `apps/web/src/features/admin/support-situation-panel.tsx` | 5 |
| `apps/web/src/features/admin/governance-panel.tsx` | 4 |
| `apps/web/src/features/admin/usage-lookup.tsx` | 5 |
| `apps/web/src/features/admin/player-lookup.tsx` | 5 |
| `apps/web/src/features/admin/support-situation-panel.test.tsx` | 12,17 |
| `apps/web/src/features/admin/support-situation-copy.ts` | 6 |
| `apps/web/src/features/admin/governance-panel.test.tsx` | 4 |
| `apps/web/src/features/admin/player-lookup.test.tsx` | 5 |
| `apps/web/app/(control)/control/enter/page.tsx` | 10 |
| `apps/web/app/(control)/control/(staff)/players/page.tsx` | 5 |
| `apps/api/src/modules/admin/admin-actor-service.ts` | 10 |
| `apps/api/src/modules/admin/admin-http-errors.ts` | 3 |
| `apps/api/src/modules/admin/controllers/admin-cases.ts` | 26 |
| `apps/api/src/modules/admin/controllers/admin-session.ts` | 16 |
| `apps/api/src/modules/admin/controllers/admin-evidence.ts` | 25 |
| `apps/api/src/modules/admin/controllers/admin-players.ts` | 19 |
| `tools/api-integration/legacy-engine-tests/obs01-operation-coverage.live.test.mjs` | 18 |
| `tools/api-integration/test/admin-cases.integration.ts` | 5 |
| `tools/api-integration/test/admin-player-reads.integration.ts` | 7 |
| `tools/api-integration/test/admin-session.integration.ts` | 4 |
| `tools/api-integration/test/admin-diagnostics.integration.ts` | 8 |
| `tools/api-integration/test/admin-audit.integration.ts` | 8 |
| `tools/api-integration/test/admin-usage.integration.ts` | 5 |
| `tools/api-integration/test/admin-situation.integration.ts` | 9 |

## terminal-auth
- Source: `packages/contracts/src/terminal-auth.ts` → `packages/identity-interface/src/terminal-auth.ts`
- Import: `@offscreen/identity-interface/terminal-auth`
- Current imports: `zod`
- Exports: `createTerminalPairingSchema`, `CreateTerminalPairingRequest`, `terminalPairingCreatedSchema`, `TerminalPairingCreated`, `approveTerminalPairingSchema`, `ApproveTerminalPairingRequest`, `exchangeTerminalPairingSchema`, `ExchangeTerminalPairingRequest`, `terminalAccessTokenIssuedSchema`, `TerminalAccessTokenIssued`, `terminalTokenCurrentSchema`, `TerminalTokenCurrent`, `terminalPairingConsentSchema`, `TerminalPairingConsent`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `apps/web/src/features/terminal/terminal-connect-form.tsx` | 4 |
| `apps/web/app/(authenticated)/terminal/connect/page.tsx` | 3 |
| `apps/api/src/modules/terminal-auth/service.ts` | 33 |
| `apps/api/src/modules/terminal-auth/controller.ts` | 20 |
| `tools/terminal/src/login.ts` | 8 |
| `tools/terminal/src/player.ts` | 19 |
| `tools/terminal/src/http.ts` | 9 |

## usage-policy
- Source: `packages/contracts/src/usage-policy.ts` → `packages/usage-policy/src/usage-policy.ts`
- Import: `@offscreen/usage-policy/usage-policy`
- Current imports: `zod`
- Exports: `policyIdSchema`, `usageLimitsSchema`, `UsageLimits`, `usageLimitKeys`, `usageLimitOverrideSchema`, `UsageLimitOverride`, `usageWindowDefinitionSchema`, `UsageWindowDefinition`, `fundingModeSchema`, `recoveryPolicySchema`, `usageEntitlementProfileSchema`, `UsageEntitlementProfile`, `usagePolicyRestrictionSchema`, `UsagePolicyRestriction`, `effectiveUsagePolicySchema`, `EffectiveUsagePolicy`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/execution.ts` | 23 |
| `packages/story-engine/src/storyteller/dispatch-authority.ts` | 5 |
| `packages/story-engine/src/storyteller/task-admission.ts` | 4 |
| `packages/story-engine/src/storyteller/openings.ts` | 40 |
| `packages/story-engine/src/storyteller/usage-policy.ts` | 1 |
| `packages/story-engine/src/storyteller/memory-provider-runtime.ts` | 3 |
| `packages/story-engine/src/storyteller/context-capture.ts` | 9 |
| `packages/story-engine/src/storyteller/load-current-dispatch-authority.ts` | 18 |
| `packages/story-engine/src/storyteller/admission.ts` | 35 |
| `packages/story-engine/src/storyteller/adaptive-recipe.ts` | 5 |
| `packages/story-engine/src/storyteller/window-accounting.ts` | 7 |
| `packages/story-engine/src/storyteller/test-synthetic-current-authority.ts` | 4 |
| `packages/story-engine/src/storyteller/usage-policy-defaults.ts` | 4 |
| `packages/story-engine/src/storyteller/usage-policy-resolution.ts` | 10 |
| `packages/story-engine/src/storyteller/read-generation-dispatch-authority.ts` | 3 |
| `packages/story-engine/src/stories/command-policy.ts` | 21 |
| `packages/story-engine/src/generations/scripted-openings.ts` | 10 |
| `packages/lab-support/src/usage-profiles.ts` | 6 |
| `packages/storyteller/src/tasks/resources.ts` | 2 |
| `apps/api/src/app.ts` | 2 |
| `apps/api/src/bootstrap/api-providers.ts` | 38 |
| `tools/api-integration/test/helpers/usage-policy.ts` | 1 |
| `tools/chamber/src/story-funding.ts` | 11 |
| `tools/chamber/src/evaluation-config.ts` | 9 |
| `tools/chamber/src/memory-packet-review.ts` | 20 |

## Non-source and internal import anchors
See program ownership map and Change split rules. Exact current relative import graph is listed above.

Technical/related owners referencing old package in snapshot (refresh impacted subset, do not rewrite historical receipts):

- `infra/kubernetes/lab/dev/dev-sync-paths.mjs`
- `infra/kubernetes/lab/app-release/production-workspace-closure.test.mjs`
- `docs/architecture/00-human-tour.md`
- `docs/technical/engine/selected-architecture.md`
- `docs/technical/platform/security-and-trust-boundaries.md`
- `docs/technical/platform/http-api-and-client-contracts.md`
- `docs/technical/platform/data-and-persistence.md`
- `docs/technical/platform/persistence-and-caching.md`
- `docs/technical/admin/topology-and-authorization.md`
- `docs/technical/lab/chamber-and-fixtures.md`
- `docs/technical/lab/experiment-protocol.md`
- `docs/technical/client/scene-direction-production.md`
- `docs/technical/client/living-book-poc.md`
- `docs/technical/client/presentation-runtime.md`
- `scripts/repo-tools/maintenance-coverage.test.mjs`
- `scripts/repo-tools/module-graph.test.mjs`
- `scripts/repo-tools/module-graph.mjs`
- `scripts/repo-tools/focused-integration.mjs`
- `scripts/repo-tools/ci-change-scope.test.mjs`
