/**
 * Fail closed before a host command writes shared checkout build output
 * while another environment session is using that checkout.
 * Pod compilation is unaffected. This is not a build scheduler.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { processStartTicksFromStat } from './dev-process-identity.mjs';
import {
  environmentSessionRoot,
  readEnvironmentSession,
} from './dev-environment-session.mjs';
import { refusal } from './dev-worktree-registry.mjs';

/**
 * @param {number} pid
 * @param {string} recorded
 * @param {string} procRoot
 * @returns {'alive' | 'inactive' | 'unreadable'}
 */
function sessionLiveness(pid, recorded, procRoot) {
  try {
    const text = readFileSync(join(procRoot, String(pid), 'stat'), 'utf8');
    return processStartTicksFromStat(text) === recorded ? 'alive' : 'inactive';
  } catch (error) {
    if (error && /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return 'inactive';
    return 'unreadable';
  }
}

/**
 * The checkout's own legacy session. This does not search other processes
 * or other checkouts. A missing file is not a consumer. A broken file refuses.
 *
 * @param {string} checkout
 * @param {string} operation
 */
function readLegacyCheckoutSession(checkout, operation) {
  const file = join(checkout, '.offscreen', 'dev-session.json');
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || typeof data.slotId !== 'string') {
      throw refusal('ownership-unreadable', `Legacy session is incomplete before ${operation}.`);
    }
    return data;
  } catch (error) {
    if (error && /** @type {{ id?: string }} */ (error).id === 'ownership-unreadable') throw error;
    throw refusal('ownership-unreadable', `Cannot read the legacy session before ${operation}.`);
  }
}

/**
 * @param {{
 *   checkout: string,
 *   registryRoot: string,
 *   selfSlotId?: string,
 *   operation: string,
 *   outputPath: string,
 *   procRoot?: string,
 * }} input
 */
export function assertExclusiveHostWrite(input) {
  const checkout = resolve(input.checkout);
  const sessionRoot = environmentSessionRoot(input.registryRoot);
  let names = [];
  try {
    names = readdirSync(sessionRoot);
  } catch (error) {
    if (!(error && /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT')) {
      throw refusal('ownership-unreadable', `Cannot read environment sessions before ${input.operation}.`);
    }
  }
  /** @type {string[]} */
  const conflicts = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const slotId = name.slice(0, -'.json'.length);
    if (input.selfSlotId && slotId === input.selfSlotId) continue;
    let session;
    try {
      session = readEnvironmentSession(sessionRoot, slotId);
    } catch {
      throw refusal('ownership-unreadable', `Cannot read the session for ${slotId} before ${input.operation}.`);
    }
    if (!session) continue;
    const bound = session.checkoutPath ?? session.worktreePath;
    if (resolve(String(bound ?? '')) !== checkout) continue;
    const pid = Number(session.pid);
    const ticks = session.processStartTicks;
    if (!Number.isInteger(pid) || pid <= 0 || typeof ticks !== 'string') {
      throw refusal('ownership-unreadable', `Session ${slotId} has no process identity before ${input.operation}.`);
    }
    const live = sessionLiveness(pid, ticks, input.procRoot ?? '/proc');
    if (live === 'unreadable') {
      throw refusal('ownership-unreadable', `Cannot confirm whether ${slotId} is active before ${input.operation}.`);
    }
    if (live === 'alive') conflicts.push(slotId);
  }
  const legacy = readLegacyCheckoutSession(checkout, input.operation);
  if (legacy && (!input.selfSlotId || legacy.slotId !== input.selfSlotId) && !conflicts.includes(legacy.slotId)) {
    const bound = resolve(String(legacy.worktreePath ?? legacy.checkoutPath ?? checkout));
    if (bound !== checkout) {
      throw refusal('ownership-unreadable', `Legacy session checkout does not match this checkout before ${input.operation}.`);
    }
    const pid = Number(legacy.pid);
    const ticks = legacy.processStartTicks;
    if (!Number.isInteger(pid) || pid <= 0 || typeof ticks !== 'string') {
      throw refusal('ownership-unreadable', `Legacy session ${legacy.slotId} has no process identity before ${input.operation}.`);
    }
    const live = sessionLiveness(pid, ticks, input.procRoot ?? '/proc');
    if (live === 'unreadable') {
      throw refusal('ownership-unreadable', `Cannot confirm whether legacy ${legacy.slotId} is active before ${input.operation}.`);
    }
    if (live === 'alive') conflicts.push(legacy.slotId);
  }
  if (conflicts.length > 0) {
    throw refusal(
      'shared-host-output',
      `${input.operation} would write ${input.outputPath} while ${conflicts.join(', ')} is active on this checkout. Use an isolated checkout.`,
    );
  }
  return { ok: true, conflicts };
}
