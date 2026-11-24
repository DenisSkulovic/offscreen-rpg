import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, renameSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { OPTIONAL_EXCLUDED_SERVICES } from '../environments/platform-plan.mjs';
import { runCommand, commandOutcome, diagnosticExcerpt, executeChecks } from './diagnostic-engine.mjs';

// Explicit source-only allowlist: do not discover and run arbitrary live proof files.
export const ADDITIONAL_PLATFORM_TESTS = Object.freeze([
  { file: 'infra/platform/common/tests/pins.test.mjs', requiresHelm: false },
  { file: 'infra/platform/common/tests/render.test.mjs', requiresHelm: true },
  { file: 'infra/platform/temporal/tests/schema-policy.test.mjs', requiresHelm: false },
  { file: 'infra/platform/temporal/tests/readiness.test.mjs', requiresHelm: false },
  { file: 'infra/platform/postgres/tests/readiness.test.mjs', requiresHelm: false },
  { file: 'infra/platform/object-storage/tests/readiness.test.mjs', requiresHelm: false },
  { file: 'infra/platform/redis/tests/dev-install.test.mjs', requiresHelm: true },
  { file: 'infra/platform/temporal/tests/render.test.mjs', requiresHelm: true },
  { file: 'infra/platform/postgres/tests/render.test.mjs', requiresHelm: true },
  { file: 'infra/platform/postgres/tests/release-install.test.mjs', requiresHelm: true },
  { file: 'infra/platform/temporal/tests/release-install.test.mjs', requiresHelm: true },
  { file: 'infra/platform/object-storage/tests/object-storage-chart.test.mjs', requiresHelm: true },
  { file: 'infra/platform/rabbitmq/tests/render.test.mjs', requiresHelm: true },
  { file: 'infra/platform/redis/tests/render.test.mjs', requiresHelm: true },
  { file: 'infra/platform/observability/tests/render.test.mjs', requiresHelm: true },
]);

const SERVICES = { dev: ['postgres', 'object-storage', 'temporal', 'redis'], release: ['postgres', 'object-storage', 'temporal', 'gateway', 'redis', 'rabbitmq', 'observability'] };
const SERVICE_IDS = { postgres: 'PL-01', 'object-storage': 'PL-02', temporal: 'PL-03', redis: 'PL-04', rabbitmq: 'PL-05', observability: 'PL-06', gateway: 'PL-07' };

export function buildDiagnosticChecks({ repoRoot, definitions, resolveFiles, parseCounts, run = runCommand }) {
  const checks = [];
  const add = (id, tier, command, args, options = {}) => checks.push({
    id, tier, command: [command, ...args], requires: options.requires, capability: options.capability,
    async run() {
      const result = await run(command, args, { cwd: repoRoot, timeoutMs: options.timeoutMs ?? 15000 });
      const outcome = commandOutcome(result);
      if (outcome.status !== 'PASS') return { ...outcome, ...(options.isNodeTest ? { counts: parseCounts(result.stdout ?? '') } : {}) };
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
    add('source:' + file, 'SOURCE', node, ['--test', '--test-reporter=tap', '--test-concurrency=1', file], {
      requires, isNodeTest: true, timeoutMs: 120000, evaluate: result => {
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
  for (const { file, requiresHelm } of ADDITIONAL_PLATFORM_TESTS) {
    addNodeTest(file, requiresHelm ? ['host.helm'] : []);
  }
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
          const optional = OPTIONAL_EXCLUDED_SERVICES.includes(service);
          return { status: observation.status, reason: diagnosticExcerpt(observation.reason), detail: diagnosticExcerpt(observation.detail), optional };
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
    capabilities: catalogIds.map(id => ({ id, liveAcceptance: 'NOT-RUN', observations: [] })),
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
    const capability = report.capabilities.find(item => item.id === row.capability);
    if (capability) capability.observations.push({ checkId: row.id, status: row.status, tier: row.tier });
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
