/**
 * Offline mechanical fixture loader. Scenario data lives in ./mechanical/.
 * Must not define runtime admission policy; see
 * @offscreen/application/campaign/fixtures/mechanical-content.ts.
 */
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import type { StorytellerTask } from '../tasks';
import { z } from 'zod';
import { authoredActivityAccess, type MechanicalCharacter } from './mechanical/shared';
import { seydaNeenOpeningPlans, seydaNeenConsequence } from './mechanical/seyda-neen';
import { pineappleOpeningPlans, pineappleConsequence } from './mechanical/pineapple';
import { microbeOpeningPlans, microbeConsequence } from './mechanical/microbe';
import { beaconOpeningPlans, beaconConsequence } from './mechanical/beacon';
import { frostRoadOpeningPlans, frostRoadConsequence } from './mechanical/frost-road';

/** Plans the offline fixture would admit for this character. Live openings capture the same objects. */
export function authorizedMechanicalOpeningPlans(character: MechanicalCharacter) {
  const plans =
    seydaNeenOpeningPlans(character) ??
    pineappleOpeningPlans(character) ??
    beaconOpeningPlans(character) ??
    microbeOpeningPlans(character) ??
    frostRoadOpeningPlans(character) ??
    [];
  return z.array(immediateActionPlanSchema).max(6).parse(plans);
}

export function scriptedMechanicalOpening(task: StorytellerTask) {
  const opening = task.context.mechanicalOpening;
  if (task.task !== 'opening' || !opening) {
    throw new Error('Missing mechanical opening context');
  }
  const plans = authorizedMechanicalOpeningPlans(opening.character);
  return {
    version: 1,
    scene: {
      version: 1,
      content: opening.opening,
      next: {
        kind: 'action-plans',
        state: plans.length ? 'available' : 'held',
        plans,
        activityAccess: authoredActivityAccess(plans),
      },
    },
    currentNotes: [],
    arrivalNotes: [],
  };
}

export function scriptedMechanicalConsequence(task: StorytellerTask) {
  const { current, resolution } = task.context;
  if (
    (task.task !== 'consequence' && task.task !== 'pending-consequence') ||
    !current ||
    !resolution
  ) {
    throw new Error('Missing committed consequence');
  }
  const evidence = `p${current.sequence}`;
  const plans =
    seydaNeenConsequence(resolution, evidence) ??
    pineappleConsequence(resolution, evidence) ??
    beaconConsequence(resolution, evidence, task.context.activitySituation) ??
    microbeConsequence(resolution, evidence) ??
    frostRoadConsequence(resolution, evidence, task.context.worldConditions) ??
    [];
  const prior = resolution.receipts.at(-1);
  return {
    version: 1,
    scene: {
      version: 3,
      content: {
        version: 1,
        title: task.context.selected?.label ?? 'The consequence',
        paragraphs: [
          prior?.text ??
            'The committed action changes the immediate situation.',
        ],
      },
      next: {
        kind: 'action-plans',
        state: plans.length ? 'available' : 'held',
        plans,
        activityAccess: authoredActivityAccess(plans),
      },
    },
    currentNotes: [],
    arrivalNotes: [],
  };
}
