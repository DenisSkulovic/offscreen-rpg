import { readFileSync } from 'node:fs';
import { readPlatformObject } from '../../common/commands.mjs';

/**
 * @param {ReturnType<typeof readPlatformObject>} observation
 * @param {string} id
 * @param {{ id: string, reason: string }[]} unreadableReads
 * @returns {'absent' | 'present' | 'unreadable'}
 */
export function observeState(observation, id, unreadableReads) {
  if (observation.state === 'unreadable') {
    unreadableReads.push({ id, reason: observation.reason });
    return 'unreadable';
  }
  if (observation.state === 'absent') return 'absent';
  return 'present';
}

/**
 * @param {(command: string, args: string[], options?: { timeoutMs?: number }) => ReturnType<typeof import('../../common/commands.mjs').runPlatformCommand>} run
 */
export function platformRead(run) {
  return (spec) => readPlatformObject(spec, { run });
}

/**
 * @param {{ readMeminfo?: () => string }} [deps]
 */
export function readMemoryMiB(deps = {}) {
  try {
    const text = deps.readMeminfo
      ? deps.readMeminfo()
      : readFileSync('/proc/meminfo', 'utf8');
    const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    return available ? Math.floor(Number(available[1]) / 1024) : 0;
  } catch {
    return 0;
  }
}
