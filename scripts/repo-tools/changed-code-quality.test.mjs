import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { selectChangedTypeScript } from './changed-code-quality.mjs';

test('includes committed, staged, unstaged and untracked TypeScript only once', () => {
  const present = new Set(['src/new.ts', 'src/committed.ts', 'src/file.tsx']);
  const files = selectChangedTypeScript('reference', {
    committed: 'src/committed.ts\0src/deleted.ts\0',
    staged: 'src/new.ts\0src/committed.ts\0',
    unstaged: 'src/file.tsx\0docs/README.md\0',
    untracked: 'src/new.ts\0',
  }, name => present.has(path.relative(process.cwd(), name)) || present.has(name.split('/').slice(-2).join('/')));
  assert.deepEqual(files, ['src/committed.ts', 'src/file.tsx', 'src/new.ts']);
});
test('rejects traversal and non-TS without claiming a passed check', () => {
  const files = selectChangedTypeScript('reference', {
    committed: '../outside.ts\0src/a.js\0',
    staged: '/tmp/escape.ts\0',
    unstaged: '',
    untracked: '',
  }, () => true);
  assert.deepEqual(files, []);
});
