import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalDocumentStore } from '@offscreen/documents';
import { checkpointWriterStore } from '../../../packages/story-engine/dist/stories/scene-checkpoint.js';

function noop() {}

function fourMethodStub(missing) {
  const base = {
    readManifest: noop,
    readStructuredDocument: noop,
    readLibraryRoot: noop,
    readSceneCheckpoint: noop,
    putSceneCheckpoint: noop,
  };
  delete base[missing];
  return base;
}

test('checkpointWriterStore accepts LocalDocumentStore', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doc-cap-guard-'));
  try {
    const store = new LocalDocumentStore(dir);
    const writer = checkpointWriterStore(store);
    assert.equal(writer, store);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkpointWriterStore refuses missing readStructuredDocument', () => {
  const result = checkpointWriterStore(
    fourMethodStub('readStructuredDocument'),
  );
  assert.equal(result, undefined);
});

test('checkpointWriterStore refuses missing readLibraryRoot', () => {
  const result = checkpointWriterStore(fourMethodStub('readLibraryRoot'));
  assert.equal(result, undefined);
});

test('checkpointWriterStore refuses non-callable putSceneCheckpoint', () => {
  const store = {
    readManifest: noop,
    readStructuredDocument: noop,
    readLibraryRoot: noop,
    readSceneCheckpoint: noop,
    putSceneCheckpoint: 'not-a-function',
  };
  const result = checkpointWriterStore(store);
  assert.equal(result, undefined);
});
