import { spawn } from 'node:child_process';
import { cpus, freemem, totalmem, platform, release } from 'node:os';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const PREFIX = '@offscreen-stack ';
export const APP_PHASES = ['images', 'credentials', 'content-build', 'content-load', 'content-import', 'content-read', 'migration', 'apply', 'rollout'];
const LABELS = { cluster: 'Cluster startup', platform: 'Platform services', images: 'Image distribution',
  credentials: 'Runtime credentials', 'content-build': 'Content image build', 'content-load': 'Content distribution',
  'content-import': 'Content publication', 'content-read': 'Independent content read', migration: 'Database migration',
  apply: 'Application deployment', rollout: 'Rollout verification' };

export function emitStackProgress(event) {
  if (process.env.OFFSCREEN_STACK_PROGRESS === '1') process.stderr.write(PREFIX + JSON.stringify(event) + '\n');
}

export function shouldUseStackDashboard(argv, { stdout = process.stdout, stderr = process.stderr, env = process.env } = {}) {
  return argv[0] === 'up' && stdout.isTTY === true && stderr.isTTY === true && env.TERM !== 'dumb' &&
    env.CI !== 'true' && env.CI !== '1' && env.OFFSCREEN_STACK_UI !== 'plain' && env.OFFSCREEN_STACK_PROGRESS !== '1';
}

export function createProgressState() {
  return { phases: [], completed: new Set(), current: null, detail: 'Checking release prerequisites', logs: [], failed: false, timings: new Map(), substep: null, cpuHistory: [], ramHistory: [] };
}

export function acceptProgress(state, event, now = Date.now()) {
  if (event?.type === 'plan' && Array.isArray(event.phases) &&
      event.phases.length > 0 && new Set(event.phases).size === event.phases.length &&
      event.phases.every(id => Object.hasOwn(LABELS, id))) {
    state.phases = [...event.phases];
  } else if (event?.type === 'start' && state.phases.includes(event.id) && !state.completed.has(event.id)) {
    state.current = event.id;
    state.timings.set(event.id, { start: now });
    state.substep = null;
    state.detail = LABELS[event.id];
  } else if (event?.type === 'done' && state.current === event.id) {
    state.completed.add(event.id);
    state.timings.get(event.id).end = now;
    state.current = null;
    state.substep = null;
  } else if (event?.type === 'substep' && state.current === event.id && Number.isInteger(event.done) && Number.isInteger(event.total) && event.done >= 0 && event.total > 0 && event.done <= event.total) {
    state.substep = { done: event.done, total: event.total };
    if (typeof event.text === 'string') state.detail = cleanLine(event.text);
  } else if (event?.type === 'detail' && typeof event.text === 'string') {
    state.detail = cleanLine(event.text);
  }
}

export function cleanLine(value) {
  return String(value).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x1f\x7f-\x9f]/g, '').slice(0, 1000);
}

export function cpuSnapshot() {
  return cpus().reduce((acc, cpu) => {
    acc.idle += cpu.times.idle;
    acc.total += Object.values(cpu.times).reduce((a,b) => a+b, 0);
    return acc;
  }, { idle: 0, total: 0 });
}

export function cpuPercent(previous, current) {
  const total = current.total - previous.total;
  if (total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round(100 * (1 - (current.idle - previous.idle) / total))));
}

function memory() {
  const total = totalmem();
  let available = freemem();
  let swap = null;
  if (platform() === 'linux') {
    try {
      const raw = readFileSync('/proc/meminfo', 'utf8');
      const value = key => Number(raw.match(new RegExp('^' + key + ':\\s+(\\d+)\\s+kB', 'm'))?.[1]) * 1024;
      const avail = value('MemAvailable');
      if (Number.isFinite(avail)) available = avail;
      const swapTotal = value('SwapTotal'), swapFree = value('SwapFree');
      if (Number.isFinite(swapTotal) && Number.isFinite(swapFree)) swap = [swapTotal - swapFree, swapTotal];
    } catch { /* OS fallback; presentation never changes admission. */ }
  }
  return { total, used: Math.max(0, total - available), swap };
}
const gib = n => (n / 1024 ** 3).toFixed(1);
const bar = (fraction, width) => {
  const fill = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return '█'.repeat(fill) + '░'.repeat(width - fill);
};

export function sparkline(values) {
  return values.slice(-24).map(value => Number.isFinite(value) ? '▁▂▃▄▅▆▇█'[Math.min(7, Math.max(0, Math.floor(value * 8)))] : '·').join('');
}
export function dashboardLines(state, { elapsed, cpu, mem, columns = 80, rows = 24, exitCode = null, host = 'Linux', now = Date.now() }) {
  const width = Math.max(1, Math.min(100, columns - 1));
  const count = state.completed.size, total = state.phases.length;
  const percent = total ? Math.floor(100 * count / total) : 0;
  const time = String(Math.floor(elapsed / 60)).padStart(2,'0') + ':' + String(Math.floor(elapsed % 60)).padStart(2,'0');
  const header = '◈ OFFSCREEN / RELEASE  ·  ' + time + (exitCode === null ? '' : exitCode === 0 ? '  COMPLETE' : '  FAILED');
  const resources = host + '  CPU ' + (cpu === null ? '…' : cpu + '%') + '  RAM ' + gib(mem.used) + '/' + gib(mem.total) + ' GiB' +
      (mem.swap ? '  swap ' + gib(mem.swap[0]) + '/' + gib(mem.swap[1]) : '');
  const history = 'CPU ' + sparkline(state.cpuHistory).padStart(24, '·') + '  RAM ' + sparkline(state.ramHistory).padStart(24, '·');
  const progress = bar(total ? count/total : 0, Math.min(24, Math.max(6, width - 18))) + '  ' + (total ? count + '/' + total + '  ' + percent + '%' : 'Preflight');
  const detail = exitCode === 0 ? 'All planned operations completed' : state.detail + (state.substep ? '  [' + state.substep.done + '/' + state.substep.total + ' verified]' : '');
  const steps = state.phases.map(id => {
    const timing = state.timings.get(id);
    const duration = timing ? ((Math.max(0, (timing.end ?? now) - timing.start))/1000).toFixed(1) + 's' : '';
    const mark = state.completed.has(id) ? '✓ ' : state.current === id ? (exitCode !== null && exitCode !== 0 ? '✗ ' : '▶ ') : '· ';
    return (mark + LABELS[id]).padEnd(33) + duration.padStart(7);
  });
  const rule = '─'.repeat(width);
  const full = [header, rule, resources, history, '', ...steps, '', progress, detail, rule, ...state.logs.slice(-3).map(line => '  ' + line)];
  const compact = [header, resources, progress, detail, history, ...state.logs.slice(-2)];
  return (full.length < rows ? full : compact).slice(0, Math.max(1, rows - 1)).map(line => cleanLine(line).slice(0,width));
}

export async function runStackDashboard(script, argv) {
  const state = createProgressState();
  const started = Date.now();
  let previous = cpuSnapshot(), cpu = null, exitCode = null;
  const output = process.stderr;
  const host = platform() === 'linux' ? (/microsoft/i.test(release()) ? 'WSL2' : 'Linux') : platform() === 'darwin' ? 'macOS' : platform();
  const color = line => process.env.NO_COLOR !== undefined ? line :
    (line.startsWith('✓') ? '\x1b[32m' : line.startsWith('✗') || line.includes('FAILED') ? '\x1b[31m' :
     line.startsWith('▶') || line.startsWith('◈') ? '\x1b[36m' : line.startsWith('·') || line.startsWith('─') ? '\x1b[90m' : '') + line + '\x1b[0m';
  const frame = () => dashboardLines(state, { elapsed: (Date.now()-started)/1000, cpu, mem: memory(),
    columns: output.columns ?? 80, rows: output.rows ?? 24, exitCode, host }).map(color).join('\r\n');
  // Alternate buffer isolates redraws from shell scrollback and terminal resize.
  const render = () => output.write('\x1b[H' + frame() + '\x1b[J');
  const child = spawn(process.execPath, [script, ...argv], {
    stdio: ['ignore','pipe','pipe'], env: { ...process.env, OFFSCREEN_STACK_PROGRESS: '1', OFFSCREEN_STACK_UI: 'plain' },
  });
  const errors = [];
  const consume = (stream, isError) => {
    let pending = '';
    stream.setEncoding('utf8');
    const line = raw => {
      if (isError && raw.startsWith(PREFIX)) {
        try { acceptProgress(state, JSON.parse(raw.slice(PREFIX.length))); } catch { /* invalid marker is not progress */ }
        return;
      }
      const safe = cleanLine(raw);
      if (!safe.trim()) return;
      state.logs.push(safe);
      if (state.logs.length > 12) state.logs.shift();
      if (isError) { errors.push(safe); if (errors.length > 30) errors.shift(); }
    };
    stream.on('data', chunk => {
      pending += chunk;
      const parts = pending.split('\n');
      pending = parts.pop() ?? '';
      for (const part of parts) line(part);
      if (pending.length > 16384) { line(pending.slice(0, 1000)); pending = ''; }
    });
    stream.on('end', () => { if (pending) line(pending); });
  };
  consume(child.stdout, false); consume(child.stderr, true);
  const onSignal = signal => { if (!child.killed) child.kill(signal); };
  const interrupt = () => onSignal('SIGINT');
  const terminate = () => onSignal('SIGTERM');
  process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
  output.write('\x1b[?1049h\x1b[?25l\x1b[2J');
  const interval = setInterval(() => {
    const next = cpuSnapshot(); cpu = cpuPercent(previous,next); previous = next;
    const mem = memory();
    state.cpuHistory.push(cpu === null ? null : cpu / 100);
    state.ramHistory.push(mem.total ? mem.used / mem.total : null);
    if (state.cpuHistory.length > 24) state.cpuHistory.shift();
    if (state.ramHistory.length > 24) state.ramHistory.shift();
    render();
  }, 500);
  try {
    render();
    exitCode = await new Promise(resolve => {
      child.once('error', error => { state.logs.push(cleanLine(error.message)); resolve(1); });
      child.once('close', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1)));
    });
    // Final receipt is printed exactly once on the normal terminal after cleanup.
    return exitCode;
  } finally {
    clearInterval(interval);
    process.off('SIGINT', interrupt); process.off('SIGTERM', terminate);
    output.write('\x1b[?1049l\x1b[?25h');
    output.write(frame() + '\n');
    if (exitCode !== 0) output.write('\nRecent diagnostics:\n' + errors.join('\n') + '\n');
  }
}
