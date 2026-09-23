import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  campaignSettings,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import {
  story,
  storyItem,
  storyPassage,
  storyResolution,
} from '@offscreen/db/story-schema';
import { StoryError, parseStoryIdentifier } from './errors';

function forkConflict(reason: string): never {
  throw new StoryError('conflict', `fork_${reason}`);
}

function remapInitialScene(
  scope: unknown,
  sourcePassageId: string,
  forkPassageId: string,
) {
  if (scope === null) return null;
  const expected = {
    version: 'active-scene-anchor.v1',
    fromSequence: 1,
    requiredPassageIds: [sourcePassageId],
  };
  if (!isDeepStrictEqual(scope, expected)) {
    forkConflict('active_scene_remap_required');
  }
  return { ...expected, requiredPassageIds: [forkPassageId] };
}

function isUnstartedCampaign(state: typeof campaign.$inferSelect) {
  return (
    state.character === null &&
    state.content === null &&
    state.location === null &&
    state.gameSecond === 0 &&
    state.acceptedActivityPlan === null &&
    state.offer === null &&
    state.activeActivityId === null &&
    state.activeActionOperationId === null &&
    isDeepStrictEqual(state.storyFacts, []) &&
    isDeepStrictEqual(state.activityOccurrences, []) &&
    isDeepStrictEqual(state.holds, []) &&
    isDeepStrictEqual(state.worldConditions, [])
  );
}

/** Fork the one snapshot-complete checkpoint currently supported by Phase 1. */
export function createStoryForks(database: Database) {
  return async function forkCurrent(input: {
    ownerId: string;
    sourceStoryId: string;
    forkStoryId: string;
    expectedRevision: number;
  }) {
    const sourceStoryId = parseStoryIdentifier(input.sourceStoryId);
    const forkStoryId = parseStoryIdentifier(input.forkStoryId);
    if (sourceStoryId === forkStoryId) throw new StoryError('invalid');

    await database.db.transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(story)
        .where(
          and(eq(story.id, sourceStoryId), eq(story.ownerId, input.ownerId)),
        )
        .for('update');
      if (!source) throw new StoryError('not_found');

      const [prior] = await tx
        .select()
        .from(story)
        .where(eq(story.id, forkStoryId));
      if (prior) {
        if (
          prior.ownerId !== input.ownerId ||
          prior.forkedFromStoryId !== sourceStoryId ||
          prior.forkedFromSequence !== input.expectedRevision
        ) {
          forkConflict('destination_in_use');
        }
        return;
      }

      if (source.revision !== input.expectedRevision || source.revision !== 1) {
        forkConflict('unsupported_revision');
      }
      const [sourcePassage] = await tx
        .select()
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, sourceStoryId),
            eq(storyPassage.sequence, source.revision),
          ),
        );
      if (!sourcePassage) forkConflict('missing_checkpoint');
      const [campaignState] = await tx
        .select()
        .from(campaign)
        .where(eq(campaign.storyId, sourceStoryId));
      const [resolution] = await tx
        .select({ id: storyResolution.generationId })
        .from(storyResolution)
        .where(eq(storyResolution.storyId, sourceStoryId))
        .limit(1);
      const [obligation] = await tx
        .select({ id: worldObligation.id })
        .from(worldObligation)
        .where(eq(worldObligation.storyId, sourceStoryId))
        .limit(1);
      if (resolution) forkConflict('pending_resolution');
      if (obligation) forkConflict('world_obligations');
      if (campaignState !== undefined && !isUnstartedCampaign(campaignState)) {
        forkConflict('mutable_campaign_state');
      }
      if (
        sourcePassage.waitPlan !== null ||
        sourcePassage.decisionPlan !== null ||
        sourcePassage.dueAt !== null ||
        sourcePassage.responseDueAt !== null
      ) {
        forkConflict('timed_checkpoint');
      }
      if (
        !isDeepStrictEqual(
          source.continuityNotes,
          source.storyteller ? [] : null,
        )
      ) {
        forkConflict('continuity_remap_required');
      }

      const forkPassageId = randomUUID();
      const activeSceneScope = remapInitialScene(
        source.activeSceneScope,
        sourcePassage.id,
        forkPassageId,
      );
      const inserted = await tx
        .insert(story)
        .values({
          id: forkStoryId,
          ownerId: input.ownerId,
          source: source.source,
          premise: source.premise,
          storyteller: source.storyteller,
          execution: source.execution,
          usagePolicy: source.usagePolicy,
          continuityNotes: source.continuityNotes,
          activeSceneScope,
          forkedFromStoryId: sourceStoryId,
          forkedFromPassageId: sourcePassage.id,
          forkedFromSequence: source.revision,
        })
        .onConflictDoNothing()
        .returning({ id: story.id });
      if (!inserted.length) forkConflict('destination_in_use');

      const items = await tx
        .select()
        .from(storyItem)
        .where(eq(storyItem.storyId, sourceStoryId));
      if (items.length) {
        await tx.insert(storyItem).values(
          items.map((item) => ({
            storyId: forkStoryId,
            key: item.key,
            label: item.label,
            holderKey: item.holderKey,
          })),
        );
      }
      if (campaignState) {
        const settings = await tx
          .select()
          .from(campaignSettings)
          .where(eq(campaignSettings.storyId, sourceStoryId));
        if (
          !settings.length ||
          !settings.some(
            (entry) => entry.revision === campaignState.settingsRevision,
          )
        ) {
          forkConflict('settings_incomplete');
        }
        await tx.insert(campaignSettings).values(
          settings.map((entry) => ({
            storyId: forkStoryId,
            revision: entry.revision,
            settings: entry.settings,
            profile: entry.profile,
          })),
        );
        await tx.insert(campaign).values({
          ...campaignState,
          storyId: forkStoryId,
        });
      }
      await tx.insert(storyPassage).values({
        ...sourcePassage,
        id: forkPassageId,
        storyId: forkStoryId,
        transitionId: null,
        // Lineage retains the source passage. Reusing its generation would make
        // one paid attempt appear as spend on two independent stories.
        sourceGenerationId: null,
        sourceGenerationPart: null,
        createdAt: new Date(),
      });
    });
  };
}
