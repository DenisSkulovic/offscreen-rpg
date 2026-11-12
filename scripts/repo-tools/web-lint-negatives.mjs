import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const fixtures = [
  'apps/web/src/test/lint-fixtures/forbidden-server-import.ts',
  'apps/web/src/test/lint-fixtures/unstable-query-key.tsx',
];

const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  [
    'exec',
    'eslint',
    '--config',
    'eslint.web-negatives.config.mjs',
    '--max-warnings',
    '0',
    ...fixtures,
  ],
  {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  },
);

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
const expects = [
  {
    file: 'forbidden-server-import.ts',
    needle: 'no-restricted-imports',
  },
  {
    file: 'unstable-query-key.tsx',
    needle: 'no-rest-destructuring',
  },
];

let failed = false;
if (result.status === 0) {
  console.error('Expected lint fixtures to fail, but eslint exited 0.');
  failed = true;
}

for (const expect of expects) {
  if (!output.includes(expect.file) || !output.includes(expect.needle)) {
    console.error(
      `Missing expected diagnostic for ${expect.file} (${expect.needle}).`,
    );
    failed = true;
  }
}

if (failed) {
  console.error(output);
  process.exit(1);
}

console.log('Web lint negatives rejected as expected.');
process.exit(0);
