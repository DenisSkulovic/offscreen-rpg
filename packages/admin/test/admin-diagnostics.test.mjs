import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  decodeOperationCursor,
  encodeOperationCursor,
  projectCampaignMetadata,
  projectRedactedOperation,
  sanitizeFailureCode,
  sanitizeOperationKind,
} from '../dist/index.js';
import {
  campaignMetadataV1Schema,
  redactedOperationV1Schema,
} from '@offscreen/contracts/admin';

test('campaign metadata uses legacy-owner and never embeds passages', () => {
  const row = projectCampaignMetadata({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    createdAt: '2026-01-01T00:00:00.000Z',
    revision: 3,
    viewVersion: 4,
    pendingOrRunning: true,
    uncertain: false,
  });
  const parsed = campaignMetadataV1Schema.parse(row);
  assert.equal(parsed.relation, 'legacy-owner');
  assert.equal(parsed.operationHealth, 'pending');
  assert.equal('premise' in parsed, false);
  assert.equal('passages' in parsed, false);
});

test('redacted operation strips unsafe kind/failure and keeps publication honest', () => {
  assert.equal(
    sanitizeOperationKind('storyteller.opening.v1'),
    'storyteller.opening.v1',
  );
  assert.equal(sanitizeOperationKind('SELECT * FROM secret'), 'other');
  assert.equal(sanitizeFailureCode('invalid_output'), 'invalid_output');
  assert.equal(sanitizeFailureCode('raw provider dump'), 'failed');

  const succeededUnpublished = redactedOperationV1Schema.parse(
    projectRedactedOperation({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      kind: 'storyteller.action.v1',
      state: 'succeeded',
      publicationState: null,
      failureCode: null,
      updatedAt: '2026-02-01T00:00:00.000Z',
      attemptCoverage: 'none-recorded',
    }),
  );
  assert.equal(succeededUnpublished.publication, 'pending');
  assert.equal(succeededUnpublished.attemptCoverage, 'none-recorded');
  assert.equal('input' in succeededUnpublished, false);
  assert.equal('output' in succeededUnpublished, false);
});

test('OBS01: operation cursor round-trips and rejects garbage', () => {
  const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const encoded = encodeOperationCursor('2026-11-15T12:00:00.000Z', id);
  const decoded = decodeOperationCursor(encoded);
  assert.ok(decoded);
  assert.equal(decoded.id, id);
  assert.equal(decoded.updatedAt.toISOString(), '2026-11-15T12:00:00.000Z');
  assert.equal(decodeOperationCursor('not-a-cursor'), null);
  assert.equal(decodeOperationCursor('2026-11-15T12:00:00.000Z~nope'), null);
});
