import { isDeepStrictEqual } from 'node:util';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import {
  storyDelegationPolicy,
  storyDelegationPolicyCommand,
} from '@offscreen/db/campaign-schema';
import { DECLINE_HARMLESS_INVITATION_CLASS } from '@offscreen/game/delegation-eligibility';
import type { Transaction } from '../outbox/index';
import { revokeArmedDelegatedOffersOnPolicyDisable } from '../campaign/delegated-offer';
import { incrementStoryViewVersion, lockOwnedStory } from './persistence';
import { StoryError, parseStoryIdentifier } from './errors';

export const DELEGATION_POLICY_ALLOWED_CLASS = DECLINE_HARMLESS_INVITATION_CLASS;

const delegationPolicyCommandSchema = z.discriminatedUnion('intent', [
  z.strictObject({ intent: z.literal('enable') }),
  z.strictObject({ intent: z.literal('disable') }),
]);

export type StoryDelegationPolicyView = {
  enabled: boolean;
  version: number | null;
  allowedClass: typeof DELEGATION_POLICY_ALLOWED_CLASS | null;
};

function toPolicyView(
  row: typeof storyDelegationPolicy.$inferSelect | undefined,
): StoryDelegationPolicyView {
  if (!row) {
    return { enabled: false, version: null, allowedClass: null };
  }
  return {
    enabled: row.enabled,
    version: row.version,
    allowedClass: DELEGATION_POLICY_ALLOWED_CLASS,
  };
}

async function readPolicyRow(tx: Transaction, storyId: string) {
  const [row] = await tx
    .select()
    .from(storyDelegationPolicy)
    .where(eq(storyDelegationPolicy.storyId, storyId));
  return row;
}

async function policyCommandReceipt(
  tx: Transaction,
  storyId: string,
  operationId: string,
  request: unknown,
) {
  parseStoryIdentifier(operationId);
  const [prior] = await tx
    .select()
    .from(storyDelegationPolicyCommand)
    .where(
      and(
        eq(storyDelegationPolicyCommand.storyId, storyId),
        eq(storyDelegationPolicyCommand.operationId, operationId),
      ),
    );
  if (prior && !isDeepStrictEqual(prior.request, request)) {
    throw new StoryError('conflict');
  }
  return prior ?? null;
}

export function createStoryDelegationPolicy(database: Database) {
  return {
    async read(args: { ownerId: string; storyId: string }) {
      return database.db.transaction(async (tx) => {
        await lockOwnedStory(tx, args);
        const row = await readPolicyRow(tx, args.storyId);
        return toPolicyView(row);
      });
    },
    async update(args: {
      ownerId: string;
      storyId: string;
      operationId: string;
      body: unknown;
    }): Promise<StoryDelegationPolicyView> {
      const parsed = delegationPolicyCommandSchema.safeParse(args.body);
      if (!parsed.success) {
        throw new StoryError('invalid');
      }
      return database.db.transaction(async (tx) => {
        const current = await lockOwnedStory(tx, args);
        const request = { kind: 'delegation-policy', ...parsed.data };
        const priorReceipt = await policyCommandReceipt(
          tx,
          current.id,
          args.operationId,
          request,
        );
        if (priorReceipt) {
          const row = await readPolicyRow(tx, current.id);
          return toPolicyView(row);
        }

        const existing = await readPolicyRow(tx, current.id);
        let resultVersion: number;

        if (parsed.data.intent === 'enable') {
          if (existing) {
            if (existing.ownerId !== current.ownerId) {
              throw new StoryError('conflict');
            }
            resultVersion = existing.version + 1;
            await tx
              .update(storyDelegationPolicy)
              .set({
                version: resultVersion,
                enabled: true,
                updatedAt: new Date(),
              })
              .where(eq(storyDelegationPolicy.storyId, current.id));
          } else {
            resultVersion = 1;
            await tx.insert(storyDelegationPolicy).values({
              storyId: current.id,
              ownerId: current.ownerId,
              version: resultVersion,
              allowedClass: DELEGATION_POLICY_ALLOWED_CLASS,
              enabled: true,
            });
          }
        } else {
          if (!existing || existing.ownerId !== current.ownerId) {
            throw new StoryError('conflict');
          }
          resultVersion = existing.version + 1;
          await tx
            .update(storyDelegationPolicy)
            .set({
              version: resultVersion,
              enabled: false,
              updatedAt: new Date(),
            })
            .where(eq(storyDelegationPolicy.storyId, current.id));
          await revokeArmedDelegatedOffersOnPolicyDisable(tx, current.id);
        }

        await tx.insert(storyDelegationPolicyCommand).values({
          storyId: current.id,
          operationId: args.operationId,
          request,
          resultVersion,
        });
        await incrementStoryViewVersion(tx, {
          storyId: current.id,
          viewVersion: current.viewVersion + 1,
        });
        const row = await readPolicyRow(tx, current.id);
        return toPolicyView(row);
      });
    },
  };
}