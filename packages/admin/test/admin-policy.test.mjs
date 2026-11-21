import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluateAdminAccess,
  workspaceFamiliesFromAssignments,
} from '../dist/index.js';

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
  const result = evaluateAdminAccess([{ ...readerLocal, status: 'inert' }], {
    capability: 'player.summary.read',
    resourceKind: 'player',
    resourceId: 'player-allowed',
    environment: 'local',
  });
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

// ---- OBS06: forensics.campaign.situation.read (case+campaign bound) --------

const investigator = {
  assignmentId: 'inv1',
  packageId: 'support-investigator',
  packageVersion: 1,
  status: 'active',
  scope: {
    environments: ['local'],
    campaignIds: ['camp-1'],
    requireAuthorizedCaseAssignment: true,
  },
  provenance: {
    kind: 'steward-case-binding',
    authorizedCaseIds: ['case-1'],
  },
};

function situationRequest(overrides = {}) {
  return {
    capability: 'forensics.campaign.situation.read',
    resourceKind: 'campaign',
    resourceId: 'camp-1',
    environment: 'local',
    caseId: 'case-1',
    ...overrides,
  };
}

test('OBS06 support-operator-v1 never carries the situation capability', () => {
  const result = evaluateAdminAccess([supportCase], situationRequest());
  assert.equal(result.decision, 'deny');
  assert.equal(result.reason, 'capability_not_in_package');
});

test('OBS06 steward-bound investigator grant allows exact case+campaign', () => {
  const result = evaluateAdminAccess([investigator], situationRequest());
  assert.equal(result.decision, 'allow');
  assert.equal(result.matchedPackageId, 'support-investigator');
});

test('OBS06 empty or absent campaignIds never means any campaign', () => {
  for (const scope of [
    { environments: ['local'], requireAuthorizedCaseAssignment: true },
    {
      environments: ['local'],
      campaignIds: [],
      requireAuthorizedCaseAssignment: true,
    },
  ]) {
    const result = evaluateAdminAccess(
      [{ ...investigator, scope }],
      situationRequest(),
    );
    assert.equal(result.decision, 'deny');
    assert.equal(result.reason, 'resource_out_of_scope');
  }
});

test('OBS06 requires requireAuthorizedCaseAssignment and listed case', () => {
  const noFlag = evaluateAdminAccess(
    [
      {
        ...investigator,
        scope: { environments: ['local'], campaignIds: ['camp-1'] },
      },
    ],
    situationRequest(),
  );
  assert.equal(noFlag.decision, 'deny');
  assert.equal(noFlag.reason, 'case_assignment_required');

  const wrongCase = evaluateAdminAccess(
    [investigator],
    situationRequest({ caseId: 'case-self-made' }),
  );
  assert.equal(wrongCase.decision, 'deny');
  assert.equal(wrongCase.reason, 'case_assignment_unproven');

  const noCase = evaluateAdminAccess(
    [investigator],
    situationRequest({ caseId: null }),
  );
  assert.equal(noCase.decision, 'deny');
});

test('OBS06 grant for a different campaign or untrusted provenance denies', () => {
  const otherCampaign = evaluateAdminAccess(
    [investigator],
    situationRequest({ resourceId: 'camp-other' }),
  );
  assert.equal(otherCampaign.decision, 'deny');
  assert.equal(otherCampaign.reason, 'resource_out_of_scope');

  const caseCreated = evaluateAdminAccess(
    [
      {
        ...investigator,
        provenance: {
          kind: 'case-create',
          authorizedCaseIds: ['case-1'],
        },
      },
    ],
    situationRequest(),
  );
  assert.equal(caseCreated.decision, 'deny');
  assert.equal(caseCreated.reason, 'case_assignment_unproven');
});

test('OBS06 case-only and campaign-only grants cannot be composed', () => {
  // Grant A proves case-1 but names camp-A; grant B names camp-1 but proves case-B.
  const grantA = {
    ...investigator,
    assignmentId: 'invA',
    scope: { ...investigator.scope, campaignIds: ['camp-A'] },
  };
  const grantB = {
    ...investigator,
    assignmentId: 'invB',
    provenance: {
      kind: 'steward-case-binding',
      authorizedCaseIds: ['case-B'],
    },
  };
  const result = evaluateAdminAccess([grantA, grantB], situationRequest());
  assert.equal(result.decision, 'deny');
});

test('OBS06 revoked, inert, and wrong-environment investigator grants deny', () => {
  for (const [patch, reason] of [
    [{ status: 'revoked' }, 'assignment_revoked'],
    [{ status: 'inert' }, 'assignment_inert'],
    [
      {
        scope: {
          ...investigator.scope,
          environments: ['production'],
        },
      },
      'environment_mismatch',
    ],
  ]) {
    const result = evaluateAdminAccess(
      [{ ...investigator, ...patch }],
      situationRequest(),
    );
    assert.equal(result.decision, 'deny');
    assert.equal(result.reason, reason);
  }
});
