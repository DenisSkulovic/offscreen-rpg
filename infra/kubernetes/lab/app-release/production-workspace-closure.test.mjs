import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
  assert.ok(web.includes('packages/story-interface'));
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

test('prepared API runtime tree resolves @offscreen/db and omits Lab', () => {
  const output = mkdtempSync(path.join(tmpdir(), 'ma12-runtime-'));
  try {
    const prepared = spawnSync(
      'bash',
      [
        path.join(
          repoRoot,
          'infra/kubernetes/lab/app-release/prepare-runtime-tree.sh',
        ),
        'apps/api',
        output,
      ],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    assert.equal(prepared.status, 0, prepared.stderr || prepared.stdout);
    assert.equal(
      spawnSync('test', ['-d', path.join(output, 'packages/lab-support')])
        .status,
      1,
    );
    assert.equal(
      spawnSync('test', ['-d', path.join(output, 'tools/api-lab')]).status,
      1,
    );
    const resolved = createRequire(
      path.join(output, 'apps/api/package.json'),
    ).resolve('@offscreen/db');
    assert.equal(resolved.startsWith(`${output}${path.sep}`), true);

    rmSync(path.join(output, 'packages/db'), { recursive: true, force: true });
    assert.throws(() =>
      createRequire(path.join(output, 'apps/api/package.json')).resolve(
        '@offscreen/db',
      ),
    );
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('release image builds copy the closure tool into the builder', () => {
  const releaseDir = path.join(repoRoot, 'infra/kubernetes/lab/app-release');
  for (const dockerfile of [
    'Dockerfile.api',
    'Dockerfile.game-authority',
    'Dockerfile.worker',
  ]) {
    assert.match(
      readFileSync(path.join(releaseDir, dockerfile), 'utf8'),
      /production-workspace-closure\.mjs/,
    );
  }
  for (const script of ['build.sh', 'build-worker.sh']) {
    assert.match(
      readFileSync(path.join(releaseDir, script), 'utf8'),
      /production-workspace-closure\.mjs/,
    );
  }
});

function writeWorkspace(root, relative, manifest) {
  const dir = path.join(root, relative);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
}
