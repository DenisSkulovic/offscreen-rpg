import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('image-plan module is build-critical for all runtime images', () => {
  const result = resolveDevSync(
    'infra/images/development/image-plan.mjs',
    repoRoot,
  );
  assert.equal(result.mode, 'rebuild');
  assert.deepEqual(result.images, ALL_RUNTIME_IMAGES);
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

test('rebuild paths include migration directory when present', () => {
  const paths = rebuildPathsForImage('api', repoRoot);
  if (existsSync(join(repoRoot, 'packages/db/migrations'))) {
    assert.ok(paths.includes('packages/db/migrations'));
  }
});
