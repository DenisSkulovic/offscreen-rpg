import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { productionWorkspaceClosure } from './production-workspace-closure.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../../../..');

test('API production closure keeps Game Authority and drops Lab packages', () => {
  const closure = productionWorkspaceClosure(repoRoot, 'apps/api');
  assert.ok(closure.includes('apps/api'));
  assert.ok(closure.includes('apps/game-authority'));
  assert.ok(closure.includes('packages/story-engine'));
  assert.equal(closure.includes('packages/lab-support'), false);
  assert.equal(closure.includes('tools/api-lab'), false);
  assert.equal(closure.includes('packages/config'), false);
});

test('Game Authority, Worker and Web closures keep their runtime workspace dependencies', () => {
  const gameAuthority = productionWorkspaceClosure(
    repoRoot,
    'apps/game-authority',
  );
  assert.ok(gameAuthority.includes('packages/story-engine'));
  assert.ok(gameAuthority.includes('packages/documents'));
  assert.equal(gameAuthority.includes('packages/lab-support'), false);

  const worker = productionWorkspaceClosure(repoRoot, 'apps/worker');
  assert.ok(worker.includes('packages/lab-support'));
  assert.ok(worker.includes('packages/workflows'));
  assert.equal(worker.includes('apps/game-authority'), false);

  const web = productionWorkspaceClosure(repoRoot, 'apps/web');
  assert.ok(web.includes('packages/contracts'));
  assert.ok(web.includes('packages/game'));
  assert.equal(web.includes('packages/lab-support'), false);
});

test('devDependencies and unknown workspace specs are rejected', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ma12-closure-'));
  writeWorkspace(root, 'apps/demo', {
    name: '@offscreen/demo',
    dependencies: { '@offscreen/kept': 'workspace:*' },
    devDependencies: { '@offscreen/dev-only': 'workspace:*' },
  });
  writeWorkspace(root, 'packages/kept', {
    name: '@offscreen/kept',
    dependencies: { '@offscreen/cycle': 'workspace:*' },
  });
  writeWorkspace(root, 'packages/cycle', {
    name: '@offscreen/cycle',
    dependencies: { '@offscreen/kept': 'workspace:*' },
  });
  writeWorkspace(root, 'packages/dev-only', { name: '@offscreen/dev-only' });

  assert.deepEqual(productionWorkspaceClosure(root, 'apps/demo'), [
    'apps/demo',
    'packages/cycle',
    'packages/kept',
  ]);

  writeWorkspace(root, 'apps/broken', {
    name: '@offscreen/broken',
    dependencies: { '@offscreen/missing': 'workspace:*' },
  });
  assert.throws(
    () => productionWorkspaceClosure(root, 'apps/broken'),
    /unknown workspace dependency @offscreen\/missing/,
  );
  assert.throws(
    () => productionWorkspaceClosure(root, 'apps/not-a-workspace'),
    /unknown workspace path/,
  );
});

function writeWorkspace(root, relative, manifest) {
  const dir = path.join(root, relative);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
}
