import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  forbiddenHostDomainSpecifiers,
  main,
  scanHostDomainImports,
} from './host-domain-imports.mjs';

test('a real old domain import fails and its removal passes', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'host-domain-'));
  const file = path.join(root, 'apps/api/src/app.ts');
  mkdirSync(path.dirname(file), { recursive: true });
  mkdirSync(path.join(root, 'apps/game-authority/src'), { recursive: true });
  mkdirSync(path.join(root, 'apps/worker/src'), { recursive: true });
  try {
    writeFileSync(
      file,
      "import { createStories } from '@offscreen/application/stories';\n",
    );
    assert.deepEqual(scanHostDomainImports(root), [
      {
        file: 'apps/api/src/app.ts',
        specifiers: ['@offscreen/application/stories'],
      },
    ]);
    assert.equal(main([root]), 1);
    writeFileSync(
      file,
      "import { createStories } from '@offscreen/story-engine/stories';\n",
    );
    assert.deepEqual(scanHostDomainImports(root), []);
    assert.equal(main([root]), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('comments and retained application facilities do not fail', () => {
  const source = `
    // import { StoryError } from '@offscreen/application/stories';
    /* require('@offscreen/application/storyteller') */
    import { createOutbox } from '@offscreen/application/outbox';
    export { draft } from '@offscreen/application/drafts';
  `;
  assert.deepEqual(forbiddenHostDomainSpecifiers(source), []);
});

test('require and dynamic import of the old prefixes fail', () => {
  assert.deepEqual(
    forbiddenHostDomainSpecifiers(
      "const loaded = require('@offscreen/application/generations');\nawait import('@offscreen/application/stories/persistence');\n",
    ).sort(),
    [
      '@offscreen/application/generations',
      '@offscreen/application/stories/persistence',
    ],
  );
});
