#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCnpgPin, planDevCnpg, statusDevCnpg } from './dev-cnpg-bootstrap.mjs';

const command = process.argv[2] ?? 'plan';
if (command === 'ensure') {
  process.stderr.write('refusing live CNPG ensure: T03b-1a does not authorize installation\n');
  process.exitCode = 2;
} else if (command !== 'plan' && command !== 'status') {
  process.stderr.write('usage: dev-cnpg-bootstrap-cli.mjs <plan|status>\n');
  process.exitCode = 2;
} else {
  const injected = process.env.OFFSCREEN_DEV_CNPG_PROBE;
  const probe = injected
    ? JSON.parse(injected)
    : {
        context: 'kind-offscreen-dev',
        clusterName: 'offscreen-dev',
        apiServer: 'https://127.0.0.1:24443',
        baselineOwner: null,
        memoryMiB: 0,
        dockerAvailable: false,
        kindAvailable: false,
        pin: null,
        resources: [],
      };
  if (!injected) {
    const pinPath = join(dirname(fileURLToPath(import.meta.url)), '../../cnpg/operator.pin');
    probe.pin = parseCnpgPin(readFileSync(pinPath, 'utf8'));
    probe.note = 'host inventory is not collected by this code-only CLI';
  }
  const result = command === 'plan' ? planDevCnpg(probe) : statusDevCnpg(probe);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
