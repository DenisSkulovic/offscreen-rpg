import {
  ActivityCancellationType,
  ApplicationFailure,
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
} from '@temporalio/workflow';
import {
  executeMission,
  type SyntheticToolRequest,
} from '../dist/workflow.js';
import { fixtureDefinitions, fixtureToolSchemas } from './fixtures/definitions.js';
import { DEFINITIONS, MODEL_ID } from './fixtures/scenarios.mjs';

const TRUSTED_MODEL_ID = MODEL_ID;
const UNKNOWN_MODEL_ID = 'e1-unregistered-model';
const release = defineSignal('e1-release');

const activities = proxyActivities<{
  runSyntheticTool(request: SyntheticToolRequest): Promise<string>;
}>({
  startToCloseTimeout: '10s',
  heartbeatTimeout: '2s',
  retry: { maximumAttempts: 1 },
  cancellationType: ActivityCancellationType.WAIT_CANCELLATION_COMPLETED,
});

type TestControl = 'hold-after-tool' | 'hold-before-loop' | 'unknown-model';

function assertControl(testControl: TestControl | undefined): void {
  if (
    testControl !== undefined &&
    testControl !== 'hold-after-tool' &&
    testControl !== 'hold-before-loop' &&
    testControl !== 'unknown-model'
  ) {
    throw ApplicationFailure.create({
      message: 'unrecognized-test-control',
      type: 'unrecognized-test-control',
      nonRetryable: true,
    });
  }
}

/** Harness-only Workflow. Control is not mission input. */
export async function mission(
  raw: unknown,
  testControl?: TestControl,
): Promise<unknown> {
  assertControl(testControl);
  let released = false;
  if (testControl === 'hold-after-tool' || testControl === 'hold-before-loop') {
    setHandler(release, () => {
      released = true;
    });
  }
  if (testControl === 'hold-before-loop') {
    await condition(() => released);
  }
  const modelId =
    testControl === 'unknown-model' ? UNKNOWN_MODEL_ID : TRUSTED_MODEL_ID;
  return executeMission(raw, {
    definitions: fixtureDefinitions,
    capabilities: [
      {
        name: 'readDocument',
        description: DEFINITIONS.researcher.toolDescription,
        inputSchema: fixtureToolSchemas.readDocument,
      },
      {
        name: 'calculate',
        description: DEFINITIONS.arithmetic.toolDescription,
        inputSchema: fixtureToolSchemas.calculate,
      },
    ],
    modelId,
    dispatch: async (request) => {
      const result = await activities.runSyntheticTool(request);
      if (testControl === 'hold-after-tool') await condition(() => released);
      return result;
    },
  });
}
