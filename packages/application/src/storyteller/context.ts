import {
  campaign,
  campaignSettings,
  gameActivity,
} from '@offscreen/db/campaign-schema';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { storyItem, storyPassage } from '@offscreen/db/story-schema';
import { contextInputSchema } from '@offscreen/storyteller/context';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import type { Transaction } from '../outbox/index';
import {
  activityProgressSchema,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { situationAuthorizationSchema } from '@offscreen/game/immediate-actions';
import { readAcceptedActivityPlan } from '../campaign/accepted-plans';
import { z } from 'zod';

const activeSceneAnchorSchema = z.strictObject({
  version: z.literal('active-scene-anchor.v1'),
  fromSequence: z.number().int().positive(),
  requiredPassageIds: z.array(z.uuid()).max(40),
});

function projectActivityProgress(plan: unknown, progress: unknown) {
  const resolved = resolvedActivityPlanSchema.parse(plan);
  const stored = activityProgressSchema.parse(progress).process;
  if (resolved.action.process.kind === 'contribution.v1') {
    if (stored.kind !== 'contribution.v1') {
      throw new Error('Stored activity progress does not match its rule');
    }
    return {
      action: resolved.action,
      progress: {
        kind: 'contribution' as const,
        label: resolved.action.process.progressLabel,
        earned: stored.earned,
        required: resolved.action.process.requiredContribution,
      },
    };
  }
  if (stored.kind !== 'clock-wait.v1') {
    throw new Error('Stored activity progress does not match its rule');
  }
  return {
    action: resolved.action,
    progress: {
      kind: 'wait' as const,
      label: resolved.action.process.progressLabel,
      elapsedTicks: stored.elapsedTicks,
      requiredTicks: resolved.action.process.requiredTicks,
    },
  };
}

/** Called inside admission while holding the story lock. No uncommitted future is evidence. */
export async function loadStorytellerContext(
  tx: Transaction,
  input: {
    storyId: string;
    revision: number;
    premise: unknown;
    notes: unknown;
    activeSceneScope: unknown;
    selected: { id: string; label: string; intention: string };
  },
) {
  const notes = continuityNotesSchema.parse(input.notes ?? []);
  const activeScene =
    input.activeSceneScope === null
      ? null
      : activeSceneAnchorSchema.parse(input.activeSceneScope);
  const recentQuery = tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, input.storyId),
        lte(storyPassage.sequence, input.revision),
        ...(activeScene
          ? [gte(storyPassage.sequence, activeScene.fromSequence)]
          : []),
      ),
    )
    .orderBy(desc(storyPassage.sequence));
  const recent = activeScene ? await recentQuery : await recentQuery.limit(7);
  const evidenceIds = [
    ...new Set([
      ...notes.flatMap((note) => note.sources),
      ...(activeScene?.requiredPassageIds ?? []),
    ]),
  ];
  const older = evidenceIds.length
    ? await tx
        .select()
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, input.storyId),
            lte(storyPassage.sequence, input.revision),
            inArray(storyPassage.id, evidenceIds),
          ),
        )
    : [];
  const evidence = [
    ...new Map(
      [...recent, ...older].map((passage) => [
        passage.id,
        {
          id: passage.id,
          sequence: passage.sequence,
          content: passage.content,
          // The published passage already describes the consequence; retain the accepted response identity as evidence.
          response:
            passage.response === null
              ? null
              : interactionSubmissionSchema.parse(passage.response).answer
                  .optionId,
        },
      ]),
    ).values(),
  ];
  const current = evidence.find(
    (passage) => passage.sequence === input.revision,
  );
  if (!current) {
    throw new Error('Missing current story context');
  }
  const items = await tx
    .select({
      key: storyItem.key,
      label: storyItem.label,
      holderKey: storyItem.holderKey,
    })
    .from(storyItem)
    .where(eq(storyItem.storyId, input.storyId));
  const [settingsRow] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, input.storyId));
  const [captured] = settingsRow
    ? await tx
        .select({ settings: campaignSettings.settings })
        .from(campaignSettings)
        .where(
          and(
            eq(campaignSettings.storyId, input.storyId),
            eq(campaignSettings.revision, settingsRow.settingsRevision),
          ),
        )
    : [];
  if (settingsRow && !captured) {
    throw new Error('Missing captured campaign settings');
  }
  const commitments = settingsRow
    ? await tx
        .select()
        .from(gameActivity)
        .where(eq(gameActivity.storyId, input.storyId))
    : [];
  const acceptedPlan = settingsRow
    ? readAcceptedActivityPlan(settingsRow.acceptedActivityPlan)
    : null;
  const blockedEntry = acceptedPlan?.entries[acceptedPlan.cursor];
  const acceptedHandoff =
    acceptedPlan?.state === 'blocked' &&
    blockedEntry?.state === 'blocked' &&
    blockedEntry.activityId === null
      ? {
          id: acceptedPlan.id,
          revision: acceptedPlan.revision,
          horizonTick: acceptedPlan.horizonTick,
          nextEntry: { id: blockedEntry.id, plan: blockedEntry.plan },
        }
      : undefined;
  const activitySituation = settingsRow
    ? {
        activityAccess: situationAuthorizationSchema.parse(
          settingsRow.situationAuthorization,
        ).activityAccess,
        activeActivityId: settingsRow.activeActivityId,
        ...(acceptedHandoff ? { acceptedPlan: acceptedHandoff } : {}),
        commitments: commitments.flatMap((record) => {
          if (
            ![
              'running',
              'paused',
              'suspended',
              'blocked',
              'encounter',
              'completion-pending',
            ].includes(record.state)
          ) {
            return [];
          }
          const projected = projectActivityProgress(
            record.plan,
            record.progress,
          );
          return [
            {
              activityId: record.id,
              actionId: projected.action.id,
              revision: record.revision,
              state: record.state,
              label: projected.action.label,
              progress: projected.progress,
            },
          ];
        }),
      }
    : undefined;
  return contextInputSchema.parse({
    ...(activeScene
      ? {
          activeSceneScope: {
            version: 'active-scene.v1',
            fromSequence: activeScene.fromSequence,
            throughSequence: input.revision,
            requiredPassageIds: activeScene.requiredPassageIds,
          },
        }
      : {}),
    ...(activitySituation ? { activitySituation } : {}),
    ...(captured ? { campaignSettings: captured.settings } : {}),
    premise: input.premise,
    current,
    items,
    selected: input.selected,
    notes,
    evidence,
  });
}
