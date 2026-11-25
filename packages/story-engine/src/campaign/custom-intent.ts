/**
 * GM01/GM02: template interpret + one-shot inspect admission. $0 provider.
 */
import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignConsequence,
  gameActionExecution,
} from '@offscreen/story-persistence/campaign';
import {
  customIntentCandidate,
  storyPassage,
  storyPublicInspectTarget,
  storyResolution,
} from '@offscreen/story-persistence/stories';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { StoryError, parseStoryIdentifier } from '../stories/errors';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  readDatabaseClockMs,
} from '../stories/persistence';
import { commandReceipt, saveCommand } from './settings';
import { campaignHoldsSchema } from './holds';
import {
  recordActionExecutionEvent,
  scheduleActionExecution,
} from './action-executions';
import {
  customIntentMatchSchema,
  hashCustomIntentRequest,
  matchCustomIntentTemplate,
  type CustomIntentMatch,
} from './custom-intent-matcher';

const CANDIDATE_TTL_MS = 5 * 60_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 3;
const RATE_MAX_PER_DAY = 20;

const interpretBodySchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  text: z.string(),
  clarificationHandle: z.string().min(1).max(80).optional(),
});

function publicCandidateResponse(input: {
  candidateId: string;
  interpretOperationId: string;
  status: string;
  match: CustomIntentMatch;
  expiresAt: Date;
  narrativeRevision: number;
  requestDigest: string;
}) {
  return {
    candidateId: input.candidateId,
    interpretOperationId: input.interpretOperationId,
    status: input.status,
    interpreter: 'template.v1' as const,
    expiresAt: input.expiresAt.toISOString(),
    narrativeRevision: input.narrativeRevision,
    requestDigest: input.requestDigest,
    match: input.match,
  };
}

export function createCustomIntentInterpretation(database: Database) {
  return async function interpretCustomIntent(args: {
    ownerId: string;
    storyId: string;
    interpretOperationId: string;
    body: unknown;
  }) {
    const storyId = parseStoryIdentifier(args.storyId);
    const interpretOperationId = z.uuid().parse(args.interpretOperationId);
    const body = interpretBodySchema.parse(args.body);

    return database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, {
        ownerId: args.ownerId,
        storyId,
      });
      if (current.revision !== body.expectedRevision) {
        throw new StoryError('conflict', 'revision');
      }

      const [existing] = await tx
        .select()
        .from(customIntentCandidate)
        .where(
          and(
            eq(customIntentCandidate.storyId, storyId),
            eq(
              customIntentCandidate.interpretOperationId,
              interpretOperationId,
            ),
          ),
        );
      const normalizedText = body.text.normalize('NFKC').trim().replace(/\s+/g, ' ');
      if (!normalizedText || [...normalizedText].length > 240) {
        throw new StoryError('invalid', 'intent_text');
      }

      if (existing && !body.clarificationHandle) {
        if (existing.inputText !== normalizedText) {
          throw new StoryError('conflict', 'interpret_operation_reuse');
        }
        return publicCandidateResponse({
          candidateId: existing.candidateId,
          interpretOperationId,
          status: existing.status,
          match: customIntentMatchSchema.parse(existing.response),
          expiresAt: existing.expiresAt,
          narrativeRevision: existing.narrativeRevision,
          requestDigest: existing.requestDigest,
        });
      }

      const [passage] = await tx
        .select({ id: storyPassage.id })
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, storyId),
            eq(storyPassage.sequence, current.revision),
          ),
        );
      if (!passage) throw new StoryError('invalid', 'passage');

      const [campaignState] = await tx
        .select({ settingsRevision: campaign.settingsRevision })
        .from(campaign)
        .where(eq(campaign.storyId, storyId));
      if (!campaignState) throw new StoryError('invalid', 'campaign');

      const targets = await tx
        .select({
          handle: storyPublicInspectTarget.handle,
          label: storyPublicInspectTarget.label,
        })
        .from(storyPublicInspectTarget)
        .where(eq(storyPublicInspectTarget.storyId, storyId));

      const requestDigest = hashCustomIntentRequest({
        storyId,
        viewerId: args.ownerId,
        narrativeRevision: current.revision,
        passageId: passage.id,
        text: normalizedText,
        targetHandles: targets.map((target) => target.handle),
      });

      if (existing && body.clarificationHandle) {
        if (existing.clarificationUsed) {
          throw new StoryError('conflict', 'clarification_exhausted');
        }
        if (existing.status !== 'clarify') {
          throw new StoryError('conflict', 'clarification_ineligible');
        }
        if (existing.expiresAt.getTime() <= Date.now()) {
          throw new StoryError('conflict', 'candidate_expired');
        }
        const prior = customIntentMatchSchema.parse(existing.response);
        if (prior.status !== 'clarify') {
          throw new StoryError('conflict', 'clarification_ineligible');
        }
        const chosen = prior.options.find(
          (option) => option.handle === body.clarificationHandle,
        );
        if (!chosen) {
          throw new StoryError('invalid', 'clarification_handle');
        }
        const match = matchCustomIntentTemplate({
          text: `Inspect ${chosen.label}`,
          publicTargets: targets,
        });
        await tx
          .update(customIntentCandidate)
          .set({
            status: match.status,
            response: match,
            clarificationUsed: true,
            inputText: normalizedText,
            requestDigest,
          })
          .where(eq(customIntentCandidate.candidateId, existing.candidateId));
        return publicCandidateResponse({
          candidateId: existing.candidateId,
          interpretOperationId,
          status: match.status,
          match,
          expiresAt: existing.expiresAt,
          narrativeRevision: existing.narrativeRevision,
          requestDigest,
        });
      }

      const windowStart = new Date(Date.now() - RATE_WINDOW_MS);
      const dayStart = new Date(Date.now() - 24 * 60 * 60_000);
      const [windowCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(customIntentCandidate)
        .where(
          and(
            eq(customIntentCandidate.viewerId, args.ownerId),
            eq(customIntentCandidate.storyId, storyId),
            gte(customIntentCandidate.createdAt, windowStart),
          ),
        );
      if ((windowCount?.count ?? 0) >= RATE_MAX_PER_WINDOW) {
        throw new StoryError('conflict', 'interpret_rate_window');
      }
      const [dayCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(customIntentCandidate)
        .where(
          and(
            eq(customIntentCandidate.viewerId, args.ownerId),
            gte(customIntentCandidate.createdAt, dayStart),
          ),
        );
      if ((dayCount?.count ?? 0) >= RATE_MAX_PER_DAY) {
        throw new StoryError('conflict', 'interpret_rate_day');
      }

      const match = matchCustomIntentTemplate({
        text: normalizedText,
        publicTargets: targets,
      });
      const candidateId = randomUUID();
      const expiresAt = new Date(Date.now() + CANDIDATE_TTL_MS);
      await tx.insert(customIntentCandidate).values({
        candidateId,
        interpretOperationId,
        storyId,
        ownerId: args.ownerId,
        viewerId: args.ownerId,
        requestDigest,
        status: match.status,
        inputText: normalizedText,
        response: match,
        passageId: passage.id,
        narrativeRevision: current.revision,
        settingsRevision: campaignState.settingsRevision,
        clarificationUsed: false,
        expiresAt,
      });

      return publicCandidateResponse({
        candidateId,
        interpretOperationId,
        status: match.status,
        match,
        expiresAt,
        narrativeRevision: current.revision,
        requestDigest,
      });
    });
  };
}

function sealedInspectPlan(targetLabel: string, targetHandle: string) {
  return immediateActionPlanSchema.parse({
    version: 1,
    key: `inspect-${targetHandle}`,
    label: `Inspect ${targetLabel}`,
    intention: `Examine the publicly visible ${targetLabel}.`,
    risk: null,
    evidence: [],
    requires: [],
    resolution: {
      kind: 'automatic',
      fictionalDurationSeconds: 10,
      outcome: {
        text: `You take a careful look at the ${targetLabel}.`,
        effects: [],
        declarations: [],
        worldEffects: [],
      },
    },
  });
}

const acceptBodySchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  candidateId: z.uuid(),
  requestDigest: z.string().regex(/^[a-f0-9]{64}$/),
});

/** GM02: admit one reviewable inspect candidate into the existing finite-action path. */
export function createCustomIntentAcceptance(database: Database) {
  return async function acceptCustomIntent(args: {
    ownerId: string;
    storyId: string;
    operationId: string;
    body: unknown;
  }) {
    const storyId = parseStoryIdentifier(args.storyId);
    const operationId = z.uuid().parse(args.operationId);
    const body = acceptBodySchema.parse(args.body);

    await database.db.transaction(async (tx) => {
      const current = await lockOwnedStory(tx, {
        ownerId: args.ownerId,
        storyId,
      });
      const request = {
        kind: 'custom-intent-accept',
        candidateId: body.candidateId,
        requestDigest: body.requestDigest,
        expectedRevision: body.expectedRevision,
      };
      if (await commandReceipt(tx, current.id, operationId, request)) {
        return;
      }
      if (current.revision !== body.expectedRevision) {
        throw new StoryError('conflict', 'revision');
      }

      const [narration] = await tx
        .select()
        .from(storyResolution)
        .where(
          and(
            eq(storyResolution.storyId, current.id),
            eq(storyResolution.baseRevision, current.revision),
          ),
        );
      if (narration) throw new StoryError('conflict', 'narration_pending');

      const [pendingConsequence] = await tx
        .select({ operationId: campaignConsequence.operationId })
        .from(campaignConsequence)
        .where(eq(campaignConsequence.storyId, current.id));
      if (pendingConsequence) {
        throw new StoryError('conflict', 'consequence_pending');
      }

      const [candidate] = await tx
        .select()
        .from(customIntentCandidate)
        .where(
          and(
            eq(customIntentCandidate.candidateId, body.candidateId),
            eq(customIntentCandidate.storyId, storyId),
            eq(customIntentCandidate.viewerId, args.ownerId),
          ),
        )
        .for('update');
      if (!candidate) throw new StoryError('not_found', 'candidate');
      if (candidate.acceptedOperationId) {
        if (candidate.acceptedOperationId === operationId) return;
        throw new StoryError('conflict', 'candidate_already_accepted');
      }
      if (candidate.status !== 'reviewable') {
        throw new StoryError('conflict', 'candidate_not_reviewable');
      }
      if (candidate.expiresAt.getTime() <= Date.now()) {
        throw new StoryError('conflict', 'candidate_expired');
      }
      if (
        candidate.narrativeRevision !== current.revision ||
        candidate.requestDigest !== body.requestDigest
      ) {
        throw new StoryError('conflict', 'candidate_stale');
      }

      const match = customIntentMatchSchema.parse(candidate.response);
      if (match.status !== 'reviewable' || match.family !== 'inspect') {
        throw new StoryError('conflict', 'candidate_not_reviewable');
      }

      const [target] = await tx
        .select()
        .from(storyPublicInspectTarget)
        .where(
          and(
            eq(storyPublicInspectTarget.storyId, storyId),
            eq(storyPublicInspectTarget.handle, match.targetHandle),
          ),
        );
      if (!target) throw new StoryError('conflict', 'target_missing');

      const [state] = await tx
        .select()
        .from(campaign)
        .where(eq(campaign.storyId, storyId))
        .for('update');
      if (!state) throw new StoryError('invalid', 'campaign');
      if (state.activeActionOperationId) {
        throw new StoryError('conflict', 'action_active');
      }

      const plan = sealedInspectPlan(match.targetLabel, match.targetHandle);
      if (plan.resolution.kind !== 'automatic') {
        throw new StoryError('invalid', 'inspect_plan');
      }
      const durationSeconds = plan.resolution.fictionalDurationSeconds;
      const offerId = randomUUID();
      const offer = {
        id: offerId,
        nodes: [
          {
            id: plan.key,
            parent: null,
            label: plan.label,
            description: plan.intention,
            action: {
              kind: 'attempt' as const,
              timing: {
                kind: 'finite' as const,
                fictionalSeconds: durationSeconds,
              },
            },
          },
        ],
      };
      const startGameSecond = state.gameSecond;
      const targetGameSecond = startGameSecond + durationSeconds;
      const selectionNow = await readDatabaseClockMs(tx, current.id);

      await tx.insert(gameActionExecution).values({
        operationId,
        storyId: current.id,
        offerId,
        actionKey: plan.key,
        baseRevision: current.revision,
        offer,
        plan,
        pendingResolution: null,
        preparationGenerationId: null,
        startGameSecond,
        targetGameSecond,
        state: 'running',
        revision: 0,
      });
      await recordActionExecutionEvent(tx, {
        storyId: current.id,
        executionId: operationId,
        executionRevision: 0,
        gameSecond: startGameSecond,
        kind: 'started',
        label: plan.label,
      });
      const holds = campaignHoldsSchema
        .parse(state.holds)
        .filter((hold) => hold.kind !== 'decision');
      await tx
        .update(campaign)
        .set({
          offer: null,
          holds,
          situationAuthorization: {
            version: 2,
            offerId: null,
            activityAccess: { kind: 'none' },
            preparedPlans: [],
          },
          activeActionOperationId: operationId,
          clockAnchorAt: new Date(selectionNow),
        })
        .where(eq(campaign.storyId, current.id));
      await tx
        .update(customIntentCandidate)
        .set({
          status: 'accepted',
          acceptedOperationId: operationId,
        })
        .where(eq(customIntentCandidate.candidateId, candidate.candidateId));
      await incrementStoryViewVersion(tx, {
        storyId: current.id,
        viewVersion: current.viewVersion + 1,
      });
      await saveCommand(tx, current.id, operationId, request);
      await scheduleActionExecution(tx, operationId);
    });

    return { operationId, candidateId: body.candidateId };
  };
}

/** Test/fixture helper: declare public inspect targets for a story. */
export async function seedStoryPublicInspectTargets(
  database: Database,
  storyId: string,
  targets: readonly { handle: string; label: string }[],
) {
  for (const target of targets) {
    await database.db
      .insert(storyPublicInspectTarget)
      .values({
        storyId,
        handle: target.handle,
        label: target.label,
      })
      .onConflictDoNothing();
  }
}

export function customIntentCandidateDigest(candidateId: string, match: CustomIntentMatch) {
  return createHash('sha256')
    .update(JSON.stringify({ candidateId, match }))
    .digest('hex');
}
