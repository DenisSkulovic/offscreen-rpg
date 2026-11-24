import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  chamberScenarioCatalog,
  chamberScenarioMetadataSchema,
  listChamberScenarios,
  startChamberSchema,
} from '@offscreen/lab-interface/chamber';

test('every accepted chamber scenario has catalog metadata', () => {
  const accepted = startChamberSchema.shape.scenario.options;
  const listed = listChamberScenarios();
  assert.deepEqual(
    listed.map((entry) => entry.id),
    [...accepted],
  );
  assert.equal(listed.length, Object.keys(chamberScenarioCatalog).length);
  for (const entry of listed) {
    const metadata = chamberScenarioMetadataSchema.parse({
      name: entry.name,
      description: entry.description,
      exercises: entry.exercises,
    });
    assert.equal(metadata.name, entry.name);
    assert.ok(metadata.exercises.length > 0);
  }
});
