import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  DEV_IMAGE_RUNTIME_MODULES,
  devImagePackagingFingerprint,
  missingDevImageRuntimeModules,
} from './dev-image-runtime-modules.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../..');

test('the dev image packages every module the workloads invoke', () => {
  assert.deepEqual(missingDevImageRuntimeModules(repo), []);
  const dockerfile = readFileSync(join(repo, 'infra/images/development/Dockerfile'), 'utf8');
  for (const relative of DEV_IMAGE_RUNTIME_MODULES) {
    assert.match(dockerfile, new RegExp(relative.replaceAll('/', '\\/')));
  }
  const ignore = readFileSync(
    join(repo, 'infra/images/development/Dockerfile.dockerignore'),
    'utf8',
  );
  for (const relative of DEV_IMAGE_RUNTIME_MODULES.filter((item) => item.startsWith('apps/'))) {
    assert.doesNotMatch(ignore, new RegExp(relative.replaceAll('/', '\\/')));
  }
  assert.match(dockerfile, /dev-image-runtime-modules\.mjs --check/);
  const fingerprint = devImagePackagingFingerprint(repo);
  assert.equal(fingerprint, devImagePackagingFingerprint(repo));
  assert.equal(fingerprint.length, 64);
});

test('missing watcher source fails the image check', () => {
  const empty = mkdtempSync(join(tmpdir(), 'dev-image-'));
  const missing = missingDevImageRuntimeModules(empty);
  assert.ok(missing.includes('apps/api/dev-pod-compile-watch.mjs'));
  assert.ok(missing.includes('apps/web/dev-pod-web-receipt.mjs'));
});
