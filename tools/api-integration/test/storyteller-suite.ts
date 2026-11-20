import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import type * as Drizzle from 'drizzle-orm' with {
  'resolution-mode': 'require',
};
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { createDrafts } from '@offscreen/application/drafts';
import { createScriptedOpenings } from '@offscreen/application/generations';
import {
  createStorytellerRuntime,
  storytellerDistributedTopic,
  storytellerTopic,
} from '@offscreen/application/storyteller';
import {
  createChamber,
  createChamberStorytellerControl,
} from '@offscreen/application/developer-tools';
import { createStories } from '@offscreen/application/stories';
import { LocalDocumentStore } from '@offscreen/documents';
import {
  withAppIntegration,
  type AppIntegration,
} from './helpers/app-integration.js';
import {
  Client,
  Connection,
  WorkflowNotFoundError,
} from '@temporalio/client';

export const orm: typeof Drizzle = createRequire(import.meta.url)('drizzle-orm');
export const { asc, eq } = orm;

export const fakeUsage = (reportedCostMicrousd: bigint) => ({
  reportedCostMicrousd,
  promptTokens: 20,
  completionTokens: 10,
  totalTokens: 30,
  reasoningTokens: 0,
  cachedTokens: 0,
  cacheWriteTokens: 0,
});
export const fakeTelemetry = (providerId: string) => ({
  durationMs: 25,
  httpStatus: 200,
  providerId,
  reportedModel: 'fake/model',
  finishReason: 'stop',
});

type ProfiledInput = {
  database: AppIntegration['database'];
  ownerId: AppIntegration['ownerId'];
  origin: AppIntegration['origin'];
  cookie: AppIntegration['cookie'];
  otherCookie: AppIntegration['otherCookie'];
  restartWorker: AppIntegration['restartWorker'];
  stopWorker: AppIntegration['stopWorker'];
  captureStore: LocalDocumentStore;
};

function bindProfiledActors(input: ProfiledInput) {
  const {
    database,
    ownerId,
    origin,
    cookie,
    otherCookie,
    restartWorker,
    stopWorker,
    captureStore,
  } = input;
  const drafts = createDrafts(database);
  const openings = createScriptedOpenings(database);
  const stories = createChamber(database);
  const storyService = createStories(database, {
    documentStore: captureStore,
  });
  const runtime = createStorytellerRuntime(database, {
    realDurationMs: () => 1000,
  });
  async function candidate(profile = 'absurd-action-comedy') {
    const draftId = randomUUID();
    await drafts.save(ownerId, draftId, {
      title: 'Pineapple test',
      premise: 'SpongeBob wakes in the pineapple with Gary.',
      storytellingDirection: '',
      storyteller: { id: profile, revision: 1 },
      expectedRevision: 0,
    });
    const generationId = randomUUID();
    await openings.request(ownerId, draftId, generationId, 1);
    await runtime.complete(generationId);
    const storyId = randomUUID();
    const snapshot = await stories.startFromCandidate({
      ownerId,
      storyId,
      candidateId: generationId,
      expectedDraftRevision: 1,
    });
    return { draftId, generationId, storyId, snapshot };
  }
  async function mechanicalCandidate(
    contentId = 'pineapple-mechanics.v4',
    pace:
      | { kind: 'instant' }
      | {
          kind: 'rate';
          fictionalSeconds: number;
          realSeconds: number;
        } = {
      kind: 'rate',
      fictionalSeconds: 1,
      realSeconds: 1,
    },
    campaignOverrides: Partial<CampaignStart> = {},
  ) {
    const draftId = randomUUID();
    await drafts.save(ownerId, draftId, {
      title: 'Mechanical loop test',
      premise: 'Wake in a strange place and respond carefully.',
      storytellingDirection: '',
      storyteller: { id: 'absurd-action-comedy', revision: 1 },
      expectedRevision: 0,
    });
    const generationId = randomUUID();
    await openings.request(ownerId, draftId, generationId, 1, contentId);
    await runtime.complete(generationId);
    const storyId = randomUUID();
    const campaign: CampaignStart = {
      mechanics: campaignOverrides.mechanics ?? true,
      locked: campaignOverrides.locked ?? false,
      pace: campaignOverrides.pace ?? pace,
      time: campaignOverrides.time ?? {
        kind: 'elapsed',
        id: 'simulation-game-seconds',
        revision: 1,
        unit: {
          id: 'game-second',
          label: 'game-second',
          pluralLabel: 'gameSeconds',
          gameSecondsPerUnit: 1,
        },
        epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
      },
      worldObligations: campaignOverrides.worldObligations ?? [],
      worlds: campaignOverrides.worlds ?? [],
    };
    const snapshot = await stories.startFromCandidate({
      ownerId,
      storyId,
      candidateId: generationId,
      expectedDraftRevision: 1,
      campaign,
    });
    return { storyId, snapshot };
  }
  async function choose(storyId: string, optionId: string) {
    const before = await stories.read({ ownerId, storyId });
    assert.ok(before.current.interaction);
    const operationId = randomUUID();
    const body = {
      expectedRevision: before.revision,
      submission: {
        interactionId: before.current.interaction.id,
        answer: { kind: 'choice.v1', optionId },
      },
    };
    await stories.admitResolution({
      ownerId,
      storyId,
      operationId,
      body,
    });
    await runtime.complete(operationId);
    return {
      operationId,
      body,
      snapshot: await stories.read({ ownerId, storyId }),
    };
  }
  return {
    database,
    ownerId,
    origin,
    cookie,
    otherCookie,
    restartWorker,
    stopWorker,
    drafts,
    openings,
    stories,
    storyService,
    runtime,
    candidate,
    mechanicalCandidate,
    choose,
  };
}

type ProfiledActors = ReturnType<typeof bindProfiledActors>;
export type ProfiledStoryteller = ProfiledActors & {
  first: Awaited<ReturnType<ProfiledActors['candidate']>>;
};

type ProfiledStorytellerOptions = {
  /**
   * Browser cases own the full draft/opening path and must not enqueue a
   * profiled fixture candidate while the relay is idle, or a stale notice can
   * sit ahead of resolution wakes.
   */
  skipFixtureCandidate?: boolean;
  /** STORY03 T06: start relay + control + executor against live Temporal. */
  distributedLive?: boolean;
  /**
   * MANUAL: the family owns runtime.complete / fake-provider work and must not
   * start a shared outbox consumer. WORKER: the family owns Temporal delivery.
   */
  executionMode?: 'manual' | 'worker';
};

/** Remove undelivered profiled notices whose operation_id no longer exists (stale relay litter on disposable DBs). */
async function drainOrphanStorytellerOutbox(
  database: AppIntegration['database'],
): Promise<number> {
  const storytellerTopics = [storytellerTopic, storytellerDistributedTopic];
  const result = await database.db.$client.query<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM outbox o
       WHERE o.delivered_at IS NULL
         AND o.topic = ANY($1::text[])
         AND NOT EXISTS (
           SELECT 1 FROM generation g WHERE g.id = o.operation_id
         )
       RETURNING 1
     )
     SELECT count(*)::text AS count FROM deleted`,
    [storytellerTopics],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export type TerminateOpenStorytellerWorkflowsResult = {
  listed: number;
  terminated: number;
  ignored: number;
};

/** Terminate leftover storyteller/{generationId} runs owned by diagnostic profiled sessions. */
export async function terminateOpenStorytellerWorkflows(): Promise<TerminateOpenStorytellerWorkflowsResult> {
  const address = process.env['TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
  const namespace = process.env['TEMPORAL_NAMESPACE'] ?? 'default';
  const connection = await Connection.connect({ address });
  const client = new Client({ connection, namespace });
  const counts: TerminateOpenStorytellerWorkflowsResult = {
    listed: 0,
    terminated: 0,
    ignored: 0,
  };
  try {
    const query =
      'WorkflowId STARTS_WITH "storyteller/" AND (ExecutionStatus = "Running" OR ExecutionStatus = "ContinuedAsNew")';
    for await (const execution of client.workflow.list({ query })) {
      if (!execution.workflowId.startsWith('storyteller/')) {
        continue;
      }
      counts.listed += 1;
      const handle = client.workflow.getHandle(
        execution.workflowId,
        execution.runId,
      );
      try {
        await handle.terminate(
          'offscreen api-integration storyteller suite cleanup',
        );
        counts.terminated += 1;
      } catch (error) {
        if (error instanceof WorkflowNotFoundError) {
          counts.ignored += 1;
          continue;
        }
        const code = (error as { code?: string }).code;
        if (code === 'NOT_FOUND' || code === 'WORKFLOW_NOT_FOUND') {
          counts.ignored += 1;
          continue;
        }
        throw error;
      }
    }
  } finally {
    await connection.close().catch(() => undefined);
  }
  return counts;
}

/** HK03 diagnostic: name which durable prerequisite is still false at poll expiry. */
export async function inspectStorytellerProgress(
  database: AppIntegration['database'],
  args: { storyId: string; operationId: string },
) {
  const client = database.db.$client;
  const execution = await client.query<{
    state: string;
    revision: number;
    preparation_generation_id: string | null;
  }>(
    `SELECT state, revision, preparation_generation_id
     FROM game_action_execution
     WHERE operation_id = $1`,
    [args.operationId],
  );
  const receipt = await client.query<{
    generation_id: string | null;
    outcome: string;
  }>(
    `SELECT generation_id, outcome
     FROM game_action_receipt
     WHERE operation_id = $1`,
    [args.operationId],
  );
  const generationId =
    receipt.rows[0]?.generation_id ??
    execution.rows[0]?.preparation_generation_id ??
    null;
  const generations = generationId
    ? await client.query<{
        id: string;
        kind: string;
        state: string;
        failure_code: string | null;
        attempt_id: string | null;
      }>(
        `SELECT id, kind, state, failure_code, attempt_id
         FROM generation
         WHERE id = $1`,
        [generationId],
      )
    : { rows: [] };
  const resolution = await client.query<{
    generation_id: string;
    base_revision: number;
    operation_id: string;
  }>(
    `SELECT generation_id, base_revision, operation_id
     FROM story_resolution
     WHERE story_id = $1`,
    [args.storyId],
  );
  const campaign = await client.query<{
    game_second: string;
    holds: unknown;
  }>(
    `SELECT game_second::text AS game_second, holds
     FROM campaign
     WHERE story_id = $1`,
    [args.storyId],
  );
  const pendingOutbox = await client.query<{
    topic: string;
    count: number;
    leased: number;
    not_yet_available: number;
  }>(
    `SELECT topic,
            count(*)::int AS count,
            count(*) FILTER (WHERE lease_id IS NOT NULL)::int AS leased,
            count(*) FILTER (WHERE available_at > clock_timestamp())::int AS not_yet_available
     FROM outbox
     WHERE delivered_at IS NULL
     GROUP BY topic`,
  );
  const operationOutbox = await client.query<{
    id: string;
    topic: string;
    leased: boolean;
    available_at: Date;
    delivered_at: Date | null;
  }>(
    `SELECT id, topic, lease_id IS NOT NULL AS leased, available_at, delivered_at
     FROM outbox
     WHERE operation_id = $1 OR ($2::uuid IS NOT NULL AND operation_id = $2)
     ORDER BY available_at`,
    [args.operationId, generationId],
  );
  const stages = generationId
    ? await client.query<{ stage: string; outcome: string }>(
        `SELECT stage, outcome
         FROM storyteller_execution_stage
         WHERE generation_id = $1
         ORDER BY stage`,
        [generationId],
      )
    : { rows: [] };
  return {
    generationId,
    execution: execution.rows,
    receipt: receipt.rows,
    generation: generations.rows,
    resolution: resolution.rows,
    campaign: campaign.rows,
    pendingOutbox: pendingOutbox.rows,
    operationOutbox: operationOutbox.rows,
    stages: stages.rows,
  };
}

/** Same profiled stack as the original single-file suite. The outbox relay runs before any in-process `candidate()` so profiled notices wake on the integration worker queue. */
export async function withProfiledStoryteller(
  run: (suite: ProfiledStoryteller) => Promise<void>,
  options: ProfiledStorytellerOptions = {},
): Promise<void> {
  const chamberStorytellerControl = createChamberStorytellerControl();
  // ENG03-narrow: provisional action-narration captures are promoted to a
  // dispatchable Storyteller generation only when a DocumentStore is present.
  const captureStore = new LocalDocumentStore(
    join(
      await mkdtemp(join(tmpdir(), 'offscreen-storyteller-capture-')),
      'store',
    ),
  );
  await withAppIntegration(
    async ({
      database,
      ownerId,
      origin,
      cookie,
      otherCookie,
      restartWorker,
      stopWorker,
    }) => {
      const orphanDrained = await drainOrphanStorytellerOutbox(database);
      console.info(
        '[withProfiledStoryteller] mode=%s orphan outbox rows drained=%s taskQueue owned by this session',
        options.executionMode ?? 'worker',
        orphanDrained,
      );
      if (options.executionMode !== 'manual') {
        await restartWorker();
      }
      const actors = bindProfiledActors({
        database,
        ownerId,
        origin,
        cookie,
        otherCookie,
        restartWorker,
        stopWorker,
        captureStore,
      });
      const first = options.skipFixtureCandidate
        ? ({
            draftId: '00000000-0000-4000-8000-000000000002',
            generationId: '00000000-0000-4000-8000-000000000003',
            storyId: '00000000-0000-4000-8000-000000000004',
            snapshot: { storyId: '00000000-0000-4000-8000-000000000004' },
          } as unknown as ProfiledStoryteller['first'])
        : await actors.candidate();
      await run({ ...actors, first });
    },
    {
      chamberStorytellerControl,
      storytellerRuntime: {
        scriptedGate: chamberStorytellerControl.evaluate,
        documentStore: captureStore,
      },
      ...(options.distributedLive
        ? { storytellerDistributedLive: true }
        : {}),
    },
  );
}

function isNodeTestFile(moduleUrl: string) {
  return process.argv.some((arg) => {
    try {
      return pathToFileURL(resolve(arg)).href === moduleUrl;
    } catch {
      return false;
    }
  });
}

/** Register one behavior family when this module is a node:test file argument. */
export function registerProfiledStoryteller(
  moduleUrl: string,
  name: string,
  check: (t: TestContext, suite: ProfiledStoryteller) => Promise<void>,
  options: ProfiledStorytellerOptions = {},
) {
  if (!isNodeTestFile(moduleUrl)) {
    return;
  }
  test(name, { timeout: 240000 }, async (t) => {
    await withProfiledStoryteller(async (suite) => {
      await check(t, suite);
    }, options);
  });
}
