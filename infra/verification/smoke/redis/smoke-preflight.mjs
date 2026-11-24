#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readPlatformObject } from '../../../platform/common/commands.mjs';

const NAMESPACE = 'lab-a';

const REDIS_FIXTURES = [
  { resource: 'deployment', name: 'redis' },
  { resource: 'service', name: 'redis' },
  { resource: 'configmap', name: 'redis-config' },
  { resource: 'pod', name: 'redis-client' },
];

const MUTATING_KUBECTL = new Set([
  'apply',
  'create',
  'delete',
  'patch',
  'replace',
  'scale',
]);

/**
 * @param {{ run?: import('../../../platform/common/commands.mjs').runPlatformCommand }} [deps]
 */
export function assertRedisFixtureAbsent(deps = {}) {
  /** @type {string[]} */
  const conflicts = [];
  for (const fixture of REDIS_FIXTURES) {
    const observed = readPlatformObject(
      {
        profileId: 'release',
        resource: fixture.resource,
        name: fixture.name,
        namespace: NAMESPACE,
      },
      deps,
    );
    if (observed.state === 'unreadable') {
      throw new Error(
        `redis smoke preflight unreadable ${fixture.resource}/${fixture.name}: ${observed.reason}`,
      );
    }
    if (observed.state === 'present') {
      conflicts.push(`${fixture.resource}/${fixture.name}`);
    }
  }
  if (conflicts.length > 0) {
    throw new Error(
      `redis smoke preflight conflict: existing ${conflicts.join(', ')}`,
    );
  }
  return { ok: true };
}

/**
 * @param {Array<{ command: string, args: string[] }>} calls
 */
function kubectlVerb(args) {
  const contextIndex = args.indexOf('--context');
  const start = contextIndex >= 0 ? contextIndex + 2 : 0;
  return args[start];
}

export function countMutatingKubectl(calls) {
  let count = 0;
  for (const call of calls) {
    if (call.command !== 'kubectl') continue;
    const verb = kubectlVerb(call.args);
    if (typeof verb === 'string' && MUTATING_KUBECTL.has(verb)) {
      count += 1;
    }
  }
  return count;
}

function main() {
  const command = process.argv[2];
  if (command !== 'assert-absent') {
    process.stderr.write('usage: smoke-preflight.mjs assert-absent\n');
    process.exit(2);
  }
  try {
    assertRedisFixtureAbsent();
    process.stdout.write('redis smoke preflight: absent\n');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'redis smoke preflight failed';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
