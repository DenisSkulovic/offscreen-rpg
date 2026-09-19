import type { StorytellerTask } from './index';

export type StorytellerRequestPurpose = Readonly<{
  id:
    | 'opening.narrative'
    | 'opening.mechanical'
    | 'scene.continuation'
    | 'activity.consequence'
    | 'history.report';
  inputContract: string;
  outputContract: string;
  promptFragments: readonly string[];
  contextPolicy: 'bounded.v1';
}>;

const purposes = {
  openingNarrative: {
    id: 'opening.narrative',
    inputContract: 'opening-context.v1',
    outputContract: 'playable-opening.v1',
    promptFragments: ['scene-rules', 'opening-rules'],
    contextPolicy: 'bounded.v1',
  },
  openingMechanical: {
    id: 'opening.mechanical',
    inputContract: 'mechanical-opening-context.v1',
    outputContract: 'mechanical-opening.v1',
    promptFragments: ['scene-rules', 'mechanical-opening-rules'],
    contextPolicy: 'bounded.v1',
  },
  continuation: {
    id: 'scene.continuation',
    inputContract: 'continuation-context.v1',
    outputContract: 'playable-continuation.v2',
    promptFragments: ['scene-rules', 'continuity-rules', 'continuation-rules'],
    contextPolicy: 'bounded.v1',
  },
  consequence: {
    id: 'activity.consequence',
    inputContract: 'committed-resolution-context.v1',
    outputContract: 'activity-consequence.v3',
    promptFragments: ['scene-rules', 'continuity-rules', 'consequence-rules'],
    contextPolicy: 'bounded.v1',
  },
  report: {
    id: 'history.report',
    inputContract: 'committed-resolution-context.v1',
    outputContract: 'historical-report.v1',
    promptFragments: ['scene-rules', 'report-rules'],
    contextPolicy: 'bounded.v1',
  },
} as const satisfies Record<string, StorytellerRequestPurpose>;

/** Stable semantic identity for audits; this describes contracts, not provider routing. */
export function describeStorytellerRequestPurpose(
  task: Pick<StorytellerTask, 'task' | 'contextManifest' | 'context'>,
): StorytellerRequestPurpose {
  if (task.contextManifest.policyVersion !== 'bounded.v1') {
    throw new Error('Unknown Storyteller context policy');
  }
  switch (task.task) {
    case 'opening':
      return task.context.mechanicalOpening
        ? purposes.openingMechanical
        : purposes.openingNarrative;
    case 'continuation':
      return purposes.continuation;
    case 'consequence':
      return purposes.consequence;
    case 'report':
      return purposes.report;
  }
}
