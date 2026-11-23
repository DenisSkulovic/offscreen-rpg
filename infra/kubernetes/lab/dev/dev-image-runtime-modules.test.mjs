import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  DEV_IMAGE_RUNTIME_MODULES,
  devImagePackagingFingerprint,
  missingDevImageRuntimeModules,
} from './dev-image-runtime-modules.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../../../..');

test('the dev image packages every module the workloads invoke', () => {
  assert.deepEqual(missingDevImageRuntimeModules(repo), []);
  const dockerfile = readFileSync(join(here, 'Dockerfile'), 'utf8');
  for (const relative of DEV_IMAGE_RUNTIME_MODULES.filter((item) => item.startsWith('infra/'))) {
    assert.match(dockerfile, new RegExp(relative.replaceAll('/', '\\/')));
  }
  assert.match(dockerfile, /dev-image-runtime-modules\.mjs --check/);
  const fingerprint = devImagePackagingFingerprint(repo);
  assert.equal(fingerprint, devImagePackagingFingerprint(repo));
  assert.equal(fingerprint.length, 64);
});
