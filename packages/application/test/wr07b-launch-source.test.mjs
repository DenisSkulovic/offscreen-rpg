import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LocalDocumentStore } from '@offscreen/documents';
import {
  assertLaunchSourceOwner,
  pinLaunchPresetRoot,
  stageLaunchPromptLibrary,
} from '@offscreen/story-engine/storyteller/launch-source';

const OWNER_A = 'user_bah_launch';
const OWNER_B = 'user_bah_other';

async function makeStore() {
  const root = await mkdtemp(join(tmpdir(), 'wr07b-launch-'));
  return new LocalDocumentStore(root);
}

test('stageLaunchPromptLibrary pins stable ids for same owner and verbatim prompt', async () => {
  const prompt = 'You are  stranded on a  rocky shore in Vvardenfell.';
  const storeA = await makeStore();
  const storeB = await makeStore();

  const first = await stageLaunchPromptLibrary(storeA, {
    ownerId: OWNER_A,
    prompt,
  });
  const second = await stageLaunchPromptLibrary(storeB, {
    ownerId: OWNER_A,
    prompt,
  });

  assert.equal(first.documentId, second.documentId);
  assert.equal(first.objectHash, second.objectHash);
  assert.equal(first.libraryRootHash, second.libraryRootHash);
  assert.equal(first.libraryRootRevision, 1);

  const stored = await storeA.readDocument(first.objectHash);
  assert.equal(stored.body, prompt);
});

test('stageLaunchPromptLibrary changes hashes when prompt bytes differ', async () => {
  const base = 'Ashore in Seyda Neen.';
  const flipped = 'Ashore in Seyda Neen.\u200b';
  const store = await makeStore();

  const baseline = await stageLaunchPromptLibrary(store, {
    ownerId: OWNER_A,
    prompt: base,
  });
  const changed = await stageLaunchPromptLibrary(store, {
    ownerId: OWNER_A,
    prompt: flipped,
  });

  assert.notEqual(baseline.objectHash, changed.objectHash);
  assert.notEqual(baseline.libraryRootHash, changed.libraryRootHash);
  assert.equal(baseline.documentId, changed.documentId);
});

test('stageLaunchPromptLibrary namespaces documentId by owner', async () => {
  const prompt = 'Begin at the Census Office dock.';
  const store = await makeStore();

  const forA = await stageLaunchPromptLibrary(store, {
    ownerId: OWNER_A,
    prompt,
  });
  const forB = await stageLaunchPromptLibrary(store, {
    ownerId: OWNER_B,
    prompt,
  });

  assert.notEqual(forA.documentId, forB.documentId);
  assert.throws(
    () => assertLaunchSourceOwner(OWNER_A, OWNER_B),
    /launch_owner_mismatch/,
  );
});

test('pinLaunchPresetRoot returns pinned hash without storage writes', () => {
  const presetRootHash = 'ab'.repeat(32);
  const first = pinLaunchPresetRoot({ presetRootHash });
  const second = pinLaunchPresetRoot({ presetRootHash });

  assert.equal(first.libraryRootHash, presetRootHash);
  assert.equal(second.libraryRootHash, presetRootHash);
  assert.equal(first.libraryRootRevision, 1);
  assert.equal(second.libraryRootRevision, 1);
});