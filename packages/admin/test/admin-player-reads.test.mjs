import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  playerSearchPageV1Schema,
  playerSummaryEnvelopeV1Schema,
  playerSummaryV1Schema,
} from '@offscreen/admin-interface/admin';
import {
  projectPlayerSummary,
  wrapPlayerSummaryEnvelope,
} from '../dist/index.js';

test('PlayerSummaryV1 never includes email or passage fields', () => {
  const summary = projectPlayerSummary({
    id: 'user_abc',
    createdAt: '2026-01-02T03:04:05.000Z',
    legacyOwnedCampaignCount: 2,
  });
  const parsed = playerSummaryV1Schema.parse(summary);
  assert.equal(parsed.status, 'unknown');
  assert.equal(parsed.commercial.status, 'unsupported');
  assert.equal(parsed.relationshipSummary.legacyOwnedCampaignCount, 2);
  assert.equal('email' in parsed, false);
  assert.equal('accessToken' in parsed, false);
  assert.equal('passages' in parsed, false);
});

test('summary envelope is strict-parseable with limitations', () => {
  const envelope = wrapPlayerSummaryEnvelope({
    summary: projectPlayerSummary({
      id: 'user_abc',
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
      legacyOwnedCampaignCount: 0,
    }),
    environment: 'local',
    observedAt: new Date('2026-11-14T12:00:00.000Z'),
  });
  const parsed = playerSummaryEnvelopeV1Schema.parse(envelope);
  assert.equal(parsed.subject.kind, 'player');
  assert.ok(parsed.limitations.includes('unsupported'));
  assert.equal(parsed.data.commercial.explanationCode, 'no-commercial-source');
});

test('empty search page schema accepts no-leak empty result', () => {
  const page = playerSearchPageV1Schema.parse({
    version: 1,
    items: [],
    limit: 1,
    nextCursor: null,
  });
  assert.equal(page.items.length, 0);
});
