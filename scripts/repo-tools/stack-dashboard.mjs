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
  return { phases: [], completed: new Set(), current: null, detail: 'Checking release prerequisites', logs: [], failed: false };
}

export function acceptProgress(state, event) {
  if (event?.type === 'plan' && Array.isArray(event.phases) &&
      event.phases.length > 0 && new Set(event.phases).size === event.phases.length &&
      event.phases.every(id => Object.hasOwn(LABELS, id))) {
    state.phases = [...event.phases];
  } else if (event?.type === 'start' && state.phases.includes(event.id) && !state.completed.has(event.id)) {
    state.current = event.id;
    state.detail = LABELS[event.id];
  } else if (event?.type === 'done' && state.current === event.id) {
    state.completed.add(event.id);
    state.current = null;
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

export function dashboardLines(state, { elapsed, cpu, mem, columns = 80, rows = 24, exitCode = null, host = 'Linux' }) {
  const width = Math.max(12, Math.min(100, columns - 1));
  const count = state.completed.size, total = state.phases.length;
  const percent = total ? Math.floor(100 * count / total) : 0;
  const time = String(Math.floor(elapsed / 60)).padStart(2,'0') + ':' + String(Math.floor(elapsed % 60)).padStart(2,'0');
  const lines = [
    '◈ OFFSCREEN / RELEASE  ·  ' + time + (exitCode === null ? '' : exitCode === 0 ? '  COMPLETE' : '  FAILED'),
    '─'.repeat(width),
    host + '  CPU ' + (cpu === null ? '…' : cpu + '%') + '  RAM ' + gib(mem.used) + '/' + gib(mem.total) + ' GiB' +
      (mem.swap ? '  swap ' + gib(mem.swap[0]) + '/' + gib(mem.swap[1]) : ''),
    'CPU ' + bar((cpu ?? 0)/100, 12) + '  RAM ' + bar(mem.total ? mem.used/mem.total : 0, 12),
    '',
    ...state.phases.map(id => (state.completed.has(id) ? '✓ ' : state.current === id ? (exitCode !== null && exitCode !== 0 ? '✗ ' : '▶ ') : '· ') + LABELS[id]),
    '',
    bar(total ? count/total : 0, Math.min(24, Math.max(6, width - 18))) + '  ' + (total ? count + '/' + total + '  ' + percent + '%' : 'Preflight'),
    state.detail,
    '─'.repeat(width),
    ...state.logs.slice(-3).map(line => '  ' + line),
  ];
  // On small terminals retain the actual progress and current phase, not a scrolling wall.
  const compact = rows < lines.length + 1 ? [lines[0], lines[2], lines[3], lines[lines.length - state.logs.slice(-3).length - 3], state.detail, ...state.logs.slice(-2)] : lines;
  return compact.slice(0, Math.max(1, rows - 1)).map(line => cleanLine(line).slice(0,width));
}

export async function runStackDashboard(script, argv) {
  const state = createProgressState();
  const started = Date.now();
  let previous = cpuSnapshot(), cpu = null, drawn = 0, exitCode = null;
  const output = process.stderr;
  const host = platform() === 'linux' ? (/microsoft/i.test(release()) ? 'WSL2' : 'Linux') : platform() === 'darwin' ? 'macOS' : platform();
  const render = () => {
    const lines = dashboardLines(state, { elapsed: (Date.now()-started)/1000, cpu, mem: memory(),
      columns: output.columns ?? 80, rows: output.rows ?? 24, exitCode, host });
    if (drawn) output.write('\r\x1b[' + drawn + 'A');
    output.write(lines.map(line => '\r\x1b[2K' + line).join('\n') + '\n');
    if (drawn > lines.length) {
      const extra = drawn - lines.length;
      output.write(('\r\x1b[2K\n').repeat(extra) + '\x1b[' + extra + 'A');
    }
    drawn = lines.length;
  };
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
  output.write('\x1b[?25l');
  const interval = setInterval(() => {
    const next = cpuSnapshot(); cpu = cpuPercent(previous,next); previous = next; render();
  }, 500);
  try {
    render();
    exitCode = await new Promise(resolve => {
      child.once('error', error => { state.logs.push(cleanLine(error.message)); resolve(1); });
      child.once('close', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1)));
    });
    render();
    if (exitCode !== 0) output.write('\nRecent diagnostics:\n' + errors.join('\n') + '\n');
    return exitCode;
  } finally {
    clearInterval(interval);
    process.off('SIGINT', interrupt); process.off('SIGTERM', terminate);
    output.write('\x1b[?25h');
  }
}
