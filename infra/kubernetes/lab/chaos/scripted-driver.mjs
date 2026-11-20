/**
 * Unit-level scripted campaign driver for chaos oracle work.
 * Uses injectable fake HTTP/DB/store adapters; does not certify distributed play.
 */

import { assertOraclePass, readOnlyOracle } from './oracle.mjs';

export const DRIVER_SCHEMA = 'offscreen.chaos-scripted-driver.v1';

/** Mirrors packages/storyteller/src/tasks/policy.ts offlineExecution */
export const OFFLINE_SCRIPTED_EXECUTION = Object.freeze({
  mode: 'scripted',
  version: 'offline-rehearsal.v1',
});

/**
 * Live GA/browser integration is blocked until TURN03 supplies test identity.
 */
export const LIVE_SCRIPTED_DRIVER = Object.freeze({
  status: 'NOT-RUN',
  reason: 'no-test-identity-or-ga-start-path',
  detail: 'Unit adapters only; no signed browser cookie or cluster HTTP',
});

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function readChaosStorytellerExecution(env) {
  if (env.STORYTELLER_LIVE_ENABLED === 'true') {
    return {
      mode: 'provider',
      refused: true,
      reason: 'live_execution_forbidden_in_chaos',
    };
  }
  if (env.STORYTELLER_EXECUTION_JSON) {
    try {
      const parsed = JSON.parse(env.STORYTELLER_EXECUTION_JSON);
      if (parsed.mode !== 'scripted') {
        return {
          mode: parsed.mode,
          refused: true,
          reason: 'non_scripted_execution_json',
        };
      }
    } catch {
      return { refused: true, reason: 'invalid_execution_json' };
    }
  }
  return { ...OFFLINE_SCRIPTED_EXECUTION, refused: false };
}

/**
 * @param {unknown} execution
 */
export function assertScriptedExecution(execution) {
  if (
    !execution ||
    typeof execution !== 'object' ||
    /** @type {{ mode?: string, version?: string }} */ (execution).mode !==
      'scripted' ||
    /** @type {{ mode?: string, version?: string }} */ (execution).version !==
      'offline-rehearsal.v1'
  ) {
    throw new Error('task.execution.mode must be scripted for chaos runs');
  }
}

export function createForbiddenProviderSpy() {
  let modelDispatchAttempts = 0;
  let forbiddenProviderInvoked = false;
  const provider = async () => {
    modelDispatchAttempts += 1;
    forbiddenProviderInvoked = true;
    throw new Error('forbidden_provider_invoked');
  };
  return {
    provider,
    snapshot() {
      return { modelDispatchAttempts, forbiddenProviderInvoked };
    },
    reset() {
      modelDispatchAttempts = 0;
      forbiddenProviderInvoked = false;
    },
  };
}

/**
 * @param {{ generateResult: (task: unknown) => Promise<unknown> | unknown, delayMs?: number }} opts
 */
export function createBoundedFixtureAdapter({ generateResult, delayMs = 0 }) {
  return async (task) => {
    if (delayMs > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
    return generateResult(task);
  };
}

/**
 * @typedef {{
 *   operationId: string,
 *   optionId: string,
 *   storyId: string,
 *   passageId?: string,
 *   expectedRevision: number,
 * }} FrozenOperation
 */

/**
 * @param {FrozenOperation} operation
 */
export function freezeScriptedOperation(operation) {
  if (!operation.operationId || !operation.optionId || !operation.storyId) {
    throw new Error('frozen operation requires operationId, optionId, storyId');
  }
  return Object.freeze({ ...operation });
}

/**
 * Deterministic option pick for unit fixtures (seeded index into visible options).
 *
 * @param {string | number} seed
 * @param {string[]} visibleOptionIds
 */
export function pickScriptedOption(seed, visibleOptionIds) {
  if (!visibleOptionIds.length) {
    throw new Error('no visible options for scripted pick');
  }
  const normalized = String(seed);
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  const index = hash % visibleOptionIds.length;
  return visibleOptionIds[index];
}

/**
 * @typedef {{
 *   story: { revision: number, rootHash: string | null, rootRevision: number },
 *   passages: Array<{
 *     id: string,
 *     operationId: string,
 *     storyId: string,
 *     checkpointHash?: string | null,
 *     canonRootHash?: string | null,
 *     canonRootRevision?: number,
 *   }>,
 *   operations: Array<{ id: string, storyId: string, revision: number, status: string }>,
 * }} DriverState
 */

/**
 * @typedef {{
 *   assertions: import('./oracle.mjs').OracleAssertions,
 *   getState: () => DriverState,
 *   store: import('./oracle.mjs').StoreSnapshot,
 *   http?: import('./oracle.mjs').HttpViewSnapshot,
 *   telemetry?: import('./oracle.mjs').TelemetrySnapshot,
 * }} OracleProbe
 */

/**
 * @param {OracleProbe} probe
 */
export function verifyScriptedProbe(probe) {
  const state = probe.getState();
  const result = readOnlyOracle({
    assertions: probe.assertions,
    sql: state,
    store: probe.store,
    http: probe.http,
    telemetry: probe.telemetry,
  });
  return assertOraclePass(result);
}

/**
 * @typedef {{
 *   seed: string | number,
 *   frozen: FrozenOperation,
 *   visibleOptionIds: string[],
 *   execution?: { mode: string, version: string },
 *   fixtureAdapter: (task: unknown) => Promise<unknown>,
 *   forbiddenSpy: ReturnType<typeof createForbiddenProviderSpy>,
 *   applyCommittedPassage: (input: {
 *     frozen: FrozenOperation,
 *     optionId: string,
 *     result: unknown,
 *   }) => DriverState,
 *   initialState: DriverState,
 *   store: import('./oracle.mjs').StoreSnapshot,
 *   ownerId: string,
 * }} ScriptedRoundInput
 */

/**
 * One unit round: pick option, run fixture adapter under scripted execution, oracle pass.
 *
 * @param {ScriptedRoundInput} input
 */
export async function runScriptedDriverRound(input) {
  const execution = input.execution ?? OFFLINE_SCRIPTED_EXECUTION;
  assertScriptedExecution(execution);

  const optionId = pickScriptedOption(input.seed, input.visibleOptionIds);
  if (optionId !== input.frozen.optionId) {
    throw new Error('seeded pick does not match frozen legal option');
  }

  const task = {
    task: 'opening',
    execution,
    context: { mechanicalOpening: true, selected: { id: optionId } },
  };

  const result = await input.fixtureAdapter(task);
  const state = input.applyCommittedPassage({
    frozen: input.frozen,
    optionId,
    result,
  });

  const telemetry = {
    ...input.forbiddenSpy.snapshot(),
    billableUsageRecords: 0,
    openRouterSecretMounted: false,
  };

  const oracle = readOnlyOracle({
    assertions: {
      runId: input.frozen.operationId,
      storyId: input.frozen.storyId,
      ownerId: input.ownerId,
      frozenOperationIds: [input.frozen.operationId],
      expectedRevision: input.frozen.expectedRevision,
      expectedRootHash: state.story.rootHash,
      expectedRootRevision: state.story.rootRevision,
      executionMode: 'scripted',
      modelDispatchAttempts: 0,
      forbiddenProviderInvoked: false,
    },
    sql: state,
    store: input.store,
    http: {
      revision: state.story.revision,
      storyId: input.frozen.storyId,
      ownerId: input.ownerId,
      passageIds: state.passages.map((p) => p.id),
    },
    telemetry,
  });

  if (oracle.status !== 'pass') {
    return {
      schema: DRIVER_SCHEMA,
      status: 'fail',
      optionId,
      result,
      state,
      oracle,
      live: LIVE_SCRIPTED_DRIVER,
    };
  }

  return {
    schema: DRIVER_SCHEMA,
    status: 'pass',
    optionId,
    result,
    state,
    oracle,
    telemetry,
    live: LIVE_SCRIPTED_DRIVER,
  };
}