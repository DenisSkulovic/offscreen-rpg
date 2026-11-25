import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OperationManifestError,
  operationKey,
  validateManifest,
} from '../src/contract.js';
import {
  OperationRegistryError,
  compileManifests,
  lookup,
  manifests,
} from '../src/registry.js';

const validPayload = {
  id: 'fix-null-checkpoints',
  version: 1,
  title: 'Backfill null scene checkpoints',
  owner: 'platform-data',
  kind: 'backfill',
  risk: 'medium',
  mode: 'batched',
  recovery: 'compensating',
  recoveryNotes: 'Run during low traffic; rows are idempotent.',
  affectedTables: ['story.scene_checkpoints'],
};

test('validateManifest accepts a valid manifest and freezes the result', () => {
  const manifest = validateManifest(validPayload);
  assert.equal(manifest.id, validPayload.id);
  assert.equal(operationKey(manifest), 'fix-null-checkpoints@1');
  assert.throws(() => {
    (manifest as { id: string }).id = 'other';
  });
  assert.throws(() => {
    (manifest.affectedTables as string[]).push('story.other');
  });
});

test('validateManifest rejects unknown fields', () => {
  assert.throws(() => validateManifest({ ...validPayload, extra: true }));
});

test('validateManifest rejects invalid enum and whitespace title', () => {
  assert.throws(
    () => validateManifest({ ...validPayload, kind: 'migrate' }),
    (error: unknown) => {
      assert.ok(error instanceof OperationManifestError);
      return true;
    },
  );
  assert.throws(() => validateManifest({ ...validPayload, title: '   ' }));
});

test('defensive copy: mutating input after validation does not change manifest', () => {
  const payload = {
    ...validPayload,
    affectedTables: ['story.scene_checkpoints', 'story.scenes'],
  };
  const manifest = validateManifest(payload);
  payload.affectedTables.push('story.evil');
  assert.deepEqual(manifest.affectedTables, [
    'story.scene_checkpoints',
    'story.scenes',
  ]);
});

test('compileManifests rejects duplicate operation keys', () => {
  const first = { ...validPayload };
  const second = { ...validPayload, title: 'Duplicate key attempt' };
  assert.throws(
    () => compileManifests([first, second]),
    (error: unknown) => {
      assert.ok(error instanceof OperationRegistryError);
      assert.match(
        (error as Error).message,
        /duplicate operation key: fix-null-checkpoints@1/,
      );
      return true;
    },
  );
});

test('lookup on explicit empty registry returns undefined', () => {
  assert.equal(manifests.length, 0);
  assert.equal(lookup('missing@1'), undefined);
});
