import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { storyItemsSchema } from '@offscreen/contracts/stories';

/** Harbor fixture: player hands Mara an existing brass compass. */
export const harborCompassItems = storyItemsSchema.parse([
  { key: 'brass-compass', label: 'Brass compass', holderKey: 'player' },
]);

export const harborCompassTransferPlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'give-compass',
  label: 'Give Mara the compass',
  intention: 'Hand the brass compass to Mara across the quay.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'check',
    fictionalDurationSeconds: 10,
    check: {
      rule: 'srd-5.2.1-subset.v1',
      purpose: 'Hand over a compass',
      skill: 'persuasion',
      ability: 'charisma',
      dc: 10,
      advantage: false,
      disadvantage: false,
      modifiers: [],
    },
    difficultyBasis: 'Mara is within reach on the quay.',
    success: {
      text: 'Mara takes the compass.',
      effects: [],
      worldEffects: [
        {
          kind: 'item.transfer.v1',
          itemKey: 'brass-compass',
          fromHolder: 'player',
          toHolder: 'mara',
        },
      ],
    },
    failure: {
      text: 'Mara does not take the compass.',
      effects: [],
    },
  },
});

/** Abstract fixture: the same rule moves a process-held signal token. */
export const abstractSignalItems = storyItemsSchema.parse([
  {
    key: 'signal-token',
    label: 'Signal token',
    holderKey: 'process-source',
  },
]);

export const abstractSignalTransferPlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'pass-signal',
  label: 'Pass the signal',
  intention: 'Move the unique signal token to the receiving process.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 10,
    outcome: {
      text: 'The signal token moves.',
      effects: [],
      worldEffects: [
        {
          kind: 'item.transfer.v1',
          itemKey: 'signal-token',
          fromHolder: 'process-source',
          toHolder: 'process-sink',
        },
      ],
    },
  },
});
