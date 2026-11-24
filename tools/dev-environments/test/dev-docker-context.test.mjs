import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  classifyDevDockerContextPath,
  estimateDevDockerContextBytes,
  isRequiredDevDockerContextPath,
} from '../src/adapters/dev-docker-context.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const loadScript = join(repoRoot, 'infra/kubernetes/lab/dev/tilt/load-dev-image.sh');
const libBuild = join(repoRoot, 'infra/kubernetes/lab/app-release/lib-build.sh');

test('load-dev-image uses Dockerfile.dockerignore; release builds use pruned context not repo root', () => {
  const script = readFileSync(loadScript, 'utf8');
  const build = script.slice(script.indexOf('docker build'));
  assert.doesNotMatch(build, /ignorefile/);
  const ignoreFile = join(repoRoot, 'infra/kubernetes/lab/dev/Dockerfile.dockerignore');
  assert.equal(existsSync(ignoreFile), true);
  assert.match(readFileSync(ignoreFile, 'utf8'), /\*\*\/node_modules/);
  assert.match(readFileSync(ignoreFile, 'utf8'), /^\.offscreen$/m);
  assert.match(script, /Dockerfile\.dockerignore/);
  assert.doesNotMatch(script, /kubectl/);
  const slotLoader = readFileSync(join(repoRoot, 'infra/kubernetes/lab/dev/load-dev-slot-image.sh'), 'utf8');
  assert.match(slotLoader, /OFFSCREEN_IMAGE_REF_FILE/);
  assert.doesNotMatch(slotLoader, /kubectl/);
  assert.match(slotLoader, /post-load-mismatch/);
  assert.match(slotLoader, /kind load docker-image "\$canonical"/);
  assert.doesNotMatch(slotLoader, /kind load docker-image "\$ref"/);
  assert.match(slotLoader, /ctr -n k8s.io images tag/);
  const release = readFileSync(libBuild, 'utf8');
  assert.doesNotMatch(release, /docker build[^\n]*\s\.$/m);
  assert.match(release, /stage_pruned_context/);
});

test('dependency-populated fixture keeps manifests and source, drops artifacts', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-docker-ctx-'));
  writeFileSync(join(root, 'package.json'), '{"name":"fixture"}\n');
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  mkdirSync(join(root, 'apps', 'api', 'src'), { recursive: true });
  writeFileSync(join(root, 'apps', 'api', 'package.json'), '{}\n');
  writeFileSync(join(root, 'apps', 'api', 'src', 'main.ts'), 'export {}\n');
  mkdirSync(join(root, 'apps', 'api', 'node_modules', '@better-auth', 'drizzle-adapter'), {
    recursive: true,
  });
  writeFileSync(
    join(root, 'apps', 'api', 'node_modules', '@better-auth', 'drizzle-adapter', 'index.js'),
    'throw new Error("host install")\n',
  );
  mkdirSync(join(root, 'apps', 'api', 'dist'), { recursive: true });
  writeFileSync(join(root, 'apps', 'api', 'dist', 'main.js'), 'compiled\n');
  mkdirSync(join(root, '.git'), { recursive: true });
  writeFileSync(join(root, '.git', 'HEAD'), 'ref\n');

  assert.equal(isRequiredDevDockerContextPath('package.json'), true);
  assert.equal(isRequiredDevDockerContextPath('apps/api/src/main.ts'), true);
  assert.equal(classifyDevDockerContextPath('apps/api/src/main.ts').include, true);
  assert.equal(
    classifyDevDockerContextPath('apps/api/node_modules/@better-auth/drizzle-adapter').include,
    false,
  );
  assert.equal(classifyDevDockerContextPath('apps/api/dist/main.js').include, false);
  assert.equal(classifyDevDockerContextPath('.git/HEAD').include, false);

  const estimate = estimateDevDockerContextBytes(root);
  assert.ok(estimate.bytes > 0);
  assert.ok(estimate.excluded.some((p) => p.includes('node_modules')));
  assert.ok(estimate.excluded.some((p) => p.includes('dist') || p === 'apps/api/dist'));
});

test('symlink into host node_modules and secret files are excluded', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-docker-neg-'));
  mkdirSync(join(root, 'packages', 'api'), { recursive: true });
  mkdirSync(join(root, 'host-deps', 'node_modules', 'pkg'), { recursive: true });
  writeFileSync(join(root, 'host-deps', 'node_modules', 'pkg', 'index.js'), 'x\n');
  symlinkSync(
    join(root, 'host-deps', 'node_modules', 'pkg'),
    join(root, 'packages', 'api', 'linked-pkg'),
    'dir',
  );
  writeFileSync(join(root, 'packages', 'api', '.env.local'), 'SECRET=1\n');
  writeFileSync(join(root, 'credentials.json'), '{}');

  const symlinkDecision = classifyDevDockerContextPath('packages/api/linked-pkg', {
    isSymlink: true,
    symlinkTarget: '../../host-deps/node_modules/pkg',
  });
  assert.equal(symlinkDecision.include, false);
  assert.equal(symlinkDecision.reason, 'symlink-artifact');

  assert.equal(classifyDevDockerContextPath('packages/api/.env.local').include, false);
  assert.equal(classifyDevDockerContextPath('credentials.json').include, false);

  const estimate = estimateDevDockerContextBytes(root);
  assert.equal(estimate.files, 0);
});

test('live repo estimate includes workspace source without node_modules paths', () => {
  const estimate = estimateDevDockerContextBytes(repoRoot);
  assert.ok(estimate.bytes > 1_000_000);
  assert.ok(
    !estimate.excluded.some((p) => p === 'apps/api/src' || p.endsWith('/src/main.ts')),
  );
});