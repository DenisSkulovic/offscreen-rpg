import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  OPTIONAL_EXCLUDED_SERVICES,
  REPO_ROOT,
  buildPlatformPlan,
  parsePlatformServiceSelection,
  runChartRenderPreflight,
  runEnsurePreflight,
  runGatewayInstallPreflight,
  runPlatformPlan,
} from './platform-plan.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('dev and release plans keep the core service order with absolute entrypoints', () => {
  const dev = buildPlatformPlan({ profileId: 'dev', command: 'plan' });
  assert.equal(dev.ok, true);
  assert.deepEqual(dev.selectedServices, [
    'postgres',
    'object-storage',
    'temporal',
  ]);
  assert.deepEqual(
    dev.phases.map((phase) => phase.id),
    ['cnpg', 'object-storage', 'temporal'],
  );
  for (const phase of dev.phases) {
    assert.equal(phase.argv[1]?.startsWith('/'), true);
    assert.equal(phase.argv[2], 'plan');
  }
  assert.deepEqual(dev.excludedOptional, ['redis']);

  const release = buildPlatformPlan({ profileId: 'release', command: 'plan' });
  assert.equal(release.ok, true);
  assert.deepEqual(release.selectedServices, [
    'postgres',
    'object-storage',
    'temporal',
    'gateway',
  ]);
  assert.deepEqual(
    release.phases.map((phase) => phase.id),
    ['postgres', 'object-storage', 'temporal', 'gateway'],
  );
  for (const phase of release.phases) {
    assert.equal(phase.argv[0], phase.id === 'temporal' ? process.execPath : 'bash');
    assert.equal(
      phase.argv[1]?.startsWith(join(REPO_ROOT, 'infra/platform')),
      true,
    );
  }
  assert.deepEqual(release.excludedOptional, [...OPTIONAL_EXCLUDED_SERVICES]);
});

test('none selection yields empty phases and no ensure preflight', () => {
  const dev = buildPlatformPlan({
    profileId: 'dev',
    command: 'plan',
    services: 'none',
  });
  assert.equal(dev.ok, true);
  assert.deepEqual(dev.selectedServices, []);
  assert.equal(dev.phases.length, 0);

  const ensure = buildPlatformPlan({
    profileId: 'release',
    command: 'ensure',
    services: 'none',
    confirmation: 'kind-offscreen-release',
  });
  assert.equal(ensure.ok, true);
  assert.deepEqual(ensure.preflight, []);
  assert.equal(ensure.phases.length, 0);
});

test('dev redis-only selection uses dev-install argv', () => {
  const plan = buildPlatformPlan({
    profileId: 'dev',
    command: 'plan',
    services: 'redis',
  });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.selectedServices, ['redis']);
  assert.equal(plan.phases.length, 1);
  assert.equal(plan.phases[0].id, 'redis');
  assert.deepEqual(plan.phases[0].argv, [
    process.execPath,
    join(REPO_ROOT, 'infra/platform/redis/dev-install.mjs'),
    'plan',
  ]);
});

test('release redis-only selection uses the optional installer argv', () => {
  const plan = buildPlatformPlan({
    profileId: 'release',
    command: 'plan',
    services: 'redis',
  });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.selectedServices, ['redis']);
  assert.equal(plan.phases.length, 1);
  assert.equal(plan.phases[0].id, 'redis');
  assert.deepEqual(plan.phases[0].argv, [
    'bash',
    join(REPO_ROOT, 'infra/platform/redis/install.sh'),
  ]);
  assert.deepEqual(plan.excludedOptional, ['rabbitmq', 'observability']);
});

test('explicit mixed selection reorders to the canonical catalog', () => {
  const plan = buildPlatformPlan({
    profileId: 'release',
    command: 'plan',
    services: 'observability,temporal,postgres',
  });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.selectedServices, [
    'postgres',
    'temporal',
    'observability',
  ]);
  assert.deepEqual(
    plan.phases.map((phase) => phase.id),
    ['postgres', 'temporal', 'observability'],
  );
});

test('dev refuses unsupported gateway and rabbitmq before planning', () => {
  for (const services of ['gateway', 'rabbitmq']) {
    const plan = buildPlatformPlan({
      profileId: 'dev',
      command: 'plan',
      services,
    });
    assert.equal(plan.ok, false);
    assert.equal(plan.refusals[0]?.id, 'unsupported-service');
    assert.equal(plan.phases.length, 0);
    assert.equal(plan.selectedServices.length, 0);
  }
});

test('chart render preflight touches only selected services', () => {
  /** @type {string[]} */
  const linted = [];
  /** @type {string[]} */
  const rendered = [];
  const fixtureHelm = (command, args) => {
    if (command === 'helm' && args[0] === 'template') {
      rendered.push(args[2]);
      return {
        ok: true,
        stdout: `${JSON.stringify({
          kind: 'Namespace',
          metadata: { name: 'offscreen-dev-postgres' },
        })}\n`,
      };
    }
    if (command === 'helm' && args[0] === 'lint') {
      linted.push(args[1]);
      return { ok: true, stdout: '', stderr: '' };
    }
    return { ok: true, stdout: '', stderr: '' };
  };
  runChartRenderPreflight('dev', ['postgres', 'temporal'], { run: fixtureHelm });
  assert.equal(linted.length, 1);
  assert.match(linted[0], /postgres\/chart$/);
  assert.equal(rendered.length, 1);
  assert.match(rendered[0], /postgres\/chart$/);
  assert.equal(
    linted.some((path) => /(?:temporal|object-storage)\/chart$/.test(path)),
    false,
  );
});

test('ensure preflight skips unselected chart services', () => {
  /** @type {string[]} */
  const helmLintTargets = [];
  const run = (command, args) => {
    if (command === 'kind' && args[0] === 'get') {
      return { ok: true, stdout: 'offscreen-release\n' };
    }
    if (command === 'kubectl' && args.includes('config')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          clusters: [
            {
              name: 'kind-offscreen-release',
              cluster: { server: 'https://127.0.0.1:6443' },
            },
          ],
          contexts: [
            {
              name: 'kind-offscreen-release',
              context: { cluster: 'kind-offscreen-release' },
            },
          ],
          'current-context': 'kind-offscreen-release',
        }),
      };
    }
    if (command === 'kubectl' && args.includes('offscreen-release-system')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          metadata: {
            labels: { 'offscreen.rpg/lab': 'disposable' },
            name: 'offscreen-release-system', uid: 'release-baseline-uid',
          },
        }),
      };
    }
    if (command === 'helm' && args[0] === 'version') {
      return { ok: true, stdout: 'v3.22.1\n', stderr: '' };
    }
    if (command === 'helm' && args[0] === 'template') {
      return {
        ok: true,
        stdout: `${JSON.stringify({
          kind: 'Namespace',
          metadata: { name: 'lab-a' },
        })}\n`,
      };
    }
    if (command === 'helm' && args[0] === 'lint') {
      helmLintTargets.push(args[1]);
      return { ok: true, stdout: '', stderr: '' };
    }
    return { ok: true, stdout: '', stderr: '' };
  };

  const pre = runEnsurePreflight('release', 'ensure', {
    run,
    memoryMiB: 99_999,
    selectedServices: ['redis'],
  });
  assert.equal(pre.ok, true);
  assert.equal(helmLintTargets.length, 1);
  assert.match(helmLintTargets[0], /redis\/chart$/);
  assert.equal(
    helmLintTargets.some((path) =>
      /(?:postgres|temporal|object-storage)\/chart$/.test(path),
    ),
    false,
  );
});

test('parsePlatformServiceSelection rejects duplicates and alias mixing', () => {
  const duplicate = parsePlatformServiceSelection('release', 'redis,redis');
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.refusal.id, 'invalid-services');

  const mixed = parsePlatformServiceSelection('release', 'core,redis');
  assert.equal(mixed.ok, false);
  assert.equal(mixed.refusal.id, 'invalid-services');
});

test('dev ensure carries the existing authorization env flags on bootstrap CLIs', () => {
  const plan = buildPlatformPlan({
    profileId: 'dev',
    command: 'ensure',
    confirmation: 'kind-offscreen-dev',
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.phases[0].env?.OFFSCREEN_DEV_CNPG_ENSURE, 'authorized');
  assert.equal(plan.phases[1].env?.OFFSCREEN_DEV_S3_ENSURE, 'authorized');
  assert.equal(plan.phases[2].env?.OFFSCREEN_TEMPORAL_ENSURE, 'authorized');
  assert.deepEqual(
    plan.phases.map((p) => p.argv[2]),
    ['ensure', 'ensure', 'ensure'],
  );
});

test('unknown profile refuses before planning phases', () => {
  const plan = buildPlatformPlan({ profileId: 'staging', command: 'plan' });
  assert.equal(plan.ok, false);
  assert.equal(plan.refusals[0]?.id, 'unknown-profile');
  assert.equal(plan.phases.length, 0);
});

test('ensure without exact context confirmation refuses', () => {
  const plan = buildPlatformPlan({
    profileId: 'release',
    command: 'ensure',
    confirmation: 'kind-offscreen-dev',
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.refusals[0]?.id, 'context-confirmation');
});

test('a second phase failure skips the remaining phases without rollback', () => {
  const plan = buildPlatformPlan({ profileId: 'dev', command: 'plan' });
  /** @type {string[]} */
  const seen = [];
  const receipt = runPlatformPlan(plan, (argv, options) => {
    const id = options?.phaseId ?? 'unknown';
    seen.push(id);
    if (id === 'object-storage') {
      return { ok: false, status: 1, stderr: 'injected object-store failure' };
    }
    return { ok: true, status: 0 };
  });
  assert.equal(receipt.ok, false);
  assert.deepEqual(seen, ['cnpg', 'object-storage']);
  assert.equal(receipt.ran.length, 2);
  assert.equal(receipt.skipped.length, 1);
  assert.equal(receipt.skipped[0]?.id, 'temporal');
  assert.equal(receipt.rollback, false);
});

test('core plans never include fixture, tenant, or optional service phases', () => {
  const forbidden =
    /fixture|tenant|redis|rabbitmq|observabilit|content-bootstrap|cluster-up/i;
  for (const profileId of ['dev', 'release']) {
    const plan = buildPlatformPlan({ profileId, command: 'plan' });
    for (const phase of plan.phases) {
      assert.equal(forbidden.test(phase.id), false);
      assert.equal(forbidden.test(phase.argv.join(' ')), false);
    }
    assert.equal(
      plan.phases.some((phase) => phase.argv.join(' ').includes('up.sh')),
      false,
    );
  }
});

test('release plan mode leaves install scripts preview-only', () => {
  const plan = buildPlatformPlan({ profileId: 'release', command: 'plan' });
  let calls = 0;
  const receipt = runPlatformPlan(plan, () => {
    calls += 1;
    return { ok: true };
  });
  assert.equal(receipt.ok, true);
  assert.equal(calls, 0);
  assert.equal(receipt.skipped.length, 4);
  assert.deepEqual(
    receipt.phases.map((phase) => phase.detail),
    ['preview-only', 'preview-only', 'preview-only', 'preview-only'],
  );
});


test('gateway preflight verifies native pins without host image or Helm repo', () => {
  assert.doesNotThrow(() => runGatewayInstallPreflight());
  const run = (command) => {
    throw new Error(`unexpected platform command: ${command}`);
  };
  assert.doesNotThrow(() => runGatewayInstallPreflight({ run }));
  assert.throws(
    () =>
      runGatewayInstallPreflight({
        loadVerifiedPins: () => {
          throw new Error('pins unreadable');
        },
      }),
    /pins unreadable/,
  );
});

test('both Temporal profiles select the same native installer and exact confirmation', () => {
  for (const profileId of ['dev', 'release']) {
    const context = profileId === 'dev' ? 'kind-offscreen-dev' : 'kind-offscreen-release';
    const plan = buildPlatformPlan({ profileId, command: 'ensure', services: 'temporal', confirmation: context });
    assert.equal(plan.ok, true);
    assert.equal(plan.phases.length, 1);
    const phase = plan.phases[0];
    assert.match(phase.argv[1], /infra\/platform\/temporal\/install\.mjs$/);
    assert.deepEqual(phase.argv.slice(2), ['ensure', profileId, context]);
    assert.equal(phase.env.OFFSCREEN_TEMPORAL_ENSURE, 'authorized');
    assert.ok(plan.preflight.includes('helm'));
  }
});
