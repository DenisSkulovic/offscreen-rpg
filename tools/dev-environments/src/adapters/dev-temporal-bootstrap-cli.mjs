#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { executeAuthorizedDevTemporal, planDevTemporal, statusDevTemporal } from '../../../../infra/platform/temporal/dev-bootstrap.mjs';
import { collectDevTemporalProbe } from '../../../../infra/platform/temporal/dev-host-probe.mjs';

function run(commandName, args, options = {}) {
  const child = spawnSync(commandName, args, {
    encoding: 'utf8',
    input: options.input,
    timeout: options.timeoutMs ?? 180000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    ok: !child.error && child.status === 0,
    stdout: child.stdout ?? '',
    stderr: `${child.stderr ?? ''}${child.error ? child.error.message : ''}`,
  };
}

const command = process.argv[2] ?? 'plan';
const injected = process.env.OFFSCREEN_DEV_TEMPORAL_PROBE;
const injectedForTest = process.env.OFFSCREEN_DEV_TEMPORAL_PROBE_MODE === 'test';

if (command === 'ensure' && injected) {
  process.stderr.write('refusing live Temporal ensure: an injected probe cannot authorize mutation\n');
  process.exitCode = 2;
} else if (command === 'ensure' && process.env.OFFSCREEN_DEV_TEMPORAL_ENSURE !== 'authorized') {
  process.stderr.write('refusing live Temporal ensure: set OFFSCREEN_DEV_TEMPORAL_ENSURE=authorized after a passing preflight\n');
  process.exitCode = 2;
} else if (command === 'ensure') {
  const result = executeAuthorizedDevTemporal({
    collect: collectDevTemporalProbe,
    generatePassword: () => randomBytes(24).toString('hex'),
    readinessTimeoutMs: 360000,
    run,
    sleep(ms) {
      spawnSync('sleep', [String(Math.ceil(ms / 1000))]);
    },
  });
  process.stdout.write(`${JSON.stringify({ ...result, manifest: undefined })}\n`);
  process.exitCode = result.ok ? 0 : 1;
} else if (command !== 'plan' && command !== 'status') {
  process.stderr.write('usage: dev-temporal-bootstrap-cli.mjs <plan|status>\n');
  process.exitCode = 2;
} else if (injected && !injectedForTest) {
  process.stderr.write('refusing injected Temporal probe outside tests\n');
  process.exitCode = 2;
} else {
  const probe = injectedForTest ? JSON.parse(injected) : collectDevTemporalProbe();
  const result = command === 'plan' ? planDevTemporal(probe) : statusDevTemporal(probe);
  const receipt = { ...result, manifest: result.manifest ? 'rendered' : undefined };
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
  if (result.refusals.length > 0) process.exitCode = 2;
}
