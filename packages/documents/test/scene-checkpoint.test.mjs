import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { ZodError } from 'zod';
import {
  DocumentStorageError,
  LocalDocumentStore,
  S3DocumentStore,
  canonicalJson,
  hashCanonicalJson,
  maximumSceneCheckpointBytes,
  sceneCheckpointSchema,
} from '../dist/index.js';

const STABLE_STORY_ID = '11111111-1111-4111-8111-111111111111';
const STABLE_PASSAGE_ID = '22222222-2222-4222-8222-222222222222';
const STABLE_ROOT_HASH = 'ab'.repeat(32);

function character() {
  return {
    name: 'A quay runner',
    scores: {
      strength: 10,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 12,
      charisma: 14,
    },
    applicableAbilities: [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ],
    skills: [{ id: 'persuasion', label: 'Persuasion' }],
    proficientSkills: ['persuasion'],
    proficiencyBonus: 2,
    hp: 20,
    maxHp: 20,
    facts: [],
    quantities: [],
  };
}

export function quiescentCheckpoint(patch = {}) {
  const storyId = patch.storyId ?? randomUUID();
  const passageId = patch.passageId ?? randomUUID();
  const rootHash = patch.rootHash ?? 'ab'.repeat(32);
  return sceneCheckpointSchema.parse({
    format: 'offscreen.scene-checkpoint.v1',
    stateSchemaVersion: 1,
    storyId,
    passageId,
    sceneSequence: 1,
    transitionId: null,
    source: 'test.opening.v1',
    premise: null,
    storyteller: { id: 'test-profile', revision: 1 },
    execution: null,
    usagePolicy: null,
    canon: { rootHash, rootRevision: patch.rootRevision ?? 1 },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: {
      worlds: [],
      rules: null,
      start: null,
      storytellerProfile: { id: 'test-profile', revision: 1 },
    },
    mechanics: {
      mechanicsAbsent: false,
      character: character(),
      items: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
      storyFacts: [],
      activityOccurrences: [],
      location: null,
      gameSecond: patch.gameSecond ?? 0,
      clock: {
        elapsedGameSeconds: 0,
        remainder: { numerator: '0', denominator: '1' },
      },
      pace: { kind: 'instant' },
      holds: [],
      offer: null,
      acceptedActivityPlan: null,
      activeActivityId: null,
      activeActionOperationId: null,
      situationAuthorization: {
        version: 2,
        offerId: null,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      worldConditions: [],
      settingsRevision: 1,
      content: null,
      continuityNotes: [],
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 1,
        requiredPassageIds: [passageId],
        recallCues: [],
      },
    },
    passage: {
      response: null,
      responseSource: null,
      initialItems: [
        { key: 'sword-a', label: 'Sword', holderKey: 'character' },
      ],
      effects: [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: {
        version: 1,
        title: 'Opening',
        paragraphs: ['The king is alive.'],
      },
      contentDocumentHash: null,
      interaction: null,
    },
  });
}

function memoryS3() {
  const objects = new Map();
  const client = {
    async send(command) {
      const name = command.constructor.name;
      const key = command.input.Key;
      if (name === 'PutObjectCommand') {
        if (command.input.IfNoneMatch === '*' && objects.has(key)) {
          const error = new Error('PreconditionFailed');
          error.name = 'PreconditionFailed';
          error.$metadata = { httpStatusCode: 412 };
          throw error;
        }
        objects.set(key, command.input.Body);
        return {};
      }
      if (name === 'GetObjectCommand') {
        if (!objects.has(key)) {
          const error = new Error('NoSuchKey');
          error.name = 'NoSuchKey';
          error.$metadata = { httpStatusCode: 404 };
          throw error;
        }
        return { Body: objects.get(key) };
      }
      throw new Error(`unexpected ${name}`);
    },
  };
  return { objects, client };
}

test('scene checkpoint schema rejects active work, unknown keys, and the wrong version', () => {
  const checkpoint = quiescentCheckpoint();
  assert.throws(
    () => sceneCheckpointSchema.parse({ ...checkpoint, extra: true }),
    ZodError,
  );
  assert.throws(
    () => sceneCheckpointSchema.parse({ ...checkpoint, stateSchemaVersion: 2 }),
    ZodError,
  );
  assert.throws(
    () =>
      sceneCheckpointSchema.parse({
        ...checkpoint,
        mechanics: {
          ...checkpoint.mechanics,
          holds: [{ kind: 'decision' }],
        },
      }),
    ZodError,
  );
  assert.throws(
    () =>
      sceneCheckpointSchema.parse({
        ...checkpoint,
        mechanics: { ...checkpoint.mechanics, offer: { id: randomUUID() } },
      }),
    ZodError,
  );
  assert.throws(
    () =>
      sceneCheckpointSchema.parse({
        ...checkpoint,
        passage: { ...checkpoint.passage, decisionPlan: { kind: 'open' } },
      }),
    ZodError,
  );
  const absent = sceneCheckpointSchema.parse({
    ...checkpoint,
    mechanics: { mechanicsAbsent: true, items: [] },
  });
  assert.equal(absent.mechanics.mechanicsAbsent, true);
  assert.deepEqual(absent.mechanics.items, []);
});

function stableV1CheckpointObject() {
  return {
    format: 'offscreen.scene-checkpoint.v1',
    stateSchemaVersion: 1,
    storyId: STABLE_STORY_ID,
    passageId: STABLE_PASSAGE_ID,
    sceneSequence: 1,
    transitionId: null,
    source: 'test.opening.v1',
    premise: null,
    storyteller: { id: 'test-profile', revision: 1 },
    execution: null,
    usagePolicy: null,
    canon: { rootHash: STABLE_ROOT_HASH, rootRevision: 1 },
    ancestor: { storyId: null, rootHash: null, rootRevision: null },
    pins: {
      worlds: [],
      rules: null,
      start: null,
      storytellerProfile: { id: 'test-profile', revision: 1 },
    },
    mechanics: {
      mechanicsAbsent: false,
      character: character(),
      items: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
      storyFacts: [],
      activityOccurrences: [],
      location: null,
      gameSecond: 0,
      clock: {
        elapsedGameSeconds: 0,
        remainder: { numerator: '0', denominator: '1' },
      },
      pace: { kind: 'instant' },
      holds: [],
      offer: null,
      acceptedActivityPlan: null,
      activeActivityId: null,
      activeActionOperationId: null,
      situationAuthorization: {
        version: 2,
        offerId: null,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      worldConditions: [],
      settingsRevision: 1,
      content: null,
      continuityNotes: [],
      activeSceneScope: {
        version: 'active-scene-anchor.v1',
        fromSequence: 1,
        requiredPassageIds: [STABLE_PASSAGE_ID],
        recallCues: [],
      },
    },
    passage: {
      response: null,
      responseSource: null,
      initialItems: [
        { key: 'sword-a', label: 'Sword', holderKey: 'character' },
      ],
      effects: [],
      decisionPlan: null,
      waitPlan: null,
      controlRevision: 0,
      content: {
        version: 1,
        title: 'Opening',
        paragraphs: ['The king is alive.'],
      },
      contentDocumentHash: null,
      interaction: null,
    },
  };
}

const STABLE_V1_CHECKPOINT_HASH =
  '6fecf9ea074573279c7ff4b15119583f1f18b7f07b5c1e0cd7ac0e60f7677c16';

function activeV2Checkpoint() {
  const holdId = '33333333-3333-4333-8333-333333333333';
  const offerId = '44444444-4444-4444-8444-444444444444';
  const activityId = '55555555-5555-4555-8555-555555555555';
  const obligationId = '66666666-6666-4666-8666-666666666666';
  const actionId = '77777777-7777-4777-8777-777777777777';
  const payload = { version: 1, body: { phase: 'open' } };
  const base = stableV1CheckpointObject();
  const { mechanics, ...baseWithoutMechanics } = base;
  return sceneCheckpointSchema.parse({
    ...baseWithoutMechanics,
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
    fictionalState: {
      mechanicsAbsent: false,
      character: character(),
      items: mechanics.items,
      storyFacts: [],
      activityOccurrences: [],
      location: null,
      gameSecond: 0,
      clock: mechanics.clock,
      pace: mechanics.pace,
      settingsRevision: 1,
      content: null,
      continuityNotes: [],
      activeSceneScope: mechanics.activeSceneScope,
      holds: [{ kind: 'decision', id: holdId }],
      offer: {
        id: offerId,
        source: 'test-offer',
        meaning: 'choose',
        payload,
      },
      acceptedActivityPlan: payload,
      activeActivityId: activityId,
      activeActionOperationId: actionId,
      situationAuthorization: {
        version: 2,
        offerId,
        activityAccess: { kind: 'none' },
        preparedPlans: [],
      },
      worldConditions: [],
      activeActivities: [
        {
          id: activityId,
          state: 'running',
          revision: 1,
          plan: payload,
          progress: payload,
        },
      ],
      worldObligations: [
        {
          id: obligationId,
          revision: 1,
          state: 'active',
          dueGameSecond: null,
          definition: payload,
        },
      ],
      activeAction: {
        id: actionId,
        status: 'pending',
        startGameSecond: 0,
        target: { kind: 'entity', id: 'npc-1' },
        pending: payload,
      },
    },
  });
}

test('v1 checkpoint hash and parse are stable', () => {
  const fixture = stableV1CheckpointObject();
  const parsed = sceneCheckpointSchema.parse(fixture);
  assert.deepEqual(parsed, fixture);
  const hash = hashCanonicalJson(fixture);
  assert.equal(hash, hashCanonicalJson(parsed));
  assert.equal(hash, hashCanonicalJson(sceneCheckpointSchema.parse(fixture)));
  assert.equal(hash, STABLE_V1_CHECKPOINT_HASH);
});

test('v2 checkpoint with open work parses and round-trips locally', async () => {
  const checkpoint = activeV2Checkpoint();
  const root = await mkdtemp(join(tmpdir(), 'offscreen-checkpoint-v2-'));
  const store = new LocalDocumentStore(root);
  const hash = await store.putSceneCheckpoint(checkpoint);
  assert.equal(await store.putSceneCheckpoint(checkpoint), hash);
  assert.deepEqual(await store.readSceneCheckpoint(hash), checkpoint);
});

test('v2 schema rejects duplicate ids, oversized payloads, and invalid pairings', () => {
  const checkpoint = activeV2Checkpoint();
  const payload = { version: 1, body: { phase: 'open' } };
  const duplicateActivity = {
    ...checkpoint,
    fictionalState: {
      ...checkpoint.fictionalState,
      activeActivities: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          state: 'running',
          revision: 1,
          plan: payload,
          progress: payload,
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          state: 'paused',
          revision: 2,
          plan: payload,
          progress: payload,
        },
      ],
    },
  };
  assert.throws(() => sceneCheckpointSchema.parse(duplicateActivity), ZodError);
  const duplicateObligation = {
    ...checkpoint,
    fictionalState: {
      ...checkpoint.fictionalState,
      worldObligations: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          revision: 1,
          state: 'active',
          dueGameSecond: null,
          definition: payload,
        },
        {
          id: '66666666-6666-4666-8666-666666666666',
          revision: 2,
          state: 'active',
          dueGameSecond: 1,
          definition: payload,
        },
      ],
    },
  };
  assert.throws(
    () => sceneCheckpointSchema.parse(duplicateObligation),
    ZodError,
  );
  const oversized = {
    ...checkpoint,
    fictionalState: {
      ...checkpoint.fictionalState,
      continuityNotes: null,
      content: { pad: 'x'.repeat(maximumSceneCheckpointBytes) },
    },
  };
  while (
    Buffer.byteLength(canonicalJson(oversized)) <= maximumSceneCheckpointBytes
  ) {
    oversized.fictionalState.content.pad += 'x'.repeat(16 * 1024);
  }
  assert.throws(() => sceneCheckpointSchema.parse(oversized), ZodError);
  const invalidCanon = {
    ...checkpoint,
    canon: { rootHash: 'not-a-hash', rootRevision: 1 },
  };
  assert.throws(() => sceneCheckpointSchema.parse(invalidCanon), ZodError);
  const missingTransition = {
    ...checkpoint,
    sceneSequence: 2,
    transitionId: null,
  };
  assert.throws(() => sceneCheckpointSchema.parse(missingTransition), ZodError);
  const v2WithMechanics = {
    ...stableV1CheckpointObject(),
    format: 'offscreen.scene-checkpoint.v2',
    stateSchemaVersion: 2,
  };
  assert.throws(() => sceneCheckpointSchema.parse(v2WithMechanics), ZodError);
});

test('local scene checkpoint round-trips, rejects a bad hash, and does not overwrite bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-checkpoint-'));
  const store = new LocalDocumentStore(root);
  const checkpoint = quiescentCheckpoint();
  const hash = await store.putSceneCheckpoint(checkpoint);
  assert.equal(await store.putSceneCheckpoint(checkpoint), hash);
  assert.deepEqual(await store.readSceneCheckpoint(hash), checkpoint);
  const path = join(
    root,
    'objects',
    'sha256',
    hash.slice(0, 2),
    `${hash}.json`,
  );
  const original = await readFile(path, 'utf8');
  await writeFile(path, `${original.slice(0, -2)} }\n`);
  await assert.rejects(
    () => store.readSceneCheckpoint(hash),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  await assert.rejects(
    () => store.putSceneCheckpoint(checkpoint),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  const stillTampered = await readFile(path, 'utf8');
  assert.notEqual(stillTampered, original);
  await assert.rejects(
    () => store.readSceneCheckpoint('cd'.repeat(32)),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'missing',
  );
});

test('mock S3 scene checkpoint round-trips and an S3 failure does not write locally', async () => {
  const memory = memoryS3();
  const store = new S3DocumentStore({
    bucket: 'offscreen-cas',
    region: 'us-east-1',
    prefix: `checkpoint/${randomUUID()}`,
    client: memory.client,
  });
  const checkpoint = quiescentCheckpoint({ gameSecond: 4 });
  const hash = await store.putSceneCheckpoint(checkpoint);
  assert.equal(await store.putSceneCheckpoint(checkpoint), hash);
  assert.deepEqual(await store.readSceneCheckpoint(hash), checkpoint);
  assert.equal(memory.objects.size, 1);
  const [key, bytes] = [...memory.objects.entries()][0];
  memory.objects.set(key, '{"format":"tampered"}\n');
  await assert.rejects(
    () => store.readSceneCheckpoint(hash),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  await assert.rejects(
    () => store.putSceneCheckpoint(checkpoint),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  assert.equal(memory.objects.get(key), '{"format":"tampered"}\n');
  assert.notEqual(memory.objects.get(key), bytes);
  await assert.rejects(
    () => store.readSceneCheckpoint('ef'.repeat(32)),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'missing',
  );

  const localRoot = await mkdtemp(
    join(tmpdir(), 'offscreen-checkpoint-local-'),
  );
  const failing = new S3DocumentStore({
    bucket: 'offscreen-cas',
    region: 'us-east-1',
    prefix: 'failed',
    client: {
      async send() {
        const error = new Error('s3 down');
        error.name = 'NetworkingError';
        throw error;
      },
    },
  });
  await assert.rejects(
    () => failing.putSceneCheckpoint(checkpoint),
    (error) =>
      error instanceof DocumentStorageError && error.code === 'unavailable',
  );
  assert.deepEqual(await readdir(localRoot), []);
  assert.equal(memory.objects.size, 1);
});
