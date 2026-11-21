import {
  qaJourneyCaseSchema,
  type QaJourneyCase,
} from '@offscreen/contracts/qa';
type StageInput = Omit<
  QaJourneyCase['stages'][number],
  'evidence' | 'assessment' | 'rubricDimensions'
> & {
  evidence?: QaJourneyCase['stages'][number]['evidence'];
  assessment?: QaJourneyCase['stages'][number]['assessment'];
  rubricDimensions?: QaJourneyCase['stages'][number]['rubricDimensions'];
};

export const stateEvidence = {
  kind: 'state-snapshot',
  description: 'Authoritative saved state or stable artifact identity.',
  required: true,
} as const;

export function stage(input: StageInput): QaJourneyCase['stages'][number] {
  return {
    ...input,
    assessment: input.assessment ?? 'structural',
    rubricDimensions: input.rubricDimensions ?? [],
    evidence: input.evidence ?? [stateEvidence],
  };
}

export function defineCase(input: QaJourneyCase): QaJourneyCase {
  return qaJourneyCaseSchema.parse(input);
}
