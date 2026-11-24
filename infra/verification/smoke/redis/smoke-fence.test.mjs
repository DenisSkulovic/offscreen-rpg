import assert from 'node:assert/strict';
import test from 'node:test';
import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import {
  assertRedisFixtureAbsent,
  countMutatingKubectl,
} from './smoke-preflight.mjs';

const releaseKind = readKindProfile('release');
const NAMESPACE = 'lab-a';

/**
 * @param {Array<{ command: string, args: string[], result?: object }>} script
 */
function makeRunner(script) {
  /** @type {{ command: string, args: string[] }[]} */
  const calls = [];
  /** @type {Map<string, object>} */
  const keyed = new Map(
    script.map((entry) => [
      `${entry.command}\0${entry.args.join('\0')}`,
      entry.result,
    ]),
  );

  const run = (command, args) => {
    calls.push({ command, args });
    if (command === 'kubectl') {
      const verb = args[args.indexOf('--context') + 2];
      if (
        ['apply', 'create', 'delete', 'patch', 'replace', 'scale'].includes(
          verb,
        )
      ) {
        throw new Error(`unexpected mutating kubectl in fence test: ${verb}`);
      }
    }
    const hit = keyed.get(`${command}\0${args.join('\0')}`);
    if (!hit) {
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'unexpected command',
        timedOut: false,
        missing: false,
      };
    }
    return hit;
  };

  return { calls, run };
}

function fixtureName(resource) {
  if (resource === 'pod') return 'redis-client';
  if (resource === 'configmap') return 'redis-config';
  return 'redis';
}

function absentFixtureScript() {
  return ['deployment', 'service', 'configmap', 'pod'].map((resource) => ({
    command: 'kubectl',
    args: [
      '--context',
      releaseKind.contextName,
      'get',
      resource,
      '-n',
      NAMESPACE,
      fixtureName(resource),
      '--ignore-not-found',
      '-o',
      'json',
    ],
    result: {
      ok: true,
      status: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
      missing: false,
    },
  }));
}

test('redis smoke preflight passes when all fixtures absent with zero mutations', () => {
  const runner = makeRunner(absentFixtureScript());
  assertRedisFixtureAbsent({ run: runner.run });
  assert.equal(countMutatingKubectl(runner.calls), 0);
});

test('existing redis deployment refuses with zero mutations', () => {
  const script = absentFixtureScript();
  script[0] = {
    ...script[0],
    result: {
      ok: true,
      status: 0,
      stdout: JSON.stringify({
        metadata: { name: 'redis', namespace: NAMESPACE, uid: 'uid-redis' },
      }),
      stderr: '',
      timedOut: false,
      missing: false,
    },
  };
  const runner = makeRunner(script);
  assert.throws(
    () => assertRedisFixtureAbsent({ run: runner.run }),
    /preflight conflict/,
  );
  assert.equal(countMutatingKubectl(runner.calls), 0);
});

test('unreadable kubectl refuses with zero mutations', () => {
  const script = absentFixtureScript();
  script[2] = {
    ...script[2],
    result: {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'forbidden',
      timedOut: false,
      missing: false,
    },
  };
  const runner = makeRunner(script);
  assert.throws(
    () => assertRedisFixtureAbsent({ run: runner.run }),
    /unreadable configmap\/redis-config/,
  );
  assert.equal(countMutatingKubectl(runner.calls), 0);
});

test('preflight under trap simulation performs zero kubectl mutations', () => {
  const runner = makeRunner(absentFixtureScript());
  let trapped = false;
  try {
    assertRedisFixtureAbsent({ run: runner.run });
    trapped = true;
    throw new Error('simulated smoke failure after preflight');
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !/simulated smoke failure/.test(error.message)
    ) {
      throw error;
    }
  }
  assert.equal(trapped, true);
  assert.equal(countMutatingKubectl(runner.calls), 0);
});
