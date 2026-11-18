import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicationPassageId } from '../dist/stories/passage-documents.js';
import { publicationAppearanceWrite } from '../dist/stories/scene-appearance.js';

const storyId = '11111111-1111-4111-8111-111111111111';
const stagedPassageId = '22222222-2222-4222-8222-222222222222';
const generationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const candidate = {
  schemaVersion: 1,
  scene: {
    palette: { backdrop: '#1A3040' },
    atmosphere: { lighting: 'dim' },
  },
};

test('a staged publication keeps that passage id on the appearance', () => {
  const written = publicationAppearanceWrite({
    generationId,
    storyId,
    stagedPassageId,
    candidate,
  });
  assert.equal(written.passageId, stagedPassageId);
  assert.equal(written.appearance?.source.passageId, stagedPassageId);
  assert.equal(written.appearance?.source.storyId, storyId);
});

test('an unstaged publication uses the generation passage id', () => {
  const written = publicationAppearanceWrite({
    generationId,
    storyId,
    candidate,
  });
  assert.equal(written.passageId, publicationPassageId(generationId));
  assert.equal(written.appearance?.source.passageId, written.passageId);
});

test('a missing or rejected candidate stores no appearance', () => {
  const absent = publicationAppearanceWrite({ generationId, storyId });
  assert.equal(absent.appearance, undefined);
  assert.equal(absent.passageId, publicationPassageId(generationId));
  const rejected = publicationAppearanceWrite({
    generationId,
    storyId,
    stagedPassageId,
    candidate: {
      schemaVersion: 1,
      scene: { palette: { backdrop: '#1a3040' } },
      source: { storyId, passageId: stagedPassageId },
    },
  });
  assert.equal(rejected.appearance, undefined);
  assert.equal(rejected.passageId, stagedPassageId);
});
