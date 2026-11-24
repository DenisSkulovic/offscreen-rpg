import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { shouldSkipKindLoad } from '../kind-image-match.mjs';
import {
  isNonRuntimePath,
  selectImagesFromPaths,
} from '../select-affected-images.mjs';
import { productionWorkspaceClosure } from '../production-workspace-closure.mjs';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(appReleaseDir, '../../..');

const graph = {
  web: productionWorkspaceClosure(repoRoot, 'apps/web'),
  api: productionWorkspaceClosure(repoRoot, 'apps/api'),
  'game-authority': productionWorkspaceClosure(repoRoot, 'apps/game-authority'),
  worker: productionWorkspaceClosure(repoRoot, 'apps/worker'),
};

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

test('lockfile selects every runtime image', () => {
  assert.deepEqual(selectImagesFromPaths(['pnpm-lock.yaml'], graph), [
    'web',
    'api',
    'game-authority',
    'worker',
  ]);
});

test('kind load is skipped only when the node already has the same image id', () => {
  assert.equal(shouldSkipKindLoad('sha256:abc', ['sha256:abc']), true);
  assert.equal(shouldSkipKindLoad('sha256:abc', ['sha256:def']), false);
  assert.equal(shouldSkipKindLoad('sha256:abc', []), false);
  assert.equal(shouldSkipKindLoad('', ['sha256:abc']), false);
});

test('node release Dockerfiles install from the lockfile before copying source', () => {
  for (const name of [
    'Dockerfile.api',
    'Dockerfile.game-authority',
    'Dockerfile.worker',
  ]) {
    const text = readFileSync(join(appReleaseDir, name), 'utf8');
    const fetchAt = text.indexOf('pnpm fetch --frozen-lockfile');
    const installAt = text.indexOf('pnpm install --frozen-lockfile --offline');
    const sourceAt = text.indexOf('COPY full/');
    assert.ok(fetchAt > 0 && installAt > fetchAt && sourceAt > installAt);
    assert.doesNotMatch(text, /COPY apps apps/);
    assert.match(text, /type=cache,id=offscreen-pnpm-store/);
  }
});

test('warm build helper bounds concurrency and still has a clean all-image path', () => {
  const text = readFileSync(
    join(repoRoot, 'infra/images/development/tilt/build-release-images.sh'),
    'utf8',
  );
  assert.match(text, /OFFSCREEN_IMAGE_BUILD_CONCURRENCY:-3/);
  assert.match(text, /--all/);
  assert.match(text, /one or more image builds failed/);
  const install = readFileSync(
    join(repoRoot, 'infra/environments/release/install.sh'),
    'utf8',
  );
  assert.match(install, /SKIP unchanged/);
  assert.match(install, /OFFSCREEN_RELEASE_IMAGES:-web,api,game-authority,worker/);
});
