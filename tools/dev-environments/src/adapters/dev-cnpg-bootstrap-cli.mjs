#!/usr/bin/env node
import { collectDevCnpgProbe } from '../../../../infra/platform/postgres/dev-host-probe.mjs';
import { planDevCnpg, statusDevCnpg } from '../../../../infra/platform/postgres/dev-bootstrap.mjs';
import { ensureBaseline } from '../../../../infra/platform/postgres/bootstrap/ensure.mjs';

const command = process.argv[2] ?? 'plan';
const injected = process.env.OFFSCREEN_DEV_CNPG_PROBE;
if (process.argv.length > 3 || !['plan', 'status', 'ensure'].includes(command)) {
  process.stderr.write('usage: dev-cnpg-bootstrap-cli.mjs <plan|status|ensure>\n');
  process.exitCode = 2;
} else if (command === 'ensure' && (injected || process.env.OFFSCREEN_DEV_CNPG_ENSURE !== 'authorized')) {
  process.stderr.write('refusing live CNPG ensure: explicit authorization required; injected probes forbidden\n');
  process.exitCode = 2;
} else if (command === 'ensure') {
  const result = ensureBaseline('dev', {
    authorized: true,
    maintenance: process.env.OFFSCREEN_POSTGRES_MAINTENANCE === 'authorized',
  });
  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.ok) process.stdout.write(JSON.stringify(result.readiness) + '\n');
  else process.exitCode = 1;
} else {
  try {
    const probe = injected ? JSON.parse(injected) : collectDevCnpgProbe();
    const result = command === 'plan' ? planDevCnpg(probe) : statusDevCnpg(probe);
    process.stdout.write(JSON.stringify({
      ...result,
      namespaceManifest: result.namespaceManifest ? 'rendered' : null,
      clusterManifest: result.clusterManifest ? 'rendered' : null,
    }) + '\n');
    if (command === 'plan' && result.refusals?.length) process.exitCode = 1;
  } catch {
    process.stderr.write('CNPG observation unavailable\n');
    process.exitCode = 2;
  }
}
