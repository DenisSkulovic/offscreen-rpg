/**
 * Bare CLI binding for kind-offscreen-lab status and ensure.
 * plan stays on the pure funding command and does not open this module.
 */

import { createTestlabKindObservation } from './testlab-kind-observer.mjs';
import { openTestlabKindDatabase } from './testlab-kind-db.mjs';
import { verifyTestlabTarget } from './testlab-target-guard.mjs';

/**
 * @param {Record<string, unknown>} observation
 */
export function kindTargetFingerprint(observation) {
  return JSON.stringify({
    clusterUid: observation?.cluster?.uid ?? null,
    dbUid: observation?.dbInstance?.uid ?? null,
    primaryPod: observation?.primaryPod ?? null,
    authorityImage: observation?.gameAuthority?.image ?? null,
    authorityPodImage: observation?.gameAuthority?.podImage ?? null,
    authorityReady: observation?.gameAuthority?.ready ?? null,
    authorityMode: observation?.gameAuthority?.env?.OFFSCREEN_WRITER_EXECUTION_MODE ?? null,
    executorImage: observation?.gameExecutor?.image ?? null,
    executorPodImage: observation?.gameExecutor?.podImage ?? null,
    executorReady: observation?.gameExecutor?.ready ?? null,
    executorMode: observation?.gameExecutor?.env?.OFFSCREEN_WRITER_EXECUTION_MODE ?? null,
  });
}

function blocked(id, message) {
  return {
    outcome: 'blocked',
    targetIdentity: 'kind-offscreen-lab',
    refusals: [{ id, message }],
  };
}

/**
 * @param {'status' | 'ensure'} command
 * @param {Record<string, string | boolean>} flags
 * @param {{
 *   observe?: typeof createTestlabKindObservation,
 *   openDatabase?: typeof openTestlabKindDatabase,
 *   runStatus?: typeof import('./testlab-funding.mjs').runTestlabFundingStatus,
 *   runEnsure?: typeof import('./testlab-funding.mjs').runTestlabFundingEnsure,
 * }} [injected]
 */
export async function runBareKindFunding(command, flags, injected = {}) {
  const funding = injected.runStatus
    ? { runTestlabFundingStatus: injected.runStatus, runTestlabFundingEnsure: injected.runEnsure }
    : await import('./testlab-funding.mjs');
  const observe = injected.observe ?? createTestlabKindObservation;
  const openDatabase = injected.openDatabase ?? openTestlabKindDatabase;
  const first = await observe();
  if (!first.ok) return blocked(first.id, first.message);

  const pinnedObservation = {
    ...first.observation,
    operatorGrantAuthorized: flags.operatorGrantAuthorized === true,
    ...(typeof flags.expectClusterUid === 'string'
      ? { expectedClusterUid: flags.expectClusterUid }
      : {}),
    ...(typeof flags.expectDbUid === 'string'
      ? { expectedDbInstanceUid: flags.expectDbUid }
      : {}),
  };
  const intent = command === 'ensure' ? 'write' : 'read';
  const verified = verifyTestlabTarget(pinnedObservation, { intent });
  if (!verified.ok) {
    return {
      outcome: 'blocked',
      targetIdentity: 'kind-offscreen-lab',
      refusals: verified.refusals,
    };
  }

  const session = await openDatabase();
  if (!session.ok) return blocked(session.id, session.message);
  try {
    if (command === 'status') {
      return await funding.runTestlabFundingStatus(flags, {
        observeKindTarget: async () => pinnedObservation,
        queryReadOnly: session.queryReadOnly,
      });
    }
    const again = await observe();
    if (!again.ok) return blocked(again.id, again.message);
    if (kindTargetFingerprint(again.observation) !== kindTargetFingerprint(pinnedObservation)) {
      return blocked(
        'target-drift',
        'Kind target identity changed between preflight and ensure; refusing without retry.',
      );
    }
    const rechecked = {
      ...again.observation,
      operatorGrantAuthorized: flags.operatorGrantAuthorized === true,
      expectedClusterUid: flags.expectClusterUid,
      expectedDbInstanceUid: flags.expectDbUid,
    };
    const pinned = verifyTestlabTarget(rechecked, { intent: 'write' });
    if (!pinned.ok) {
      return { outcome: 'blocked', targetIdentity: 'kind-offscreen-lab', refusals: pinned.refusals };
    }
    return await funding.runTestlabFundingEnsure(flags, {
      observeKindTarget: async () => rechecked,
      grantStore: session.grantStore,
    });
  } finally {
    await session.close();
  }
}
