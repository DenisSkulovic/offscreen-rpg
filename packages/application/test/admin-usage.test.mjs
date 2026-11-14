import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectUsageStatus } from '../dist/admin/index.js';
import { usageStatusV1Schema } from '@offscreen/contracts/admin';

test('usage projection never invents free-tier or zero-cost authority', () => {
  const empty = usageStatusV1Schema.parse(
    projectUsageStatus({
      accountRef: '11111111-1111-4111-8111-111111111111',
      fundingVerifiedAt: '2026-01-01T00:00:00.000Z',
      reserved: 500n,
      dispatched: 0n,
      settled: 0n,
      uncertain: 100n,
      hasAllocationRows: false,
      hasUnknownCost: true,
      windows: [],
      measuredAt: '2026-11-14T12:00:00.000Z',
    }),
  );
  assert.equal(empty.commercialIntegration, 'unsupported');
  assert.equal(empty.costAuthority, 'unknown');
  assert.equal(empty.reserved, '500');
  assert.equal(empty.uncertain, '100');
  assert.notEqual(empty.commercialExplanationCode, 'free-tier');

  const recorded = usageStatusV1Schema.parse(
    projectUsageStatus({
      accountRef: '11111111-1111-4111-8111-111111111111',
      fundingVerifiedAt: '2026-01-01T00:00:00.000Z',
      reserved: 0n,
      dispatched: 25n,
      settled: 75n,
      uncertain: 0n,
      hasAllocationRows: true,
      hasUnknownCost: false,
      windows: [
        {
          windowId: 'account-microusd',
          windowVersion: 1,
          scope: 'account',
          metric: 'microusd',
        },
      ],
      measuredAt: '2026-11-14T12:00:00.000Z',
    }),
  );
  assert.equal(recorded.costAuthority, 'recorded');
  assert.equal(recorded.dispatched, '25');
  assert.equal(recorded.settled, '75');
});
