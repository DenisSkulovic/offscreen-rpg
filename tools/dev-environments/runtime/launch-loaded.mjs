#!/usr/bin/env node
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {
  fingerprintCompiledTree,
  resolveCompiledDistRoot,
  writeDevLoadedRuntimeReceipt,
} from './generation.mjs';

/**
 * @param {string[]} argv
 */
/**
 * @param {string[]} argv
 * @param {{ cwd?: string }} [options]
 */
export async function runLaunchLoaded(
  argv = process.argv.slice(2),
  options = {},
) {
  const [role, entry, generationId, expectedDigest] = argv;
  if (!role || !entry || !generationId || !expectedDigest) {
    process.stderr.write(
      'usage: launch-loaded.mjs <role> <entry> <generationId> <compiledModuleIdentity>\n',
    );
    return 1;
  }

  const cwd = options.cwd ?? process.cwd();
  const distRoot = resolveCompiledDistRoot(cwd, entry);
  let digest = fingerprintCompiledTree(distRoot);
  if (digest !== expectedDigest) {
    process.stderr.write('digest_mismatch_before_import\n');
    return 1;
  }

  const entryUrl = pathToFileURL(resolve(cwd, entry)).href;
  await import(entryUrl);

  digest = fingerprintCompiledTree(distRoot);
  if (digest !== expectedDigest) {
    process.stderr.write('digest_mismatch_after_import\n');
    return 1;
  }

  writeDevLoadedRuntimeReceipt({
    role,
    compiledModulePath: resolve(cwd, entry),
    generationId,
    cwd,
  });

  return 0;
}

const launchLoadedModulePath = fileURLToPath(import.meta.url);
const launchLoadedInvokedAsMain =
  process.argv[1] && resolve(process.argv[1]) === launchLoadedModulePath;

if (launchLoadedInvokedAsMain) {
  runLaunchLoaded()
    .then((code) => {
      if (code !== 0) {
        process.exit(code);
      }
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.stack : String(error)}\n`,
      );
      process.exit(1);
    });
}
