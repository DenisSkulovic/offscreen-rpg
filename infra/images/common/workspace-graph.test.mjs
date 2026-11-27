import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  selectWorkspaceImages,
  workspaceClosure,
  workspaceDirectoryForPath,
  workspaceGraph,
} from './workspace-graph.mjs';

test('runtime closure ignores devDependencies and build closure follows them', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'inf07-graph-'));
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

  assert.deepEqual(workspaceClosure(root, 'apps/demo', { mode: 'runtime' }), [
    'apps/demo',
    'packages/cycle',
    'packages/kept',
  ]);
  assert.deepEqual(workspaceClosure(root, 'apps/demo', { mode: 'build' }), [
    'apps/demo',
    'packages/cycle',
    'packages/dev-only',
    'packages/kept',
  ]);
  rmSync(root, { recursive: true, force: true });
});

test('duplicate workspace names and missing dependencies fail closed', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'inf07-graph-dup-'));
  writeWorkspace(root, 'apps/one', { name: '@offscreen/same' });
  writeWorkspace(root, 'packages/two', { name: '@offscreen/same' });
  assert.throws(
    () => workspaceClosure(root, 'apps/one', { mode: 'runtime' }),
    /duplicate workspace name/,
  );

  const root2 = mkdtempSync(path.join(tmpdir(), 'inf07-graph-miss-'));
  writeWorkspace(root2, 'apps/broken', {
    name: '@offscreen/broken',
    dependencies: { '@offscreen/missing': 'workspace:*' },
  });
  assert.throws(
    () => workspaceClosure(root2, 'apps/broken', { mode: 'build' }),
    /unknown workspace dependency/,
  );
  assert.throws(
    () => workspaceClosure(root2, 'apps/broken', { mode: 'runtime' }),
    /unknown workspace dependency/,
  );
  rmSync(root, { recursive: true, force: true });
  rmSync(root2, { recursive: true, force: true });
});

test('closure results are stably sorted', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'inf07-graph-sort-'));
  writeWorkspace(root, 'apps/root', {
    name: '@offscreen/root',
    dependencies: {
      '@offscreen/zed': 'workspace:*',
      '@offscreen/alpha': 'workspace:*',
    },
  });
  writeWorkspace(root, 'packages/alpha', { name: '@offscreen/alpha' });
  writeWorkspace(root, 'packages/zed', { name: '@offscreen/zed' });
  const closure = workspaceClosure(root, 'apps/root', { mode: 'runtime' });
  assert.deepEqual(closure, [...closure].sort((a, b) => a.localeCompare(b)));
  rmSync(root, { recursive: true, force: true });
});

test('selectWorkspaceImages uses workspace prefixes only', () => {
  const graph = workspaceGraph(path.resolve(import.meta.dirname, '../../..'), 'build');
  assert.deepEqual(
    selectWorkspaceImages(['packages/story-engine/src/index.ts'], graph),
    ['api', 'game-authority', 'worker'],
  );
  assert.deepEqual(selectWorkspaceImages(['docs/guide.md'], graph), []);
});

test('grouped leaves join the same closure and placeholders do not', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ac01-graph-'));
  writeWorkspace(root, 'apps/api', {
    name: '@offscreen/api',
    dependencies: { '@offscreen/grouped-runtime': 'workspace:*' },
  });
  writeWorkspace(root, 'apps/web', {
    name: '@offscreen/web',
    devDependencies: { '@offscreen/grouped-build': 'workspace:*' },
  });
  writeWorkspace(root, 'apps/game-authority', { name: '@offscreen/game-authority' });
  writeWorkspace(root, 'apps/worker', { name: '@offscreen/worker' });
  writeWorkspace(root, 'packages/ai/grouped-runtime', {
    name: '@offscreen/grouped-runtime',
  });
  writeWorkspace(root, 'packages/domain/grouped-build', {
    name: '@offscreen/grouped-build',
  });
  const placeholder = path.join(root, 'packages/ai/inference');
  mkdirSync(placeholder, { recursive: true });
  writeFileSync(path.join(placeholder, 'README.md'), '# placeholder\n');
  mkdirSync(path.join(root, 'packages/ai/grouped-runtime/nested/extra'), {
    recursive: true,
  });

  assert.deepEqual(workspaceClosure(root, 'apps/api', { mode: 'runtime' }), [
    'apps/api',
    'packages/ai/grouped-runtime',
  ]);
  assert.deepEqual(workspaceClosure(root, 'apps/web', { mode: 'runtime' }), [
    'apps/web',
  ]);
  assert.deepEqual(workspaceClosure(root, 'apps/web', { mode: 'build' }), [
    'apps/web',
    'packages/domain/grouped-build',
  ]);
  assert.equal(
    workspaceDirectoryForPath(
      root,
      'packages/ai/grouped-runtime/src/index.ts',
    ),
    'packages/ai/grouped-runtime',
  );
  assert.equal(
    workspaceDirectoryForPath(root, 'packages/ai/inference/README.md'),
    null,
  );
  rmSync(root, { recursive: true, force: true });
});

test('family manifests and duplicate flat or grouped names fail closed', () => {
  const family = mkdtempSync(path.join(tmpdir(), 'ac01-family-'));
  writeWorkspace(family, 'packages/domain', { name: '@offscreen/family' });
  writeWorkspace(family, 'apps/api', { name: '@offscreen/api' });
  assert.throws(
    () => workspaceClosure(family, 'apps/api', { mode: 'runtime' }),
    /workspace manifest on family directory/,
  );

  const dup = mkdtempSync(path.join(tmpdir(), 'ac01-dup-'));
  writeWorkspace(dup, 'packages/shared', { name: '@offscreen/shared' });
  writeWorkspace(dup, 'packages/foundation/shared', {
    name: '@offscreen/shared',
  });
  writeWorkspace(dup, 'apps/api', { name: '@offscreen/api' });
  assert.throws(
    () => workspaceClosure(dup, 'apps/api', { mode: 'runtime' }),
    /duplicate workspace name/,
  );
  rmSync(family, { recursive: true, force: true });
  rmSync(dup, { recursive: true, force: true });
});

function writeWorkspace(root, relative, manifest) {
  const dir = path.join(root, relative);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
}