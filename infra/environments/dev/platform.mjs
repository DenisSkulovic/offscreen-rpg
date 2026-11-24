#!/usr/bin/env node
import process from 'node:process';
import {
  buildPlatformPlan,
  defaultPlatformRunner,
  redactPlatformReceipt,
  runPlatformPlan,
} from '../platform-plan.mjs';

function usage() {
  process.stderr.write(
    'usage: node infra/environments/dev/platform.mjs <plan|ensure> [context-confirmation]\n',
  );
}

const command = process.argv[2] ?? 'plan';
const confirmation = process.argv[3];

if (command !== 'plan' && command !== 'ensure') {
  usage();
  process.exit(2);
}

const plan = buildPlatformPlan({
  profileId: 'dev',
  command: /** @type {'plan' | 'ensure'} */ (command),
  confirmation,
});

const receipt = runPlatformPlan(plan, (argv, options) =>
  defaultPlatformRunner(argv, options),
);

process.stdout.write(`${JSON.stringify(redactPlatformReceipt(receipt))}\n`);
process.exitCode = receipt.ok ? 0 : 1;