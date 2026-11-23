import { readFileSync } from 'node:fs';

/**
 * Linux /proc/<pid>/stat field 22: start time in clock ticks since boot.
 * The command field is wrapped in parentheses and may contain spaces, so the
 * clock fields are taken only after the final ')'.
 *
 * @param {string} statText
 * @returns {string | null}
 */
export function processStartTicksFromStat(statText) {
  const close = statText.lastIndexOf(')');
  if (close < 0) return null;
  const fields = statText.slice(close + 2).trim().split(/\s+/);
  const start = fields[19];
  if (!start || !/^[0-9]+$/.test(start)) return null;
  return start;
}

/**
 * @param {number} pid
 * @param {{ readStat?: (pid: number) => string }} [deps]
 * @returns {string | null}
 */
export function readProcessStartTicks(pid, deps = {}) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const readStat = deps.readStat ?? ((target) => readFileSync(`/proc/${target}/stat`, 'utf8'));
  try {
    return processStartTicksFromStat(readStat(pid));
  } catch {
    return null;
  }
}

/**
 * A remembered PID is owned only when it is still the same process start.
 * A missing recorded start time is not enough to signal the current PID.
 *
 * @param {{ pid?: number | null, processStartTicks?: string | null }} session
 * @param {{ readStartTicks?: (pid: number) => string | null, pidAlive?: (pid: number) => boolean }} deps
 * @returns {{ owned: boolean, reason: string }}
 */
export function assessOwnedProcess(session, deps) {
  const pid = Number(session?.pid);
  if (!Number.isInteger(pid) || pid <= 0) {
    return { owned: false, reason: 'missing_pid' };
  }
  const recorded = session.processStartTicks;
  if (typeof recorded !== 'string' || !/^[0-9]+$/.test(recorded)) {
    return { owned: false, reason: 'missing_start_time' };
  }
  if (!deps.pidAlive(pid)) {
    return { owned: false, reason: 'not_running' };
  }
  const current = deps.readStartTicks(pid);
  if (current !== recorded) {
    return { owned: false, reason: 'start_time_mismatch' };
  }
  return { owned: true, reason: 'pid_and_start_time' };
}
