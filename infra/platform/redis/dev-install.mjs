#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  runPlatformCommand,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { observeRedis, planRedisInstall } from './observations.mjs';
import { reconcileRedis } from './reconcile.mjs';
import { observeRedisReady } from './readiness.mjs';

const devProfile = readPlatformProfile('dev');
export const DEV_REDIS_CONTEXT = devProfile.contextName;
export const DEV_REDIS_NAMESPACE = devProfile.namespaces.redis;

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeDevRedis(deps = {}) {
  return observeRedis('dev', deps);
}

/**
 * @param {ReturnType<typeof observeDevRedis>} observations
 */
export function planDevRedisInstall(observations) {
  return planRedisInstall('dev', observations);
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeDevRedisReady(deps = {}) {
  return observeRedisReady('dev', deps);
}

/**
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   renderDeps?: { run?: typeof runPlatformCommand },
 *   observe?: typeof observeDevRedis,
 * }} [deps]
 */
export function executeAuthorizedDevRedis(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const renderDeps = deps.renderDeps ?? { run };
  const observe = deps.observe ?? observeDevRedis;
  return reconcileRedis('dev', { run, renderDeps, observe });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const command = process.argv[2] ?? 'plan';
  if (command === 'plan') {
    assertPlatformTarget('dev');
    const observations = observeDevRedis();
    const plan = planDevRedisInstall(observations);
    process.stdout.write(`${JSON.stringify(plan)}\n`);
    process.exitCode = plan.ok ? 0 : 1;
  } else if (command === 'ensure') {
    if (process.env.OFFSCREEN_DEV_REDIS_ENSURE !== 'authorized') {
      process.stderr.write(
        'refusing live redis ensure: set OFFSCREEN_DEV_REDIS_ENSURE=authorized after a passing preflight\n',
      );
      process.exitCode = 2;
    } else {
      const result = executeAuthorizedDevRedis();
      process.stdout.write(`${JSON.stringify(result)}\n`);
      process.exitCode = result.ok ? 0 : 1;
    }
  } else {
    process.stderr.write(`unsupported command: ${command}\n`);
    process.exitCode = 2;
  }
}
