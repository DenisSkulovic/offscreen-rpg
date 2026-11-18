import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectStoredSceneAppearance } from '../src/stories';

const storyId = '11111111-1111-4111-8111-111111111111';
const passageId = '22222222-2222-4222-8222-222222222222';
const otherPassageId = '33333333-3333-4333-8333-333333333333';

const directive = {
  schemaVersion: 1,
  scene: {
    palette: { backdrop: '#1a3040', accent: '#d7a15a', surfaceTint: '#1c2830' },
    atmosphere: { lighting: 'dim' },
  },
};

test('a matching saved appearance stays on the current passage', () => {
  const projected = projectStoredSceneAppearance(
    {
      source: { storyId, passageId },
      directive,
    },
    { storyId, passageId },
  );
  assert.equal(projected?.source.passageId, passageId);
  assert.equal(projected?.directive, directive);
});

test('a wrong passage, a wrong story, and a corrupt value are omitted', () => {
  assert.equal(
    projectStoredSceneAppearance(
      { source: { storyId, passageId: otherPassageId }, directive },
      { storyId, passageId },
    ),
    undefined,
  );
  assert.equal(
    projectStoredSceneAppearance(
      {
        source: {
          storyId: '44444444-4444-4444-8444-444444444444',
          passageId,
        },
        directive,
      },
      { storyId, passageId },
    ),
    undefined,
  );
  assert.equal(projectStoredSceneAppearance(null, { storyId, passageId }), undefined);
  assert.equal(
    projectStoredSceneAppearance(
      { source: { storyId, passageId }, directive, extra: true },
      { storyId, passageId },
    ),
    undefined,
  );
});

test('an asset src outside the public schema drops the appearance', () => {
  assert.equal(
    projectStoredSceneAppearance(
      {
        source: { storyId, passageId },
        directive,
        assets: {
          plate: {
            src: 'javascript:alert(1)',
            width: 32,
            height: 32,
            description: null,
          },
        },
      },
      { storyId, passageId },
    ),
    undefined,
  );
});
