import type { startChamberSchema } from '@offscreen/contracts/stories';
import type { z } from 'zod';
import { StoryError } from './story-errors';

export type ChamberScenario = z.infer<typeof startChamberSchema>['scenario'];

type ChamberOpening = {
  source: ChamberScenario;
  content: {
    version: 1;
    title: string;
    paragraphs: string[];
  };
  interaction: {
    kind: 'choice.v1';
    prompt: string;
    options: ReadonlyArray<{
      id: string;
      label: string;
      description?: string;
    }>;
  };
  items?: ReadonlyArray<{
    key: string;
    label: string;
    holderKey: string;
  }>;
};

type ChamberContinuation = {
  content: {
    version: 1;
    title: string;
    paragraphs: string[];
  };
  interaction: ChamberOpening['interaction'] | null;
  wait?: {
    version: 1;
    realDurationMs: number;
    gameDurationMs: number;
    arrival: {
      content: ChamberContinuation['content'];
      interaction: ChamberOpening['interaction'] | null;
    };
  };
  decision?: {
    version: 1;
    responseDurationMs: number;
    defaultOptionId: string;
    outcome: {
      content: ChamberContinuation['content'];
      interaction: ChamberOpening['interaction'] | null;
    };
  };
  effects?: ReadonlyArray<{
    kind: 'item.transfer.v1';
    itemKey: string;
    fromHolder: string;
    toHolder: string;
  }>;
};

type ChamberFixture = {
  opening: ChamberOpening;
  respond:
    ((revision: number, optionId: string) => ChamberContinuation) | undefined;
};

// Preserve this version: a new fixture meaning gets a new source key.
const readOnlyOpening: ChamberOpening = {
  source: 'chamber.v1',
  content: {
    version: 1,
    title: 'A gate and a small decision.',
    paragraphs: [
      'You stand in a quiet chamber. A closed gate faces you. Beside it, a shallow slot bears the outline of a token.',
      'This saved scene is the first piece of the testing chamber. Choices and timed progression are not connected yet.',
    ],
  },
  interaction: {
    kind: 'choice.v1',
    prompt: 'How would you proceed?',
    options: [
      {
        id: 'offer-token',
        label: 'Offer a token',
        description:
          'The next implementation slice will validate possessions and apply this consequence.',
      },
      { id: 'remain', label: 'Remain in the chamber' },
    ],
  },
};

const playableOpening: ChamberOpening = {
  source: 'chamber.v2',
  content: {
    version: 1,
    title: 'A gate and a small decision.',
    paragraphs: [
      'You stand in a quiet chamber. Beyond a wooden gate, someone is humming.',
    ],
  },
  interaction: {
    kind: 'choice.v1',
    prompt: 'What do you do?',
    options: [
      { id: 'approach', label: 'Approach the gate' },
      { id: 'leave', label: 'Leave the chamber' },
    ],
  },
};

const timedOpening: ChamberOpening = {
  source: 'chamber.v3',
  content: {
    version: 1,
    title: 'A visit across the courtyard.',
    paragraphs: ['You are at home. A friend is waiting in the courtyard cafe.'],
  },
  interaction: {
    kind: 'choice.v1',
    prompt: 'What would you like to do?',
    options: [
      { id: 'visit', label: 'Walk to the cafe (20 seconds)' },
      { id: 'leave', label: 'Stay home and end this visit' },
    ],
  },
};

const deadlineOpening: ChamberOpening = {
  ...playableOpening,
  source: 'chamber.v4',
};

const itemOpening: ChamberOpening = {
  source: 'chamber.v5',
  content: {
    version: 1,
    title: 'A letter to deliver.',
    paragraphs: [
      'You carry a sealed letter. The caretaker is waiting by the gate.',
    ],
  },
  items: [
    { key: 'sealed-letter', label: 'Sealed letter', holderKey: 'courier' },
  ],
  interaction: {
    kind: 'choice.v1',
    prompt: 'What do you do?',
    options: [
      { id: 'deliver', label: 'Give the letter to the caretaker' },
      { id: 'keep', label: 'Keep the letter and leave' },
    ],
  },
};

function immediateConversation(
  revision: number,
  option: string,
): ChamberContinuation {
  if (revision === 1 && option === 'approach') {
    return {
      content: {
        version: 1,
        title: 'At the gate.',
        paragraphs: [
          'You approach. The humming stops. A voice asks who is there.',
        ],
      },
      interaction: {
        kind: 'choice.v1',
        prompt: 'How do you reply?',
        options: [
          { id: 'joke', label: 'Tell a joke' },
          { id: 'leave', label: 'Say goodbye and leave' },
        ],
      },
    };
  }
  if ((revision === 1 || revision === 2) && option === 'leave') {
    return {
      content: {
        version: 1,
        title: 'A quiet departure.',
        paragraphs: ['You leave the chamber. This little visit is over.'],
      },
      interaction: null,
    };
  }
  if (revision === 2 && option === 'joke') {
    return {
      content: {
        version: 1,
        title: 'Someone laughs.',
        paragraphs: [
          '“I was going to tell a joke about a gate, but I could not find an opening.”',
          'A laugh comes from the other side. You exchange goodbyes, and your visit ends.',
        ],
      },
      interaction: null,
    };
  }
  throw new StoryError('conflict');
}

function timedVisit(revision: number, option: string): ChamberContinuation {
  if (revision === 1 && option === 'visit') {
    return {
      content: {
        version: 1,
        title: 'Crossing the courtyard.',
        paragraphs: [
          'You set out toward the cafe. You may close this page; the visit will continue.',
        ],
      },
      interaction: null,
      wait: {
        version: 1,
        realDurationMs: 20000,
        gameDurationMs: 600000,
        arrival: {
          content: {
            version: 1,
            title: 'At the cafe.',
            paragraphs: [
              'You arrive after ten minutes in the story. Your friend waves you over.',
            ],
          },
          interaction: {
            kind: 'choice.v1',
            prompt: 'How do you greet your friend?',
            options: [
              { id: 'joke', label: 'Tell a joke' },
              { id: 'leave', label: 'Say goodbye and leave' },
            ],
          },
        },
      },
    };
  }
  if (revision === 1 && option === 'leave') {
    return immediateConversation(1, 'leave');
  }
  if (revision === 3 && option === 'leave') {
    return immediateConversation(2, 'leave');
  }
  if (revision === 3 && option === 'joke') {
    return {
      content: {
        version: 1,
        title: 'Coffee and a laugh.',
        paragraphs: [
          '“I tried to catch the fog on my way here. Mist.” Your friend groans, then laughs. You enjoy your coffee and head home.',
        ],
      },
      interaction: null,
    };
  }
  throw new StoryError('conflict');
}

function timedGateReply(revision: number, option: string): ChamberContinuation {
  const outcome = immediateConversation(revision, option);
  if (revision === 1 && option === 'approach') {
    return {
      ...outcome,
      decision: {
        version: 1,
        responseDurationMs: 15000,
        defaultOptionId: 'leave',
        outcome: immediateConversation(2, 'leave'),
      },
    };
  }
  return outcome;
}

function letterDelivery(revision: number, option: string): ChamberContinuation {
  if (revision !== 1) {
    throw new StoryError('conflict');
  }
  if (option === 'deliver') {
    return {
      content: {
        version: 1,
        title: 'Letter delivered.',
        paragraphs: [
          'The caretaker accepts the sealed letter. Your delivery is complete.',
        ],
      },
      interaction: null,
      effects: [
        {
          kind: 'item.transfer.v1',
          itemKey: 'sealed-letter',
          fromHolder: 'courier',
          toHolder: 'caretaker',
        },
      ],
    };
  }
  if (option === 'keep') {
    return {
      content: {
        version: 1,
        title: 'Letter kept.',
        paragraphs: [
          'You leave with the sealed letter still in your possession.',
        ],
      },
      interaction: null,
      effects: [],
    };
  }
  throw new StoryError('conflict');
}

export const chamberFixtures = {
  'chamber.v1': { opening: readOnlyOpening, respond: undefined },
  'chamber.v2': { opening: playableOpening, respond: immediateConversation },
  'chamber.v3': { opening: timedOpening, respond: timedVisit },
  'chamber.v4': { opening: deadlineOpening, respond: timedGateReply },
  'chamber.v5': { opening: itemOpening, respond: letterDelivery },
} as const satisfies Record<ChamberScenario, ChamberFixture>;

export function selectChamberFixture(
  source: string,
): ChamberFixture | undefined {
  if (!Object.hasOwn(chamberFixtures, source)) {
    return undefined;
  }
  return chamberFixtures[source as ChamberScenario];
}

export function chamberOpeningFor(scenario: ChamberScenario) {
  return chamberFixtures[scenario].opening;
}

export function chamberAllowsResponse(source: string) {
  return selectChamberFixture(source)?.respond !== undefined;
}
