#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDevCnpgProbe } from '../../../../infra/platform/postgres/dev-host-probe.mjs';
import {
  DEV_CNPG_CONTEXT,
  executeAuthorizedDevCnpg,
  parseCnpgPin,
  planDevCnpg,
  statusDevCnpg,
} from '../../../../infra/platform/postgres/dev-bootstrap.mjs';
import {
  DEV_POSTGRES_READINESS_TIMEOUT_MS,
  waitForDevPostgresReadiness,
} from '../../../../infra/platform/postgres/readiness.mjs';

/**
 * @param {(command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => { ok: boolean, stdout?: string, stderr?: string, timedOut?: boolean }} run
 */
function waitForDevPostgres(run) {
  const steps = [
    [
      'wait',
      '--for=condition=Established',
      'crd/clusters.postgresql.cnpg.io',
      '--timeout=180s',
    ],
    [
      '-n',
      'cnpg-system',
      'rollout',
      'status',
      'deployment/cnpg-controller-manager',
      '--timeout=240s',
    ],
  ];
  for (const args of steps) {
    const waited = run('kubectl', ['--context', DEV_CNPG_CONTEXT, ...args], {
      timeoutMs: 260000,
    });
    if (!waited.ok) {
      return {
        ok: false,
        stage: args[0],
        detail: waited.stderr || waited.stdout || 'wait failed',
      };
    }
  }
  const readiness = waitForDevPostgresReadiness({
    run,
    sleep(ms) {
      run('sleep', [String(Math.ceil(ms / 1000))], { timeoutMs: ms + 1000 });
    },
    readinessTimeoutMs: DEV_POSTGRES_READINESS_TIMEOUT_MS,
  });
  if (!readiness.ok) {
    return {
      ok: false,
      stage: 'cluster-ready',
      detail: readiness.detail ?? 'cluster readiness failed',
    };
  }
  return {
    ok: true,
    stage: 'ready',
    primaryPod: readiness.primaryPod,
  };
}

const command = process.argv[2] ?? 'plan';
const injected = process.env.OFFSCREEN_DEV_CNPG_PROBE;
if (command === 'ensure' && injected) {
  process.stderr.write(
    'refusing live CNPG ensure: an injected probe cannot authorize mutation\n',
  );
  process.exitCode = 2;
} else if (
  command === 'ensure' &&
  process.env.OFFSCREEN_DEV_CNPG_ENSURE !== 'authorized'
) {
  process.stderr.write(
    'refusing live CNPG ensure: set OFFSCREEN_DEV_CNPG_ENSURE=authorized after a passing preflight\n',
  );
  process.exitCode = 2;
} else if (command !== 'plan' && command !== 'status' && command !== 'ensure') {
  process.stderr.write(
    'usage: dev-cnpg-bootstrap-cli.mjs <plan|status|ensure>\n',
  );
  process.exitCode = 2;
} else if (command === 'ensure') {
  const result = executeAuthorizedDevCnpg({
    collect: collectDevCnpgProbe,
    readOperatorManifest() {
      const pin = parseCnpgPin(
        readFileSync(
          join(
            dirname(fileURLToPath(import.meta.url)),
            '../../../../infra/platform/postgres/operator.pin',
          ),
          'utf8',
        ),
      );
      const file = join('/tmp', `offscreen-dev-cnpg-${pin.sha256}.yaml`);
      const response = spawnSync(
        'curl',
        ['-fsSL', '--retry', '3', '--retry-delay', '2', '-o', file, pin.url],
        {
          encoding: 'utf8',
          timeout: 120000,
        },
      );
      if (response.status !== 0) return { body: '', sha256: '' };
      const body = readFileSync(file);
      return {
        body: body.toString('utf8'),
        sha256: createHash('sha256').update(body).digest('hex'),
      };
    },
    run(commandName, args, options = {}) {
      const child = spawnSync(commandName, args, {
        encoding: 'utf8',
        input: options.input,
        timeout: options.timeoutMs ?? 60000,
        maxBuffer: 8 * 1024 * 1024,
      });
      return {
        ok: !child.error && child.status === 0,
        stdout: child.stdout ?? '',
        stderr: `${child.stderr ?? ''}${child.error ? child.error.message : ''}`,
      };
    },
    sleep(ms) {
      spawnSync('sleep', [String(Math.ceil(ms / 1000))]);
    },
  });
  process.stdout.write(
    `${JSON.stringify({ ...result, namespaceManifest: undefined, clusterManifest: undefined })}\n`,
  );
  if (!result.ok) {
    process.exitCode = 1;
  } else if (
    result.mutated ||
    result.actions.some((action) => action.op === 'noop')
  ) {
    const platformRun = (commandName, args, options = {}) => {
      const child = spawnSync(commandName, args, {
        encoding: 'utf8',
        input: options.input,
        timeout: options.timeoutMs ?? 60000,
        maxBuffer: 8 * 1024 * 1024,
      });
      const timedOut =
        child.error?.code === 'ETIMEDOUT' || child.signal === 'SIGTERM';
      return {
        ok: !timedOut && !child.error && child.status === 0,
        stdout: child.stdout ?? '',
        stderr: `${child.stderr ?? ''}${child.error ? child.error.message : ''}`,
        timedOut,
      };
    };
    const ready = waitForDevPostgres(platformRun);
    process.stdout.write(`${JSON.stringify(ready)}\n`);
    if (!ready.ok) process.exitCode = 1;
  }
} else {
  const probe = injected ? JSON.parse(injected) : collectDevCnpgProbe();
  const result = command === 'plan' ? planDevCnpg(probe) : statusDevCnpg(probe);
  const printable = {
    ...result,
    namespaceManifest: result.namespaceManifest ? 'rendered' : null,
    clusterManifest: result.clusterManifest ? 'rendered' : null,
  };
  process.stdout.write(`${JSON.stringify(printable)}\n`);
  if ((result.refusals ?? []).length > 0 && command === 'plan')
    process.exitCode = 1;
}
