#!/usr/bin/env node
import { collectDevClusterProbe } from './dev-cluster-host-probe.mjs';
import {
  planDevCluster,
  readInjectedDevClusterProbe,
  statusDevCluster,
} from './dev-cluster-bootstrap.mjs';

const command = process.argv[2] ?? 'plan';
if (command === 'ensure') {
  process.stderr.write('refusing live ensure: T03a does not authorize cluster creation\n');
  process.exitCode = 2;
} else if (command !== 'plan' && command !== 'status') {
  process.stderr.write('usage: dev-cluster-bootstrap-cli.mjs <plan|status>\n');
  process.exitCode = 2;
} else {
  const probe = readInjectedDevClusterProbe(process.env) ?? collectDevClusterProbe();
  const result = command === 'plan' ? planDevCluster(probe) : statusDevCluster(probe);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
