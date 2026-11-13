import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  acceptedShiftEightyPercentRecipe,
  createPostgresSandboxStore,
  destroyDisposableSandboxDatabase,
  materializeSandboxSpecimen,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';

test('live sandbox DROP/CREATE materializes and isolates two runs', async () => {
  const runA = randomUUID();
  const runB = randomUUID();
  const recipe = acceptedShiftEightyPercentRecipe({
    seed: 141,
    includeItem: true,
  });

  const provisionedA = await provisionDisposableSandboxDatabase({
    runId: runA,
    confirmDisposableProvision: true,
  });
  const provisionedB = await provisionDisposableSandboxDatabase({
    runId: runB,
    confirmDisposableProvision: true,
  });
  assert.notEqual(provisionedA.databaseName, provisionedB.databaseName);

  const storeA = createPostgresSandboxStore(provisionedA.connectionString);
  const storeB = createPostgresSandboxStore(provisionedB.connectionString);
  try {
    const first = await materializeSandboxSpecimen({
      recipe,
      runId: runA,
      store: storeA,
      connectionString: provisionedA.connectionString,
      confirmDisposableProvision: true,
    });
    const second = await materializeSandboxSpecimen({
      recipe,
      runId: runB,
      store: storeB,
      connectionString: provisionedB.connectionString,
      confirmDisposableProvision: true,
    });
    assert.equal(first.storeKind, 'postgres');
    assert.equal(first.summary.fixtureHash, second.summary.fixtureHash);
    assert.equal(first.summary.progressRatio, 0.8);
    assert.notEqual(first.checkpoint.storyId, second.checkpoint.storyId);

    await storeA.mutateItemHolder({
      runId: runA,
      storyId: first.checkpoint.storyId,
      itemKey: 'sealed-letter',
      holderKey: 'mutated-a',
    });
    const summaryA = await storeA.readSummary({
      runId: runA,
      storyId: first.checkpoint.storyId,
    });
    const summaryB = await storeB.readSummary({
      runId: runB,
      storyId: second.checkpoint.storyId,
    });
    assert.equal(summaryA.itemHolders['sealed-letter'], 'mutated-a');
    assert.equal(summaryB.itemHolders['sealed-letter'], 'courier');
  } finally {
    await storeA.close().catch(() => undefined);
    await storeB.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId: runA,
      confirmDisposableProvision: true,
    });
    await destroyDisposableSandboxDatabase({
      runId: runB,
      confirmDisposableProvision: true,
    });
  }
});
