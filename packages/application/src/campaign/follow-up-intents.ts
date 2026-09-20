import type { Transaction } from '../outbox/index';
import { holdCampaignForStorytellerIntent } from './holds';
import {
  requestActionNarration,
  requestConsequenceNarration,
} from './narration';
import type { ActivityRecord, CampaignRecord } from './persistence';
import { requestActivityReport } from './reports';
import type { StoryRecord } from '../stories/persistence';
import type { OutcomeEffect } from '@offscreen/game/effects';
import { transitionStorytellerIntentToGeneration } from './holds';
import { enqueue } from '../outbox/index';
import { storytellerTopic } from '../storyteller/records';
import { randomUUID } from 'node:crypto';

/**
 * Durable work required by an already-decided campaign transition. These are
 * commands to application adapters, not domain facts or an in-process event bus.
 */
export type CampaignFollowUpIntent =
  | {
      kind: 'prepare-action-consequence';
      operationId: string;
    }
  | {
      kind: 'publish-prepared-action-consequence';
      operationId: string;
      generationId: string;
    }
  | {
      kind: 'prepare-activity-consequence';
      current: StoryRecord;
      activityId: string;
      passageId: string;
      afterSegment: number;
      throughSegment: number;
      label: string;
      intention: string;
    }
  | {
      kind: 'prepare-activity-report';
      current: StoryRecord;
      activity: ActivityRecord;
      passageId: string;
      label: string;
      intention: string;
      factualSummary: string;
      completionEffects: readonly OutcomeEffect[];
    };

/**
 * Applies follow-ups inside the transition's transaction so its hold and
 * outbox notice cannot be separated from the authoritative state change.
 */
export async function applyCampaignFollowUpIntents(
  tx: Transaction,
  state: CampaignRecord,
  intents: readonly CampaignFollowUpIntent[],
  now: number,
) {
  let nextState = state;
  for (const intent of intents) {
    switch (intent.kind) {
      case 'prepare-action-consequence':
        nextState = await holdCampaignForStorytellerIntent(
          tx,
          nextState,
          intent.operationId,
          now,
        );
        await requestActionNarration(tx, intent.operationId);
        break;
      case 'publish-prepared-action-consequence':
        nextState = await holdCampaignForStorytellerIntent(
          tx,
          nextState,
          intent.operationId,
          now,
        );
        nextState = await transitionStorytellerIntentToGeneration(
          tx,
          nextState,
          intent.operationId,
          intent.generationId,
          now,
        );
        // A fast preparation may already have attempted publication while its
        // receipt was private. Settlement gives the same generation a fresh,
        // idempotent publication wake; a slow execution safely sees it too.
        await enqueue(tx, {
          id: randomUUID(),
          operationId: intent.generationId,
          topic: storytellerTopic,
        });
        break;
      case 'prepare-activity-consequence':
        nextState = await holdCampaignForStorytellerIntent(
          tx,
          nextState,
          intent.activityId,
          now,
        );
        await requestConsequenceNarration(tx, intent.current, {
          kind: 'activity',
          passageId: intent.passageId,
          operationId: intent.activityId,
          afterSegment: intent.afterSegment,
          throughSegment: intent.throughSegment,
          label: intent.label,
          intention: intent.intention,
        });
        break;
      case 'prepare-activity-report':
        await requestActivityReport(tx, {
          current: intent.current,
          state: nextState,
          activity: intent.activity,
          passageId: intent.passageId,
          label: intent.label,
          intention: intent.intention,
          factualSummary: intent.factualSummary,
          completionEffects: intent.completionEffects,
        });
        break;
      default:
        intent satisfies never;
    }
  }
  return nextState;
}
