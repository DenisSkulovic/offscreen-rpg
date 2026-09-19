import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  campaign,
  gameActivity,
  gameActivityReport,
} from '@offscreen/db/campaign-schema';
import { generation } from '@offscreen/db/generation-schema';
import { storyResolution } from '@offscreen/db/story-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import { offerSchema } from '@offscreen/game/offers';
import {
  authorizeSituation,
  immediateActionAvailable,
  validateImmediateActionProposal,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import {
  storytellerTaskSchema,
  validateStorytellerResult,
} from '@offscreen/storyteller/tasks';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { setPublication, storytellerKind } from './records';
import { translateGeneratedContinuation } from '../generations/generated-continuation';
import { commitStoryContinuation } from '../stories/continuation';
import {
  lockOwnedStory,
  insertContinuationPassage,
  advanceStoryView,
  incrementStoryViewVersion,
  readDatabaseClockMs,
} from '../stories/persistence';
import { publishStorytellerNotes } from './memory';
import { StoryError } from '../stories/errors';
import { continuationSchema } from '../stories/command-policy';
import { saveOfferPlans } from '../campaign/persistence';
import { resolvedActivityPlanSchema } from '@offscreen/game/activities';
import { transitionStorytellerHoldToDecision } from '../campaign/holds';

export async function publishStorytellerResult(
  database: Database,
  id: string,
  realDurationMs: (gameDurationMs: number) => number,
) {
  await database.db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(generation)
      .where(and(eq(generation.id, id), eq(generation.kind, storytellerKind)));
    if (!record) {
      return;
    }
    const task = storytellerTaskSchema.parse(record.input);
    if (record.state !== 'succeeded') {
      if (task.task === 'report' && record.state === 'failed') {
        const current = await lockOwnedStory(tx, {
          storyId: task.source.storyId,
          ownerId: record.ownerId,
        });
        const changed = await tx
          .update(gameActivityReport)
          .set({ state: 'blocked' })
          .where(
            and(
              eq(gameActivityReport.id, task.source.hookId),
              eq(gameActivityReport.generationId, id),
              eq(gameActivityReport.state, 'generating'),
            ),
          )
          .returning({ id: gameActivityReport.id });
        if (changed.length) {
          await incrementStoryViewVersion(tx, {
            storyId: current.id,
            viewVersion: current.viewVersion + 1,
          });
        }
        await setPublication(
          tx,
          id,
          'blocked',
          record.failureCode ?? 'generation_failed',
        );
      }
      return;
    }
    const result = validateStorytellerResult(task, record.output);
    if (task.task === 'opening') {
      await setPublication(tx, id, 'published');
      return;
    }
    const current = await lockOwnedStory(tx, {
      storyId: task.source.storyId,
      ownerId: record.ownerId,
    });
    const [publication] = await tx
      .select()
      .from(storytellerPublication)
      .where(eq(storytellerPublication.generationId, id));
    if (publication?.state === 'published' || publication?.state === 'stale') {
      return;
    }
    if (task.task === 'report') {
      if (!('report' in result)) {
        throw new StoryError('invalid');
      }
      const [hook] = await tx
        .select()
        .from(gameActivityReport)
        .where(eq(gameActivityReport.id, task.source.hookId))
        .for('update');
      if (
        !hook ||
        hook.storyId !== current.id ||
        hook.generationId !== id ||
        hook.sourcePassageId !== task.source.passageId ||
        hook.sourceRevision !== task.source.narrativeRevision
      ) {
        throw new StoryError('invalid');
      }
      if (hook.state === 'published') {
        await setPublication(tx, id, 'published');
        return;
      }
      await tx
        .update(gameActivityReport)
        .set({
          state: 'published',
          report: result.report,
          publishedAt: new Date(),
        })
        .where(eq(gameActivityReport.id, hook.id));
      await incrementStoryViewVersion(tx, {
        storyId: current.id,
        viewVersion: current.viewVersion + 1,
      });
      await setPublication(tx, id, 'published');
      return;
    }
    if ('report' in result) {
      throw new StoryError('invalid');
    }
    if (current.revision !== task.source.narrativeRevision) {
      await setPublication(tx, id, 'stale');
      return;
    }
    const [resolution] = await tx
      .select()
      .from(storyResolution)
      .where(eq(storyResolution.generationId, id));
    if (!resolution || resolution.basePassageId !== task.source.passageId) {
      throw new StoryError('invalid');
    }
    if (task.task === 'consequence') {
      const [campaignState] = await tx
        .select()
        .from(campaign)
        .where(eq(campaign.storyId, current.id));
      if (!campaignState) {
        throw new StoryError('invalid');
      }
      if (
        result.scene.version !== 3 ||
        result.scene.next.kind !== 'action-plans'
      ) {
        throw new StoryError('invalid');
      }
      const resolutionContext = task.context.resolution;
      if (!resolutionContext) {
        throw new StoryError('invalid');
      }
      const evidenceHandles = new Set(
        task.context.evidence.map((passage) => `p${passage.sequence}`),
      );
      const selectedPlans: ImmediateActionPlan[] = [];
      for (const proposal of result.scene.next.plans) {
        const validation = validateImmediateActionProposal({
          proposal,
          character: resolutionContext.character,
          storyFacts: resolutionContext.storyFacts,
          evidenceHandles,
        });
        if (validation.kind === 'rejected') {
          throw new StoryError('invalid');
        }
        if (
          !immediateActionAvailable(
            resolutionContext.character,
            resolutionContext.storyFacts,
            validation.plan,
          )
        ) {
          throw new StoryError('invalid');
        }
        let admittedPlan = validation.plan;
        if (admittedPlan.resolution.kind === 'resume') {
          const resume = admittedPlan.resolution;
          const retained = (
            await tx
              .select()
              .from(gameActivity)
              .where(eq(gameActivity.storyId, current.id))
          ).filter((candidate) => {
            if (!['encounter', 'suspended'].includes(candidate.state)) {
              return false;
            }
            if (
              resolvedActivityPlanSchema.parse(candidate.plan).action.id ===
              resume.activityActionId
            ) {
              return (
                resume.activityId === undefined ||
                (candidate.id === resume.activityId &&
                  candidate.revision === resume.activityRevision)
              );
            }
            return false;
          });
          if (retained.length !== 1 || !retained[0]) {
            throw new StoryError('invalid');
          }
          admittedPlan = {
            ...admittedPlan,
            resolution: {
              ...admittedPlan.resolution,
              activityId: retained[0].id,
              activityRevision: retained[0].revision,
            },
          };
        }
        selectedPlans.push(admittedPlan);
      }
      const plannedOffer = offerSchema.parse({
        id: randomUUID(),
        nodes: selectedPlans.map((plan) => {
          return {
            id: plan.key,
            parent: null,
            label: plan.label,
            description: plan.intention,
            risk: plan.risk,
            action: {
              kind: 'attempt',
              timing:
                plan.resolution.kind === 'process' ||
                plan.resolution.kind === 'resume'
                  ? 'process'
                  : 'instant',
            },
          };
        }),
      });
      const passageId = await insertContinuationPassage(tx, {
        storyId: current.id,
        sequence: current.revision + 1,
        transitionId: resolution.operationId,
        sourceGenerationId: id,
        responseSource: null,
        input: {
          expectedRevision: current.revision,
          content: result.scene.content,
          effects: [],
          response: null,
          interaction: null,
          wait: null,
          decision: null,
          sourceGenerationPart: 'current',
        },
      });
      await publishStorytellerNotes(tx, {
        storyId: current.id,
        generationId: id,
        passageId,
        revision: current.revision + 1,
        sourcePart: 'current',
        notes: current.continuityNotes,
      });
      await saveOfferPlans(
        tx,
        current.id,
        current.revision + 1,
        plannedOffer.id,
        selectedPlans,
      );
      await tx
        .update(campaign)
        .set({
          offer: plannedOffer,
          situationAuthorization: authorizeSituation(
            selectedPlans,
            plannedOffer.id,
            result.scene.next.activityAccess,
          ),
        })
        .where(eq(campaign.storyId, current.id));
      await transitionStorytellerHoldToDecision(
        tx,
        campaignState,
        id,
        plannedOffer.id,
        await readDatabaseClockMs(tx, current.id),
      );
      await advanceStoryView(tx, {
        storyId: current.id,
        revision: current.revision + 1,
        viewVersion: current.viewVersion + 1,
      });
      await setPublication(tx, id, 'published');
      return;
    }
    const proposed = translateGeneratedContinuation({
      output: result.scene,
      generationId: id,
      response: interactionSubmissionSchema.parse(resolution.submission),
      realDurationMs,
    });
    const continuation = continuationSchema.safeParse({
      ...proposed,
      expectedRevision: task.source.narrativeRevision,
    });
    if (!continuation.success) {
      throw new StoryError('invalid');
    }
    await commitStoryContinuation(tx, {
      ownerId: record.ownerId,
      storyId: task.source.storyId,
      transitionId: resolution.operationId,
      input: continuation.data,
      completingIntervalPassageId: undefined,
      completingDecisionPassageId: undefined,
      sourceGenerationId: id,
    });
    await setPublication(tx, id, 'published');
  });
}
