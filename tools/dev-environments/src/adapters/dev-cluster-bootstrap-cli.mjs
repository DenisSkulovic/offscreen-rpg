#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { collectDevClusterProbe } from '../../../../infra/clusters/kind/manager/dev-host-probe.mjs';
import {
  executeAuthorizedDevCluster,
  planDevCluster,
  readInjectedDevClusterProbe,
  statusDevCluster,
} from '../../../../infra/clusters/kind/manager/dev-bootstrap.mjs';

const command = process.argv[2] ?? 'plan';
const ensureAuthorized = process.env.OFFSCREEN_DEV_CLUSTER_ENSURE === 'authorized';
if (command === 'ensure' && !ensureAuthorized) {
  process.stderr.write('refusing live ensure: set OFFSCREEN_DEV_CLUSTER_ENSURE=authorized after a passing preflight\n');
  process.exitCode = 2;
} else if (command === 'ensure') {
  const injected = readInjectedDevClusterProbe(process.env);
  if (injected) {
    process.stderr.write('refusing live ensure: an injected probe cannot authorize mutation\n');
    process.exitCode = 2;
  } else {
    const result = executeAuthorizedDevCluster({
      collect: collectDevClusterProbe,
      run(commandName, args, options = {}) {
        const child = spawnSync(commandName, args, {
          encoding: 'utf8',
          input: options.input,
          timeout: options.timeoutMs ?? 30000,
        });
        return {
          ok: !child.error && child.status === 0,
          stdout: child.stdout ?? '',
          stderr: `${child.stderr ?? ''}${child.error ? child.error.message : ''}`,
        };
      },
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.ok) process.exitCode = 1;
  }
} else if (command !== 'plan' && command !== 'status') {
  process.stderr.write('usage: dev-cluster-bootstrap-cli.mjs <plan|status>\n');
  process.exitCode = 2;
} else {
  const probe = readInjectedDevClusterProbe(process.env) ?? collectDevClusterProbe();
  const result = command === 'plan' ? planDevCluster(probe) : statusDevCluster(probe);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}