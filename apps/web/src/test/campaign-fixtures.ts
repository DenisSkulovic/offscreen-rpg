import { campaignViewSchema, type CampaignView } from '@offscreen/contracts/campaign';
import { offerSchema } from '@offscreen/game/offers';

const offerA = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const offerB = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

export function makeCampaign(
  overrides: Partial<{
    offerId: string;
    holdKind: 'storyteller' | 'decision' | 'world-obligation' | null;
  }> = {},
): CampaignView {
  const offerId = overrides.offerId ?? offerA;
  const offer = offerSchema.parse({
    id: offerId,
    nodes: [
      {
        id: 'look',
        parent: null,
        label: 'Look around',
        description: 'Survey the gate.',
        action: null,
      },
      {
        id: 'approach',
        parent: 'look',
        label: 'Approach the gate',
        description: 'Walk forward.',
        action: {
          kind: 'attempt',
          timing: { kind: 'finite', fictionalSeconds: 30 },
        },
      },
      {
        id: 'wait',
        parent: 'look',
        label: 'Wait in shadow',
        description: 'Stay hidden.',
        action: {
          kind: 'attempt',
          timing: { kind: 'finite', fictionalSeconds: 60 },
        },
      },
    ],
  });

  const holds =
    overrides.holdKind === 'storyteller'
      ? [
          {
            kind: 'storyteller' as const,
            generationId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            reason: 'required-turn' as const,
          },
        ]
      : overrides.holdKind === 'world-obligation'
        ? [
            {
              kind: 'world-obligation' as const,
              obligationId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
              reason: 'controlling-event' as const,
            },
          ]
        : overrides.holdKind === 'decision'
          ? [
              {
                kind: 'decision' as const,
                offerId,
                reason: 'player-choice' as const,
              },
            ]
          : [];

  return campaignViewSchema.parse({
    settings: {
      revision: 1,
      creative: {
        profile: { id: 'chronicler', revision: 1 },
        tone: 'Measured.',
        emphasis: 'balanced',
        surprises: 'occasional',
        tags: [],
        guidance: [],
      },
      pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
      locked: false,
      rules: 'srd-5.2.1-subset.v1',
      risk: 'nonlethal',
    },
    character: null,
    storyFacts: [],
    location: 'Silt Gate',
    gameSecond: 0,
    worldTime: {
      kind: 'elapsed',
      definitionId: 'elapsed-fictional-time',
      definitionRevision: 1,
      gameSecond: 0,
      wholeUnits: 0,
      gameSecondOfUnit: 0,
      unitLabel: 'fictional seconds',
      label: '0 fictional seconds',
    },
    holds,
    offer,
    activityAccess: { kind: 'none' },
    activity: null,
    actionExecution: null,
    actionExecutionEvents: [],
    commitments: [],
    activityEvents: [],
    activityReports: [],
    worldObligationReports: [],
    worldConditions: [],
    worldObligations: [],
    worldObligationEvents: [],
    acceptedActivityPlan: null,
    rolls: [],
    actionReceipts: [],
  });
}

export const fixtureOfferIds = { offerA, offerB };
