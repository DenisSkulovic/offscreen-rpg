#!/usr/bin/env node
import { planDevTemporal, statusDevTemporal } from './dev-temporal-bootstrap.mjs';
import { collectDevTemporalProbe } from './dev-temporal-host-probe.mjs';

const command = process.argv[2] ?? 'plan';
const injected = process.env.OFFSCREEN_DEV_TEMPORAL_PROBE;
const injectedForTest = process.env.OFFSCREEN_DEV_TEMPORAL_PROBE_MODE === 'test';

if (command === 'ensure') {
  process.stderr.write('refusing live Temporal ensure: an injected probe cannot authorize mutation and this slice does not install Temporal\n');
  process.exitCode = 2;
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
