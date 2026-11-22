#!/usr/bin/env node
import { planDevObjectStore, statusDevObjectStore } from './dev-object-store-bootstrap.mjs';

const command = process.argv[2] ?? 'plan';
if (command === 'ensure') {
  process.stderr.write('refusing live object-store ensure: T03b-1b does not authorize installation\n');
  process.exitCode = 2;
} else if (command !== 'plan' && command !== 'status') {
  process.stderr.write('usage: dev-object-store-bootstrap-cli.mjs <plan|status>\n');
  process.exitCode = 2;
} else {
  const injected = process.env.OFFSCREEN_DEV_S3_PROBE;
  if (!injected) {
    process.stderr.write('refusing host plan: this slice accepts only an injected probe\n');
    process.exitCode = 2;
  } else {
    const probe = JSON.parse(injected);
    const result = command === 'plan' ? planDevObjectStore(probe) : statusDevObjectStore(probe);
    const printable = { ...result, manifest: result.manifest ? 'rendered' : undefined };
    process.stdout.write(`${JSON.stringify(printable)}\n`);
  }
}
