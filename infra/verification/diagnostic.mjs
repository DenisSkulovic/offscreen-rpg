import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, renameSync, mkdtempSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { runCommand, commandOutcome, diagnosticExcerpt, executeChecks } from './diagnostic-engine.mjs';

const SERVICES = { dev: ['postgres', 'object-storage', 'temporal', 'redis'], release: ['postgres', 'object-storage', 'temporal', 'gateway', 'redis', 'rabbitmq', 'observability'] };
const SERVICE_IDS = { postgres: 'PL-01', 'object-storage': 'PL-02', temporal: 'PL-03', redis: 'PL-04', rabbitmq: 'PL-05', observability: 'PL-06', gateway: 'PL-07' };

export function buildDiagnosticChecks({ repoRoot, definitions, resolveFiles, parseCounts, run = runCommand }) {
  const checks = [];
  const add = (id, tier, command, args, options = {}) => checks.push({
    id, tier, requires: options.requires, capability: options.capability,
    async run() {
      const result = await run(command, args, { cwd: repoRoot, timeoutMs: options.timeoutMs ?? 15000 });
      const outcome = commandOutcome(result);
      if (outcome.status !== 'PASS') return outcome;
      if (options.evaluate) return options.evaluate(result);
      return outcome;
    }
  });
  const node = process.execPath;
  add('host.node', 'LIVE-OBSERVATION', node, ['--version'], { capability: 'HOST-01', evaluate: result => {
    const match = /^v24\.(\d+)\.(\d+)/.exec(result.stdout.trim());
    return match && Number(match[1]) >= 19 ? { status: 'PASS', version: match[0] } : { status: 'FAIL', reason: 'Node >=24.19 <25 required', detail: diagnosticExcerpt(result.stdout) };
  }});
  add('host.helm', 'LIVE-OBSERVATION', 'helm', ['version', '--short']);
  add('host.python', 'LIVE-OBSERVATION', 'python3', ['--version']);
  add('host.memory', 'LIVE-OBSERVATION', node, ['-e', "const m=require('node:fs').readFileSync('/proc/meminfo','utf8').match(/^MemAvailable:\\s+(\\d+)\\s+kB/m); if(!m)process.exit(1); console.log(m[1])"], {
    capability: 'HOST-01', evaluate: result => {
      const availableKiB = Number(result.stdout.trim());
      return Number.isSafeInteger(availableKiB) && availableKiB > 0 ? { status: availableKiB >= 4194304 ? 'PASS' : 'FAIL', availableKiB, reason: '4 GiB admission threshold' } : { status: 'FAIL', reason: 'invalid MemAvailable' };
    }
  });
  function addNodeTest(file, requires = []) {
    add('source:' + file, 'SOURCE', node, ['--test', '--test-concurrency=1', file], {
      requires, timeoutMs: 120000, evaluate: result => {
        const counts = parseCounts(result.stdout);
        if (!counts.complete || counts.fail !== 0 || counts.tests <= 0 || counts.pass !== counts.tests || counts.skipped !== 0) return { status: 'FAIL', reason: 'incomplete, failed or skipped TAP', counts, detail: diagnosticExcerpt(result.stdout) };
        return { status: 'PASS', counts };
      }
    });
  }
  for (const definition of definitions) {
    const files = resolveFiles(repoRoot, definition);
    if (!files.length) checks.push({ id: 'source:' + definition.id, tier: 'SOURCE', run: () => ({ status: 'FAIL', reason: 'empty test group' }) });
    for (const file of files) addNodeTest(file, definition.requiresHelm ? ['host.helm'] : []);
  }
  for (const file of [
    'infra/verification/verify.test.mjs', 'infra/verification/verify-operation.test.mjs',
    'infra/verification/diagnostic.test.mjs', 'infra/environments/infra-cli.test.mjs',
    'infra/environments/infra-cli-operation.test.mjs', 'infra/monitoring/tests/operation-event.test.mjs',
    'infra/clusters/kind/manager/host-probe.test.mjs', 'infra/clusters/kind/manager/config.test.mjs',
    'infra/clusters/kind/manager/lifecycle.test.mjs', 'infra/platform/common/tests/commands.test.mjs'
  ]) addNodeTest(file);
  add('source:monitoring-python', 'FIXTURE', 'python3', ['-m', 'unittest', 'discover', '-s', 'infra/monitoring/tests', '-p', 'test_*.py'], {
    requires: ['host.python'], timeoutMs: 120000, evaluate: result => {
      const text = result.stdout + '\n' + result.stderr;
      const match = /Ran (\d+) tests? in /.exec(text);
      return match && Number(match[1]) > 0 && /^OK\s*$/m.test(text) ? { status: 'PASS', tests: Number(match[1]) } : { status: 'FAIL', reason: 'Python test summary incomplete or skipped', detail: diagnosticExcerpt(text) };
    }
  });
  for (const profile of ['dev', 'release']) {
    const cluster = 'live:' + profile + ':cluster';
    for (const service of ['cluster', ...SERVICES[profile]]) {
      add('live:' + profile + ':' + service, 'LIVE-OBSERVATION', node, ['infra/verification/diagnostic-live.mjs', profile, service], {
        requires: service === 'cluster' ? [] : [cluster],
        capability: service === 'cluster' ? profile === 'dev' ? 'CL-01' : 'CL-02' : SERVICE_IDS[service],
        timeoutMs: 180000, evaluate: result => {
          const observation = JSON.parse(result.stdout);
          return { status: observation.status, reason: diagnosticExcerpt(observation.reason), detail: diagnosticExcerpt(observation.detail) };
        }
      });
    }
  }
  return checks;
}

export async function runDiagnostic({ repoRoot, definitions, resolveFiles, parseCounts, catalogIds, json = false, run = runCommand, progress = text => process.stderr.write(text) }) {
  const dir = join(repoRoot, '.offscreen', 'verification');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const root = mkdtempSync(join(dir, 'run-'));
  const path = join(root, 'report.json');
  const startedAt = new Date().toISOString();
  const git = await run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  const dirty = await run('git', ['status', '--porcelain'], { cwd: repoRoot });
  const report = {
    schemaVersion: 1, runId: randomUUID(), startedAt,
    revision: git.code === 0 && /^[0-9a-f]{40}$/.test(git.stdout.trim()) ? git.stdout.trim() : null,
    dirty: dirty.code === 0 ? Boolean(dirty.stdout.trim()) : null,
    scope: 'source and existing local read-only observations; not full lifecycle acceptance',
    complete: false, checks: [],
    capabilities: catalogIds.map(id => ({ id, liveAcceptance: 'NOT-RUN' })),
    cleanup: 'no application, cluster or tenant mutations requested',
  };
  function persist() {
    const temp = path + '.tmp';
    writeFileSync(temp, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    renameSync(temp, path);
  }
  persist();
  progress('Diagnostic report: ' + path + '\n');
  const checks = buildDiagnosticChecks({ repoRoot, definitions, resolveFiles, parseCounts, run });
  await executeChecks(checks, { onResult(row) {
    report.checks.push(row);
    persist();
    progress(row.status + ' ' + row.id + ' (' + row.durationMs + 'ms)\n');
  }});
  report.finishedAt = new Date().toISOString();
  report.complete = true;
  report.counts = Object.fromEntries(['PASS', 'FAIL', 'BLOCKED', 'NOT-RUN'].map(status => [status, report.checks.filter(row => row.status === status).length]));
  report.exitCode = report.counts.FAIL || report.counts.BLOCKED ? 1 : 0;
  persist();
  if (json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  else process.stdout.write(JSON.stringify(report.counts) + '\nReport: ' + path + '\n');
  return report.exitCode;
}
