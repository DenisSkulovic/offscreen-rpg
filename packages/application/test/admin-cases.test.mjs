import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectCaseSummary } from '../dist/admin/index.js';
import { caseSummaryV1Schema } from '@offscreen/contracts/admin';

test('case summary holds only safe link references', () => {
  const summary = caseSummaryV1Schema.parse(
    projectCaseSummary(
      {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'open',
        category: 'account',
        title: 'Login help',
        createdByStaffId: '22222222-2222-4222-8222-222222222222',
        assignedStaffId: null,
        createdAt: '2026-11-14T12:00:00.000Z',
        updatedAt: '2026-11-14T12:00:00.000Z',
      },
      [{ kind: 'player', id: 'player-allowed' }],
    ),
  );
  assert.equal(summary.links[0]?.kind, 'player');
  assert.equal('note' in summary, false);
  assert.equal('passage' in summary, false);
});
