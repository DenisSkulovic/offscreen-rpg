/**
 * OBS06 Support Situation → Why (S1, body-free).
 *
 * Explicit safe-column SELECTs only. Never reads: generation.input/output,
 * story.premise/source, campaign.character/storyFacts/worldConditions/content,
 * story_passage.content/response, game_action_receipt.plan/effects/outcomeText,
 * story_public_event.title/summary, storyteller_prompt_provenance.manifest.
 * Runs in one REPEATABLE READ / READ ONLY snapshot: GET can never write.
 */
import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { adminCase, adminCaseLink } from '@offscreen/db/admin-schema';
import {
  campaign,
  gameActionExecution,
  gameActionExecutionEvent,
  gameActionReceipt,
  gameActivity,
  storyPublicEvent,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import { generation } from '@offscreen/db/generation-schema';
import {
  story,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import {
  storytellerAttempt,
  storytellerContextCapture,
  storytellerExecutionStage,
  storytellerPublication,
} from '@offscreen/db/storyteller-schema';
import {
  supportSituationV1Schema,
  type SupportSafeRefV1,
  type SupportSituationV1,
} from '@offscreen/contracts/admin';
import { campaignHoldsSchema } from '@offscreen/contracts/campaign-holds';
import { AdminSessionError } from './session.js';

export const SITUATION_MAX_EVENTS = 8;
export const SITUATION_MAX_STAGES = 12;
export const SITUATION_MAX_WHY = 6;

type Why = SupportSituationV1['why'][number];
type Activegeneration = NonNullable<SupportSituationV1['activeGeneration']>;
type Commitment = NonNullable<SupportSituationV1['now']['activeCommitment']>;

const SAFE_FAILURE = new Set<string>([
  'invalid_output',
  'invalid-shape',
  'provider_error',
  'timeout',
  'budget_exhausted',
  'cancelled',
  'blocked',
  'missing_source',
  'document_store',
  'corrupt_source',
  'source_mismatch',
  'scripted_hold',
  'scripted_execution',
  'chamber_injected_failure',
]);

type SafeFailure = Activegeneration['safeFailureCode'];

/** Allowlist; free-text failure classes become the generic `failed`. */
export function sanitizeSituationFailure(
  code: string | null | undefined,
): SafeFailure {
  if (!code) return null;
  return (SAFE_FAILURE.has(code) ? code : 'failed') as SafeFailure;
}

const ACTION_STATES = new Set(['running', 'paused', 'interrupted', 'settled']);
const ACTIVITY_STATES = new Set([
  'running',
  'paused',
  'encounter',
  'complete',
  'blocked',
  'cancelled',
  'horizon-reached',
]);

function commitmentStatus(
  state: string,
  allowed: ReadonlySet<string>,
): Commitment['status'] {
  return (allowed.has(state) ? state : 'unknown') as Commitment['status'];
}

const GENERATION_STATES = new Set([
  'pending',
  'running',
  'succeeded',
  'failed',
  'uncertain',
]);
const CAPTURE_STATES = new Set([
  'captured',
  'materializing',
  'ready',
  'held',
  'blocked',
  'stale',
]);
const PUBLICATION_STATES = new Set([
  'pending',
  'published',
  'stale',
  'blocked',
]);

const EVENT_KINDS = new Set([
  'passage-published',
  'action-settled',
  'action-interrupted',
  'activity-development',
  'world-development',
]);

function refKindForEventSource(
  sourceKind: string,
): SupportSafeRefV1['kind'] | null {
  switch (sourceKind) {
    case 'passage':
      return 'story-passage';
    case 'action-execution':
      return 'action-execution-event';
    case 'activity-event':
      return 'activity-event';
    case 'world-obligation':
      return 'world-obligation';
    default:
      return null;
  }
}

function iso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export function createAdminSituationReads(database: Database) {
  return {
    /**
     * Caller must already have passed capability gates (case.summary.read +
     * forensics.campaign.situation.read with exact case/campaign provenance).
     * This method re-verifies the case row, assignment and campaign link in
     * the same snapshot as the story read. Every failure is the same
     * not_authorized so foreign subjects are not enumerable.
     */
    async readSituation(input: {
      caseId: string;
      campaignId: string;
      actorStaffId: string;
    }): Promise<SupportSituationV1> {
      const { caseId, campaignId, actorStaffId } = input;
      const denied = () => new AdminSessionError('not_authorized');

      const built = await database.db.transaction(
        async (tx) => {
          const [caseRow] = await tx
            .select({
              status: adminCase.status,
              assignedStaffId: adminCase.assignedStaffId,
            })
            .from(adminCase)
            .where(eq(adminCase.id, caseId))
            .limit(1);
          if (
            !caseRow ||
            caseRow.status !== 'assigned' ||
            caseRow.assignedStaffId !== actorStaffId
          ) {
            throw denied();
          }
          const [link] = await tx
            .select({ id: adminCaseLink.id })
            .from(adminCaseLink)
            .where(
              and(
                eq(adminCaseLink.caseId, caseId),
                eq(adminCaseLink.subjectKind, 'campaign'),
                eq(adminCaseLink.subjectId, campaignId),
              ),
            )
            .limit(1);
          if (!link) throw denied();

          const [storyRow] = await tx
            .select({
              id: story.id,
              revision: story.revision,
              viewVersion: story.viewVersion,
            })
            .from(story)
            .where(eq(story.id, campaignId))
            .limit(1);
          if (!storyRow) throw denied();

          const [campaignRow] = await tx
            .select({
              gameSecond: campaign.gameSecond,
              holds: campaign.holds,
              activeActivityId: campaign.activeActivityId,
              activeActionOperationId: campaign.activeActionOperationId,
            })
            .from(campaign)
            .where(eq(campaign.storyId, campaignId))
            .limit(1);

          const [passage] = await tx
            .select({ id: storyPassage.id, sequence: storyPassage.sequence })
            .from(storyPassage)
            .where(
              and(
                eq(storyPassage.storyId, campaignId),
                eq(storyPassage.sequence, storyRow.revision),
              ),
            )
            .limit(1);

          const eventRows = await tx
            .select({
              id: storyPublicEvent.id,
              eventSequence: storyPublicEvent.eventSequence,
              kind: storyPublicEvent.kind,
              gameSecond: storyPublicEvent.gameSecond,
              createdAt: storyPublicEvent.createdAt,
              sourceKind: storyPublicEvent.sourceKind,
              sourceId: storyPublicEvent.sourceId,
            })
            .from(storyPublicEvent)
            .where(eq(storyPublicEvent.storyId, campaignId))
            .orderBy(desc(storyPublicEvent.eventSequence))
            .limit(SITUATION_MAX_EVENTS);

          const recentDevelopments: SupportSituationV1['recentDevelopments'] =
            [];
          for (const row of eventRows) {
            const refKind = refKindForEventSource(row.sourceKind);
            if (!refKind || !EVENT_KINDS.has(row.kind)) continue;
            recentDevelopments.push({
              sourceRef: { kind: refKind, id: row.sourceId },
              eventSequence: String(row.eventSequence),
              kind: row.kind as SupportSituationV1['recentDevelopments'][number]['kind'],
              gameSecond: row.gameSecond ?? null,
              observedAt: iso(row.createdAt),
              observation: 'recorded',
            });
          }

          const why: Why[] = [];
          const gaps = {
            conflict: false,
            partial: false,
          };

          // ---- Now -------------------------------------------------------
          let nowKind: SupportSituationV1['now']['kind'];
          let controllingRef: SupportSafeRefV1 | null = null;
          let held: boolean | null = null;
          let confidence: SupportSituationV1['now']['sourceConfidence'];
          let activeCommitment: SupportSituationV1['now']['activeCommitment'] =
            null;
          let generationIdToRead: string | null = null;

          if (!campaignRow) {
            nowKind = 'narrative-only';
            confidence = 'partial';
            gaps.partial = true;
            why.push({
              statementCode: 'source_data_unavailable',
              class: 'unknown',
              sourceRefs: [{ kind: 'story', id: campaignId }],
              missing: ['mechanical-history-not-instrumented'],
            });
          } else {
            const parsedHolds = campaignHoldsSchema.safeParse(
              campaignRow.holds,
            );

            // Active commitment is shown separately from any controlling hold.
            let commitmentConflict = false;
            if (campaignRow.activeActionOperationId) {
              const [exec] = await tx
                .select({
                  operationId: gameActionExecution.operationId,
                  state: gameActionExecution.state,
                })
                .from(gameActionExecution)
                .where(
                  and(
                    eq(
                      gameActionExecution.operationId,
                      campaignRow.activeActionOperationId,
                    ),
                    eq(gameActionExecution.storyId, campaignId),
                  ),
                )
                .limit(1);
              if (exec) {
                activeCommitment = {
                  kind: 'finite-action',
                  ref: { kind: 'action-execution', id: exec.operationId },
                  status: commitmentStatus(exec.state, ACTION_STATES),
                };
              } else {
                commitmentConflict = true;
              }
            }
            if (campaignRow.activeActivityId) {
              if (activeCommitment) {
                commitmentConflict = true;
              } else {
                const [activity] = await tx
                  .select({ id: gameActivity.id, state: gameActivity.state })
                  .from(gameActivity)
                  .where(
                    and(
                      eq(gameActivity.id, campaignRow.activeActivityId),
                      eq(gameActivity.storyId, campaignId),
                    ),
                  )
                  .limit(1);
                if (activity) {
                  activeCommitment = {
                    kind: 'activity',
                    ref: { kind: 'activity', id: activity.id },
                    status: commitmentStatus(activity.state, ACTIVITY_STATES),
                  };
                } else {
                  commitmentConflict = true;
                }
              }
            }

            if (!parsedHolds.success) {
              nowKind = 'unknown';
              confidence = 'unknown';
              gaps.conflict = true;
              why.push({
                statementCode: 'source_data_unavailable',
                class: 'unknown',
                sourceRefs: [{ kind: 'campaign', id: campaignId }],
                missing: ['source-conflict'],
              });
            } else if (parsedHolds.data.length > 1 || commitmentConflict) {
              nowKind = 'conflicting-sources';
              held = parsedHolds.data.length > 0;
              confidence = 'partial';
              gaps.conflict = true;
              why.push({
                statementCode: 'source_data_unavailable',
                class: 'unknown',
                sourceRefs: [{ kind: 'campaign', id: campaignId }],
                missing: ['source-conflict'],
              });
            } else if (parsedHolds.data.length === 1) {
              const hold = parsedHolds.data[0]!;
              held = true;
              confidence = 'direct-current-source';
              if (hold.kind === 'storyteller-intent') {
                nowKind = 'narration-intent';
                controllingRef = {
                  kind: 'storyteller-operation',
                  id: hold.operationId,
                };
              } else if (hold.kind === 'decision') {
                nowKind = 'decision-hold';
                controllingRef = { kind: 'decision-offer', id: hold.offerId };
              } else if (hold.kind === 'world-obligation') {
                const [obligation] = await tx
                  .select({ id: worldObligation.id })
                  .from(worldObligation)
                  .where(
                    and(
                      eq(worldObligation.id, hold.obligationId),
                      eq(worldObligation.storyId, campaignId),
                    ),
                  )
                  .limit(1);
                if (obligation) {
                  nowKind = 'world-obligation';
                  controllingRef = {
                    kind: 'world-obligation',
                    id: obligation.id,
                  };
                } else {
                  nowKind = 'conflicting-sources';
                  confidence = 'partial';
                  gaps.conflict = true;
                }
              } else {
                nowKind = 'storyteller-generation';
                generationIdToRead = hold.generationId;
              }
            } else if (activeCommitment) {
              held = false;
              confidence = 'direct-current-source';
              nowKind =
                activeCommitment.kind === 'finite-action'
                  ? 'finite-action'
                  : 'activity';
              controllingRef = activeCommitment.ref;
            } else {
              held = false;
              confidence = 'direct-current-source';
              nowKind = 'idle';
            }
          }

          // ---- Selected current G only ------------------------------------
          let activeGeneration: SupportSituationV1['activeGeneration'] = null;
          let stageCoverage: SupportSituationV1['coverage']['storytellerStages'] =
            'not-applicable';

          if (generationIdToRead) {
            const gid = generationIdToRead;
            const [capture] = await tx
              .select({
                storyId: storytellerContextCapture.storyId,
                state: storytellerContextCapture.state,
                failureCode: storytellerContextCapture.failureCode,
              })
              .from(storytellerContextCapture)
              .where(eq(storytellerContextCapture.captureId, gid))
              .limit(1);
            const [resolution] = await tx
              .select({ storyId: storyResolution.storyId })
              .from(storyResolution)
              .where(eq(storyResolution.generationId, gid))
              .limit(1);
            const [attempt] = await tx
              .select({
                id: storytellerAttempt.id,
                storyId: storytellerAttempt.storyId,
              })
              .from(storytellerAttempt)
              .where(eq(storytellerAttempt.generationId, gid))
              .limit(1);
            const [published] = await tx
              .select({
                id: storyPassage.id,
                storyId: storyPassage.storyId,
              })
              .from(storyPassage)
              .where(
                and(
                  eq(storyPassage.sourceGenerationId, gid),
                  eq(storyPassage.storyId, campaignId),
                ),
              )
              .limit(1);

            const claimedStories = [
              capture?.storyId,
              resolution?.storyId,
              attempt?.storyId,
            ].filter((id): id is string => typeof id === 'string');
            const foreign = claimedStories.some((id) => id !== campaignId);
            const owned =
              !foreign && (claimedStories.length > 0 || Boolean(published));

            if (!owned) {
              // Hold names a G this campaign cannot prove: show no G detail.
              nowKind = 'conflicting-sources';
              confidence = 'partial';
              gaps.conflict = true;
              why.push({
                statementCode: 'source_data_unavailable',
                class: 'unknown',
                sourceRefs: [{ kind: 'campaign', id: campaignId }],
                missing: ['source-conflict'],
              });
            } else {
              controllingRef = { kind: 'generation', id: gid };
              const [gen] = await tx
                .select({
                  id: generation.id,
                  state: generation.state,
                  failureCode: generation.failureCode,
                })
                .from(generation)
                .where(eq(generation.id, gid))
                .limit(1);
              const [publication] = await tx
                .select({
                  state: storytellerPublication.state,
                  failureCode: storytellerPublication.failureCode,
                })
                .from(storytellerPublication)
                .where(eq(storytellerPublication.generationId, gid))
                .limit(1);
              const stageRows = await tx
                .select({
                  id: storytellerExecutionStage.id,
                  stage: storytellerExecutionStage.stage,
                  outcome: storytellerExecutionStage.outcome,
                  failureClass: storytellerExecutionStage.failureClass,
                  createdAt: storytellerExecutionStage.createdAt,
                })
                .from(storytellerExecutionStage)
                .where(eq(storytellerExecutionStage.generationId, gid))
                .orderBy(
                  desc(storytellerExecutionStage.createdAt),
                  desc(storytellerExecutionStage.id),
                )
                .limit(SITUATION_MAX_STAGES + 1);

              if (!gen) {
                nowKind = 'conflicting-sources';
                confidence = 'partial';
                gaps.conflict = true;
                controllingRef = null;
                why.push({
                  statementCode: 'source_data_unavailable',
                  class: 'unknown',
                  sourceRefs: [{ kind: 'generation', id: gid }],
                  missing: ['source-missing'],
                });
              } else {
                const stagePartial = stageRows.length > SITUATION_MAX_STAGES;
                const stages = stageRows
                  .slice(0, SITUATION_MAX_STAGES)
                  .reverse()
                  .map((row) => ({
                    ref: { kind: 'storyteller-stage' as const, id: row.id },
                    stage: row.stage,
                    outcome: row.outcome,
                    safeFailureCode: sanitizeSituationFailure(row.failureClass),
                    observedAt: iso(row.createdAt),
                  }));
                stageCoverage = stagePartial
                  ? 'partial'
                  : stages.length > 0
                    ? 'recorded'
                    : 'not-instrumented';

                const captureState = capture
                  ? CAPTURE_STATES.has(capture.state)
                    ? capture.state
                    : 'unknown'
                  : 'not-recorded';
                const generationState = GENERATION_STATES.has(gen.state)
                  ? gen.state
                  : 'unknown';
                const publicationState = publication
                  ? PUBLICATION_STATES.has(publication.state)
                    ? publication.state
                    : 'unknown'
                  : 'unknown';
                const failureSource =
                  gen.failureCode ??
                  (capture &&
                  (capture.state === 'held' || capture.state === 'blocked')
                    ? (capture.failureCode ?? 'blocked')
                    : null) ??
                  publication?.failureCode ??
                  null;

                activeGeneration = {
                  generationId: gid,
                  state: generationState as Activegeneration['state'],
                  capture: captureState as Activegeneration['capture'],
                  publication:
                    publicationState as Activegeneration['publication'],
                  attemptCoverage: attempt ? 'recorded' : 'none-recorded',
                  safeFailureCode: sanitizeSituationFailure(failureSource),
                  stageCoverage,
                  stages,
                };

                const genRef: SupportSafeRefV1 = {
                  kind: 'generation',
                  id: gid,
                };
                const scriptedSkip = stageRows.find(
                  (row) =>
                    row.stage === 'stage-skipped' &&
                    row.outcome === 'not-run' &&
                    row.failureClass === 'scripted_execution',
                );
                const heldStage = stageRows.find(
                  (row) => row.stage === 'stage-held',
                );
                const validationStage = stageRows.find(
                  (row) =>
                    row.stage === 'validation-settled' &&
                    row.outcome === 'failed',
                );

                if (captureState === 'held') {
                  why.push({
                    statementCode: 'context_materialization_held',
                    class: 'recorded',
                    sourceRefs: [
                      genRef,
                      ...(heldStage
                        ? [
                            {
                              kind: 'storyteller-stage' as const,
                              id: heldStage.id,
                            },
                          ]
                        : []),
                    ],
                    missing: [],
                  });
                }
                if (scriptedSkip) {
                  why.push({
                    statementCode: 'scripted_provider_skipped',
                    class: 'recorded',
                    sourceRefs: [
                      { kind: 'storyteller-stage', id: scriptedSkip.id },
                    ],
                    missing: [],
                  });
                }
                if (
                  gen.state === 'failed' &&
                  (gen.failureCode === 'invalid_output' ||
                    gen.failureCode === 'invalid-shape' ||
                    validationStage)
                ) {
                  why.push({
                    statementCode: 'validation_failed',
                    class: 'recorded',
                    sourceRefs: [
                      genRef,
                      ...(validationStage
                        ? [
                            {
                              kind: 'storyteller-stage' as const,
                              id: validationStage.id,
                            },
                          ]
                        : []),
                    ],
                    missing: [],
                  });
                }
                if (publicationState === 'stale') {
                  why.push({
                    statementCode: 'publication_stale',
                    class: 'recorded',
                    sourceRefs: [genRef],
                    missing: [],
                  });
                }
                if (published) {
                  why.push({
                    statementCode: 'published_passage',
                    class: 'recorded',
                    sourceRefs: [
                      { kind: 'story-passage', id: published.id },
                      genRef,
                    ],
                    missing: [],
                  });
                }
                if (!attempt && !scriptedSkip) {
                  why.push({
                    statementCode: 'model_attempt_unverified',
                    class: 'unknown',
                    sourceRefs: [genRef],
                    missing:
                      stages.length === 0
                        ? ['attempt-not-recorded', 'stage-not-instrumented']
                        : ['attempt-not-recorded'],
                  });
                }
              }
            }
          }

          // ---- Action evidence from the most recent action development -----
          const actionDev = recentDevelopments.find(
            (entry) =>
              entry.kind === 'action-interrupted' ||
              entry.kind === 'action-settled',
          );
          if (actionDev) {
            const [executionEvent] = await tx
              .select({
                id: gameActionExecutionEvent.id,
                executionId: gameActionExecutionEvent.executionId,
                kind: gameActionExecutionEvent.kind,
              })
              .from(gameActionExecutionEvent)
              .where(
                and(
                  eq(gameActionExecutionEvent.id, actionDev.sourceRef.id),
                  eq(gameActionExecutionEvent.storyId, campaignId),
                ),
              )
              .limit(1);
            if (executionEvent?.kind === 'interrupted') {
              why.push({
                statementCode: 'action_interrupted',
                class: 'recorded',
                sourceRefs: [
                  { kind: 'action-execution-event', id: executionEvent.id },
                  { kind: 'action-execution', id: executionEvent.executionId },
                ],
                missing: [],
              });
            } else if (executionEvent?.kind === 'settled') {
              const [receipt] = await tx
                .select({ operationId: gameActionReceipt.operationId })
                .from(gameActionReceipt)
                .where(
                  and(
                    eq(
                      gameActionReceipt.operationId,
                      executionEvent.executionId,
                    ),
                    eq(gameActionReceipt.storyId, campaignId),
                  ),
                )
                .limit(1);
              if (receipt) {
                why.push({
                  statementCode: 'action_settlement_recorded',
                  class: 'recorded',
                  sourceRefs: [
                    { kind: 'action-execution-event', id: executionEvent.id },
                    { kind: 'action-execution', id: receipt.operationId },
                  ],
                  missing: [],
                });
              }
            }
          }

          const currentState: SupportSituationV1['coverage']['currentState'] =
            gaps.conflict || gaps.partial || nowKind === 'unknown'
              ? 'partial'
              : 'verified';

          return supportSituationV1Schema.parse({
            version: 1,
            caseId,
            campaignId,
            observedAt: new Date().toISOString(),
            sourceFrontier: {
              storyRevision: storyRow.revision,
              viewVersion: storyRow.viewVersion,
              latestPublishedPassageId: passage?.id ?? null,
              latestPublishedPassageSequence: passage?.sequence ?? null,
              mechanicalHistoryCoverage:
                recentDevelopments.length > 0 ? 'partial' : 'not-instrumented',
            },
            now: {
              kind: nowKind,
              controllingRef,
              gameSecond: campaignRow?.gameSecond ?? null,
              held,
              sourceConfidence: confidence,
              activeCommitment,
            },
            activeGeneration,
            recentDevelopments,
            why: why.slice(0, SITUATION_MAX_WHY),
            coverage: {
              currentState,
              gameHistory:
                recentDevelopments.length > 0 ? 'partial' : 'not-instrumented',
              storytellerStages: stageCoverage,
              promptBody: 'not-included',
            },
          });
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
      return built;
    },
  };
}

export type AdminSituationReads = ReturnType<typeof createAdminSituationReads>;
