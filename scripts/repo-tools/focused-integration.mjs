import path from 'node:path';
import {
  fail,
  providerFreeEnvironment,
  root,
  run,
  runPnpm,
} from './process.mjs';
import { resetTestDatabase, testDatabaseUrl } from './reset-test-db.mjs';

const suites = {
  auth: 'auth.integration.js',
  stories: 'stories.integration.js',
  'stories-core': 'stories-core.integration.js',
  'stories-http': 'stories-http.integration.js',
  'stories-browser': 'stories-browser.integration.js',
  'story-start': 'story-start.integration.js',
  'story-resolution': 'story-resolution.integration.js',
  storyteller: 'storyteller.integration.js',
};

function usage() {
  console.log('Usage: pnpm test:focus <suite> [test name pattern]');
  console.log(`Suites: ${Object.keys(suites).join(', ')}`);
  console.log(
    'This rebuilds the integration workspace and recreates only offscreen_auth_test.',
  );
}

try {
  const args = process.argv.slice(2);
  if (args[0] === '--') args.shift();
  const [suite, pattern, ...extra] = args;
  if (!suite || suite === '--help') {
    usage();
    process.exit(0);
  }
  if (!Object.hasOwn(suites, suite) || extra.length > 0) {
    usage();
    throw new Error(
      'Unknown suite or too many arguments. Quote a multi-word pattern.',
    );
  }
  runPnpm(['turbo', 'run', 'build', '--filter=@offscreen/api-integration'], {
    env: providerFreeEnvironment(),
  });
  resetTestDatabase({ build: false });
  const testArgs = ['--test', '--test-concurrency=1'];
  if (pattern) testArgs.push(`--test-name-pattern=${pattern}`);
  testArgs.push(
    path.join('tools', 'api-integration', 'dist', 'test', suites[suite]),
  );
  run(process.execPath, testArgs, {
    cwd: root,
    env: providerFreeEnvironment({ DATABASE_TEST_URL: testDatabaseUrl }),
  });
} catch (error) {
  fail(error);
}
