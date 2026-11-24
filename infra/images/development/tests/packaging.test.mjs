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
} from '../packaging.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../../../..');

test('the dev image packages every runtime module the workloads invoke', () => {
  assert.deepEqual(missingDevImageRuntimeModules(repo), []);
  const dockerfile = readFileSync(
    join(repo, 'infra/images/development/Dockerfile'),
    'utf8',
  );
  assert.match(
    dockerfile,
    /tools\/dev-environments\/runtime\/check-packaging\.mjs --check/,
  );
  assert.doesNotMatch(dockerfile, /infra\/dev\//);
  assert.doesNotMatch(dockerfile, /dev-pod-(compile-watch|web-receipt)/);
  assert.match(dockerfile, /COPY tools \.\/tools/);
  const fingerprint = devImagePackagingFingerprint(repo);
  assert.equal(fingerprint, devImagePackagingFingerprint(repo));
  assert.equal(fingerprint.length, 64);
});

test('missing runtime source fails the image check', () => {
  const empty = mkdtempSync(join(tmpdir(), 'dev-image-'));
  const missing = missingDevImageRuntimeModules(empty);
  assert.ok(
    missing.includes('tools/dev-environments/runtime/compile-watch.mjs'),
  );
  assert.ok(missing.includes('tools/dev-environments/runtime/generation.mjs'));
});
