#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDevCnpgProbe } from './dev-cnpg-host-probe.mjs';
import {
  DEV_CNPG_CLUSTER,
  DEV_CNPG_CONTEXT,
  DEV_CNPG_NAMESPACE,
  executeAuthorizedDevCnpg,
  parseCnpgPin,
  planDevCnpg,
  statusDevCnpg,
} from './dev-cnpg-bootstrap.mjs';

function waitForDevPostgres() {
  const steps = [
    ['wait', '--for=condition=Established', 'crd/clusters.postgresql.cnpg.io', '--timeout=180s'],
    ['-n', 'cnpg-system', 'rollout', 'status', 'deployment/cnpg-controller-manager', '--timeout=240s'],
  ];
  for (const args of steps) {
    const child = spawnSync('kubectl', ['--context', DEV_CNPG_CONTEXT, ...args], { encoding: 'utf8', timeout: 260000 });
    if (child.status !== 0) {
      return { ok: false, stage: args[0], detail: child.stderr || child.stdout || 'wait failed' };
    }
  }
  const deadline = Date.now() + 480000;
  let phase = '';
  let ready = '';
  while (Date.now() < deadline) {
    phase = spawnSync('kubectl', ['--context', DEV_CNPG_CONTEXT, '-n', DEV_CNPG_NAMESPACE, 'get', 'cluster.postgresql.cnpg.io', DEV_CNPG_CLUSTER, '-o', 'jsonpath={.status.phase}'], { encoding: 'utf8', timeout: 20000 }).stdout ?? '';
    ready = spawnSync('kubectl', ['--context', DEV_CNPG_CONTEXT, '-n', DEV_CNPG_NAMESPACE, 'get', 'cluster.postgresql.cnpg.io', DEV_CNPG_CLUSTER, '-o', 'jsonpath={.status.conditions[?(@.type=="Ready")].status}'], { encoding: 'utf8', timeout: 20000 }).stdout ?? '';
    if (phase === 'Cluster in healthy state' && ready === 'True') break;
    spawnSync('sleep', ['5']);
  }
  if (phase !== 'Cluster in healthy state' || ready !== 'True') {
    return { ok: false, stage: 'cluster-ready', phase, ready };
  }
  const sql = spawnSync('kubectl', ['--context', DEV_CNPG_CONTEXT, '-n', DEV_CNPG_NAMESPACE, 'exec', `${DEV_CNPG_CLUSTER}-1`, '--', 'psql', '-U', 'postgres', '-d', 'dev', '-tAc', 'SELECT 1'], { encoding: 'utf8', timeout: 30000 });
  return { ok: sql.status === 0 && sql.stdout.trim() === '1', stage: 'sql', phase, ready };
}

const command = process.argv[2] ?? 'plan';
const injected = process.env.OFFSCREEN_DEV_CNPG_PROBE;
if (command === 'ensure' && injected) {
  process.stderr.write('refusing live CNPG ensure: an injected probe cannot authorize mutation\n');
  process.exitCode = 2;
} else if (command === 'ensure' && process.env.OFFSCREEN_DEV_CNPG_ENSURE !== 'authorized') {
  process.stderr.write('refusing live CNPG ensure: set OFFSCREEN_DEV_CNPG_ENSURE=authorized after a passing preflight\n');
  process.exitCode = 2;
} else if (command !== 'plan' && command !== 'status' && command !== 'ensure') {
  process.stderr.write('usage: dev-cnpg-bootstrap-cli.mjs <plan|status|ensure>\n');
  process.exitCode = 2;
} else if (command === 'ensure') {
  const result = executeAuthorizedDevCnpg({
    collect: collectDevCnpgProbe,
    readOperatorManifest() {
      const pin = parseCnpgPin(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../cnpg/operator.pin'), 'utf8'));
      const file = join('/tmp', `offscreen-dev-cnpg-${pin.sha256}.yaml`);
      const response = spawnSync('curl', ['-fsSL', '--retry', '3', '--retry-delay', '2', '-o', file, pin.url], {
        encoding: 'utf8',
        timeout: 120000,
      });
      if (response.status !== 0) return { body: '', sha256: '' };
      const body = readFileSync(file);
      return { body: body.toString('utf8'), sha256: createHash('sha256').update(body).digest('hex') };
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
  process.stdout.write(`${JSON.stringify({ ...result, namespaceManifest: undefined, clusterManifest: undefined })}\n`);
  if (!result.ok) {
    process.exitCode = 1;
  } else if (result.mutated || result.actions.some((action) => action.op === 'noop')) {
    const ready = waitForDevPostgres();
    process.stdout.write(`${JSON.stringify(ready)}\n`);
    if (!ready.ok) process.exitCode = 1;
  }
} else {
  const probe = injected ? JSON.parse(injected) : collectDevCnpgProbe();
  const result = command === 'plan' ? planDevCnpg(probe) : statusDevCnpg(probe);
  const printable = { ...result, namespaceManifest: result.namespaceManifest ? 'rendered' : null, clusterManifest: result.clusterManifest ? 'rendered' : null };
  process.stdout.write(`${JSON.stringify(printable)}\n`);
  if ((result.refusals ?? []).length > 0 && command === 'plan') process.exitCode = 1;
}
