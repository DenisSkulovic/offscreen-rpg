import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AdminSessionError,
  createAdminSessions,
  mintAdminToken,
  createAdminAccess,
  createAdminCaseStore,
} from '@offscreen/admin';

import {
  campaignHoldSchema as engineCampaignHoldSchema,
  campaignHoldsSchema as engineCampaignHoldsSchema,
} from '../../../packages/story-engine/dist/campaign/holds.js';

import {
  campaignHoldSchema as contractsCampaignHoldSchema,
  campaignHoldsSchema as contractsCampaignHoldsSchema,
} from '@offscreen/contracts/campaign-holds';

test('admin public surface exports resolve from @offscreen/admin', () => {
  assert.equal(typeof AdminSessionError, 'function');
  assert.equal(typeof createAdminSessions, 'function');
  assert.equal(typeof mintAdminToken, 'function');
  assert.equal(typeof createAdminAccess, 'function');
  assert.equal(typeof createAdminCaseStore, 'function');
});

test('campaign holds schema identity matches contracts via story-engine', () => {
  assert.equal(engineCampaignHoldSchema, contractsCampaignHoldSchema);
  assert.equal(engineCampaignHoldsSchema, contractsCampaignHoldsSchema);
});

test('admin negative: AdminSessionError is not a plain object', () => {
  assert.notEqual(typeof AdminSessionError, 'object');
});