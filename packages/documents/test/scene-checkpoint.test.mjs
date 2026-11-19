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
  sceneCheckpointSchema,
} from '../dist/index.js';

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
      initialItems: [{ key: 'sword-a', label: 'Sword', holderKey: 'character' }],
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
    (error) => error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  await assert.rejects(
    () => store.putSceneCheckpoint(checkpoint),
    (error) => error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  const stillTampered = await readFile(path, 'utf8');
  assert.notEqual(stillTampered, original);
  await assert.rejects(
    () => store.readSceneCheckpoint('cd'.repeat(32)),
    (error) => error instanceof DocumentStorageError && error.code === 'missing',
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
    (error) => error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  await assert.rejects(
    () => store.putSceneCheckpoint(checkpoint),
    (error) => error instanceof DocumentStorageError && error.code === 'corrupt',
  );
  assert.equal(memory.objects.get(key), '{"format":"tampered"}\n');
  assert.notEqual(memory.objects.get(key), bytes);
  await assert.rejects(
    () => store.readSceneCheckpoint('ef'.repeat(32)),
    (error) => error instanceof DocumentStorageError && error.code === 'missing',
  );

  const localRoot = await mkdtemp(join(tmpdir(), 'offscreen-checkpoint-local-'));
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
