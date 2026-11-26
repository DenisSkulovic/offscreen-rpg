#!/usr/bin/env node
import console from 'node:console';
import process from 'node:process';
import { mkdirSync, mkdtempSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  executeChecks,
  runCommand,
  commandOutcome,
  diagnosticExcerpt,
} from './diagnostic-engine.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const RABBITMQ_PROVISIONING_GROUP_MS = 1_050_000;
const DEFAULT_ENSURE_MS = 900_000;

const baseServices = {
  dev: ['postgres', 'object-storage', 'temporal', 'redis'],
  release: [
    'postgres',
    'object-storage',
    'temporal',
    'gateway',
    'redis',
    'observability',
  ],
};

function observeOutcome(result) {
  const outcome = commandOutcome(result);
  if (outcome.status !== 'PASS') return outcome;
  const observed = JSON.parse(result.stdout);
  return observed.status === 'PASS'
    ? { status: 'PASS' }
    : {
        status: 'FAIL',
        reason: 'readiness observation failed',
        detail: diagnosticExcerpt(
          `${observed.reason ?? ''} ${observed.detail ?? ''}`,
        ),
      };
}

/**
 * @param {import('./diagnostic-engine.mjs').runCommand extends Function ? Awaited<ReturnType<typeof runCommand>> : never} result
 */
export function evaluateRabbitmqProvisioningEnsure(result) {
  if (result.reason === 'timeout') {
    return {
      status: 'FAIL',
      reason: 'possible-mutation',
      detail: 'provisioning output lost after rabbitmq launch',
    };
  }
  const stdout = String(result.stdout ?? '').trim();
  if (!stdout && result.code === 0) {
    return {
      status: 'FAIL',
      reason: 'possible-mutation',
      detail: 'provisioning output lost after rabbitmq launch',
    };
  }
  const outcome = commandOutcome(result);
  if (outcome.status !== 'PASS') {
    if (!stdout && result.reason !== 'ENOENT') {
      return {
        status: 'FAIL',
        reason: 'possible-mutation',
        detail: diagnosticExcerpt(
          result.stderr || 'missing provisioning receipt',
        ),
      };
    }
    return outcome;
  }
  let body;
  try {
    body = JSON.parse(stdout);
  } catch {
    return {
      status: 'FAIL',
      reason: 'possible-mutation',
      detail: 'malformed rabbitmq provisioning receipt',
    };
  }
  const phases = body?.receipt?.phases;
  const rabbitmqPhase = Array.isArray(phases)
    ? phases.find((phase) => phase?.id === 'rabbitmq')
    : undefined;
  if (rabbitmqPhase?.mutation === 'possible') {
    return {
      status: 'FAIL',
      reason: 'possible-mutation',
      detail: diagnosticExcerpt(
        rabbitmqPhase.detail ?? 'rabbitmq mutation uncertain',
      ),
    };
  }
  return body.ok === true
    ? { status: 'PASS' }
    : {
        status: 'FAIL',
        reason: 'rabbitmq ensure failed',
        detail: diagnosticExcerpt(
          `${body.phase ?? ''} ${rabbitmqPhase?.detail ?? ''}`,
        ),
      };
}

/**
 * @param {'dev' | 'release'} profile
 * @param {{ run?: typeof runCommand, repoRoot?: string, rabbitmq?: boolean }} [options]
 */
export function buildProvisioningChecks(
  profile,
  { run = runCommand, repoRoot = root, rabbitmq = false } = {},
) {
  if (!Object.hasOwn(baseServices, profile)) throw Error('invalid profile');
  const services = [
    ...baseServices[profile],
    ...(rabbitmq ? ['rabbitmq'] : []),
  ];
  const checks = [];
  const add = (
    id,
    args,
    requires = [],
    evaluate = commandOutcome,
    timeoutMs = DEFAULT_ENSURE_MS,
  ) =>
    checks.push({
      id,
      tier: 'LIVE',
      requires,
      command: [process.execPath, ...args],
      async run() {
        return evaluate(
          await run(process.execPath, args, { cwd: repoRoot, timeoutMs }),
        );
      },
    });
  const cluster = profile + ':cluster';
  add(
    cluster,
    ['infra/verification/diagnostic-live.mjs', profile, 'cluster'],
    [],
    observeOutcome,
  );
  for (const service of services) {
    const ensure = profile + ':ensure:' + service;
    const timeoutMs =
      service === 'rabbitmq'
        ? RABBITMQ_PROVISIONING_GROUP_MS
        : DEFAULT_ENSURE_MS;
    const evaluate =
      service === 'rabbitmq'
        ? evaluateRabbitmqProvisioningEnsure
        : commandOutcome;
    add(
      ensure,
      [
        'infra/environments/infra-cli.mjs',
        'up',
        '--env',
        profile,
        '--services',
        service,
      ],
      [
        cluster,
        ...(service === 'temporal' ? [profile + ':observe:postgres'] : []),
      ],
      evaluate,
      timeoutMs,
    );
    add(
      profile + ':observe:' + service,
      ['infra/verification/diagnostic-live.mjs', profile, service],
      [ensure],
      observeOutcome,
    );
  }
  return checks;
}

export async function runProvisioning(
  profile,
  { repoRoot = root, run = runCommand, rabbitmq = false } = {},
) {
  const checks = buildProvisioningChecks(profile, { run, repoRoot, rabbitmq });
  const parent = join(repoRoot, '.offscreen', 'verification');
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const path = join(mkdtempSync(join(parent, 'provisioning-')), 'report.json');
  const report = { profile, complete: false, checks: [], rabbitmq };
  const persist = () => {
    writeFileSync(path + '.tmp', JSON.stringify(report, null, 2) + '\n', {
      mode: 0o600,
    });
    renameSync(path + '.tmp', path);
  };
  persist();
  console.log('Report: ' + path);
  await executeChecks(checks, {
    onResult(row) {
      report.checks.push(row);
      persist();
      console.log(
        row.status + ' ' + row.id + (row.reason ? ': ' + row.reason : ''),
      );
    },
  });
  report.complete = true;
  persist();
  return report.checks.every((row) => row.status === 'PASS') ? 0 : 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [profile, confirmation, ...rest] = process.argv.slice(2);
  const rabbitmq = rest.includes('--rabbitmq');
  const extras = rest.filter((token) => token !== '--rabbitmq');
  if (
    !Object.hasOwn(baseServices, profile) ||
    confirmation !== '--ensure' ||
    extras.length
  ) {
    console.error(
      'usage: node infra/verification/provisioning.mjs <dev|release> --ensure [--rabbitmq]',
    );
    process.exitCode = 2;
  } else {
    try {
      process.exitCode = await runProvisioning(profile, { rabbitmq });
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
