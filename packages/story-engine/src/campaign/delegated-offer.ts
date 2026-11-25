import { createHash, randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import {
  campaignDelegatedOffer,
  storyDelegationPolicy,
} from '@offscreen/story-persistence/campaign';
import {
  immediateActionPlanSchema,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import {
  DECLINE_HARMLESS_INVITATION_CLASS,
  isDeclineHarmlessInvitation,
} from '@offscreen/game/delegation-eligibility';
import type { Transaction } from '@offscreen/db';
import { enqueue } from '@offscreen/outbox/enqueue';
import {
  incrementStoryViewVersion,
  lockOwnedStory,
  readDatabaseClockMs,
} from '../stories/persistence';
import { StoryError } from '../stories/errors';
import { PREAPPROVED_WITHDRAWAL_WINDOW_MS } from './delegated-decision';
import { commandReceipt, saveCommand } from './settings';

export const DELEGATED_DECISION_NOTICE_TOPIC = 'campaign.delegated-decision.v1';

type DelegationCaptureCandidate = {
  fallbackPlan: ImmediateActionPlan;
  fallbackPath: string;
  sourceFingerprint: string;
  capturedPolicyVersion: number;
};

export function canonicalPlanFingerprint(
  fallbackPlan: ImmediateActionPlan,
  fallbackActionKey: string,
): string {
  const canonical = immediateActionPlanSchema.parse(fallbackPlan);
  return createHash('sha256')
    .update(
      JSON.stringify({ plan: canonical, fallbackActionKey }),
      'utf8',
    )
    .digest('hex');
}

export function resolveDelegationCaptureCandidate(
  plans: readonly ImmediateActionPlan[],
  policy:
    | typeof storyDelegationPolicy.$inferSelect
    | undefined,
): DelegationCaptureCandidate | null {
  if (
    !policy?.enabled ||
    policy.allowedClass !== DECLINE_HARMLESS_INVITATION_CLASS
  ) {
    return null;
  }
  if (plans.length !== 2) {
    return null;
  }
  const eligible = plans.filter((plan) => isDeclineHarmlessInvitation(plan));
  if (eligible.length !== 1) {
    return null;
  }
  const fallbackPlan = eligible[0]!;
  const fallbackPath = JSON.stringify([fallbackPlan.key]);
  return {
    fallbackPlan,
    fallbackPath,
    sourceFingerprint: canonicalPlanFingerprint(
      fallbackPlan,
      fallbackPlan.key,
    ),
    capturedPolicyVersion: policy.version,
  };
}

/** Arms at most one capture when publication and owner policy both qualify. */
export async function captureDelegatedOfferOnPublication(
  tx: Transaction,
  input: {
    storyId: string;
    ownerId: string;
    narrativeRevision: number;
    offerId: string;
    plans: readonly ImmediateActionPlan[];
    clockMs: number;
  },
): Promise<boolean> {
  const [policy] = await tx
    .select()
    .from(storyDelegationPolicy)
    .where(eq(storyDelegationPolicy.storyId, input.storyId));
  if (!policy || policy.ownerId !== input.ownerId) {
    return false;
  }
  const candidate = resolveDelegationCaptureCandidate(input.plans, policy);
  if (!candidate) {
    return false;
  }

  await tx
    .update(campaignDelegatedOffer)
    .set({ status: 'held', remainingMs: null })
    .where(
      and(
        eq(campaignDelegatedOffer.storyId, input.storyId),
        inArray(campaignDelegatedOffer.status, ['armed', 'paused']),
      ),
    );

  const publishedAt = new Date(input.clockMs);
  const dueAt = new Date(input.clockMs + PREAPPROVED_WITHDRAWAL_WINDOW_MS);
  const actionOperationId = randomUUID();
  const wakeOperationId = randomUUID();

  await tx.insert(campaignDelegatedOffer).values({
    offerId: input.offerId,
    storyId: input.storyId,
    narrativeRevision: input.narrativeRevision,
    ownerId: input.ownerId,
    fallbackActionKey: candidate.fallbackPlan.key,
    fallbackPath: candidate.fallbackPath,
    sourceFingerprint: candidate.sourceFingerprint,
    capturedPolicyVersion: candidate.capturedPolicyVersion,
    publishedAt,
    dueAt,
    status: 'armed',
    controlRevision: 0,
    remainingMs: null,
    wakeEpoch: 1,
    actionOperationId,
    wakeOperationId,
    selectedAt: null,
    selectionSource: null,
  });

  await enqueue(tx, {
    id: randomUUID(),
    topic: DELEGATED_DECISION_NOTICE_TOPIC,
    operationId: wakeOperationId,
  });
  return true;
}

export async function revokeArmedDelegatedOffersOnPolicyDisable(
  tx: Transaction,
  storyId: string,
) {
  const active = await tx
    .select()
    .from(campaignDelegatedOffer)
    .where(
      and(
        eq(campaignDelegatedOffer.storyId, storyId),
        inArray(campaignDelegatedOffer.status, ['armed', 'paused']),
      ),
    );
  for (const row of active) {
    await tx
      .update(campaignDelegatedOffer)
      .set({
        status: 'revoked',
        wakeEpoch: row.wakeEpoch + 1,
        wakeOperationId: randomUUID(),
        controlRevision: row.controlRevision + 1,
        remainingMs: null,
      })
      .where(eq(campaignDelegatedOffer.offerId, row.offerId));
  }
}

const delegatedOfferControlSchema = z.discriminatedUnion('intent', [
  z.strictObject({ intent: z.literal('pause'), offerId: z.uuid() }),
  z.strictObject({ intent: z.literal('resume'), offerId: z.uuid() }),
  z.strictObject({ intent: z.literal('revoke'), offerId: z.uuid() }),
]);

export function createDelegatedOfferControls(database: Database) {
  return {
    async control(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }) {
      const parsed = delegatedOfferControlSchema.safeParse(args.body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      return database.db.transaction(async (tx) => {
        const current = await lockOwnedStory(tx, args);
        const request = { kind: 'delegated-offer-control', ...parsed.data };
        if (await commandReceipt(tx, current.id, args.operationId, request)) {
          const [row] = await tx
            .select()
            .from(campaignDelegatedOffer)
            .where(eq(campaignDelegatedOffer.offerId, parsed.data.offerId));
          return row ?? null;
        }

        const [row] = await tx
          .select()
          .from(campaignDelegatedOffer)
          .where(
            and(
              eq(campaignDelegatedOffer.offerId, parsed.data.offerId),
              eq(campaignDelegatedOffer.storyId, current.id),
            ),
          );
        if (!row || row.ownerId !== current.ownerId) {
          throw new StoryError('conflict');
        }

        const clockMs = await readDatabaseClockMs(tx, current.id);

        if (parsed.data.intent === 'pause') {
          if (row.status !== 'armed') {
            throw new StoryError('conflict');
          }
          if (clockMs >= row.dueAt.getTime()) {
            await saveCommand(tx, current.id, args.operationId, request);
            return row;
          }
          const remainingMs = row.dueAt.getTime() - clockMs;
          const wakeOperationId = randomUUID();
          const [updated] = await tx
            .update(campaignDelegatedOffer)
            .set({
              status: 'paused',
              remainingMs,
              wakeEpoch: row.wakeEpoch + 1,
              wakeOperationId,
              controlRevision: row.controlRevision + 1,
            })
            .where(eq(campaignDelegatedOffer.offerId, row.offerId))
            .returning();
          await saveCommand(tx, current.id, args.operationId, request);
          await incrementStoryViewVersion(tx, {
            storyId: current.id,
            viewVersion: current.viewVersion + 1,
          });
          return updated ?? row;
        }

        if (parsed.data.intent === 'resume') {
          if (row.status !== 'paused' || row.remainingMs === null) {
            throw new StoryError('conflict');
          }
          const dueAt = new Date(clockMs + row.remainingMs);
          const wakeOperationId = randomUUID();
          const [updated] = await tx
            .update(campaignDelegatedOffer)
            .set({
              status: 'armed',
              dueAt,
              remainingMs: null,
              wakeEpoch: row.wakeEpoch + 1,
              wakeOperationId,
              controlRevision: row.controlRevision + 1,
            })
            .where(eq(campaignDelegatedOffer.offerId, row.offerId))
            .returning();
          await enqueue(tx, {
            id: randomUUID(),
            topic: DELEGATED_DECISION_NOTICE_TOPIC,
            operationId: wakeOperationId,
          });
          await saveCommand(tx, current.id, args.operationId, request);
          await incrementStoryViewVersion(tx, {
            storyId: current.id,
            viewVersion: current.viewVersion + 1,
          });
          return updated ?? row;
        }

        if (row.status !== 'armed' && row.status !== 'paused') {
          throw new StoryError('conflict');
        }
        const wakeOperationId = randomUUID();
        const [updated] = await tx
          .update(campaignDelegatedOffer)
          .set({
            status: 'revoked',
            remainingMs: null,
            wakeEpoch: row.wakeEpoch + 1,
            wakeOperationId,
            controlRevision: row.controlRevision + 1,
          })
          .where(eq(campaignDelegatedOffer.offerId, row.offerId))
          .returning();
        await saveCommand(tx, current.id, args.operationId, request);
        await incrementStoryViewVersion(tx, {
          storyId: current.id,
          viewVersion: current.viewVersion + 1,
        });
        return updated ?? row;
      });
    },
  };
}