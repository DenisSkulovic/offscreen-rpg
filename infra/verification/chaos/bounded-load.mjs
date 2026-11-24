/**
 * Bounded load runner (K8S10 T04). Injectable command + clock only; no cluster.
 */

export const BOUNDED_LOAD_SCHEMA = 'offscreen.k8s10-bounded-load.v1';

const MAX_IDENTITIES = 3;
const MAX_ACTIONS_PER_IDENTITY = 3;
const MAX_COMMANDS = 9;
const DEFAULT_ACTIONS_PER_IDENTITY = 3;
const DEFAULT_WINDOW_MS = 60_000;
const MIN_MEMORY_KIB = 262_144;

/**
 * @param {number[]} samples
 * @returns {number | null}
 */
export function computeObservedP95Ms(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return null;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * @param {string[]} identities
 * @param {number} actionsPerIdentity
 */
function planCommands(identities, actionsPerIdentity) {
  const requestedActions = actionsPerIdentity ?? DEFAULT_ACTIONS_PER_IDENTITY;
  const cappedIdentities = identities.slice(0, MAX_IDENTITIES);
  const cappedActions = Math.min(requestedActions, MAX_ACTIONS_PER_IDENTITY);

  let refusedOverflow = 0;
  if (identities.length > MAX_IDENTITIES) {
    refusedOverflow +=
      (identities.length - MAX_IDENTITIES) *
      Math.min(requestedActions, MAX_ACTIONS_PER_IDENTITY);
  }
  if (requestedActions > MAX_ACTIONS_PER_IDENTITY) {
    refusedOverflow +=
      cappedIdentities.length * (requestedActions - MAX_ACTIONS_PER_IDENTITY);
  }

  /** @type {{ identity: string, actionIndex: number }[]} */
  const slots = [];
  for (const identity of cappedIdentities) {
    for (let actionIndex = 0; actionIndex < cappedActions; actionIndex += 1) {
      slots.push({ identity, actionIndex });
    }
  }

  if (slots.length > MAX_COMMANDS) {
    refusedOverflow += slots.length - MAX_COMMANDS;
    slots.length = MAX_COMMANDS;
  }

  return { slots, refusedOverflow, activeIdentities: cappedIdentities };
}

/**
 * @param {{
 *   identities: string[],
 *   actionsPerIdentity?: number,
 *   windowMs?: number,
 *   now?: () => number,
 *   memoryKib?: number,
 *   command: (identity: string, actionIndex: number) => Promise<{
 *     accepted?: boolean,
 *     latencyMs?: number,
 *     queueDepth?: number,
 *     statusCode?: number,
 *     operationId?: string,
 *     duplicateEffect?: boolean,
 *     held?: boolean,
 *   }> | {
 *     accepted?: boolean,
 *     latencyMs?: number,
 *     queueDepth?: number,
 *     statusCode?: number,
 *     operationId?: string,
 *     duplicateEffect?: boolean,
 *     held?: boolean,
 *   },
 *   providerSpy?: () => void,
 * }} options
 */
export async function runBoundedLoad(options) {
  let providerSpyInvocations = 0;
  const originalProviderSpy = options?.providerSpy;
  if (typeof originalProviderSpy === 'function') {
    options.providerSpy = () => {
      providerSpyInvocations += 1;
      return originalProviderSpy();
    };
  }

  const identities = Array.isArray(options?.identities)
    ? options.identities
    : [];
  const { slots, refusedOverflow, activeIdentities } = planCommands(
    identities,
    options?.actionsPerIdentity,
  );

  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const now = options?.now ?? (() => Date.now());
  const startMs = now();

  if (
    typeof options?.memoryKib === 'number' &&
    options.memoryKib < MIN_MEMORY_KIB
  ) {
    return {
      schema: BOUNDED_LOAD_SCHEMA,
      status: 'ABORT',
      reason: 'low-memory',
      multiOwner: activeIdentities.length >= 2 ? 'RUN' : 'NOT-RUN',
      refusedOverflow,
      plannedCommands: slots.length,
      executedCommands: 0,
      latencySamples: [],
      queueDepthSamples: [],
      observedP95Ms: null,
      events: [{ type: 'abort', reason: 'low-memory' }],
      conflicts409: 0,
      timedOut: 0,
      providerSpyInvocations: 0,
      commands: [],
    };
  }

  const multiOwner = activeIdentities.length === 1 ? 'NOT-RUN' : 'RUN';
  /** @type {ReturnType<typeof runBoundedLoad> extends Promise<infer T> ? T : never}['commands'] */
  const commands = [];
  /** @type {number[]} */
  const latencySamples = [];
  /** @type {number[]} */
  const queueDepthSamples = [];
  /** @type {Record<string, unknown>[]} */
  const events = [];
  let conflicts409 = 0;
  let timedOut = 0;
  let duplicateEffect = false;
  let serverError = false;
  let commandError = false;

  /**
   * @param {{ identity: string, actionIndex: number }} slot
   */
  async function runSlot(slot) {
    if (now() > startMs + windowMs) {
      timedOut += 1;
      events.push({
        type: 'timeout',
        identity: slot.identity,
        actionIndex: slot.actionIndex,
      });
      commands.push({
        identity: slot.identity,
        actionIndex: slot.actionIndex,
        timedOut: true,
        accepted: false,
      });
      return;
    }

    try {
      const result = await options.command(slot.identity, slot.actionIndex);
      if (result?.duplicateEffect === true) {
        duplicateEffect = true;
      }

      if (typeof result?.latencyMs === 'number') {
        latencySamples.push(result.latencyMs);
      }
      if (typeof result?.queueDepth === 'number') {
        queueDepthSamples.push(result.queueDepth);
      }

      const statusCode = result?.statusCode;
      if (typeof statusCode === 'number' && statusCode === 409) {
        conflicts409 += 1;
        events.push({
          type: 'conflict',
          identity: slot.identity,
          actionIndex: slot.actionIndex,
          statusCode,
        });
      }
      if (typeof statusCode === 'number' && statusCode >= 500) {
        serverError = true;
        events.push({
          type: 'server-error',
          identity: slot.identity,
          actionIndex: slot.actionIndex,
          statusCode,
        });
      }

      commands.push({
        identity: slot.identity,
        actionIndex: slot.actionIndex,
        accepted: result?.accepted === true,
        latencyMs: result?.latencyMs,
        queueDepth: result?.queueDepth,
        statusCode: result?.statusCode,
        operationId: result?.operationId,
        duplicateEffect: result?.duplicateEffect === true,
        held: result?.held === true || statusCode === 409,
        timedOut: false,
      });
    } catch (error) {
      commandError = true;
      events.push({
        type: 'command-error',
        identity: slot.identity,
        actionIndex: slot.actionIndex,
        message: error instanceof Error ? error.message : 'command-failed',
      });
      commands.push({
        identity: slot.identity,
        actionIndex: slot.actionIndex,
        accepted: false,
        timedOut: false,
        error: true,
      });
    }
  }

  if (multiOwner === 'NOT-RUN') {
    for (const slot of slots) {
      // eslint-disable-next-line no-await-in-loop
      await runSlot(slot);
    }
  } else {
    /** @type {Map<string, { identity: string, actionIndex: number }[]>} */
    const byIdentity = new Map();
    for (const slot of slots) {
      const group = byIdentity.get(slot.identity) ?? [];
      group.push(slot);
      byIdentity.set(slot.identity, group);
    }
    await Promise.all(
      [...byIdentity.values()].map(async (group) => {
        for (const slot of group) {
          // eslint-disable-next-line no-await-in-loop
          await runSlot(slot);
        }
      }),
    );
  }

  const executedCommands = commands.filter(
    (row) => row.timedOut !== true,
  ).length;
  const observedP95Ms = computeObservedP95Ms(latencySamples);

  const acceptedCommands = commands.filter((row) => row.accepted === true);
  const unresolvedAccepted = acceptedCommands.filter(
    (row) =>
      row.timedOut === true ||
      (typeof row.statusCode === 'number' && row.statusCode >= 500) ||
      row.duplicateEffect === true ||
      row.error === true,
  );

  const allAcceptedResolved =
    acceptedCommands.length === 0
      ? slots.length === 0
      : unresolvedAccepted.length === 0 &&
        acceptedCommands.every(
          (row) =>
            row.held === true ||
            (typeof row.statusCode === 'number' && row.statusCode < 500),
        );

  /** @type {'PASS' | 'FAIL' | 'BLOCKED'} */
  let status = 'PASS';
  /** @type {string | undefined} */
  let reason;

  if (providerSpyInvocations > 0) {
    status = 'FAIL';
    reason = 'provider-dispatch';
  } else if (duplicateEffect) {
    status = 'FAIL';
    reason = 'duplicate-effect';
  } else if (timedOut > 0) {
    status = 'FAIL';
    reason = 'window-timeout';
  } else if (serverError || commandError) {
    status = 'FAIL';
    reason = serverError ? 'server-error' : 'command-error';
  } else if (!allAcceptedResolved) {
    status = 'FAIL';
    reason = 'unresolved-accepted-command';
  }

  if (refusedOverflow > 0 && status === 'PASS') {
    events.push({ type: 'overflow-refused', count: refusedOverflow });
  }

  return {
    schema: BOUNDED_LOAD_SCHEMA,
    status,
    reason,
    multiOwner,
    refusedOverflow,
    plannedCommands: slots.length,
    executedCommands,
    latencySamples,
    queueDepthSamples,
    observedP95Ms,
    events,
    conflicts409,
    timedOut,
    providerSpyInvocations,
    commands,
  };
}
