/**
 * ENG06: record and replay disposable Temporal histories for campaign/action/interval
 * workflows; prove a deliberately incompatible workflow fails replay.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Client, Connection } from '@temporalio/client';
import { NativeConnection, ReplayError, Worker } from '@temporalio/worker';
import {
  campaignActionWorkflowType,
  campaignActivityWorkflowType,
  controlledIntervalWorkflowType,
  intervalChangedSignal,
} from '@offscreen/workflows/contracts';

// Prefer the source fixture folder so live runs update the repo corpus, not only dist/.
const fixtureDir = join(
  __dirname.replace(/[/\\]dist[/\\]test$/, `${join('/', 'test')}`),
  'fixtures',
  'eng06',
);
const address = process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
const namespace = process.env['TEMPORAL_NAMESPACE'] ?? 'default';

type HistoryFixture = {
  workflowType: string;
  workflowId: string;
  eventCount: number;
  sdk: string;
  recordedAt: string;
  history: unknown;
};

async function withTemporal<T>(
  run: (args: {
    client: Client;
    native: NativeConnection;
    connection: Connection;
  }) => Promise<T>,
) {
  const connection = await Connection.connect({ address });
  const native = await NativeConnection.connect({ address });
  const client = new Client({ connection, namespace });
  try {
    return await run({ client, native, connection });
  } finally {
    await native.close().catch(() => undefined);
    await connection.close().catch(() => undefined);
  }
}

async function recordHistory(args: {
  client: Client;
  native: NativeConnection;
  workflowType: string;
  workflowId: string;
  activities: Record<string, (...activityArgs: never[]) => Promise<unknown>>;
  afterStart?: (
    handle: Awaited<ReturnType<Client['workflow']['start']>>,
  ) => Promise<void>;
}): Promise<HistoryFixture> {
  const taskQueue = `eng06-record-${randomUUID()}`;
  const worker = await Worker.create({
    connection: args.native,
    namespace,
    taskQueue,
    workflowsPath: require.resolve('@offscreen/workflows'),
    activities: args.activities,
  });
  const run = worker.run();
  try {
    const handle = await args.client.workflow.start(args.workflowType, {
      taskQueue,
      workflowId: args.workflowId,
      args: [`eng06-${randomUUID()}`],
      workflowExecutionTimeout: '30 seconds',
    });
    if (args.afterStart) await args.afterStart(handle);
    await handle.result();
    const history = await handle.fetchHistory();
    const events = (history as { events?: unknown[] }).events ?? [];
    return {
      workflowType: args.workflowType,
      workflowId: args.workflowId,
      eventCount: events.length,
      sdk: '1.24.0',
      recordedAt: new Date().toISOString(),
      history,
    };
  } finally {
    worker.shutdown();
    await run.catch(() => undefined);
  }
}

async function writeManifest(fixtures: readonly HistoryFixture[]) {
  await mkdir(fixtureDir, { recursive: true });
  // Histories are replayed from the in-memory objects returned by Temporal
  // (JSON round-trip mangles Duration/Timestamp WKTs). Persist metadata only.
  const path = join(fixtureDir, 'manifest.json');
  await writeFile(
    path,
    `${JSON.stringify(
      {
        sdk: '1.24.0',
        recordedAt: new Date().toISOString(),
        workflows: fixtures.map((fixture) => ({
          workflowType: fixture.workflowType,
          workflowId: fixture.workflowId,
          eventCount: fixture.eventCount,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return path;
}

test(
  'ENG06 live: record, replay, and reject incompatible campaign/action/interval histories',
  { timeout: 120_000 },
  async (t) => {
    try {
      await withTemporal(async () => undefined);
    } catch (error) {
      t.skip(
        `local Temporal required at ${address}: ${
          error instanceof Error ? error.message : 'unavailable'
        }`,
      );
      return;
    }

    await withTemporal(async ({ client, native }) => {
      let actionCalls = 0;
      const actionFixture = await recordHistory({
        client,
        native,
        workflowType: campaignActionWorkflowType,
        workflowId: `eng06-action/${randomUUID()}`,
        activities: {
          advanceCampaignAction: async () => {
            actionCalls += 1;
            return actionCalls === 1 ? 25 : null;
          },
        },
      });
      assert.ok(actionFixture.eventCount > 0);

      const activityFixture = await recordHistory({
        client,
        native,
        workflowType: campaignActivityWorkflowType,
        workflowId: `eng06-activity/${randomUUID()}`,
        activities: {
          advanceCampaignActivity: async () => null,
        },
      });

      let intervalCalls = 0;
      const intervalId = `eng06-interval/${randomUUID()}`;
      const intervalFixture = await recordHistory({
        client,
        native,
        workflowType: controlledIntervalWorkflowType,
        workflowId: intervalId,
        activities: {
          advanceControlledInterval: async () => {
            intervalCalls += 1;
            if (intervalCalls === 1) return 200;
            return null;
          },
        },
        afterStart: async (handle) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          await handle.signal(intervalChangedSignal);
        },
      });

      await writeManifest([actionFixture, activityFixture, intervalFixture]);

      const replayOptions = {
        workflowsPath: require.resolve('@offscreen/workflows'),
      };

      for (const fixture of [actionFixture, activityFixture, intervalFixture]) {
        await Worker.runReplayHistory(replayOptions, fixture.history);
      }

      await assert.rejects(
        () =>
          Worker.runReplayHistory(
            {
              workflowsPath: require.resolve(
                '@offscreen/workflows/eng06-incompatible',
              ),
            },
            actionFixture.history,
          ),
        (error: unknown) =>
          error instanceof ReplayError ||
          (error instanceof Error &&
            /non-determin|Nondeterminism|Replay/i.test(error.message)),
      );

      console.log(
        JSON.stringify({
          eng06Replay: {
            actionEvents: actionFixture.eventCount,
            activityEvents: activityFixture.eventCount,
            intervalEvents: intervalFixture.eventCount,
          },
        }),
      );
    });
  },
);
