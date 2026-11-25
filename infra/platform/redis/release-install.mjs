#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  runPlatformCommand,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { observeRedis } from './observations.mjs';
import { reconcileRedis } from './reconcile.mjs';

const releaseProfile = readPlatformProfile('release');
export const RELEASE_REDIS_CONTEXT = releaseProfile.contextName;
export const RELEASE_REDIS_NAMESPACE = releaseProfile.namespaces.redis;

/**
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   renderDeps?: { run?: typeof runPlatformCommand, chartRoot?: string },
 *   observe?: typeof observeRedis,
 * }} [deps]
 */
export function executeAuthorizedReleaseRedis(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const renderDeps = deps.renderDeps ?? { run };
  const observe =
    deps.observe ?? ((options) => observeRedis('release', options));
  return reconcileRedis('release', { run, renderDeps, observe });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.length > 2) {
    process.stderr.write('release-install.mjs takes no arguments.\n');
    process.exitCode = 2;
  } else {
    try {
      assertPlatformTarget('release');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
    if (process.exitCode !== 1) {
      const result = executeAuthorizedReleaseRedis();
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (!result.ok) {
        const refusal = result.refusals?.[0];
        process.stderr.write(
          `Redis install refused: ${refusal?.id ?? 'unknown'}${refusal?.detail ? ` (${refusal.detail})` : ''}\n`,
        );
        if (result.mutated) {
          process.stderr.write(
            'Redis install stopped after a partial mutation.\n',
          );
        }
        process.exitCode = 1;
      }
    }
  }
}
