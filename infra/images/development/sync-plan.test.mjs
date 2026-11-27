import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  isUnsafeDevSyncPath,
  rebuildPathsForImage,
  resolveDevSync,
  syncSubpathsForImage,
  tiltDevSyncConfig,
} from './sync-plan.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const migrationSample = existsSync(
  join(repoRoot, 'packages/db/migrations/meta/_journal.json'),
)
  ? 'packages/db/migrations/meta/_journal.json'
  : 'packages/db/migrations/0000_init.sql';

test('packages/story-engine source triggers rebuild not live sync', () => {
  const result = resolveDevSync('packages/story-engine/src/index.ts', repoRoot);
  assert.equal(result.mode, 'rebuild');
  assert.deepEqual(result.images, ['api', 'game-authority', 'worker']);
  assert.equal(result.workloads.includes('game-web'), false);
  assert.equal(isUnsafeDevSyncPath('packages/story-engine/src/index.ts'), true);
});

test('apps/api source syncs api workload only', () => {
  const result = resolveDevSync('apps/api/src/main.ts', repoRoot);
  assert.equal(result.mode, 'sync');
  assert.deepEqual(result.images, ['api']);
  assert.deepEqual(result.workloads, ['game-api']);
  assert.equal(isUnsafeDevSyncPath('apps/api/src/main.ts'), false);
});

test('docs-only change selects no workload', () => {
  const result = resolveDevSync('docs/runbooks/local-development.md', repoRoot);
  assert.equal(result.mode, 'none');
  assert.deepEqual(result.workloads, []);
  assert.equal(
    isUnsafeDevSyncPath('docs/runbooks/local-development.md'),
    false,
  );
});

test('release-only path selects no workload rebuild', () => {
  const releaseScript = 'infra/images/release/build-release-images.sh';
  const result = resolveDevSync(releaseScript, repoRoot);
  assert.equal(result.mode, 'none');
  assert.deepEqual(result.images, []);
  assert.equal(isUnsafeDevSyncPath(releaseScript), false);
});

test('pnpm-lock.yaml rebuilds all runtime images', () => {
  const result = resolveDevSync('pnpm-lock.yaml', repoRoot);
  assert.equal(result.mode, 'rebuild');
  assert.deepEqual(result.images, ['web', 'api', 'game-authority', 'worker']);
  assert.equal(isUnsafeDevSyncPath('pnpm-lock.yaml'), true);
});

test('workspace package.json triggers rebuild for dependents', () => {
  const result = resolveDevSync('packages/story-engine/package.json', repoRoot);
  assert.equal(result.mode, 'rebuild');
  assert.equal(isUnsafeDevSyncPath('packages/story-engine/package.json'), true);
});

test('db migration path is rebuild-only input not live sync', () => {
  assert.equal(isUnsafeDevSyncPath(migrationSample), true);
  assert.equal(resolveDevSync(migrationSample, repoRoot).mode, 'rebuild');
});

test('db-migrations generator config is rebuild-only', () => {
  const generatorConfig = 'tools/db-migrations/drizzle.config.ts';
  assert.equal(isUnsafeDevSyncPath(generatorConfig), true);
  assert.equal(resolveDevSync(generatorConfig, repoRoot).mode, 'rebuild');
});

const ALL_RUNTIME_IMAGES = ['web', 'api', 'game-authority', 'worker'];

test('dev Dockerfile is build-critical rebuild', () => {
  assert.equal(
    isUnsafeDevSyncPath('infra/images/development/Dockerfile'),
    true,
  );
  const result = resolveDevSync(
    'infra/images/development/Dockerfile',
    repoRoot,
  );
  assert.equal(result.mode, 'rebuild');
  assert.deepEqual(result.images, ALL_RUNTIME_IMAGES);
});

test('dev runtime helper rebuilds all runtime images', () => {
  const result = resolveDevSync(
    'tools/dev-environments/runtime/generation.mjs',
    repoRoot,
  );
  assert.equal(result.mode, 'rebuild');
  assert.deepEqual(result.images, ALL_RUNTIME_IMAGES);
});

test('host-only image planning edits do not trigger workload builds', () => {
  for (const file of ["infra/images/common/workspace-graph.mjs","infra/images/development/build.sh","infra/images/development/load-dev-slot-image.sh","infra/images/development/packaging.mjs","infra/images/distribution/kind-image-loader.mjs","infra/images/development/image-plan.mjs"]) {
    assert.equal(resolveDevSync(file, repoRoot).mode, 'none', file);
  }
});

test('sync-plan does not import release image selector', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'sync-plan.mjs'),
    'utf8',
  );
  assert.doesNotMatch(source, /select-affected-images/);
  assert.doesNotMatch(source, /build-release-images/);
});

test('api image sync subpaths mount only the app directory', () => {
  const dirs = syncSubpathsForImage('api', repoRoot);
  assert.deepEqual(dirs, ['/apps/api']);
  assert.equal(dirs.includes('/packages/story-engine'), false);
});

test('tiltDevSyncConfig exposes sync and rebuild maps without warm release', () => {
  const config = tiltDevSyncConfig(repoRoot);
  assert.ok(config.sync_dirs_by_image);
  assert.ok(config.rebuild_paths_by_image);
  assert.equal('warm_release_cmd' in config, false);
  assert.equal('unsafe_watch_paths' in config, false);
  assert.equal('unsafe_fall_back' in config, false);
  assert.deepEqual(config.sync_dirs_by_image.api, ['/apps/api']);
  assert.ok(
    config.rebuild_paths_by_image.api.includes('packages/story-engine'),
  );
  assert.ok(config.rebuild_paths_by_image.api.includes('pnpm-lock.yaml'));
});

test('grouped leaf source, manifest and tsconfig rebuild only dependents', () => {
  const root = mkdtempSync(join(tmpdir(), 'ac01-sync-'));
  const write = (relative, manifest) => {
    const dir = join(root, relative);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest));
  };
  write('apps/api', {
    name: '@offscreen/api',
    dependencies: { '@offscreen/grouped-runtime': 'workspace:*' },
  });
  write('apps/web', {
    name: '@offscreen/web',
    devDependencies: { '@offscreen/grouped-build': 'workspace:*' },
  });
  write('apps/game-authority', { name: '@offscreen/game-authority' });
  write('apps/worker', { name: '@offscreen/worker' });
  write('packages/ai/grouped-runtime', { name: '@offscreen/grouped-runtime' });
  write('packages/domain/grouped-build', { name: '@offscreen/grouped-build' });
  mkdirSync(join(root, 'packages/ai/inference'), { recursive: true });
  writeFileSync(join(root, 'packages/ai/inference/README.md'), '# placeholder\n');
  write('packages/foundation/unused', { name: '@offscreen/unused' });

  const source = resolveDevSync(
    'packages/ai/grouped-runtime/src/index.ts',
    root,
  );
  assert.equal(source.mode, 'rebuild');
  assert.deepEqual(source.images, ['api']);
  assert.deepEqual(source.workloads, ['game-api']);

  const manifest = resolveDevSync(
    'packages/ai/grouped-runtime/package.json',
    root,
  );
  assert.equal(manifest.mode, 'rebuild');
  assert.deepEqual(manifest.images, ['api']);
  assert.equal(
    isUnsafeDevSyncPath('packages/ai/grouped-runtime/package.json', root),
    true,
  );

  const tsconfig = resolveDevSync(
    'packages/domain/grouped-build/tsconfig.json',
    root,
  );
  assert.equal(tsconfig.mode, 'rebuild');
  assert.deepEqual(tsconfig.images, ['web']);

  const placeholder = resolveDevSync('packages/ai/inference/README.md', root);
  assert.equal(placeholder.mode, 'none');
  assert.deepEqual(placeholder.workloads, []);

  const nested = resolveDevSync(
    'packages/ai/inference/src/index.ts',
    root,
  );
  assert.equal(nested.mode, 'none');
  assert.deepEqual(nested.images, []);

  const app = resolveDevSync('apps/api/src/main.ts', root);
  assert.equal(app.mode, 'sync');
  assert.deepEqual(app.images, ['api']);

  const unused = resolveDevSync('packages/foundation/unused/src/index.ts', root);
  assert.equal(unused.mode, 'rebuild');
  assert.deepEqual(unused.images, []);
  assert.deepEqual(unused.workloads, []);

  assert.equal(
    isUnsafeDevSyncPath('packages/commerce/removed/package.json', root),
    true,
  );
  rmSync(root, { recursive: true, force: true });
});

test('rebuild paths include migration directory when present', () => {
  const paths = rebuildPathsForImage('api', repoRoot);
  if (existsSync(join(repoRoot, 'packages/db/migrations'))) {
    assert.ok(paths.includes('packages/db/migrations'));
  }
});
