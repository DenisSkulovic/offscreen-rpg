import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fail, providerFreeEnvironment, root, run } from './process.mjs';

function runPnpm(args, env) {
  const result = spawnSync('pnpm', args, {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pnpm exited with ${result.status}`);
  }
}

const suite = path.join(
  'tools',
  'api-integration',
  'test',
  'longform-acceptance.integration.mjs',
);

try {
  const env = providerFreeEnvironment();
  if (env.OPENROUTER_API_KEY) {
    throw new Error('provider key still present; refusing to run');
  }
  runPnpm(
    ['turbo', 'run', 'build', '--filter=@offscreen/game-authority'],
    env,
  );
  console.log(
    'longform-acceptance: disposable database per test; shared offscreen_auth_test is not reset.',
  );
  run(process.execPath, ['--test', '--test-concurrency=1', suite], {
    cwd: root,
    env,
  });
} catch (error) {
  fail(error);
}
