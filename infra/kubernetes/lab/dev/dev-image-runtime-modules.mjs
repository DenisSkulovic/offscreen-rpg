#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Modules the rendered dev commands import, plus the check that fails the image build. */
export const DEV_IMAGE_RUNTIME_MODULES = Object.freeze([
  'infra/kubernetes/lab/dev/dev-watched-compilation-receipt.mjs',
  'infra/kubernetes/lab/dev/dev-watch-compilation.mjs',
  'infra/kubernetes/lab/dev/dev-image-runtime-modules.mjs',
  'apps/api/dev-pod-compile-watch.mjs',
  'apps/game-authority/dev-pod-compile-watch.mjs',
  'apps/worker/dev-pod-compile-watch.mjs',
  'apps/web/dev-pod-web-receipt.mjs',
]);

export function missingDevImageRuntimeModules(root) {
  return DEV_IMAGE_RUNTIME_MODULES.filter((relative) => !existsSync(join(root, relative)));
}

/** Changes when the Dockerfile or a packaged runtime script changes. */
export function devImagePackagingFingerprint(root) {
  const hash = createHash('sha256');
  const files = ['infra/kubernetes/lab/dev/Dockerfile', ...DEV_IMAGE_RUNTIME_MODULES];
  for (const relative of files) {
    hash.update(relative);
    hash.update('\0');
    hash.update(readFileSync(join(root, relative)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

if (process.argv.includes('--check')) {
  const missing = missingDevImageRuntimeModules(process.cwd());
  if (missing.length > 0) {
    process.stderr.write(`dev image missing runtime modules: ${missing.join(', ')}\n`);
    process.exit(1);
  }
}
