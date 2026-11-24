import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { campaign } from '@offscreen/db/campaign-schema';
import { user } from '@offscreen/identity-persistence/auth';
import { story } from '@offscreen/db/story-schema';
import type { Transaction } from '@offscreen/db/outbox';
import {
  sceneCheckpointSchema,
  sceneCheckpointV1Schema,
} from '@offscreen/documents';
import { wholeGameSeconds } from '@offscreen/game/time';
import { committedCheckpointMatches } from './continuation';
import { quiescentCampaignOpeningCheckpoint } from './initialization';

const databaseTestUrl = process.env['DATABASE_TEST_URL'];
const disposableTestDb =
  databaseTestUrl !== undefined &&
  new URL(databaseTestUrl).pathname === '/offscreen_db_test' &&
  ['127.0.0.1', 'localhost'].includes(new URL(databaseTestUrl).hostname);

const pace = { kind: 'instant' as const };
const authorization = {
  version: 2,
  offerId: null,
  activityAccess: { kind: 'none' as const },
  preparedPlans: [],
};

test(
  'committedCheckpointMatches accepts a matching v2 opening and rejects drift',
  { skip: !disposableTestDb },
  async () => {
    const config = readDatabaseConfig({ DATABASE_URL: databaseTestUrl });
    const database = createDatabase(config, (error: Error) => {
      throw error;
    });
    await database.checkConnection();
    const ownerId = `user_${randomUUID()}`;
    const storyId = randomUUID();
    const passageId = randomUUID();
    await database.db.insert(user).values({
      id: ownerId,
      name: 'TURN03',
      email: `${ownerId}@example.test`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await database.db.insert(story).values({
      id: storyId,
      ownerId,
      source: 'turn03.v2-opening',
      continuityNotes: null,
      activeSceneScope: null,
    });
    await database.db.insert(campaign).values({
      storyId,
      settingsRevision: 1,
      character: null,
      storyFacts: [],
      activityOccurrences: [],
      acceptedActivityPlan: null,
      content: null,
      location: null,
      gameSecond: 0,
      clock: wholeGameSeconds(0),
      clockAnchorAt: new Date(),
      clockPace: pace,
      holds: [],
      offer: null,
      situationAuthorization: authorization,
      activeActivityId: null,
      activeActionOperationId: null,
      worldConditions: [],
    });
    const opening = quiescentCampaignOpeningCheckpoint({
      storyId,
      passageId,
      input: {
        source: 'turn03.v2-opening',
        items: [],
        content: {
          version: 1,
          title: 'Opening',
          paragraphs: ['The path splits.'],
        },
        interaction: null,
      },
      interactionId: null,
      rootHash: 'ab'.repeat(32),
      rootRevision: 1,
      contentDocumentHash: 'cd'.repeat(32),
      pins: {
        worlds: [],
        rules: null,
        start: null,
        storytellerProfile: null,
      },
      pace,
    });
    const checkpoint = sceneCheckpointSchema.parse(opening);
    const matched = await database.db.transaction((tx: Transaction) =>
      committedCheckpointMatches(tx, checkpoint),
    );
    assert.equal(matched, true);
    assert.equal(checkpoint.format, 'offscreen.scene-checkpoint.v2');
    if (checkpoint.format !== 'offscreen.scene-checkpoint.v2') {
      return;
    }
    if (checkpoint.fictionalState.mechanicsAbsent) {
      throw new Error('expected campaign mechanics');
    }
    const drifted = sceneCheckpointSchema.parse({
      ...checkpoint,
      fictionalState: {
        ...checkpoint.fictionalState,
        location: 'Seyda Neen',
      },
    });
    const rejected = await database.db.transaction((tx: Transaction) =>
      committedCheckpointMatches(tx, drifted),
    );
    assert.equal(rejected, false);
  },
);

test(
  'committedCheckpointMatches keeps v1 absent-mechanics acceptance',
  { skip: !disposableTestDb },
  async () => {
    const config = readDatabaseConfig({ DATABASE_URL: databaseTestUrl });
    const database = createDatabase(config, (error: Error) => {
      throw error;
    });
    await database.checkConnection();
    const ownerId = `user_${randomUUID()}`;
    const storyId = randomUUID();
    await database.db.insert(user).values({
      id: ownerId,
      name: 'TURN03',
      email: `${ownerId}@example.test`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await database.db.insert(story).values({
      id: storyId,
      ownerId,
      source: 'turn03.v1-opening',
    });
    const checkpoint = sceneCheckpointV1Schema.parse({
      format: 'offscreen.scene-checkpoint.v1',
      stateSchemaVersion: 1,
      storyId,
      passageId: randomUUID(),
      sceneSequence: 1,
      transitionId: null,
      source: 'turn03.v1-opening',
      premise: null,
      storyteller: null,
      execution: null,
      usagePolicy: null,
      canon: { rootHash: null, rootRevision: 0 },
      ancestor: { storyId: null, rootHash: null, rootRevision: null },
      pins: {
        worlds: [],
        rules: null,
        start: null,
        storytellerProfile: null,
      },
      passage: {
        response: null,
        responseSource: null,
        initialItems: null,
        effects: [],
        decisionPlan: null,
        waitPlan: null,
        controlRevision: 0,
        content: { text: 'Opening' },
        contentDocumentHash: null,
        interaction: null,
      },
      mechanics: { mechanicsAbsent: true, items: [] },
    });
    const matched = await database.db.transaction((tx: Transaction) =>
      committedCheckpointMatches(tx, checkpoint),
    );
    assert.equal(matched, true);
    const present = sceneCheckpointV1Schema.parse({
      ...checkpoint,
      mechanics: {
        mechanicsAbsent: false,
        character: null,
        items: [],
        storyFacts: [],
        activityOccurrences: [],
        location: null,
        gameSecond: 0,
        clock: wholeGameSeconds(0),
        pace,
        holds: [],
        offer: null,
        acceptedActivityPlan: null,
        activeActivityId: null,
        activeActionOperationId: null,
        situationAuthorization: authorization,
        worldConditions: [],
        settingsRevision: 1,
        content: null,
        continuityNotes: [],
        activeSceneScope: null,
      },
    });
    const rejected = await database.db.transaction((tx: Transaction) =>
      committedCheckpointMatches(tx, present),
    );
    assert.equal(rejected, false);
  },
);
