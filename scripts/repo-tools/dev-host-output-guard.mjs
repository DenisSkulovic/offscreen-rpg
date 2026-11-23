/**
 * Fail closed before a host command writes shared checkout build output
 * while another environment session is using that checkout.
 * Pod compilation is unaffected. This is not a build scheduler.
 */

import { readFileSync, readdirSync } from 'node:fs';
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
  let names;
  try {
    names = readdirSync(sessionRoot);
  } catch (error) {
    if (error && /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return { ok: true, conflicts: [] };
    throw refusal('ownership-unreadable', `Cannot read environment sessions before ${input.operation}.`);
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
  if (conflicts.length > 0) {
    throw refusal(
      'shared-host-output',
      `${input.operation} would write ${input.outputPath} while ${conflicts.join(', ')} is active on this checkout. Use an isolated checkout.`,
    );
  }
  return { ok: true, conflicts };
}
