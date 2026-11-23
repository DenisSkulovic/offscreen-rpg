/**
 * Read-only v1 cutover classification. It discovers live namespace and
 * Deployment UIDs for comparison and does not write the registry, signal
 * processes, or scale workloads.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { processStartTicksFromStat } from './dev-process-identity.mjs';
import {
  environmentSessionRoot,
  readEnvironmentSession,
  readLegacyDevSession,
} from './dev-environment-session.mjs';
import { readRegistryJson, refusal } from './dev-worktree-registry.mjs';

const APPLICATION_ROLES = Object.freeze([
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
]);

/**
 * @param {number | undefined} pid
 * @param {unknown} ticks
 * @param {(pid: number) => string | null | undefined} readProcStat
 * @returns {'alive' | 'inactive' | 'incomplete' | 'unreadable'}
 */
function processState(pid, ticks, readProcStat) {
  if (!Number.isInteger(pid) || pid <= 0 || typeof ticks !== 'string' || ticks.length === 0) return 'incomplete';
  let stat;
  try {
    stat = readProcStat(pid);
  } catch {
    return 'unreadable';
  }
  if (stat === undefined) return 'unreadable';
  if (stat === null) return 'inactive';
  const live = processStartTicksFromStat(stat);
  if (live === null) return 'unreadable';
  return live === ticks ? 'alive' : 'inactive';
}

/**
 * @param {Record<string, unknown> | null} session
 * @param {(pid: number) => string | null | undefined} readProcStat
 */
function sessionState(session, readProcStat) {
  if (!session) return 'absent';
  return processState(Number(session.pid), session.processStartTicks, readProcStat);
}

/**
 * @param {{
 *   registryRoot: string,
 *   observe: (owner: Record<string, any>) => {
 *     namespace: { uid: string, labels?: Record<string, string> },
 *     deployments: Array<{ name: string, uid: string, desired: number, labels?: Record<string, string> }>,
 *   },
 *   readProcStat?: (pid: number) => string | null | undefined,
 * }} input
 */
export function preflightLiveCutover(input) {
  const raw = readRegistryJson(input.registryRoot);
  if (!raw || typeof raw !== 'object') {
    throw refusal('registry-corrupt', 'Dev registry is missing or unreadable.');
  }
  if (raw.version !== 1 || !raw.ownersByWorktree || typeof raw.ownersByWorktree !== 'object') {
    throw refusal('registry-corrupt', 'Cutover preflight expects an intact v1 registry.');
  }
  const readProcStat = input.readProcStat ?? ((pid) => {
    try {
      return readFileSync(join('/proc', String(pid), 'stat'), 'utf8');
    } catch (error) {
      if (error && /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
      return undefined;
    }
  });
  const sessionRoot = environmentSessionRoot(input.registryRoot);
  /** @type {Array<Record<string, unknown>>} */
  const environments = [];
  for (const owner of Object.values(raw.ownersByWorktree)) {
    environments.push(classifyOwner(owner, sessionRoot, input.observe, readProcStat));
  }
  const blocking = environments.filter((item) => item.state === 'ambiguous' || item.state === 'orphaned_running');
  return {
    ok: blocking.length === 0,
    sessionsVerified: environments.every((item) => item.state === 'active_verified' || item.state === 'parked_verified'),
    reusableSlotIds: environments.filter((item) => item.reusable).map((item) => item.slotId),
    environments,
    registryWrites: 0,
    signals: 0,
    scales: 0,
  };
}

/**
 * @param {Record<string, any>} owner
 * @param {string} sessionRoot
 * @param {(owner: Record<string, any>) => any} observe
 * @param {(pid: number) => string | null | undefined} readProcStat
 */
function classifyOwner(owner, sessionRoot, observe, readProcStat) {
  const slotId = String(owner.slotId);
  let stored = null;
  try {
    stored = readEnvironmentSession(sessionRoot, slotId);
  } catch (error) {
    if (error && /** @type {{ id?: string }} */ (error).id === 'corrupt-session') throw error;
    throw refusal('ownership-unreadable', `Cannot read the session for ${slotId}.`);
  }
  let legacy = null;
  try {
    legacy = readLegacyDevSession(owner.worktreePath);
  } catch (error) {
    if (error && /** @type {{ id?: string }} */ (error).id === 'corrupt-session') throw error;
    throw refusal('ownership-unreadable', `Cannot read the legacy session for ${slotId}.`);
  }
  const session = stored ?? legacy;
  if (stored && legacy && (stored.pid !== legacy.pid || stored.processStartTicks !== legacy.processStartTicks)) {
    return result(owner, 'ambiguous', 'session-disagreement', null, false);
  }
  const live = observe(owner);
  const discovered = {
    namespace: live.namespace?.uid ?? null,
    deployments: Object.fromEntries((live.deployments ?? []).map((item) => [item.name, item.uid])),
  };
  const label = live.namespace?.labels?.['offscreen.dev/slot'];
  if (label !== slotId) {
    return result(owner, 'ambiguous', 'foreign-ownership-label', discovered, false);
  }
  for (const deployment of live.deployments ?? []) {
    if (deployment.labels?.['offscreen.dev/slot'] && deployment.labels['offscreen.dev/slot'] !== slotId) {
      return result(owner, 'ambiguous', 'foreign-ownership-label', discovered, false);
    }
  }
  const recordedNamespace = owner.resourceUids?.namespace;
  if (recordedNamespace && recordedNamespace !== live.namespace?.uid) {
    return result(owner, 'ambiguous', 'uid-mismatch', discovered, false);
  }
  for (const [name, uid] of Object.entries(owner.resourceUids ?? {})) {
    if (name === 'namespace' || !uid) continue;
    const observed = discovered.deployments[name];
    if (observed && observed !== uid) {
      return result(owner, 'ambiguous', 'uid-mismatch', discovered, false);
    }
  }
  const desired = Object.fromEntries((live.deployments ?? []).map((item) => [item.name, item.desired]));
  const knownRoles = APPLICATION_ROLES.every((role) => Number.isInteger(desired[role]));
  if (!knownRoles) return result(owner, 'ambiguous', 'incomplete-workloads', discovered, false);
  const running = APPLICATION_ROLES.some((role) => desired[role] > 0);
  const parked = APPLICATION_ROLES.every((role) => desired[role] === 0);
  const verified = sessionState(session, readProcStat);
  if (verified === 'unreadable' || (session && verified === 'incomplete')) {
    return result(owner, 'ambiguous', 'ownership-unreadable', discovered, false);
  }
  if (session && (session.slotId !== slotId || session.namespace !== owner.namespace)) {
    return result(owner, 'ambiguous', 'session-ownership-mismatch', discovered, false);
  }
  if (session && resolve(String(session.checkoutPath ?? session.worktreePath ?? owner.worktreePath)) !== resolve(owner.worktreePath)) {
    return result(owner, 'ambiguous', 'checkout-mismatch', discovered, false);
  }
  const leaseState = owner.lease
    ? processState(Number(owner.lease.pid), String(owner.lease.startTimeJiffies), readProcStat)
    : 'absent';
  if (leaseState === 'unreadable') return result(owner, 'ambiguous', 'ownership-unreadable', discovered, false);
  if (leaseState === 'alive' && verified !== 'alive') {
    return result(owner, 'ambiguous', 'lease-without-session', discovered, false);
  }
  if (verified === 'alive' && running) {
    return result(owner, 'active_verified', 'verified-session', discovered, false);
  }
  if (verified !== 'alive' && running && leaseState !== 'alive') {
    return result(owner, 'orphaned_running', 'workloads-without-verified-session', discovered, false);
  }
  if (parked && verified !== 'alive' && leaseState !== 'alive' && label === slotId) {
    return result(owner, 'parked_verified', 'parked-ownership', discovered, false);
  }
  return result(owner, 'ambiguous', 'unresolved-evidence', discovered, false);
}

/**
 * @param {Record<string, any>} owner
 * @param {string} state
 * @param {string} reason
 * @param {Record<string, unknown> | null} discoveredResourceUids
 * @param {boolean} reusable
 */
function result(owner, state, reason, discoveredResourceUids, reusable) {
  return {
    slotId: owner.slotId,
    state,
    reason,
    reusable,
    adopted: false,
    processIdentity: owner.processIdentity ?? null,
    lease: owner.lease ?? null,
    discoveredResourceUids,
  };
}
