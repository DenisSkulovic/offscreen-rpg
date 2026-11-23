import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assessOwnedProcess } from './dev-process-identity.mjs';
import {
  isAllocatorRefusal,
  readRegistryJson,
  refusal,
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
  /** @type {'up' | 'status' | 'stop' | 'new'} */
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
        throw refusal('invalid-arguments', '--instance requires an environment id.');
      }
      if (instance) throw refusal('conflicting-arguments', '--instance was provided more than once.');
      instance = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) {
      throw refusal('invalid-arguments', `Unknown argument: ${arg}`);
    }
    if (arg !== 'status' && arg !== 'stop' && arg !== 'new') {
      throw refusal('invalid-arguments', `Unknown command: ${arg}`);
    }
    if (sawCommand) throw refusal('conflicting-arguments', 'Only one dev command is allowed.');
    command = arg;
    sawCommand = true;
  }
  if (command === 'new' && instance) {
    throw refusal('conflicting-arguments', 'dev:new allocates an id; do not also pass --instance.');
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
  if (raw.version !== 1) throw refusal('registry-version', `Unsupported registry version: ${raw.version}`);
  const match = Object.values(raw.ownersByWorktree).find((record) => record.slotId === slotId);
  if (!match) throw refusal('unknown-environment', `Unknown environment id: ${slotId}`);
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
 * }} input
 */
export function resolveDevEnvironmentSelection(input) {
  const checkout = resolve(input.worktree);
  if (input.command === 'new') {
    const raw = readRegistryJson(input.registryRoot);
    if (!raw || raw.version !== 2) {
      throw refusal('registry-version', 'dev:new requires registry v2 and does not migrate it.');
    }
    const allocate = input.allocate ?? allocateIndependentEnvironment;
    const record = allocate(checkout, input.registryRoot);
    return { action: 'startup-not-yet-bound', record, checkout };
  }
  if (input.instance) {
    const record = ownerFromEitherRegistry(input.registryRoot, input.instance);
    if (input.command === 'up') return { action: 'startup-not-yet-bound', record, checkout };
    return { action: input.command, record, checkout };
  }
  const record = defaultFromEitherRegistry(input.registryRoot, checkout);
  return { action: input.command, record, checkout };
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
  mkdirSync(sessionRoot, { recursive: true });
  const file = environmentSessionPath(sessionRoot, String(session.slotId));
  writeFileSync(file, `${JSON.stringify(session)}\n`, 'utf8');
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
  if (!legacy) throw refusal('legacy-session-missing', `No legacy session for ${input.owner.slotId}.`);
  const checkout = resolve(input.owner.worktreePath);
  if (resolve(input.worktree) !== checkout) {
    throw refusal('checkout-mismatch', 'Legacy session checkout does not match the selected source.');
  }
  if (legacy.slotId !== input.owner.slotId) {
    throw refusal('slot-mismatch', `Legacy session ${legacy.slotId} is not ${input.owner.slotId}.`);
  }
  if (legacy.namespace !== input.owner.namespace) {
    throw refusal('namespace-mismatch', `Legacy namespace ${legacy.namespace} is not ${input.owner.namespace}.`);
  }
  if (legacy.gamePort !== input.owner.ports.game || legacy.tiltPort !== input.owner.ports.tilt) {
    throw refusal('port-mismatch', `Legacy ports do not match ${input.owner.slotId}.`);
  }
  const assess = input.assess ?? assessOwnedProcess;
  const tilt = assess(legacy, input.processDeps);
  const forward = assess({
    pid: legacy.forwardPid,
    processStartTicks: legacy.forwardStartTicks,
  }, input.processDeps);
  if (!tilt.owned || !forward.owned) {
    throw refusal('process-ownership-unverified', `Legacy ${input.owner.slotId} process ownership is ${tilt.reason}/${forward.reason}.`);
  }
  const adopted = {
    ...legacy,
    checkoutPath: checkout,
    adoptedFrom: join(checkout, '.offscreen', 'dev-session.json'),
  };
  writeEnvironmentSession(input.sessionRoot, adopted);
  const receiptDir = join(input.sessionRoot, 'receipts');
  mkdirSync(receiptDir, { recursive: true });
  writeFileSync(join(receiptDir, `${input.owner.slotId}.json`), `${JSON.stringify({
    slotId: input.owner.slotId,
    legacyPath: adopted.adoptedFrom,
    preserved: true,
  })}\n`);
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
  const session = input.session ?? readEnvironmentSession(input.sessionRoot, input.owner.slotId);
  if (!session) {
    return { ok: true, idempotent: true, signalled: false, scaled: false, reason: 'already_stopped' };
  }
  if (session.slotId !== input.owner.slotId || session.namespace !== input.owner.namespace) {
    return { ok: false, signalled: false, scaled: false, reason: 'slot_or_namespace_mismatch' };
  }
  if (resolve(String(session.checkoutPath ?? input.owner.worktreePath)) !== resolve(input.owner.worktreePath)) {
    return { ok: false, signalled: false, scaled: false, reason: 'checkout_mismatch' };
  }
  if (session.gamePort !== input.owner.ports.game || session.tiltPort !== input.owner.ports.tilt) {
    return { ok: false, signalled: false, scaled: false, reason: 'port_mismatch' };
  }
  const assess = assessOwnedProcess(session, input.processDeps);
  if (!assess.owned) {
    if (assess.reason === 'not_running' || assess.reason === 'missing_pid') {
      return { ok: true, idempotent: true, signalled: false, scaled: false, reason: 'already_stopped' };
    }
    return { ok: false, signalled: false, scaled: false, reason: assess.reason };
  }
  const signal = input.signal ?? (() => {});
  signal(Number(session.pid), 'SIGTERM');
  const forward = assessOwnedProcess({
    pid: session.forwardPid,
    processStartTicks: session.forwardStartTicks,
  }, input.processDeps);
  if (forward.owned) signal(Number(session.forwardPid), 'SIGTERM');
  if (input.scale) input.scale(input.owner.namespace);
  writeEnvironmentSession(input.sessionRoot, {
    ...session,
    stopped: true,
    stoppedAt: new Date().toISOString(),
  });
  return { ok: true, idempotent: false, signalled: true, scaled: Boolean(input.scale), reason: 'owned' };
}
