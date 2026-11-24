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

/** Bounded subprocess; on Linux the child owns a separate process group. */
export function runCommand(command, args, { cwd, timeoutMs = 15000, env = process.env } = {}) {
  return new Promise(resolve => {
    let child;
    let stdout = '', stderr = '', reason = null, timer, settled = false;
    const group = process.platform !== 'win32';
    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, ...result });
    }
    function kill(why) {
      if (reason) return;
      reason = why;
      try {
        if (group && child.pid) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch { /* close/error provides actual outcome */ }
    }
    function capture(stream, chunk) {
      if (stream === 'stdout') stdout += chunk;
      else stderr += chunk;
      if (stdout.length + stderr.length > MAX_CAPTURE) {
        stdout = stdout.slice(-MAX_CAPTURE / 2);
        stderr = stderr.slice(-MAX_CAPTURE / 2);
        kill('output-limit');
      }
    }
    try {
      child = spawn(command, args, { cwd, env, shell: false, detached: group, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      finish({ code: null, reason: error.code ?? 'spawn-error' });
      return;
    }
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => capture('stdout', chunk));
    child.stderr.on('data', chunk => capture('stderr', chunk));
    child.on('error', error => finish({ code: null, reason: error.code ?? 'spawn-error' }));
    child.on('close', (code, signal) => finish({ code, signal, reason }));
    timer = setTimeout(() => kill('timeout'), timeoutMs);
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
    const row = { ...result, id: check.id, tier: check.tier, capability: check.capability ?? null, durationMs: Math.max(0, Math.round(now() - start)) };
    rows.push(row);
    prior.set(check.id, row);
    await onResult(row);
  }
  return rows;
}
