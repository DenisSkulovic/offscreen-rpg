import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  balancedStoryRetrievalTuning,
  storyRetrievalTuningSchema,
} from '../src/context/story-retrieval.js';

test('balancedStoryRetrievalTuning parses through storyRetrievalTuningSchema', () => {
  const parsed = storyRetrievalTuningSchema.parse(balancedStoryRetrievalTuning);
  assert.equal(parsed.id, balancedStoryRetrievalTuning.id);
  assert.equal(parsed.version, balancedStoryRetrievalTuning.version);
  assert.deepEqual(
    parsed.fieldWeights,
    balancedStoryRetrievalTuning.fieldWeights,
  );
});

test('storyRetrievalTuningSchema rejects all-zero fieldWeights', () => {
  const invalid = {
    ...balancedStoryRetrievalTuning,
    fieldWeights: { title: 0, path: 0, context: 0, body: 0 },
  };
  const result = storyRetrievalTuningSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test('storyRetrievalTuningSchema rejects an extra property', () => {
  const invalid = {
    ...balancedStoryRetrievalTuning,
    unexpected: true,
  };
  const result = storyRetrievalTuningSchema.safeParse(invalid);
  assert.equal(result.success, false);
});
