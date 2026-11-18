import assert from 'node:assert/strict';
import test from 'node:test';
import { continuityProvenance } from './story-session-report.mjs';

const secret = 'The secret harbor warning must stay out of the report';
const packedBody = 'The packed current record stays hashed';
const documentId = '11111111-1111-4111-8111-111111111111';

function sample(overrides = {}) {
  return continuityProvenance({
    output: {
      documentChanges: [
        {
          operation: 'revise',
          kind: 'identity',
          path: 'people/mira.md',
          documentId,
          expectedRevision: 3,
          title: 'Mira',
          body: secret,
          reason: secret,
        },
      ],
      currentNotes: [],
    },
    publicationState: 'rejected',
    retainedRoot: { revision: 4, hash: 'abc123' },
    canonicalKnowledge: {
      catalogue: [
        { handle: 'd9', loaded: false, title: 'Catalogue only' },
      ],
      documentSelection: {
        loadedHandles: ['d1'],
        omitted: [{ documentId, reason: 'request-limit' }],
      },
    },
    request: {
      messages: [
        { role: 'user', content: `${secret} d9` },
        { handle: 'd1', body: packedBody },
      ],
    },
    ...overrides,
  });
}

test('a rejected proposal stays proposed and is not a retained document', () => {
  const continuity = sample();
  assert.equal(continuity.published.state, 'rejected');
  assert.deepEqual(continuity.proposed.documents, [
    {
      index: 0,
      operation: 'revise',
      kind: 'identity',
      path: 'people/mira.md',
      documentId,
      expectedRevision: 3,
    },
  ]);
  assert.equal(continuity.proposed.noteCount, 0);
  assert.equal(continuity.retained.documents, 'unknown');
  assert.equal(continuity.retained.rootHash, 'abc123');
  assert.equal(JSON.stringify(continuity).includes(secret), false);
});

test('a catalogue-only handle is not selected or packed', () => {
  const continuity = sample();
  assert.deepEqual(continuity.selected.handles, ['d1']);
  assert.deepEqual(
    continuity.packed.handles.map((entry) => entry.handle),
    ['d1'],
  );
  assert.equal(continuity.packed.handles[0].bytes, Buffer.byteLength(packedBody));
  assert.equal(JSON.stringify(continuity).includes(packedBody), false);
  assert.equal(continuity.selected.handles.includes('d9'), false);
  assert.equal(
    continuity.packed.handles.some((entry) => entry.handle === 'd9'),
    false,
  );
});

test('a selected handle without a request body is not packed', () => {
  const continuity = sample({
    request: { messages: [{ role: 'user', content: 'remember d1' }] },
  });
  assert.deepEqual(continuity.selected.handles, ['d1']);
  assert.deepEqual(continuity.packed.handles, []);
});

test('missing evidence stays unknown', () => {
  const continuity = continuityProvenance({});
  assert.equal(continuity.proposed, 'unknown');
  assert.equal(continuity.published, 'unknown');
  assert.equal(continuity.retained, 'unknown');
  assert.equal(continuity.selected, 'unknown');
  assert.equal(continuity.packed, 'unknown');
  const empty = continuityProvenance({
    output: { documentChanges: [] },
  });
  assert.deepEqual(empty.proposed.documents, []);
  assert.equal(empty.proposed.noteCount, 'unknown');
});
