/**
 * SA08 fixtures: priced cold/warm packets plus not-priced fail-closed case.
 * Provider transport is never performed.
 */
import { prepareStorytellerTask, type StorytellerTask } from '../tasks';
import {
  createModelRoutePacketReport,
  type ModelRoutePacketReport,
} from './model-route-capabilities';
import { createRequestAuditFixtureCases } from './request-audit-fixtures';

export const modelRouteCapabilityScenarioIds = [
  'priced-cold-warm',
  'not-priced-fails-closed',
  'captured-cache-usage',
] as const;

export type ModelRouteCapabilityScenarioId =
  (typeof modelRouteCapabilityScenarioIds)[number];

const pricedPolicy = {
  version: 'sa08-fixture.v1',
  route: 'sa08:offline-priced',
  model: 'audit/model-not-selected',
  provider: 'Audit',
  priceVersion: 'sa08-pricing.v1',
  inputMicrousdPerMillion: '2000000',
  cacheReadMicrousdPerMillion: '1000000',
  cacheWriteMicrousdPerMillion: '2500000',
  outputMicrousdPerMillion: '10000000',
  maxInputTokens: 100000,
  maxOutputTokens: 2000,
  timeoutMs: 1000,
} as const;

function withPolicy(
  task: StorytellerTask,
  policy: {
    version: string;
    route: string;
    model: string;
    provider: string;
    priceVersion: string;
    inputMicrousdPerMillion: string;
    cacheReadMicrousdPerMillion?: string;
    cacheWriteMicrousdPerMillion?: string;
    outputMicrousdPerMillion: string;
    maxInputTokens: number;
    maxOutputTokens: number;
    timeoutMs: number;
  },
): StorytellerTask {
  if (task.execution.mode !== 'provider') {
    throw new Error('Fixture task must use provider execution');
  }
  if (task.resources.authority.kind !== 'effective-usage-policy') {
    throw new Error('Fixture task must carry effective usage policy');
  }
  return prepareStorytellerTask({
    ...task,
    execution: {
      ...task.execution,
      policy: {
        ...task.execution.policy,
        ...policy,
      },
    },
    resources: {
      ...task.resources,
      authority: {
        ...task.resources.authority,
        policy: {
          ...task.resources.authority.policy,
          route: policy.route,
        },
      },
    },
  });
}

export type ModelRouteCapabilityFixture = Readonly<{
  id: ModelRouteCapabilityScenarioId;
  cold?: ModelRoutePacketReport;
  warm?: ModelRoutePacketReport;
  report?: ModelRoutePacketReport;
  rejected?: true;
  errorCode?: string;
}>;

export function createModelRouteCapabilityFixtures(input?: {
  scenarioIds?: readonly ModelRouteCapabilityScenarioId[];
}): ModelRouteCapabilityFixture[] {
  const scenarioIds = input?.scenarioIds ?? modelRouteCapabilityScenarioIds;
  const [coldBase, warmBase] = createRequestAuditFixtureCases({
    caseIds: ['continuity-human-turn-13', 'continuity-human-turn-14'],
    profile: { id: 'quiet-eerie-mystery', revision: 1 },
  }).map((entry) => entry.task);
  if (!coldBase || !warmBase) {
    throw new Error('Missing continuity audit fixtures');
  }

  return scenarioIds.map((id) => {
    switch (id) {
      case 'priced-cold-warm': {
        const coldTask = withPolicy(coldBase, pricedPolicy);
        const warmTask = withPolicy(warmBase, pricedPolicy);
        return {
          id,
          cold: createModelRoutePacketReport({
            task: coldTask,
            transportPerformed: false,
          }),
          warm: createModelRoutePacketReport({
            task: warmTask,
            compareAgainstTask: coldTask,
            transportPerformed: false,
          }),
        };
      }
      case 'not-priced-fails-closed': {
        const task = withPolicy(coldBase, {
          ...pricedPolicy,
          priceVersion: 'not-priced',
          inputMicrousdPerMillion: '0',
          outputMicrousdPerMillion: '0',
          cacheReadMicrousdPerMillion: '0',
          cacheWriteMicrousdPerMillion: '0',
        });
        try {
          createModelRoutePacketReport({ task });
          throw new Error('Expected not-priced route to fail closed');
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (!message.includes('storyteller_route_price_unknown')) {
            throw error;
          }
          return {
            id,
            rejected: true as const,
            errorCode: 'storyteller_route_price_unknown',
          };
        }
      }
      case 'captured-cache-usage': {
        const task = withPolicy(coldBase, pricedPolicy);
        return {
          id,
          report: createModelRoutePacketReport({
            task,
            usage: {
              reportedCostMicrousd: 7000n,
              promptTokens: 1000,
              completionTokens: 500,
              totalTokens: 1500,
              reasoningTokens: 0,
              cachedTokens: 100,
              cacheWriteTokens: 200,
            },
            durationMs: 42,
            transportPerformed: false,
          }),
        };
      }
      default: {
        const exhaustive: never = id;
        throw new Error(`Unknown model-route scenario: ${exhaustive}`);
      }
    }
  });
}
