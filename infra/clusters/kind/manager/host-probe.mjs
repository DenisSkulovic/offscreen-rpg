import { spawnSync } from 'node:child_process';

export const HOST_PROBE_TIMEOUT_MS = 8000;
export const MIN_HOST_MEMORY_MIB = 4096;

/**
 * @param {string} command
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
export function runReadOnlyCommand(command, args, timeoutMs = HOST_PROBE_TIMEOUT_MS) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: timeoutMs,
    windowsHide: true,
  });
  const timedOut = result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
  return {
    command,
    ok: !timedOut && !result.error && result.status === 0,
    missing: result.error?.code === 'ENOENT',
    timedOut,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * Listening loopback and wildcard IPv4 ports from /proc/net/tcp. State 0A is LISTEN.
 * 0100007F is 127.0.0.1; 00000000 is 0.0.0.0.
 * @param {string} text
 * @returns {number[]}
 */
export function parseLoopbackListenPorts(text) {
  const ports = new Set();
  for (const line of text.split('\n').slice(1)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 4 || fields[3] !== '0A') continue;
    const [address, portHex] = fields[1].split(':');
    if (!portHex) continue;
    if (address !== '0100007F' && address !== '00000000') continue;
    ports.add(Number.parseInt(portHex, 16));
  }
  return [...ports];
}

/**
 * @param {string} text
 */
export function parseMeminfoMiB(text) {
  const available = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
  const total = text.match(/^MemTotal:\s+(\d+)\s+kB/m);
  return {
    memAvailableMiB: available ? Math.floor(Number(available[1]) / 1024) : null,
    memTotalMiB: total ? Math.floor(Number(total[1]) / 1024) : null,
  };
}