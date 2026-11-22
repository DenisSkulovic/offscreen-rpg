import assert from 'node:assert/strict';
import test from 'node:test';
import { StoryError } from '../dist/stories/errors.js';
import {
  attachWriterPublicationStage,
  recordWriterPublicationFailure,
} from '../dist/storyteller/writer-publication-diagnostic.js';

const ids = {
  missionId: 'af143bcb-1ec0-479e-876f-d68c810cd736',
  generationId: '8ef6e199-f227-4ab3-8273-cdee9ac04f25',
  storyId: 'e757f6d0-c94d-4cf9-8a8b-96e4f3364d86',
};

test('publication rollback keeps the public failure and records the safe cause', () => {
  const error = new StoryError('conflict', 'writer_scene_base_stale');
  error.stack = `StoryError: conflict\n    at publishAcceptedWriterSceneAtStage (writer-continuation-publication.ts:12:3)\n    at secret narrative line`;
  attachWriterPublicationStage(error, 'base-identity');
  const lines = [];
  const result = recordWriterPublicationFailure(error, ids, (line) => lines.push(line));
  assert.deepEqual(result, { status: 'held', reason: 'publication_failed' });
  const logged = JSON.parse(lines[0]);
  assert.equal(logged.event, 'writer-scene.publication-failed');
  assert.equal(logged.errorKind, 'Error');
  assert.equal(logged.correlation.publicationStage, 'base-identity');
  assert.equal(logged.correlation.code, 'conflict');
  assert.equal(logged.correlation.reason, 'writer_scene_base_stale');
  assert.equal(logged.correlation.stackFrame, 'writer-continuation-publication.ts:12:3');
  assert.equal(logged.message.includes('narrative'), false);
  assert.equal(JSON.stringify(logged).includes('secret'), false);
});

test('prose and unsafe reasons are omitted from the publication log', () => {
  const error = new Error('the prisoner whispered a secret name');
  error.reason = 'the whole scene text';
  attachWriterPublicationStage(error, 'not a stage');
  const lines = [];
  const result = recordWriterPublicationFailure(error, ids, (line) => lines.push(line));
  assert.equal(result.reason, 'publication_failed');
  const logged = JSON.parse(lines[0]);
  assert.equal(logged.correlation.reason, undefined);
  assert.equal(logged.correlation.publicationStage, undefined);
  assert.equal(JSON.stringify(logged).includes('prisoner'), false);
  assert.equal(JSON.stringify(logged).includes('scene text'), false);
});
