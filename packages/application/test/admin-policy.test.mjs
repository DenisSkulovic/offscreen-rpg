import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluateAdminAccess,
  workspaceFamiliesFromAssignments,
} from '../dist/admin/index.js';

const readerLocal = {
  assignmentId: 'a1',
  packageId: 'admin-reader',
  packageVersion: 1,
  status: 'active',
  scope: { environments: ['local'], playerIds: ['player-allowed'] },
  provenance: { kind: 'test' },
};

const supportCase = {
  assignmentId: 'a2',
  packageId: 'support-operator',
  packageVersion: 1,
  status: 'active',
  scope: {
    environments: ['local'],
    requireAuthorizedCaseAssignment: true,
  },
  provenance: {
    kind: 'case-assignment',
    authorizedCaseIds: ['case-real'],
  },
};

const engineer = {
  assignmentId: 'a3',
  packageId: 'engineering-observer',
  packageVersion: 1,
  status: 'active',
  scope: { environments: ['local'] },
  provenance: { kind: 'test' },
};

test('admin-reader allows named player summary in environment', () => {
  const result = evaluateAdminAccess([readerLocal], {
    capability: 'player.summary.read',
    resourceKind: 'player',
    resourceId: 'player-allowed',
    environment: 'local',
  });
  assert.equal(result.decision, 'allow');
  assert.equal(result.matchedPackageId, 'admin-reader');
});

test('environment mismatch denies production when scoped to local', () => {
  const result = evaluateAdminAccess([readerLocal], {
    capability: 'player.summary.read',
    resourceKind: 'player',
    resourceId: 'player-allowed',
    environment: 'production',
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.reason, 'environment_mismatch');
});

test('out-of-scope player id denies without inventing capability', () => {
  const result = evaluateAdminAccess([readerLocal], {
    capability: 'player.summary.read',
    resourceKind: 'player',
    resourceId: 'player-other',
    environment: 'local',
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.reason, 'resource_out_of_scope');
});

test('inert assignment never authorizes', () => {
  const result = evaluateAdminAccess(
    [{ ...readerLocal, status: 'inert' }],
    {
      capability: 'player.summary.read',
      resourceKind: 'player',
      resourceId: 'player-allowed',
      environment: 'local',
    },
  );
  assert.equal(result.decision, 'deny');
  assert.equal(result.reason, 'assignment_inert');
});

test('unknown capability denies closed registry', () => {
  const result = evaluateAdminAccess([readerLocal], {
    capability: 'commercial.refund.request',
    resourceKind: 'player',
    resourceId: 'player-allowed',
    environment: 'local',
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.reason, 'unknown_capability');
});

test('compound packages union intact grants without Cartesian product', () => {
  // Reader can read allowed player; engineer can read operations; neither
  // creates global commercial.finance.read.
  const allowedPlayer = evaluateAdminAccess([readerLocal, engineer], {
    capability: 'player.summary.read',
    resourceKind: 'player',
    resourceId: 'player-allowed',
    environment: 'local',
  });
  assert.equal(allowedPlayer.decision, 'allow');

  const operation = evaluateAdminAccess([readerLocal, engineer], {
    capability: 'ai.operation.read',
    resourceKind: 'operation',
    resourceId: 'op-1',
    environment: 'local',
  });
  assert.equal(operation.decision, 'allow');
  assert.equal(operation.matchedPackageId, 'admin-reader');

  // Support case grant does not widen reader player scope to all players.
  const otherPlayer = evaluateAdminAccess([readerLocal, supportCase], {
    capability: 'player.summary.read',
    resourceKind: 'player',
    resourceId: 'player-other',
    environment: 'local',
  });
  assert.equal(otherPlayer.decision, 'deny');
  assert.equal(otherPlayer.reason, 'resource_out_of_scope');
});

test('self-supplied case id without provenance cannot satisfy case gate', () => {
  const forged = evaluateAdminAccess([supportCase], {
    capability: 'player.summary.read',
    resourceKind: 'player',
    resourceId: 'player-secret',
    environment: 'local',
    caseId: 'case-self-made',
  });
  assert.equal(forged.decision, 'deny');
  assert.equal(forged.reason, 'case_assignment_unproven');

  const proven = evaluateAdminAccess([supportCase], {
    capability: 'player.summary.read',
    resourceKind: 'player',
    resourceId: 'player-secret',
    environment: 'local',
    caseId: 'case-real',
  });
  assert.equal(proven.decision, 'allow');
});

test('workspace families ignore inert assignments', () => {
  assert.deepEqual(
    workspaceFamiliesFromAssignments([
      { ...readerLocal, status: 'inert' },
      engineer,
    ]),
    ['ai', 'platform'],
  );
});
