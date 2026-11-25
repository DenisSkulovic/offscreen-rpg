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
    'usage: node infra/environments/release/platform.mjs <plan|ensure> [context-confirmation]\n',
  );
}

const command = process.argv[2] ?? 'plan';
const confirmation = process.argv[3];

if (command !== 'plan' && command !== 'ensure') {
  usage();
  process.exit(2);
}

const plan = buildPlatformPlan({
  profileId: 'release',
  command: /** @type {'plan' | 'ensure'} */ (command),
  confirmation,
});

let done = 0;
const progress = text => {
  if (process.env.OFFSCREEN_STACK_PROGRESS === '1') process.stderr.write('@offscreen-stack ' + JSON.stringify({ type: 'substep', id: 'platform', done, total: plan.phases.length, text }) + '\n');
};
const receipt = runPlatformPlan(plan, (argv, options) =>
  {
    progress('Platform: ' + options.phaseId);
    const result = defaultPlatformRunner(argv, options);
    if (result.ok) { done++; progress('Platform: ' + options.phaseId + ' ready'); }
    return result;
  },
);

process.stdout.write(`${JSON.stringify(redactPlatformReceipt(receipt))}\n`);
process.exitCode = receipt.ok ? 0 : 1;