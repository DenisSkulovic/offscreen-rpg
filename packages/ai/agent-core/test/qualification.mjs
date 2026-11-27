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

function publicObservation(item) {
  return {
    workflowId: item.workflowId ?? null,
    runId: item.runId ?? null,
    activityId: item.activityId ?? null,
    attempt: item.attempt ?? null,
    phase: item.phase ?? null,
    kind: item.kind ?? null,
    workerGeneration: item.workerGeneration ?? null,
    toolName: item.toolName ?? null,
    code: item.code ?? null,
  };
}

/**
 * Keep physical observations for one Workflow execution.
 * Activity identity must be one scheduled in that history. Run identity is required when both sides have it.
 */
export function scopeObservations(observations, execution, activityIds) {
  const ids = activityIds instanceof Set ? activityIds : new Set(activityIds ?? []);
  return (observations ?? []).filter((item) => {
    if (execution?.workflowId && item.workflowId !== execution.workflowId) return false;
    if (execution?.runId && item.runId && item.runId !== execution.runId) return false;
    if (item.activityId && ids.size > 0 && !ids.has(item.activityId)) return false;
    return true;
  });
}

export function summarizeHistory(history, observations, execution) {
  const events = history?.events ?? [];
  const scheduled = [];
  const completions = [];
  for (const event of events) {
    if (matches(event, 'ACTIVITY_TASK_SCHEDULED')) {
      const attrs = event.activityTaskScheduledEventAttributes ?? {};
      scheduled.push({
        eventId: event.eventId,
        name: attrs.activityType?.name ?? '',
        activityId: attrs.activityId ?? '',
      });
    }
    if (matches(event, 'ACTIVITY_TASK_COMPLETED')) {
      const attrs = event.activityTaskCompletedEventAttributes ?? {};
      completions.push({
        eventId: event.eventId,
        scheduledEventId: attrs.scheduledEventId,
      });
    }
  }
  const activityIds = new Set(scheduled.map((item) => item.activityId).filter(Boolean));
  const scoped = scopeObservations(observations, execution, activityIds).map(publicObservation);
  const byId = new Map(scoped.map((item) => [item.activityId, item]));
  return {
    workflowId: execution?.workflowId ?? null,
    runId: execution?.runId ?? null,
    eventCount: events.length,
    scheduled,
    completions,
    completedIds: completions.map((item) => item.scheduledEventId),
    workflowTaskCompleted: events.filter((event) => matches(event, 'WORKFLOW_TASK_COMPLETED')).map((event) => event.eventId),
    counts: {
      invokeModel: scheduled.filter((item) => item.name === 'invokeModel').length,
      runSyntheticTool: scheduled.filter((item) => item.name === 'runSyntheticTool').length,
    },
    observations: scoped,
    observationByActivity: Object.fromEntries(byId),
  };
}

const SECRET = /api[_-]?key|secret|token|password|bearer\s+|sk-[a-z0-9]/i;

export function publicFailure(error) {
  const message = String(error?.message ?? 'qualification-failed');
  if (SECRET.test(message)) return 'redacted-failure';
  return message.slice(0, 300);
}

export async function createHarness(checked) {
  if (!checked?.ok) throw new Error('qualification-env-refused');
  const native = await NativeConnection.connect({ address: checked.address });
  const connection = await Connection.connect({ address: checked.address });
  const client = new Client({ connection, namespace: checked.namespace });
  const taskQueue = `agent-core-e1-${randomUUID()}`;
  const workflowsPath = fileURLToPath(new URL('./mission.workflow.ts', import.meta.url));
  const state = {
    generations: [],
    observations: [],
    worker: null,
    runPromise: null,
    runError: null,
    last: null,
  };

  function trackGeneration() {
    const generation = state.generations.length + 1;
    const bucket = [];
    const push = bucket.push.bind(bucket);
    bucket.push = (item) => push({ ...item, workerGeneration: generation });
    state.generations.push(bucket);
    state.observations = bucket;
    return bucket;
  }

  const harness = {
    namespace: checked.namespace,
    taskQueue,
    workflowsPath,
    observations: () => state.observations,
    generations: () => state.generations,
    async startWorker() {
      const bucket = trackGeneration();
      const fixture = createFixturePlugin(bucket, activityContext);
      state.worker = await Worker.create({
        connection: native,
        namespace: checked.namespace,
        taskQueue,
        workflowsPath,
        activities: createFixtureActivities(bucket, activityContext),
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
      state.last = { handle, workflowId };
      return { handle, missionId, workflowId };
    },
    async history(handle) {
      const described = await handle.describe();
      const events = await handle.fetchHistory();
      const execution = { workflowId: described.workflowId, runId: described.runId };
      return summarizeHistory(events, state.generations.flat(), execution);
    },
    async failureEvidence(error) {
      const evidence = {
        message: publicFailure(error),
        errorName: error?.name ?? 'Error',
      };
      if (!state.last?.handle) return evidence;
      try {
        const summary = await harness.history(state.last.handle);
        return {
          ...evidence,
          workflowId: summary.workflowId,
          runId: summary.runId,
          historyEventCount: summary.eventCount,
          counts: summary.counts,
          observations: summary.observations,
        };
      } catch {
        return { ...evidence, workflowId: state.last.workflowId };
      }
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
    if (scenarios.cases.every((item) => item.status === 'pass')) {
      const recovery = await runRecovery(harness, scenarios.completedP1);
      receipt.cases.push(...recovery.cases);
    }
    receipt.status = receipt.cases.every((item) => item.status === 'pass') ? 'pass' : 'failed';
  } catch (error) {
    receipt.status = 'failed';
    receipt.failure = publicFailure(error);
    if (harness.failureEvidence) {
      receipt.evidence = await harness.failureEvidence(error);
    }
  } finally {
    await harness.close();
  }
  receipt.historyEventCount = receipt.cases.reduce(
    (total, item) => total + (item.historyEventCount ?? 0),
    0,
  );
  console.log(JSON.stringify(receipt));
  return receipt.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const code = await main();
  process.exit(code);
}
