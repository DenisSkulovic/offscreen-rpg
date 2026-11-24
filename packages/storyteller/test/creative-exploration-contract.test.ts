import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  creativeExplorationRecipeSchema,
  disabledCreativeExplorationRecipe,
} from '../src/context/creative-exploration.js';

test('disabledCreativeExplorationRecipe parses through creativeExplorationRecipeSchema', () => {
  const parsed = creativeExplorationRecipeSchema.parse(
    disabledCreativeExplorationRecipe,
  );
  assert.equal(parsed.id, disabledCreativeExplorationRecipe.id);
  assert.equal(parsed.enabled, false);
  assert.equal(parsed.posture, 'off');
});

test('creativeExplorationRecipeSchema rejects maxReads:1 on disabled recipe', () => {
  const invalid = {
    ...disabledCreativeExplorationRecipe,
    limits: {
      ...disabledCreativeExplorationRecipe.limits,
      maxReads: 1,
    },
  };
  const result = creativeExplorationRecipeSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test('creativeExplorationRecipeSchema rejects an extra property', () => {
  const invalid = {
    ...disabledCreativeExplorationRecipe,
    unexpected: true,
  };
  const result = creativeExplorationRecipeSchema.safeParse(invalid);
  assert.equal(result.success, false);
});
