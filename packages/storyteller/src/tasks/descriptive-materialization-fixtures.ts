/**
 * SA09 fixtures: gift/favor materialization vs crowd omit, disputed attributed,
 * and failed-transfer rejection. Provider-free.
 */
import {
  decideDescriptiveMaterialization,
  proposedChangeMatchesMaterialization,
  type DescriptiveMaterializationDecision,
} from './descriptive-materialization';
import {
  proposedDocumentChangeSchema,
  type ProposedDocumentChange,
} from './document-changes';

export const descriptiveMaterializationScenarioIds = [
  'named-gift-relationship',
  'passing-crowd-omit',
  'disputed-attributed-lore',
  'failed-transfer-rejected',
] as const;

export type DescriptiveMaterializationScenarioId =
  (typeof descriptiveMaterializationScenarioIds)[number];

export type DescriptiveMaterializationFixture = Readonly<{
  id: DescriptiveMaterializationScenarioId;
  decision: DescriptiveMaterializationDecision;
  change: ProposedDocumentChange | null;
  accepted: boolean;
}>;

const giftChange = proposedDocumentChangeSchema.parse({
  operation: 'create',
  path: 'relationships/mira-vale-quay-favor.md',
  kind: 'relationship',
  authority: 'canon',
  visibility: 'player-known',
  title: 'Mira Vale quay favor',
  body: 'After receiving the repaired brass clasp, Mira Vale still owes the traveler a quiet quay favor: shelter for one night if the tide turns against them.',
  reason: 'Successful named gift established a durable obligation',
});

const disputedChange = proposedDocumentChangeSchema.parse({
  operation: 'create',
  path: 'lore/rumors/beacon-abandoned.md',
  kind: 'lore',
  authority: 'attributed',
  visibility: 'player-known',
  title: 'Beacon abandoned (attributed)',
  body: 'The stranger claims the coastal beacon is abandoned. This remains attributed speech, not settled world fact.',
  reason: 'Retain the disputed claim without promoting it to canon',
});

const failedSuccessChange = proposedDocumentChangeSchema.parse({
  operation: 'create',
  path: 'relationships/mira-vale-quay-favor.md',
  kind: 'relationship',
  authority: 'canon',
  visibility: 'player-known',
  title: 'Mira Vale quay favor',
  body: 'Mira accepted the clasp and owes a favor.',
  reason: 'Hallucinated successful gift after a failed transfer',
});

export function createDescriptiveMaterializationFixtures(input?: {
  scenarioIds?: readonly DescriptiveMaterializationScenarioId[];
}): DescriptiveMaterializationFixture[] {
  const scenarioIds =
    input?.scenarioIds ?? descriptiveMaterializationScenarioIds;
  return scenarioIds.map((id) => {
    switch (id) {
      case 'named-gift-relationship': {
        const decision = decideDescriptiveMaterialization({
          situation: 'named-gift-or-favor',
          personStable: true,
          transferSucceeded: true,
          futureRelevance: true,
          counterpartExact: true,
        });
        return {
          id,
          decision,
          change: giftChange,
          accepted: proposedChangeMatchesMaterialization(giftChange, decision),
        };
      }
      case 'passing-crowd-omit': {
        const decision = decideDescriptiveMaterialization({
          situation: 'passing-crowd-mention',
          distinctiveEngagement: false,
        });
        return {
          id,
          decision,
          change: null,
          accepted: decision.action === 'omit',
        };
      }
      case 'disputed-attributed-lore': {
        const decision = decideDescriptiveMaterialization({
          situation: 'disputed-or-rumored-claim',
          attributedSpeakerKnown: true,
          laterCorrectnessDepends: true,
        });
        return {
          id,
          decision,
          change: disputedChange,
          accepted: proposedChangeMatchesMaterialization(
            disputedChange,
            decision,
          ),
        };
      }
      case 'failed-transfer-rejected': {
        const decision = decideDescriptiveMaterialization({
          situation: 'failed-transfer-as-success',
          claimedSuccessfulGift: true,
          transferSucceeded: false,
        });
        return {
          id,
          decision,
          change: failedSuccessChange,
          accepted:
            decision.action === 'reject' &&
            !proposedChangeMatchesMaterialization(
              failedSuccessChange,
              decision,
            ),
        };
      }
      default: {
        const exhaustive: never = id;
        throw new Error(`Unknown materialization scenario: ${exhaustive}`);
      }
    }
  });
}
