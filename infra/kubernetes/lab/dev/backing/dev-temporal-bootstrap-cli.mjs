#!/usr/bin/env node
import { planDevTemporal, statusDevTemporal } from './dev-temporal-bootstrap.mjs';

const command = process.argv[2] ?? 'plan';
const injected = process.env.OFFSCREEN_DEV_TEMPORAL_PROBE;
if (command === 'ensure') {
  process.stderr.write('refusing live Temporal ensure: an injected probe cannot authorize mutation and this slice does not install Temporal\n');
  process.exitCode = 2;
} else if (command !== 'plan' && command !== 'status') {
  process.stderr.write('usage: dev-temporal-bootstrap-cli.mjs <plan|status>\n');
  process.exitCode = 2;
} else if (!injected) {
  process.stderr.write('refusing host plan: this slice accepts only an injected probe\n');
  process.exitCode = 2;
} else {
  const probe = JSON.parse(injected);
  const result = command === 'plan' ? planDevTemporal(probe) : statusDevTemporal(probe);
  process.stdout.write(`${JSON.stringify({ ...result, manifest: result.manifest ? 'rendered' : undefined })}\n`);
}
