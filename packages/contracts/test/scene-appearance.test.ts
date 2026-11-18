import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeValidatedAppearanceForPublication,
  projectStoredSceneAppearance,
} from '../src/stories';

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

const subset = {
  schemaVersion: 1,
  scene: {
    palette: { backdrop: '#1A3040' },
    atmosphere: { lighting: 'dim' },
  },
};

test('a publication candidate keeps the server source and the visible subset', () => {
  const stored = makeValidatedAppearanceForPublication({
    storyId,
    passageId,
    candidate: subset,
  });
  assert.equal(stored?.source.storyId, storyId);
  assert.equal(stored?.source.passageId, passageId);
  assert.deepEqual(stored?.directive, {
    schemaVersion: 1,
    scene: {
      palette: { backdrop: '#1a3040' },
      atmosphere: { lighting: 'dim' },
    },
  });
});

test('an invalid publication candidate is omitted', () => {
  const rejected = [
    undefined,
    null,
    { ...subset, source: { storyId, passageId: otherPassageId } },
    { ...subset, choices: [{ css: 'background:url(https://evil.example)' }] },
    { ...subset, assets: { plate: { src: 'https://evil.example' } } },
    {
      schemaVersion: 1,
      scene: { palette: { backdrop: 'linear-gradient(red, blue)' } },
    },
    {
      schemaVersion: 1,
      scene: { palette: { backdrop: 'https://evil.example/a.png' } },
    },
    {
      schemaVersion: 1,
      scene: { atmosphere: { lighting: 'javascript' } },
    },
    { schemaVersion: 1, scene: { palette: { backdrop: '#1a3040', accent: '#fff' } } },
    { schemaVersion: 1, storyStyle: { palette: { backdrop: '#1a3040' } } },
  ];
  for (const candidate of rejected) {
    assert.equal(
      makeValidatedAppearanceForPublication({ storyId, passageId, candidate }),
      undefined,
    );
  }
});
