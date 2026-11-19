import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import type * as Drizzle from 'drizzle-orm' with {
  'resolution-mode': 'require',
};
import type { CampaignStart } from '@offscreen/contracts/campaign';
import { createDrafts } from '@offscreen/application/drafts';
import { createScriptedOpenings } from '@offscreen/application/generations';
import { createStorytellerRuntime } from '@offscreen/application/storyteller';
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

/** Same profiled stack as the original single-file suite. The worker stays stopped until a case starts it. */
export async function withProfiledStoryteller(
  run: (suite: ProfiledStoryteller) => Promise<void>,
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
      const first = await actors.candidate();
      await run({ ...actors, first });
    },
    {
      chamberStorytellerControl,
      storytellerRuntime: {
        scriptedGate: chamberStorytellerControl.evaluate,
        documentStore: captureStore,
      },
    },
  );
}

/** Register one behavior family when this module is the node:test entry. */
export function registerProfiledStoryteller(
  moduleUrl: string,
  name: string,
  check: (t: TestContext, suite: ProfiledStoryteller) => Promise<void>,
) {
  const entry = process.argv[1]
    ? pathToFileURL(process.argv[1]).href
    : undefined;
  if (entry !== moduleUrl) {
    return;
  }
  test(name, { timeout: 240000 }, async (t) => {
    await withProfiledStoryteller(async (suite) => {
      await check(t, suite);
    });
  });
}
