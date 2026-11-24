import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  isUnsafeDevSyncPath,
  resolveDevSync,
  syncSubpathsForImage,
  tiltDevSyncConfig,
} from './dev-sync-paths.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const devTiltfilePath = join(repoRoot, 'infra/dev/Tiltfile');
const devTiltfile = readFileSync(devTiltfilePath, 'utf8');

const migrationSample = existsSync(
  join(repoRoot, 'packages/db/migrations/meta/_journal.json'),
)
  ? 'packages/db/migrations/meta/_journal.json'
  : 'packages/db/migrations/0000_init.sql';

test('packages/story-engine source syncs api, game-authority, worker not web', () => {
  const result = resolveDevSync('packages/story-engine/src/index.ts', repoRoot);
  assert.equal(result.mode, 'sync');
  assert.deepEqual(result.images, ['api', 'game-authority', 'worker']);
  assert.equal(result.workloads.includes('game-web'), false);
  assert.equal(result.workloads.includes('game-api'), true);
  assert.equal(result.workloads.includes('game-authority'), true);
  assert.equal(result.workloads.includes('game-control'), true);
  assert.equal(result.workloads.includes('game-executor'), true);
  assert.equal(result.workloads.includes('game-relay'), true);
});

test('apps/api source syncs api workload only', () => {
  const result = resolveDevSync('apps/api/src/main.ts', repoRoot);
  assert.equal(result.mode, 'sync');
  assert.deepEqual(result.images, ['api']);
  assert.deepEqual(result.workloads, ['game-api']);
});

test('docs-only change selects no workload sync', () => {
  const result = resolveDevSync('docs/runbooks/local-development.md', repoRoot);
  assert.equal(result.mode, 'none');
  assert.deepEqual(result.workloads, []);
});

test('pnpm-lock.yaml is unsafe warm rebuild not live sync', () => {
  const result = resolveDevSync('pnpm-lock.yaml', repoRoot);
  assert.equal(result.mode, 'warm');
  assert.equal(isUnsafeDevSyncPath('pnpm-lock.yaml'), true);
});

test('workspace package.json is unsafe warm rebuild', () => {
  const result = resolveDevSync('packages/story-engine/package.json', repoRoot);
  assert.equal(result.mode, 'warm');
  assert.equal(isUnsafeDevSyncPath('packages/story-engine/package.json'), true);
});

test('db migration path is unsafe', () => {
  assert.equal(isUnsafeDevSyncPath(migrationSample), true);
  assert.equal(resolveDevSync(migrationSample, repoRoot).mode, 'warm');
});

test('db-migrations generator config is unsafe warm rebuild', () => {
  const generatorConfig = 'tools/db-migrations/drizzle.config.ts';
  assert.equal(isUnsafeDevSyncPath(generatorConfig), true);
  assert.equal(resolveDevSync(generatorConfig, repoRoot).mode, 'warm');
  const config = tiltDevSyncConfig(repoRoot);
  assert.ok(config.unsafe_watch_paths.includes(generatorConfig));
});

test('dev Dockerfile is unsafe', () => {
  assert.equal(
    isUnsafeDevSyncPath('infra/images/development/Dockerfile'),
    true,
  );
  assert.equal(
    resolveDevSync('infra/images/development/Dockerfile', repoRoot).mode,
    'warm',
  );
});

test('dev dockerignore is unsafe warm rebuild', () => {
  assert.equal(
    isUnsafeDevSyncPath('infra/images/development/Dockerfile.dockerignore'),
    true,
  );
  assert.equal(
    resolveDevSync('infra/images/development/Dockerfile.dockerignore', repoRoot).mode,
    'warm',
  );
});

test('api image sync subpaths include story-engine from production closure', () => {
  const dirs = syncSubpathsForImage('api', repoRoot);
  assert.ok(dirs.includes('/packages/story-engine'));
  assert.ok(dirs.includes('/apps/api'));
  assert.equal(dirs.includes('/apps/web'), false);
});

test('dev Tiltfile wires closure sync, unsafe fallback, warm release helper', () => {
  const config = tiltDevSyncConfig(repoRoot);
  assert.match(devTiltfile, /dev-sync-paths\.mjs --tilt/);
  assert.match(devTiltfile, /dev-warm-release-fallback/);
  assert.match(devTiltfile, /SYNC_CONFIG\['warm_release_cmd'\]/);
  assert.match(config.warm_release_cmd, /build-release-images\.sh/);
  assert.ok(config.sync_dirs_by_image.api.includes('/packages/story-engine'));
  assert.match(devTiltfile, /fall_back_on\s*\(fallbacks\)/);
  assert.match(
    devTiltfile,
    /for sub in SYNC_CONFIG\['sync_dirs_by_image'\]\[image_key\]:/,
  );
  assert.match(
    devTiltfile,
    /sync\(REPO_ROOT \+ sub, '\/app' \+ sub\)/,
  );
});