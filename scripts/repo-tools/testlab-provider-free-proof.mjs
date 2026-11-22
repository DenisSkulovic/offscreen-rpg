#!/usr/bin/env node
/**
 * Narrow proof runner for TESTLAB01 T05 provider-free launch integration.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const integrationTestRel =
  'tools/api-integration/dist/test/testlab-provider-free-launch.integration.js';
const integrationTestPath = join(repoRoot, integrationTestRel);

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

function receipt(payload) {
  console.log(JSON.stringify(payload));
}

const builds = [['pnpm', ['--filter', '@offscreen/api-integration', 'build']]];

for (const [cmd, args] of builds) {
  const build = run(cmd, args);
  if (build.status !== 0) {
    receipt({
      task: 'TESTLAB01-T05',
      outcome: 'FAIL',
      phase: 'build',
      command: [cmd, ...args].join(' '),
      exitCode: build.status ?? 1,
    });
    process.exitCode = build.status ?? 1;
    process.exit();
  }
}

if (!existsSync(integrationTestPath)) {
  receipt({
    task: 'TESTLAB01-T05',
    outcome: 'FAIL',
    phase: 'precheck',
    message: `Missing compiled test at ${integrationTestRel}`,
  });
  process.exitCode = 1;
  process.exit();
}

const testRun = run('node', ['--test', integrationTestRel]);
const stdoutMarker = testRun.status === 0 ? 'PASS' : 'FAIL';

receipt({
  task: 'TESTLAB01-T05',
  outcome: stdoutMarker,
  proof: {
    builds: builds.map(([cmd, args]) => [cmd, ...args].join(' ')),
    test: `node --test ${integrationTestRel}`,
    exitCode: testRun.status ?? 1,
  },
});

process.exitCode = testRun.status ?? 1;
