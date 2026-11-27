import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { allNodesMatchDigest } from '../kind-image-match.mjs';
import {
  isNonRuntimePath,
  requiresFullImageRebuild,
  selectImagesFromPaths,
  workspaceGraph,
} from '../select-affected-images.mjs';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(appReleaseDir, '../../..');

const graph = workspaceGraph(repoRoot);

test('docs and tests select no runtime image', () => {
  assert.equal(isNonRuntimePath('docs/runbooks/local-development.md'), true);
  assert.deepEqual(
    selectImagesFromPaths(
      [
        'docs/runbooks/local-development.md',
        'apps/worker/src/bootstrap/main.test.ts',
        'packages/story-engine/README.md',
      ],
      graph,
    ),
    [],
  );
});

test('story-engine source selects its production dependents', () => {
  const selected = selectImagesFromPaths(
    ['packages/story-engine/src/index.ts'],
    graph,
  );
  assert.deepEqual(selected, ['api', 'game-authority', 'worker']);
  assert.equal(selected.includes('web'), false);
});

test('build-only workspace dependency change selects owning image', () => {
  const buildOnlyGraph = {
    web: ['apps/web'],
    api: ['apps/api', 'packages/build-only-tool'],
    'game-authority': ['apps/game-authority'],
    worker: ['apps/worker'],
  };
  assert.deepEqual(
    selectImagesFromPaths(
      ['packages/build-only-tool/tsconfig.json'],
      buildOnlyGraph,
    ),
    ['api'],
  );
  assert.deepEqual(
    selectImagesFromPaths(['packages/build-only-tool/tsconfig.json'], {
      ...buildOnlyGraph,
      api: ['apps/api'],
    }),
    [],
  );
});

test('worker source selects only the worker image', () => {
  assert.deepEqual(
    selectImagesFromPaths(['apps/worker/src/bootstrap/main.ts'], graph),
    ['worker'],
  );
});

test('web source selects only web', () => {
  assert.deepEqual(
    selectImagesFromPaths(['apps/web/src/app/page.tsx'], graph),
    ['web'],
  );
});

test('workspace manifest edits require rebuilding every image', () => {
  assert.equal(
    requiresFullImageRebuild(['packages/story-engine/package.json']),
    true,
  );
  assert.equal(requiresFullImageRebuild(['pnpm-workspace.yaml']), true);
  assert.equal(
    requiresFullImageRebuild(['packages/story-engine/src/index.ts']),
    false,
  );
  assert.equal(
    requiresFullImageRebuild(['packages/ai/agent-core/package.json']),
    true,
  );
  assert.equal(
    requiresFullImageRebuild(['apps/api/package.json']),
    true,
  );
  assert.equal(
    requiresFullImageRebuild(['packages/ai/agent-core/src/index.ts']),
    false,
  );
  assert.equal(
    requiresFullImageRebuild(['packages/ai/inference/README.md']),
    false,
  );
  assert.equal(
    requiresFullImageRebuild(['packages/ai/agent-core/nested/extra/package.json']),
    false,
  );
  assert.equal(
    requiresFullImageRebuild(['packages/unknown/leaf/package.json']),
    false,
  );
});

test('lockfile selects every runtime image', () => {
  assert.deepEqual(selectImagesFromPaths(['pnpm-lock.yaml'], graph), [
    'web',
    'api',
    'game-authority',
    'worker',
  ]);
});

test('kind load is required unless every node already has the same image id', () => {
  const digest =
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.equal(allNodesMatchDigest(digest, [digest, digest]), true);
  assert.equal(
    allNodesMatchDigest(digest, [
      digest,
      'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ]),
    false,
  );
  assert.equal(allNodesMatchDigest(digest, []), false);
  assert.equal(allNodesMatchDigest('', [digest]), false);
});

test('release service Dockerfile installs from the lockfile before copying source', () => {
  const text = readFileSync(join(appReleaseDir, 'Dockerfile.services'), 'utf8');
  const fetchAt = text.indexOf('pnpm fetch --frozen-lockfile');
  const installAt = text.indexOf('pnpm install --frozen-lockfile --offline');
  const sourceAt = text.indexOf('COPY full/');
  assert.ok(fetchAt > 0 && installAt > fetchAt && sourceAt > installAt);
  assert.doesNotMatch(text, /COPY apps apps/);
  assert.match(text, /type=cache,id=offscreen-pnpm-store/);
  assert.match(text, /FROM runtime-base AS api/);
  assert.match(text, /FROM runtime-base AS worker/);
});

test('warm build helper bounds concurrency and still has a clean all-image path', () => {
  const text = readFileSync(
    join(repoRoot, 'infra/images/release/build-release-images.sh'),
    'utf8',
  );
  assert.match(text, /OFFSCREEN_IMAGE_BUILD_CONCURRENCY:-3/);
  assert.match(text, /--all/);
  assert.match(text, /one or more image builds failed/);
  const install = readFileSync(
    join(repoRoot, 'infra/environments/release/install.sh'),
    'utf8',
  );
  assert.match(install, /node "\$KIND_IMAGE_LOADER" release/);
  assert.doesNotMatch(install, /SKIP unchanged/);
  assert.match(
    install,
    /OFFSCREEN_RELEASE_IMAGES:-web,api,game-authority,worker/,
  );
  const releaseTiltPath = join(repoRoot, 'infra/environments/release/Tiltfile');
  assert.equal(existsSync(releaseTiltPath), false);
});
