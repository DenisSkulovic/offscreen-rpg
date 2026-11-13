import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  acceptedShiftEightyPercentRecipe,
  assertDestructiveSandboxProvisionAllowed,
  assertSandboxDatabaseTarget,
  buildSandboxDatabaseUrl,
  createMemorySandboxStore,
  materializeSandboxSpecimen,
  rematerializeSandboxSpecimen,
  SandboxGuardError,
  sandboxDatabaseNameForRun,
} from '../dist/developer-tools/index.js';

test('sandbox guard refuses remote, reserved, and query-bearing URLs before connect', () => {
  assert.throws(
    () =>
      assertSandboxDatabaseTarget(
        'postgresql://offscreen:x@db.example.com:5432/offscreen_chamber_run_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ),
    (error) =>
      error instanceof SandboxGuardError && error.code === 'non-local-host',
  );
  assert.throws(
    () =>
      assertSandboxDatabaseTarget(
        'postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_chamber',
      ),
    (error) =>
      error instanceof SandboxGuardError && error.code === 'reserved-name',
  );
  assert.throws(
    () =>
      assertSandboxDatabaseTarget(
        'postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_auth_test',
      ),
    (error) =>
      error instanceof SandboxGuardError && error.code === 'reserved-name',
  );
  assert.throws(
    () =>
      assertSandboxDatabaseTarget(
        'postgresql://offscreen:local-development-only@127.0.0.1:5432/offscreen_chamber_run_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?sslmode=require',
      ),
    (error) =>
      error instanceof SandboxGuardError && error.code === 'query-overrides',
  );
  const runId = '123e4567-e89b-12d3-a456-426614174000';
  const ok = assertSandboxDatabaseTarget(
    buildSandboxDatabaseUrl({ runId }),
    runId,
  );
  assert.equal(ok.databaseName, sandboxDatabaseNameForRun(runId));
  assert.throws(
    () =>
      assertDestructiveSandboxProvisionAllowed({
        connectionString: ok.connectionString,
        runId,
        confirmDisposableProvision: false,
      }),
    (error) =>
      error instanceof SandboxGuardError &&
      error.code === 'destructive-not-confirmed',
  );
});

test('two isolated memory runs share fixture hash but not IDs or mutations', async () => {
  const recipe = acceptedShiftEightyPercentRecipe({
    seed: 141,
    includeItem: true,
  });
  const { first, second } = await rematerializeSandboxSpecimen({
    recipe,
    storeFactory: createMemorySandboxStore,
  });
  assert.equal(first.summary.fixtureHash, second.summary.fixtureHash);
  assert.equal(first.summary.progressRatio, 0.8);
  assert.notEqual(first.checkpoint.runId, second.checkpoint.runId);
  assert.notEqual(first.checkpoint.storyId, second.checkpoint.storyId);
  assert.notEqual(
    first.checkpoint.databaseName,
    second.checkpoint.databaseName,
  );

  const store = createMemorySandboxStore();
  const run = await materializeSandboxSpecimen({ recipe, store });
  await store.mutateItemHolder({
    runId: run.checkpoint.runId,
    storyId: run.checkpoint.storyId,
    itemKey: 'sealed-letter',
    holderKey: 'intruder',
  });
  const other = await materializeSandboxSpecimen({ recipe, store });
  const mutated = await store.readSummary({
    runId: run.checkpoint.runId,
    storyId: run.checkpoint.storyId,
  });
  const untouched = await store.readSummary({
    runId: other.checkpoint.runId,
    storyId: other.checkpoint.storyId,
  });
  assert.equal(mutated.itemHolders['sealed-letter'], 'intruder');
  assert.equal(untouched.itemHolders['sealed-letter'], 'courier');
  await store.close();
});

test('invalid fixture never writes; postgres store refuses without confirm', async () => {
  const store = createMemorySandboxStore();
  await assert.rejects(
    () =>
      materializeSandboxSpecimen({
        store,
        recipe: {
          id: 'bad',
          version: 1,
          seed: 1,
          overlays: [
            {
              kind: 'owned-item',
              itemKey: 'sealed-letter',
              label: 'Sealed letter',
              ownerHolderKey: 'courier',
              holderKey: 'caretaker',
            },
          ],
        },
      }),
    /foreign|holder/i,
  );
  assert.equal(
    await store.readSummary({
      runId: randomUUID(),
      storyId: randomUUID(),
    }),
    null,
  );
  await store.close();

  const postgresLike = {
    kind: 'postgres',
    async writeSpecimen() {
      throw new Error('must not write');
    },
    async readSummary() {
      return null;
    },
    async close() {},
  };
  await assert.rejects(
    () =>
      materializeSandboxSpecimen({
        store: postgresLike,
        runId: '123e4567-e89b-12d3-a456-426614174000',
        confirmDisposableProvision: false,
      }),
    (error) =>
      error instanceof SandboxGuardError &&
      error.code === 'destructive-not-confirmed',
  );
});
