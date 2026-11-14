import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  LocalDocumentStore,
  documentManifestSchema,
} from '@offscreen/documents';
import {
  isStorytellerActivityState,
  STORYTELLER_ACTIVITY_STATES,
} from '../dist/storyteller/activity-context.js';
import { loadCanonicalKnowledge } from '../dist/storyteller/canonical-knowledge.js';
import { stageStoryPublicationDocuments } from '../dist/stories/passage-documents.js';
import { publicationPassageId } from '../dist/stories/passage-documents.js';

test('storyteller activity states keep retained work and exclude terminals', () => {
  for (const state of STORYTELLER_ACTIVITY_STATES) {
    assert.equal(isStorytellerActivityState(state), true);
  }
  assert.equal(isStorytellerActivityState('completed'), false);
  assert.equal(isStorytellerActivityState('cancelled'), false);
  assert.equal(isStorytellerActivityState('failed'), false);
  assert.ok(STORYTELLER_ACTIVITY_STATES.includes('suspended'));
  assert.ok(STORYTELLER_ACTIVITY_STATES.includes('completion-pending'));
});

test('canonical knowledge inspects only bodies needed for selection, not the whole catalogue', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-sa03-canon-'));
  const storage = new LocalDocumentStore(root);
  const storyId = randomUUID();
  const base = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: storyId,
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    entries: [],
  });
  let rootHash = await storage.putManifest(base);
  let rootRevision = 1;
  let requiredId = null;

  for (let index = 0; index < 24; index += 1) {
    const operationId = randomUUID();
    const path =
      index === 0
        ? 'relationships/required-favor.md'
        : `lore/noise/day-${String(index).padStart(2, '0')}.md`;
    const staged = await stageStoryPublicationDocuments({
      storage,
      storyId,
      passageId: publicationPassageId(operationId),
      sequence: rootRevision + 1,
      operationId,
      rootHash,
      rootRevision,
      content: {
        version: 1,
        title: `Passage ${index}`,
        paragraphs: [`Noise body ${index}`],
      },
      changes: [
        {
          operation: 'create',
          path,
          kind: index === 0 ? 'relationship' : 'lore',
          authority: 'canon',
          visibility: 'player-known',
          title: index === 0 ? 'Required favor' : `Noise ${index}`,
          body: `${'x'.repeat(64)} document ${index}`,
          reason: 'SA03 catalogue pressure',
        },
      ],
    });
    rootHash = staged.rootHash;
    rootRevision += 1;
    if (index === 0) {
      const manifest = await storage.readManifest(rootHash);
      requiredId = manifest.entries.find(
        (entry) => entry.path === 'relationships/required-favor.md',
      )?.documentId;
    }
  }
  assert.ok(requiredId);

  let readCount = 0;
  const countingStore = {
    readManifest: (hash) => storage.readManifest(hash),
    readDocument: async (hash) => {
      readCount += 1;
      return storage.readDocument(hash);
    },
    readStructuredDocument: (hash) => storage.readStructuredDocument(hash),
  };

  const knowledge = await loadCanonicalKnowledge(countingStore, {
    storyId,
    rootHash,
    rootRevision,
    campaignDocumentIds: [requiredId],
  });

  assert.ok(knowledge.catalogue.length >= 20);
  assert.ok(readCount <= 8, `expected ≤8 body reads, got ${readCount}`);
  assert.ok(readCount < knowledge.catalogue.length);
  assert.ok(
    knowledge.catalogue.some(
      (entry) => entry.bodyInspected === false && entry.loaded === false,
    ),
  );
  const required = knowledge.catalogue.find(
    (entry) => entry.documentId === requiredId,
  );
  assert.equal(required?.loaded, true);
  assert.equal(required?.bodyInspected, true);
  assert.ok(knowledge.documents.some((doc) => doc.title === 'Required favor'));
});
