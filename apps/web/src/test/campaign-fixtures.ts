import {
  campaignViewSchema,
  type CampaignView,
} from '@offscreen/contracts/campaign';
import { offerSchema } from '@offscreen/game/offers';

const offerA = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const offerB = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const activityId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export function makeCampaign(
  overrides: Partial<{
    offerId: string;
    holdKind: 'storyteller' | 'decision' | 'world-obligation' | null;
    activity:
      | 'none'
      | 'running-contribution'
      | 'paused-contribution'
      | 'completion-pending';
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

  const activityKind = overrides.activity ?? 'none';
  const activity =
    activityKind === 'none'
      ? null
      : {
          id: activityId,
          label: 'Repair the beacon',
          state:
            activityKind === 'paused-contribution'
              ? ('paused' as const)
              : ('running' as const),
          boundariesSettled: 1,
          revision: 1,
          completionPending: activityKind === 'completion-pending',
          progress: {
            kind: 'contribution' as const,
            label: 'Signal parts secured',
            earned: 3,
            required: 5,
          },
          dueAt:
            activityKind === 'completion-pending'
              ? null
              : '2026-11-13T12:00:00.000Z',
          estimatedCompletionAt:
            activityKind === 'completion-pending'
              ? null
              : '2026-11-13T12:30:00.000Z',
          resolvedGameSeconds: 0,
          settingsRevision: 1,
        };

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
    activity,
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
