import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AdminSessionError as AppAdminSessionError,
  createAdminSessions as appCreateAdminSessions,
  mintAdminToken as appMintAdminToken,
  createAdminAccess as appCreateAdminAccess,
  createAdminCaseStore as appCreateAdminCaseStore,
} from '../dist/admin/index.js';

import {
  AdminSessionError as PkgAdminSessionError,
  createAdminSessions as pkgCreateAdminSessions,
  mintAdminToken as pkgMintAdminToken,
  createAdminAccess as pkgCreateAdminAccess,
  createAdminCaseStore as pkgCreateAdminCaseStore,
} from '@offscreen/admin';

import {
  campaignHoldSchema as appCampaignHoldSchema,
  campaignHoldsSchema as appCampaignHoldsSchema,
} from '../dist/campaign/holds.js';

import {
  campaignHoldSchema as contractsCampaignHoldSchema,
  campaignHoldsSchema as contractsCampaignHoldsSchema,
} from '@offscreen/contracts/campaign-holds';

test('admin public surface identity matches @offscreen/admin', () => {
  assert.equal(AppAdminSessionError, PkgAdminSessionError);
  assert.equal(appCreateAdminSessions, pkgCreateAdminSessions);
  assert.equal(appMintAdminToken, pkgMintAdminToken);
  assert.equal(appCreateAdminAccess, pkgCreateAdminAccess);
  assert.equal(appCreateAdminCaseStore, pkgCreateAdminCaseStore);
});

test('campaign holds schema identity matches contracts', () => {
  assert.equal(appCampaignHoldSchema, contractsCampaignHoldSchema);
  assert.equal(appCampaignHoldsSchema, contractsCampaignHoldsSchema);
});
