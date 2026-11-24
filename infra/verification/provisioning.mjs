#!/usr/bin/env node
import { mkdirSync, mkdtempSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeChecks, runCommand, commandOutcome, diagnosticExcerpt } from './diagnostic-engine.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const services = {
  dev: ['postgres', 'object-storage', 'temporal', 'redis'],
  release: ['postgres', 'object-storage', 'temporal', 'gateway', 'redis', 'rabbitmq', 'observability'],
};

function observeOutcome(result) {
  const outcome = commandOutcome(result);
  if (outcome.status !== 'PASS') return outcome;
  const observed = JSON.parse(result.stdout);
  return observed.status === 'PASS' ? { status: 'PASS' } : {
    status: 'FAIL', reason: 'readiness observation failed',
    detail: diagnosticExcerpt(observed.reason + ' ' + (observed.detail ?? '')),
  };
}

export function buildProvisioningChecks(profile, { run = runCommand, repoRoot = root } = {}) {
  if (!Object.hasOwn(services, profile)) throw Error('invalid profile');
  const checks = [];
  const add = (id, args, requires = [], evaluate = commandOutcome) => checks.push({
    id, tier: 'LIVE', requires, command: [process.execPath, ...args],
    async run() {
      return evaluate(await run(process.execPath, args, { cwd: repoRoot, timeoutMs: 900000 }));
    },
  });
  // Require an existing owned cluster. No implicit reset, repair or allocation.
  const cluster = profile + ':cluster';
  add(cluster, ['infra/verification/diagnostic-live.mjs', profile, 'cluster'], [], observeOutcome);
  for (const service of services[profile]) {
    const ensure = profile + ':ensure:' + service;
    add(ensure, ['infra/environments/infra-cli.mjs', 'up', '--env', profile, '--services', service], [cluster, ...(service === 'temporal' ? [profile + ':observe:postgres'] : [])]);
    add(profile + ':observe:' + service, ['infra/verification/diagnostic-live.mjs', profile, service], [ensure], observeOutcome);
  }
  return checks;
}

export async function runProvisioning(profile, { repoRoot = root, run = runCommand } = {}) {
  const checks = buildProvisioningChecks(profile, { run, repoRoot });
  const parent = join(repoRoot, '.offscreen', 'verification');
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const path = join(mkdtempSync(join(parent, 'provisioning-')), 'report.json');
  const report = { profile, complete: false, checks: [] };
  const persist = () => {
    writeFileSync(path + '.tmp', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    renameSync(path + '.tmp', path);
  };
  persist();
  console.log('Report: ' + path);
  await executeChecks(checks, { onResult(row) {
    report.checks.push(row);
    persist();
    console.log(row.status + ' ' + row.id + (row.reason ? ': ' + row.reason : ''));
  } });
  report.complete = true;
  persist();
  return report.checks.every(row => row.status === 'PASS') ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [profile, confirmation, ...rest] = process.argv.slice(2);
  if (!Object.hasOwn(services, profile) || confirmation !== '--ensure' || rest.length) {
    console.error('usage: node infra/verification/provisioning.mjs <dev|release> --ensure');
    process.exitCode = 2;
  } else {
    try { process.exitCode = await runProvisioning(profile); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
