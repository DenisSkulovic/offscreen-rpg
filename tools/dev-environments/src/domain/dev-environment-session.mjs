import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { writeDevSessionJsonAtomically } from './dev-session-json.mjs';
import { join, resolve } from 'node:path';
import { assessOwnedProcess } from './dev-process-identity.mjs';
import {
  isAllocatorRefusal,
  readRegistryJson,
  refusal,
  withSlotOperationLock,
} from './dev-worktree-registry.mjs';
import {
  allocateIndependentEnvironment,
  getDefaultEnvironment,
  getEnvironment,
} from './dev-worktree-allocator.mjs';

export { isAllocatorRefusal };

/**
 * Ignored machine-local session store, keyed by environment id.
 *
 * @param {string} registryRoot
 */
export function environmentSessionRoot(registryRoot) {
  return join(resolve(registryRoot), '..', 'dev-environment-sessions');
}

/**
 * @param {string} sessionRoot
 * @param {string} slotId
 */
export function environmentSessionPath(sessionRoot, slotId) {
  return join(sessionRoot, `${slotId}.json`);
}

/**
 * @param {string[]} argv
 */
export function parseDevCliArgs(argv) {
  const args = argv.slice(2);
  /** @type {'up' | 'status' | 'stop' | 'new' | 'reserve' | 'attach'} */
  let command = 'up';
  /** @type {string | null} */
  let instance = null;
  let sawCommand = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') continue;
    if (arg === '--instance') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw refusal(
          'invalid-arguments',
          '--instance requires an environment id.',
        );
      }
      if (instance)
        throw refusal(
          'conflicting-arguments',
          '--instance was provided more than once.',
        );
      instance = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) {
      throw refusal('invalid-arguments', `Unknown argument: ${arg}`);
    }
    if (
      arg !== 'status' &&
      arg !== 'stop' &&
      arg !== 'new' &&
      arg !== 'reserve' &&
      arg !== 'attach'
    ) {
      throw refusal('invalid-arguments', `Unknown command: ${arg}`);
    }
    if (sawCommand)
      throw refusal(
        'conflicting-arguments',
        'Only one dev command is allowed.',
      );
    command = arg;
    sawCommand = true;
  }
  if (command === 'new' && instance) {
    throw refusal(
      'conflicting-arguments',
      'dev:new allocates an id; do not also pass --instance.',
    );
  }
  if (command === 'reserve' && instance) {
    throw refusal(
      'conflicting-arguments',
      'dev:reserve does not accept --instance.',
    );
  }
  if (command === 'attach' && !instance) {
    throw refusal('invalid-arguments', 'dev:attach requires --instance.');
  }
  return { command, instance };
}

/**
 * @param {string} registryRoot
 * @param {string} slotId
 */
function ownerFromEitherRegistry(registryRoot, slotId) {
  const raw = readRegistryJson(registryRoot);
  if (!raw) throw refusal('registry-corrupt', 'Dev registry is missing.');
  if (raw.version === 2) return getEnvironment(registryRoot, slotId);
  if (raw.version !== 1)
    throw refusal(
      'registry-version',
      `Unsupported registry version: ${raw.version}`,
    );
  const match = Object.values(raw.ownersByWorktree).find(
    (record) => record.slotId === slotId,
  );
  if (!match)
    throw refusal('unknown-environment', `Unknown environment id: ${slotId}`);
  return match;
}

/**
 * @param {string} registryRoot
 * @param {string} checkout
 */
function defaultFromEitherRegistry(registryRoot, checkout) {
  const raw = readRegistryJson(registryRoot);
  if (!raw) return null;
  if (raw.version === 2) return getDefaultEnvironment(registryRoot, checkout);
  const record = raw.ownersByWorktree?.[resolve(checkout)];
  return record ?? null;
}

/**
 * @param {{
 *   command: 'up' | 'status' | 'stop' | 'new',
 *   instance: string | null,
 *   worktree: string,
 *   registryRoot: string,
 *   allocate?: typeof allocateIndependentEnvironment,
 *   processDeps?: { pidAlive: (pid: number) => boolean, readStartTicks: (pid: number) => string | null },
 * }} input
 */
export function resolveDevEnvironmentSelection(input) {
  const checkout = resolve(input.worktree);
  const raw = readRegistryJson(input.registryRoot);
  if (input.command === 'new') {
    if (!raw || raw.version !== 2) {
      throw refusal(
        'registry-version',
        'dev:new requires registry v2 and does not migrate it.',
      );
    }
    const allocate = input.allocate ?? allocateIndependentEnvironment;
    const record = allocate(checkout, input.registryRoot);
    return { action: 'up', record, checkout, allocatedNew: true };
  }
  if (input.instance) {
    const record = ownerFromEitherRegistry(input.registryRoot, input.instance);
    if (record.worktreePath === null) {
      throw refusal(
        'unattached-environment',
        `${record.slotId} is not attached to this checkout.`,
      );
    }
    const bound = resolve(String(record.worktreePath));
    if (bound !== checkout) {
      throw refusal(
        'foreign-checkout',
        `${record.slotId} belongs to another checkout.`,
      );
    }
    return {
      action: input.command,
      record,
      checkout,
    };
  }
  if (raw?.version === 2 && input.command === 'up') {
    const existing = getDefaultEnvironment(input.registryRoot, checkout);
    if (existing) return { action: 'up', record: existing, checkout };
    const allocate = input.allocate ?? allocateIndependentEnvironment;
    const record = allocate(checkout, input.registryRoot, {
      setAsDefault: true,
    });
    return { action: 'up', record, checkout, allocatedDefault: true };
  }
  const record = defaultFromEitherRegistry(input.registryRoot, checkout);
  if (raw?.version === 2 && !record) {
    throw refusal(
      'missing-default',
      'This checkout has no v2 default environment.',
    );
  }
  return { action: input.command, record, checkout };
}

/**
 * PID to signal for the selected environment. A stale or unverified PID is not returned.
 *
 * @param {string} registryRoot
 * @param {{ slotId: string }} owner
 * @param {{ pidAlive: (pid: number) => boolean, readStartTicks: (pid: number) => string | null }} processDeps
 */
export function ownedEnvironmentSessionPid(registryRoot, owner, processDeps) {
  const session = readEnvironmentSession(
    environmentSessionRoot(registryRoot),
    owner.slotId,
  );
  if (!session) return null;
  const ownership = assessOwnedProcess(session, processDeps);
  return ownership.owned ? Number(session.pid) : null;
}

/**
 * @param {string} sessionRoot
 * @param {string} slotId
 */
export function readEnvironmentSession(sessionRoot, slotId) {
  const file = environmentSessionPath(sessionRoot, slotId);
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!data || data.slotId !== slotId) {
      throw refusal('corrupt-session', `Session for ${slotId} is corrupt.`);
    }
    return data;
  } catch (error) {
    if (isAllocatorRefusal(error)) throw error;
    throw refusal('corrupt-session', `Session for ${slotId} is unreadable.`);
  }
}

/**
 * @param {string} sessionRoot
 * @param {Record<string, unknown>} session
 */
export function writeEnvironmentSession(sessionRoot, session) {
  const slotId = String(session.slotId);
  const file = environmentSessionPath(sessionRoot, slotId);
  writeDevSessionJsonAtomically(file, session);
}

/**
 * @param {string} worktree
 */
export function readLegacyDevSession(worktree) {
  const file = join(resolve(worktree), '.offscreen', 'dev-session.json');
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object') {
      throw refusal('corrupt-session', 'Legacy dev session is corrupt.');
    }
    return data;
  } catch (error) {
    if (isAllocatorRefusal(error)) throw error;
    throw refusal('corrupt-session', 'Legacy dev session is unreadable.');
  }
}

/**
 * Adopt one legacy checkout session into the slot-keyed store.
 * The original file is left in place.
 *
 * @param {{
 *   worktree: string,
 *   owner: { slotId: string, worktreePath: string, namespace: string, ports: { game: number, tilt: number } },
 *   sessionRoot: string,
 *   assess?: typeof assessOwnedProcess,
 * }} input
 */
export function adoptLegacyEnvironmentSession(input) {
  const legacy = readLegacyDevSession(input.owner.worktreePath);
  if (!legacy)
    throw refusal(
      'legacy-session-missing',
      `No legacy session for ${input.owner.slotId}.`,
    );
  const checkout = resolve(input.owner.worktreePath);
  if (resolve(input.worktree) !== checkout) {
    throw refusal(
      'checkout-mismatch',
      'Legacy session checkout does not match the selected source.',
    );
  }
  if (legacy.slotId !== input.owner.slotId) {
    throw refusal(
      'slot-mismatch',
      `Legacy session ${legacy.slotId} is not ${input.owner.slotId}.`,
    );
  }
  if (legacy.namespace !== input.owner.namespace) {
    throw refusal(
      'namespace-mismatch',
      `Legacy namespace ${legacy.namespace} is not ${input.owner.namespace}.`,
    );
  }
  if (
    legacy.gamePort !== input.owner.ports.game ||
    legacy.tiltPort !== input.owner.ports.tilt
  ) {
    throw refusal(
      'port-mismatch',
      `Legacy ports do not match ${input.owner.slotId}.`,
    );
  }
  const assess = input.assess ?? assessOwnedProcess;
  const tilt = assess(legacy, input.processDeps);
  const forward = assess(
    {
      pid: legacy.forwardPid,
      processStartTicks: legacy.forwardStartTicks,
    },
    input.processDeps,
  );
  if (!tilt.owned || !forward.owned) {
    throw refusal(
      'process-ownership-unverified',
      `Legacy ${input.owner.slotId} process ownership is ${tilt.reason}/${forward.reason}.`,
    );
  }
  const adopted = {
    ...legacy,
    checkoutPath: checkout,
    adoptedFrom: join(checkout, '.offscreen', 'dev-session.json'),
  };
  writeEnvironmentSession(input.sessionRoot, adopted);
  const receiptDir = join(input.sessionRoot, 'receipts');
  mkdirSync(receiptDir, { recursive: true });
  writeFileSync(
    join(receiptDir, `${input.owner.slotId}.json`),
    `${JSON.stringify({
      slotId: input.owner.slotId,
      legacyPath: adopted.adoptedFrom,
      preserved: true,
    })}\n`,
  );
  return adopted;
}

/**
 * Stop one environment only after its session matches the registry record
 * and the live PID start time matches. A failed check does not signal,
 * scale, or delete session state.
 *
 * @param {{
 *   owner: { slotId: string, worktreePath: string, namespace: string, ports: { game: number, tilt: number } },
 *   sessionRoot: string,
 *   session?: Record<string, unknown> | null,
 *   signal?: (pid: number, signal: string) => void,
 *   scale?: (namespace: string) => void,
 *   processDeps: { pidAlive: (pid: number) => boolean, readStartTicks: (pid: number) => string | null },
 * }} input
 */
export function stopSelectedEnvironment(input) {
  const session =
    input.session ??
    readEnvironmentSession(input.sessionRoot, input.owner.slotId);
  if (!session) {
    return {
      ok: true,
      idempotent: true,
      signalled: false,
      scaled: false,
      reason: 'already_stopped',
    };
  }
  if (
    session.slotId !== input.owner.slotId ||
    session.namespace !== input.owner.namespace
  ) {
    return {
      ok: false,
      signalled: false,
      scaled: false,
      reason: 'slot_or_namespace_mismatch',
    };
  }
  if (
    resolve(String(session.checkoutPath ?? input.owner.worktreePath)) !==
    resolve(input.owner.worktreePath)
  ) {
    return {
      ok: false,
      signalled: false,
      scaled: false,
      reason: 'checkout_mismatch',
    };
  }
  if (
    session.gamePort !== input.owner.ports.game ||
    session.tiltPort !== input.owner.ports.tilt
  ) {
    return {
      ok: false,
      signalled: false,
      scaled: false,
      reason: 'port_mismatch',
    };
  }
  const assess = assessOwnedProcess(session, input.processDeps);
  if (!assess.owned) {
    if (assess.reason === 'not_running' || assess.reason === 'missing_pid') {
      return {
        ok: true,
        idempotent: true,
        signalled: false,
        scaled: false,
        reason: 'already_stopped',
      };
    }
    return {
      ok: false,
      signalled: false,
      scaled: false,
      reason: assess.reason,
    };
  }
  const signal = input.signal ?? (() => {});
  signal(Number(session.pid), 'SIGTERM');
  const forward = assessOwnedProcess(
    {
      pid: session.forwardPid,
      processStartTicks: session.forwardStartTicks,
    },
    input.processDeps,
  );
  if (forward.owned) signal(Number(session.forwardPid), 'SIGTERM');
  if (input.scale) input.scale(input.owner.namespace);
  writeEnvironmentSession(input.sessionRoot, {
    ...session,
    stopped: true,
    stoppedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    idempotent: false,
    signalled: true,
    scaled: Boolean(input.scale),
    reason: 'owned',
  };
}

export const PARKED_APPLICATION_ROLES = Object.freeze([
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
]);

function reservationMatchesSession(owner, session) {
  if (!owner.lease) return true;
  return (
    owner.lease.pid === Number(session.pid) &&
    String(owner.lease.startTimeJiffies) === String(session.processStartTicks)
  );
}

function desiredAreZero(desired) {
  return PARKED_APPLICATION_ROLES.every((role) => desired?.[role] === 0);
}

/**
 * Park one owned environment: stop its fenced processes, scale its six
 * application Deployments to zero, and clear the active reservation only
 * after desired replicas read back as zero. Tenants, namespace, ports and
 * image artifacts stay. A failed check or partial scale keeps the session.
 *
 * @param {{
 *   owner: { slotId: string, worktreePath: string, namespace: string, ports: { game: number, tilt: number }, lease?: { pid: number, startTimeJiffies: number } | null, resourceUids?: Record<string, string> },
 *   sessionRoot: string,
 *   session?: Record<string, unknown> | null,
 *   signal?: (pid: number, signal: string) => void,
 *   scaleRole?: (namespace: string, role: string) => void,
 *   readDesiredReplicas?: (namespace: string) => Record<string, number>,
 *   clearReservation?: (owner: object) => void,
 *   activeConsumer?: string | null,
 *   processDeps: { pidAlive: (pid: number) => boolean, readStartTicks: (pid: number) => string | null },
 * }} input
 */
export function parkSelectedEnvironment(input) {
  const session =
    input.session ??
    readEnvironmentSession(input.sessionRoot, input.owner.slotId);
  const readDesired =
    input.readDesiredReplicas ??
    (() =>
      Object.fromEntries(PARKED_APPLICATION_ROLES.map((role) => [role, 0])));
  const tenantIdentity = {
    namespace: input.owner.namespace,
    resourceUids: input.owner.resourceUids ?? null,
    ports: input.owner.ports,
  };
  if (!session) {
    return {
      ok: false,
      released: false,
      signalled: false,
      scaled: false,
      reason: 'missing_session',
      tenantIdentity,
    };
  }
  if (
    session.slotId !== input.owner.slotId ||
    session.namespace !== input.owner.namespace
  ) {
    return {
      ok: false,
      released: false,
      signalled: false,
      scaled: false,
      reason: 'slot_or_namespace_mismatch',
      tenantIdentity,
    };
  }
  if (
    resolve(String(session.checkoutPath ?? '')) !==
    resolve(input.owner.worktreePath)
  ) {
    return {
      ok: false,
      released: false,
      signalled: false,
      scaled: false,
      reason: 'checkout_mismatch',
      tenantIdentity,
    };
  }
  if (
    input.activeConsumer &&
    session.consumerId &&
    input.activeConsumer !== session.consumerId
  ) {
    return {
      ok: false,
      released: false,
      signalled: false,
      scaled: false,
      reason: 'foreign_consumer',
      tenantIdentity,
    };
  }
  if (!reservationMatchesSession(input.owner, session)) {
    return {
      ok: false,
      released: false,
      signalled: false,
      scaled: false,
      reason: 'foreign_lease',
      tenantIdentity,
    };
  }
  if (session?.parked === true && input.portOccupied?.(input.owner.ports)) {
    return {
      ok: false,
      released: false,
      signalled: false,
      scaled: false,
      reason: 'conflicting_listener',
      tenantIdentity,
    };
  }
  const assess = assessOwnedProcess(session, input.processDeps);
  if (
    !assess.owned &&
    assess.reason !== 'not_running' &&
    assess.reason !== 'missing_pid'
  ) {
    return {
      ok: false,
      released: false,
      signalled: false,
      scaled: false,
      reason: assess.reason,
      tenantIdentity,
    };
  }
  if (
    session?.parked === true &&
    !assess.owned &&
    !input.owner.lease &&
    desiredAreZero(readDesired(input.owner.namespace))
  ) {
    return {
      ok: true,
      idempotent: true,
      released: true,
      signalled: false,
      scaled: false,
      reason: 'already_parked',
      tenantIdentity,
    };
  }
  const signal = input.signal ?? (() => {});
  const stoppedProcess = (record) => {
    const seen = assessOwnedProcess(record, input.processDeps);
    return (
      !seen.owned &&
      (seen.reason === 'not_running' ||
        seen.reason === 'missing_pid' ||
        seen.reason === 'start_time_mismatch')
    );
  };
  let signalled = false;
  const targets = [];
  if (assess.owned)
    targets.push({
      pid: session.pid,
      processStartTicks: session.processStartTicks,
    });
  const forward = assessOwnedProcess(
    {
      pid: session.forwardPid,
      processStartTicks: session.forwardStartTicks,
    },
    input.processDeps,
  );
  if (forward.owned)
    targets.push({
      pid: session.forwardPid,
      processStartTicks: session.forwardStartTicks,
    });
  else if (
    forward.reason !== 'not_running' &&
    forward.reason !== 'missing_pid' &&
    session.forwardPid
  ) {
    return {
      ok: false,
      released: false,
      signalled: false,
      scaled: false,
      reason: forward.reason,
      tenantIdentity,
    };
  }
  const failSignal = () => {
    writeEnvironmentSession(input.sessionRoot, {
      ...session,
      processesStopped: false,
      parkIncomplete: true,
      released: false,
      parked: false,
    });
    return {
      ok: false,
      released: false,
      signalled,
      scaled: false,
      reason: 'signal-failed',
      tenantIdentity,
    };
  };
  // Tilt is recorded first. Its exit is confirmed before the forwarder is signalled.
  for (const target of targets) {
    const again = assessOwnedProcess(target, input.processDeps);
    if (!again.owned) {
      if (stoppedProcess(target)) continue;
      return {
        ok: false,
        released: false,
        signalled,
        scaled: false,
        reason: again.reason,
        tenantIdentity,
      };
    }
    const beforeSignal = assessOwnedProcess(target, input.processDeps);
    if (!beforeSignal.owned) {
      if (stoppedProcess(target)) continue;
      return {
        ok: false,
        released: false,
        signalled,
        scaled: false,
        reason: beforeSignal.reason,
        tenantIdentity,
      };
    }
    try {
      signal(Number(target.pid), 'SIGTERM');
    } catch {
      return failSignal();
    }
    signalled = true;
    // kubectl port-forward often exits after the first 250ms. Forty 50ms polls cover about two seconds.
    const waitForExit = (attempts) => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (stoppedProcess(target)) return true;
        input.processDeps.sleep?.(attempt);
      }
      return stoppedProcess(target);
    };
    let gone = waitForExit(40);
    if (!gone) {
      // Re-check PID and start time. A reused PID must not receive SIGKILL.
      const stillOwned = assessOwnedProcess(target, input.processDeps);
      if (!stillOwned.owned) {
        if (stoppedProcess(target)) {
          gone = true;
        } else {
          writeEnvironmentSession(input.sessionRoot, {
            ...session,
            processesStopped: false,
            parkIncomplete: true,
            released: false,
            parked: false,
          });
          return {
            ok: false,
            released: false,
            signalled,
            scaled: false,
            reason: stillOwned.reason,
            tenantIdentity,
          };
        }
      } else {
        const beforeKill = assessOwnedProcess(target, input.processDeps);
        if (!beforeKill.owned) {
          if (stoppedProcess(target)) {
            gone = true;
          } else {
            writeEnvironmentSession(input.sessionRoot, {
              ...session,
              processesStopped: false,
              parkIncomplete: true,
              released: false,
              parked: false,
            });
            return {
              ok: false,
              released: false,
              signalled,
              scaled: false,
              reason: beforeKill.reason,
              tenantIdentity,
            };
          }
        } else {
          // Under memory pressure Tilt can ignore SIGTERM for the whole polite wait.
          try {
            signal(Number(target.pid), 'SIGKILL');
          } catch {
            return failSignal();
          }
          gone = waitForExit(10);
        }
      }
    }
    if (!gone) {
      writeEnvironmentSession(input.sessionRoot, {
        ...session,
        processesStopped: false,
        parkIncomplete: true,
        released: false,
        parked: false,
      });
      return {
        ok: false,
        released: false,
        signalled,
        scaled: false,
        reason: 'process-stop-incomplete',
        tenantIdentity,
      };
    }
  }
  if (input.portOccupied?.(input.owner.ports)) {
    writeEnvironmentSession(input.sessionRoot, {
      ...session,
      processesStopped: true,
      parkIncomplete: true,
      released: false,
      parked: false,
    });
    return {
      ok: false,
      released: false,
      signalled,
      scaled: false,
      reason: 'conflicting_listener',
      tenantIdentity,
    };
  }
  const scaleRole = input.scaleRole ?? (() => {});
  const scaled = [];
  try {
    for (const role of PARKED_APPLICATION_ROLES) {
      scaleRole(input.owner.namespace, role);
      scaled.push(role);
    }
  } catch (error) {
    writeEnvironmentSession(input.sessionRoot, {
      ...session,
      processesStopped: signalled || session.processesStopped === true,
      parkIncomplete: true,
      released: false,
      scaledRoles: scaled,
      parkError: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      released: false,
      signalled,
      scaled: false,
      reason: 'scale_incomplete',
      tenantIdentity,
      scaledRoles: scaled,
    };
  }
  const desired = readDesired(input.owner.namespace);
  if (!desiredAreZero(desired)) {
    writeEnvironmentSession(input.sessionRoot, {
      ...session,
      processesStopped: signalled || session.processesStopped === true,
      parkIncomplete: true,
      released: false,
      scaledRoles: scaled,
    });
    return {
      ok: false,
      released: false,
      signalled,
      scaled: true,
      reason: 'replicas_not_zero',
      tenantIdentity,
    };
  }
  if (input.clearReservation) input.clearReservation(input.owner);
  writeEnvironmentSession(input.sessionRoot, {
    ...session,
    stopped: true,
    parked: true,
    released: true,
    parkIncomplete: false,
    stoppedAt: new Date().toISOString(),
  });
  return {
    ok: true,
    idempotent: false,
    released: true,
    signalled,
    scaled: true,
    reason: 'parked',
    tenantIdentity,
  };
}

/**
 * Run one slot-scoped park or launch follow-up under the per-slot operation lock.
 *
 * @param {string} registryRoot
 * @param {string} slotId
 * @param {() => T} fn
 * @param {{ tryOnly?: boolean, lockTimeoutMs?: number }} [options]
 * @returns {T}
 * @template T
 */
export function withSlotEnvironmentOperationLock(
  registryRoot,
  slotId,
  fn,
  options = {},
) {
  return withSlotOperationLock(
    {
      registryRoot,
      slotId,
      tryOnly: options.tryOnly ?? true,
      lockTimeoutMs: options.lockTimeoutMs ?? 0,
    },
    fn,
  );
}
