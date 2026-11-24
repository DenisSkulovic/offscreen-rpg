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

function writeWorkspace(root, relative, manifest) {
  const dir = path.join(root, relative);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
}