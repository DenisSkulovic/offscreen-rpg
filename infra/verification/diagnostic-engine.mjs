import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import process from 'node:process';

const MAX_CAPTURE = 2 * 1024 * 1024;
const MAX_DETAIL = 12000;

/** Private local diagnostic text, not a guarantee that arbitrary secrets are absent. */
export function diagnosticExcerpt(value) {
  return String(value ?? '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
    .split('\n')
    .filter(line => !/authorization|bearer|password|passwd|secret|token|api.?key|credential|private.?key|connection.?string|database.?url|cookie|:\/\/[^/\s]+@/i.test(line))
    .join('\n').slice(-MAX_DETAIL);
}

/**
 * Bounded subprocess. On Linux the child owns a separate process group.
 * Optional signal, monotonic clock, byte cap and close grace do not change
 * callers that omit them. A group kill covers only this process group.
 * If this parent is hard-killed, the group can survive; pending custody
 * remains the mutation authority.
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, timeoutMs?: number, env?: NodeJS.ProcessEnv, signal?: AbortSignal, now?: () => number, maxCaptureBytes?: number, closeGraceMs?: number, spawnImpl?: typeof spawn }} [options]
 */
export function runCommand(command, args, options = {}) {
  const {
    cwd,
    timeoutMs = 15000,
    env = process.env,
    signal,
    now = () => performance.now(),
    maxCaptureBytes = MAX_CAPTURE,
    closeGraceMs = 0,
    spawnImpl = spawn,
  } = options;
  return new Promise(resolve => {
    const empty = { stdout: '', stderr: '', code: null, signal: null };
    if (signal?.aborted) {
      resolve({ ...empty, reason: 'aborted' });
      return;
    }
    const started = now();
    const deadline = started + timeoutMs;
    const grace = Math.max(0, Math.min(closeGraceMs, timeoutMs));
    let child;
    let stdout = '', stderr = '', reason = null, killTimer, graceTimer, settled = false;
    let spawned = false;
    const group = process.platform !== 'win32';
    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      clearTimeout(graceTimer);
      signal?.removeEventListener?.('abort', onAbort);
      resolve({ stdout, stderr, ...result });
    }
    function kill(why) {
      if (reason || !spawned) return;
      reason = why;
      try {
        if (group && child.pid) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch { /* close provides the actual outcome */ }
    }
    function unconfirmed() {
      try { child.unref?.(); } catch { /* already closed */ }
      try { child.stdout?.destroy?.(); child.stderr?.destroy?.(); } catch { /* pipes already gone */ }
      finish({ code: null, signal: null, reason: 'close-unconfirmed' });
    }
    function armCloseWait(why) {
      kill(why);
      if (grace === 0) return;
      const remain = Math.max(0, deadline - now());
      graceTimer = setTimeout(unconfirmed, remain);
    }
    function onAbort() {
      if (!spawned) {
        finish({ code: null, signal: null, reason: 'aborted' });
        return;
      }
      armCloseWait('aborted');
    }
    function capture(stream, chunk) {
      const text = String(chunk);
      if (stream === 'stdout') stdout += text;
      else stderr += text;
      const bytes = Buffer.byteLength(stdout, 'utf8') + Buffer.byteLength(stderr, 'utf8');
      if (bytes > maxCaptureBytes) {
        stdout = stdout.slice(-Math.floor(maxCaptureBytes / 2));
        stderr = stderr.slice(-Math.floor(maxCaptureBytes / 2));
        armCloseWait('output-limit');
      }
    }
    if (now() >= deadline) {
      resolve({ ...empty, reason: 'timeout' });
      return;
    }
    try {
      child = spawnImpl(command, args, { cwd, env, shell: false, detached: group, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      finish({ code: null, reason: error.code ?? 'spawn-error' });
      return;
    }
    spawned = true;
    signal?.addEventListener?.('abort', onAbort, { once: true });
    child.stdout?.setEncoding?.('utf8');
    child.stderr?.setEncoding?.('utf8');
    child.stdout?.on?.('data', chunk => capture('stdout', chunk));
    child.stderr?.on?.('data', chunk => capture('stderr', chunk));
    child.on?.('error', error => {
      reason = reason ?? error.code ?? 'spawn-error';
      if (grace === 0) finish({ code: null, signal: null, reason });
    });
    child.on?.('close', (code, closeSignal) => {
      finish({ code, signal: closeSignal, reason });
    });
    const killDelay = Math.max(0, timeoutMs - grace);
    killTimer = setTimeout(() => armCloseWait('timeout'), killDelay);
  });
}

export function commandOutcome(result) {
  if (result.reason === 'ENOENT') return { status: 'BLOCKED', reason: 'executable missing' };
  if (result.reason || result.signal || result.code !== 0) {
    return { status: 'FAIL', reason: result.reason ?? result.signal ?? 'nonzero exit',
      exitCode: result.code, detail: diagnosticExcerpt(result.stderr + '\n' + result.stdout) };
  }
  return { status: 'PASS', exitCode: 0 };
}

/** Sequential, explicit prerequisites. Never turn an exception or missing result green. */
export async function executeChecks(checks, { onResult = () => {}, now = () => performance.now() } = {}) {
  const ids = new Set(), prior = new Map(), rows = [];
  for (const check of checks) {
    if (ids.has(check.id) || (check.requires ?? []).some(id => !ids.has(id))) throw new Error('invalid check ordering: ' + check.id);
    ids.add(check.id);
  }
  for (const check of checks) {
    const start = now();
    const blockers = (check.requires ?? []).filter(id => prior.get(id)?.status !== 'PASS');
    let result;
    if (blockers.length) result = { status: 'BLOCKED', reason: 'prerequisite not passed', blockers };
    else {
      try {
        result = await check.run();
        if (!['PASS', 'FAIL', 'BLOCKED', 'NOT-RUN'].includes(result?.status)) result = { status: 'FAIL', reason: 'invalid check result' };
      } catch (error) {
        result = { status: 'FAIL', reason: 'check threw', detail: diagnosticExcerpt(error instanceof Error ? error.message : 'unknown error') };
      }
    }
    const row = { ...result, id: check.id, tier: check.tier, capability: check.capability ?? null, command: check.command ?? null, durationMs: Math.max(0, Math.round(now() - start)) };
    rows.push(row);
    prior.set(check.id, row);
    await onResult(row);
  }
  return rows;
}
