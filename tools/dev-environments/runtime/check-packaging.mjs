#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Runtime modules the dev workspace image must ship for pod compile supervision. */
export const DEV_IMAGE_RUNTIME_MODULES = Object.freeze([
  'tools/dev-environments/runtime/compile-watch.mjs',
  'tools/dev-environments/runtime/launch-loaded.mjs',
  'tools/dev-environments/runtime/generation.mjs',
  'tools/dev-environments/runtime/status.mjs',
]);

/**
 * @param {string} root
 * @returns {string[]}
 */
export function missingDevImageRuntimeModules(root) {
  return DEV_IMAGE_RUNTIME_MODULES.filter(
    (relative) => !existsSync(join(root, relative)),
  );
}

/**
 * Changes when the Dockerfile or a packaged runtime script changes.
 * @param {string} root
 */
export function devImagePackagingFingerprint(root) {
  const hash = createHash('sha256');
  const files = [
    'infra/images/development/Dockerfile',
    ...DEV_IMAGE_RUNTIME_MODULES,
  ];
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
    process.stderr.write(
      `dev image missing runtime modules: ${missing.join(', ')}\n`,
    );
    process.exit(1);
  }
}
