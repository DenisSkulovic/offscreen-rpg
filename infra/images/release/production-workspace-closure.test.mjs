import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  existsSync,
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

const repoRoot = path.resolve(import.meta.dirname, '../../..');

test('API production closure keeps Game Authority and drops Lab packages', () => {
  const closure = productionWorkspaceClosure(repoRoot, 'apps/api');
  assert.ok(closure.includes('apps/api'));
  assert.ok(closure.includes('apps/game-authority'));
  assert.ok(closure.includes('packages/story-engine'));
  assert.ok(closure.includes('packages/identity-persistence'));
  assert.ok(closure.includes('packages/story-persistence'));
  assert.equal(closure.includes('packages/lab-support'), false);
  assert.equal(closure.includes('packages/lab-interface'), false);
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
  assert.equal(gameAuthority.includes('packages/lab-interface'), false);

  const worker = productionWorkspaceClosure(repoRoot, 'apps/worker');
  assert.ok(worker.includes('packages/lab-support'));
  assert.ok(worker.includes('packages/workflows'));
  assert.ok(worker.includes('packages/outbox'));
  assert.ok(worker.includes('packages/identity-persistence'));
  assert.ok(worker.includes('packages/story-persistence'));
  assert.equal(worker.includes('apps/game-authority'), false);

  const web = productionWorkspaceClosure(repoRoot, 'apps/web');
  assert.deepEqual(web, [
    'apps/web',
    'packages/admin-interface',
    'packages/cache',
    'packages/cache-port',
    'packages/documents',
    'packages/game',
    'packages/identity-interface',
    'packages/lab-interface',
    'packages/object-storage',
    'packages/story-interface',
  ]);
  for (const forbidden of [
    'packages/story-engine',
    'packages/db',
    'packages/admin',
    'packages/lab-support',
    'packages/game-authority-protocol',
  ]) {
    assert.equal(web.includes(forbidden), false, forbidden);
  }
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

test('prepared API runtime tree resolves @offscreen/db and omits Lab', {
  skip: !existsSync(path.join(repoRoot, 'apps/api/dist')),
}, () => {
  const output = mkdtempSync(path.join(tmpdir(), 'ma12-runtime-'));
  try {
    const prepared = spawnSync(
      'bash',
      [
        path.join(
          repoRoot,
          'infra/images/release/prepare-runtime-tree.sh',
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

test('release image builds copy the closure helpers into the builder', () => {
  const releaseDir = path.join(repoRoot, 'infra/images/release');
  const servicesDockerfile = readFileSync(
    path.join(releaseDir, 'Dockerfile.services'),
    'utf8',
  );
  assert.match(servicesDockerfile, /production-workspace-closure\.mjs/);
  assert.match(servicesDockerfile, /infra\/images\/common\/workspace-graph\.mjs/);
  assert.doesNotMatch(
    readFileSync(path.join(releaseDir, 'Dockerfile.web'), 'utf8'),
    /workspace-graph\.mjs/,
  );
  for (const script of ['build.sh', 'build-worker.sh']) {
    assert.match(
      readFileSync(path.join(releaseDir, script), 'utf8'),
      /production-workspace-closure\.mjs/,
    );
  }
  const libBuild = readFileSync(path.join(releaseDir, 'lib-build.sh'), 'utf8');
  assert.match(libBuild, /COMMON_DIR\/workspace-graph\.mjs/);
});

function writeWorkspace(root, relative, manifest) {
  const dir = path.join(root, relative);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
}
