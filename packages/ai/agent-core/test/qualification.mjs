import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Context } from '@temporalio/activity';
import { Connection, Client, WorkflowIdConflictPolicy, WorkflowIdReusePolicy } from '@temporalio/client';
import { NativeConnection, Worker } from '@temporalio/worker';
import { AiSdkPlugin } from '@temporalio/vercel-ai-sdk';
import { missionWorkflowId } from '../dist/index.js';
import { createFixtureActivities } from './fixtures/tools.mjs';
import { createFixturePlugin } from './fixtures/model.mjs';
import { runRecovery } from './qualification-recovery.mjs';
import { runScenarios } from './qualification-scenarios.mjs';

const LOOPBACK = /^127\.0\.0\.1:(\d{1,5})$/;
const NAMESPACE = /^offscreen-agent-poc-[a-z0-9-]{8,35}$/;
const CREDENTIAL =
  /(^|_)(API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)($|_)|OTEL_EXPORTER_|^(OPENAI|ANTHROPIC|AWS|AZURE|GOOGLE)_/i;

export function validateQualificationEnv(env) {
  if (env.E1_QUALIFY !== '1') return { ok: false, reason: 'opt-in-required' };
  const address = env.POC_TEMPORAL_ADDRESS;
  const addressMatch = typeof address === 'string' ? LOOPBACK.exec(address) : null;
  const port = addressMatch ? Number(addressMatch[1]) : 0;
  if (!addressMatch || port < 1 || port > 65535) {
    return { ok: false, reason: 'loopback-required' };
  }
  if (typeof env.POC_NAMESPACE !== 'string' || !NAMESPACE.test(env.POC_NAMESPACE)) {
    return { ok: false, reason: 'namespace-required' };
  }
  for (const name of Object.keys(env)) {
    if (CREDENTIAL.test(name)) return { ok: false, reason: 'credential-refused' };
  }
  return {
    ok: true,
    address,
    namespace: env.POC_NAMESPACE,
  };
}

function activityContext() {
  const current = Context.current();
  return { info: current.info, cancellationSignal: current.cancellationSignal };
}

function eventName(event) {
  return String(event.eventType ?? '');
}

function matches(event, suffix) {
  const name = eventName(event);
  return name === suffix || name.endsWith(`_${suffix}`) || name.endsWith(suffix);
}

export function summarizeHistory(history, observations) {
  const events = history?.events ?? [];
  const scheduled = [];
  const completedIds = [];
  for (const event of events) {
    if (matches(event, 'ACTIVITY_TASK_SCHEDULED')) {
      const attrs = event.activityTaskScheduledEventAttributes ?? {};
      scheduled.push({
        eventId: event.eventId,
        name: attrs.activityType?.name ?? '',
      });
    }
    if (matches(event, 'ACTIVITY_TASK_COMPLETED')) {
      completedIds.push(event.activityTaskCompletedEventAttributes?.scheduledEventId);
    }
  }
  const byId = new Map(observations.map((item) => [item.activityId, item]));
  return {
    eventCount: events.length,
    scheduled,
    completedIds,
    workflowTaskCompleted: events.filter((event) => matches(event, 'WORKFLOW_TASK_COMPLETED')).map((event) => event.eventId),
    counts: {
      invokeModel: scheduled.filter((item) => item.name === 'invokeModel').length,
      runSyntheticTool: scheduled.filter((item) => item.name === 'runSyntheticTool').length,
    },
    observations: observations.map((item) => ({
      activityId: item.activityId,
      attempt: item.attempt,
      phase: item.phase,
      kind: item.kind,
      toolName: item.toolName ?? null,
      code: item.code ?? null,
    })),
    observationByActivity: Object.fromEntries(byId),
  };
}

export async function createHarness(checked) {
  if (!checked?.ok) throw new Error('qualification-env-refused');
  const native = await NativeConnection.connect({ address: checked.address });
  const connection = await Connection.connect({ address: checked.address });
  const client = new Client({ connection, namespace: checked.namespace });
  const taskQueue = `agent-core-e1-${randomUUID()}`;
  const workflowsPath = fileURLToPath(new URL('./mission.workflow.ts', import.meta.url));
  const state = {
    observations: [],
    worker: null,
    runPromise: null,
    runError: null,
  };

  const harness = {
    namespace: checked.namespace,
    taskQueue,
    workflowsPath,
    observations: () => state.observations,
    async startWorker() {
      state.observations = [];
      const fixture = createFixturePlugin(state.observations, activityContext);
      state.worker = await Worker.create({
        connection: native,
        namespace: checked.namespace,
        taskQueue,
        workflowsPath,
        activities: createFixtureActivities(state.observations, activityContext),
        plugins: [
          new AiSdkPlugin({
            modelProvider: fixture.modelProvider,
            download: fixture.download,
          }),
        ],
      });
      state.runPromise = state.worker.run();
      state.runPromise.catch((error) => {
        state.runError = error;
      });
    },
    async stopWorker() {
      if (!state.worker) return;
      state.worker.shutdown();
      await state.runPromise;
      state.worker = null;
    },
    async startMission(definitionId, input, requestedTools, maxSteps = 3, testControl, missionId = randomUUID()) {
      const raw = {
        version: 1,
        missionId,
        definitionId,
        definitionVersion: 1,
        input,
        requestedTools,
        maxSteps,
      };
      return harness.startRaw(raw, missionWorkflowId(missionId), testControl);
    },
    async startRaw(raw, workflowId, testControl) {
      const args = testControl === undefined ? [raw] : [raw, testControl];
      const handle = await client.workflow.start('mission', {
        taskQueue,
        workflowId,
        args,
        workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
        workflowIdConflictPolicy: WorkflowIdConflictPolicy.FAIL,
        workflowExecutionTimeout: '30s',
      });
      const missionId = raw && typeof raw === 'object' ? raw.missionId : null;
      return { handle, missionId, workflowId };
    },
    async history(handle) {
      return summarizeHistory(await handle.fetchHistory(), state.observations);
    },
    handle(workflowId) {
      return client.workflow.getHandle(workflowId);
    },
    async waitFor(predicate, timeoutMs) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (await predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error('wait-deadline');
    },
    async close() {
      await harness.stopWorker();
      await connection.close();
      await native.close();
    },
  };
  return harness;
}

export async function main(env = process.env) {
  const checked = validateQualificationEnv(env);
  if (!checked.ok) {
    console.log(JSON.stringify({ status: 'refused', reason: checked.reason }));
    return 1;
  }
  const harness = await createHarness(checked);
  const receipt = {
    sourceSha: env.E1_SOURCE_SHA ?? null,
    namespace: harness.namespace,
    queue: harness.taskQueue,
    cases: [],
    status: 'failed',
  };
  try {
    await harness.startWorker();
    const scenarios = await runScenarios(harness);
    receipt.cases.push(...scenarios.cases);
    const recovery = await runRecovery(harness, scenarios.completedP1);
    receipt.cases.push(...recovery.cases);
    receipt.status = receipt.cases.every((item) => item.status === 'pass') ? 'pass' : 'failed';
  } catch (error) {
    receipt.status = 'failed';
    receipt.failure = error instanceof Error ? error.message : 'qualification-failed';
  } finally {
    await harness.close();
  }
  console.log(JSON.stringify(receipt));
  return receipt.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const code = await main();
  process.exit(code);
}
