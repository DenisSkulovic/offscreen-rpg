import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  projectAuditEvent,
  projectStaffAccess,
  summarizeGrantScope,
} from '../dist/admin/index.js';
import {
  adminAuditEventV1Schema,
  adminStaffAccessV1Schema,
} from '@offscreen/contracts/admin';

test('staff access summarizes scope without listing private resource ids', () => {
  const access = adminStaffAccessV1Schema.parse(
    projectStaffAccess('11111111-1111-4111-8111-111111111111', [
      {
        assignmentId: '22222222-2222-4222-8222-222222222222',
        packageId: 'admin-reader',
        packageVersion: 1,
        status: 'active',
        scope: {
          environments: ['local'],
          playerIds: ['secret-player'],
        },
        provenance: { kind: 'cli-bootstrap' },
      },
    ]),
  );
  assert.equal(access.packages[0]?.scope.playerScope, 'named');
  assert.equal(access.packages[0]?.provenanceKind, 'cli-bootstrap');
  assert.ok(!JSON.stringify(access).includes('secret-player'));
  assert.deepEqual(summarizeGrantScope({ environments: ['local'] }).playerScope, 'any');
});

test('audit projection drops unsafe kinds and payload blobs', () => {
  const ok = adminAuditEventV1Schema.parse(
    projectAuditEvent({
      id: '33333333-3333-4333-8333-333333333333',
      kind: 'admin.session.enter_denied',
      createdAt: '2026-11-14T12:00:00.000Z',
      staffPrincipalId: null,
      payload: { reason: 'stale_login', narrative: 'PRIVATE' },
    }),
  );
  assert.equal(ok.reasonCode, 'stale_login');
  assert.equal('narrative' in ok, false);

  assert.equal(
    projectAuditEvent({
      id: '33333333-3333-4333-8333-333333333333',
      kind: 'admin.secret.dump',
      createdAt: '2026-11-14T12:00:00.000Z',
      staffPrincipalId: null,
      payload: { text: 'nope' },
    }),
    null,
  );
});
