/**
 * Locked Storyteller context assembly from authoritative application state.
 *
 * Uses SQL for current story, clock, commitments, and accepted passages.
 * Delegates pinned document selection/omission to canonical-knowledge.ts.
 * It does not construct provider requests or publish model output.
 */
import { campaign, campaignSettings, gameActivity } from '@offscreen/db/campaign-schema';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { storyItem, storyPassage } from '@offscreen/db/story-schema';
import { contextInputSchema, continuityNotesSchema } from '@offscreen/storyteller/context';
import { campaignSettingsSchema } from '@offscreen/contracts/campaign';
import { projectWorldTime } from '@offscreen/game/calendar';
import { worldConditionsSchema } from '@offscreen/game/world-obligations';
import type { Transaction } from '../outbox/index';
import { activityProgressSchema, resolvedActivityPlanSchema } from '@offscreen/game/activities';
import { situationAuthorizationSchema } from '@offscreen/game/immediate-actions';
import { readAcceptedActivityPlan } from '../campaign/accepted-plans';
import { z } from 'zod';
import type { DocumentStore } from '@offscreen/documents';
import { readPassageDocument } from '../stories/passage-documents';
import type { CanonicalRecallCue } from './canonical-search';
import {
  loadCanonicalKnowledge,
  type CanonicalLibrarySectionSelection,
  type CanonicalCampaignDocumentSelection,
} from './canonical-knowledge';

// Maintain the existing public application API while routing knowledge
// questions to its narrowly owned module.
export {
  loadCanonicalKnowledge,
  loadStartPackageKnowledge,
  canonicalContextDependencies,
  canonicalRuleEvidence,
  canonicalWorldEvidence,
  type CanonicalLibrarySectionSelection,
  type CanonicalCampaignDocumentSelection,
} from './canonical-knowledge';

const activeSceneAnchorSchema = z.strictObject({
  version: z.literal('active-scene-anchor.v1'),
  fromSequence: z.number().int().positive(),
  requiredPassageIds: z.array(z.uuid()).max(40),
  recallCues: z
    .array(
      z.strictObject({
        documentId: z.uuid(),
        reason: z.enum(['identity', 'place', 'thread']),
      }),
    )
    .max(8)
    .default([]),
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
      elapsedFictionalSeconds: stored.elapsedFictionalSeconds,
      requiredFictionalSeconds:
        resolved.action.process.requiredFictionalSeconds,
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
    projectGameSecond?: number;
    documentStore?: DocumentStore;
    canonical?: {
      rootHash: string;
      rootRevision: number;
      librarySectionSelection?: CanonicalLibrarySectionSelection;
      campaignDocumentIds?: CanonicalCampaignDocumentSelection;
      recallCues?: CanonicalRecallCue[];
    };
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
  const evidence = await Promise.all(
    [
      ...new Map(
        [...recent, ...older].map((passage) => [passage.id, passage]),
      ).values(),
    ].map(async (passage) => {
      if (passage.contentDocumentHash !== null && !input.documentStore) {
        throw new Error('Canonical passage context requires document storage');
      }
      return {
        id: passage.id,
        sequence: passage.sequence,
        content: passage.contentDocumentHash
          ? await readPassageDocument(
              input.documentStore!,
              passage.contentDocumentHash,
            )
          : passage.content,
        // The published passage already describes the consequence; retain the accepted response identity as evidence.
        response:
          passage.response === null
            ? null
            : interactionSubmissionSchema.parse(passage.response).answer
                .optionId,
      };
    }),
  );
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
  const acceptedSettings = captured
    ? campaignSettingsSchema.parse(captured.settings)
    : null;
  const compactSettings = acceptedSettings
    ? (({ time: _time, ...settings }) => settings)(acceptedSettings)
    : null;
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
          horizonGameSecond: acceptedPlan.horizonGameSecond,
          nextEntry: { id: blockedEntry.id, plan: blockedEntry.plan },
        }
      : undefined;
  if (input.canonical && !input.documentStore) {
    throw new Error('Canonical knowledge requires document storage');
  }
  const canonicalKnowledge = input.canonical
    ? await loadCanonicalKnowledge(input.documentStore!, {
        storyId: input.storyId,
        rootHash: input.canonical.rootHash,
        rootRevision: input.canonical.rootRevision,
        ...(input.canonical.librarySectionSelection
          ? {
              librarySectionSelection: input.canonical.librarySectionSelection,
            }
          : {}),
        ...(input.canonical.campaignDocumentIds
          ? { campaignDocumentIds: input.canonical.campaignDocumentIds }
          : {}),
        recallCues: [
          ...(activeScene?.recallCues ?? []),
          ...(input.canonical.recallCues ?? []),
        ],
      })
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
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
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
    ...(compactSettings ? { campaignSettings: compactSettings } : {}),
    ...(acceptedSettings && settingsRow
      ? {
          campaignTime: projectWorldTime(
            acceptedSettings.time,
            input.projectGameSecond ?? settingsRow.gameSecond,
          ),
        }
      : {}),
    ...(settingsRow
      ? {
          worldConditions: worldConditionsSchema.parse(
            settingsRow.worldConditions,
          ),
        }
      : {}),
    premise: input.premise,
    current,
    items,
    selected: input.selected,
    notes,
    evidence,
  });
}
