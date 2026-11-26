import assert from 'node:assert/strict';
import process from 'node:process';
import { join } from 'node:path';
import test from 'node:test';
import {
  OPTIONAL_EXCLUDED_SERVICES,
  REPO_ROOT,
  buildPlatformPlan,
  parsePlatformServiceSelection,
  platformRunnerSpawnTimeout,
  runChartRenderPreflight,
  runEnsurePreflight,
  runGatewayInstallPreflight,
  runPlatformPlan,
} from './platform-plan.mjs';

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
    if (phase.id === 'object-storage') {
      assert.match(
        phase.argv[1],
        /infra\/platform\/object-storage\/providers\/seaweedfs\/install\.mjs$/,
      );
      assert.equal(phase.argv[3], 'dev');
    }
  }
  assert.deepEqual(dev.excludedOptional, [
    'redis',
    'rabbitmq',
    'observability',
  ]);

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
    const nativePhase =
      phase.id === 'temporal' || phase.id === 'object-storage';
    assert.equal(phase.argv[0], nativePhase ? process.execPath : 'bash');
    assert.equal(
      phase.argv[1]?.startsWith(join(REPO_ROOT, 'infra/platform')),
      true,
    );
    if (phase.id === 'object-storage') {
      assert.match(
        phase.argv[1],
        /infra\/platform\/object-storage\/providers\/seaweedfs\/install\.mjs$/,
      );
      assert.deepEqual(phase.argv.slice(2), ['plan', 'release']);
    }
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

test('dev and release redis phases use native install.mjs argv', () => {
  const redisInstall = join(REPO_ROOT, 'infra/platform/redis/install.mjs');
  for (const profileId of ['dev', 'release']) {
    const context =
      profileId === 'dev' ? 'kind-offscreen-dev' : 'kind-offscreen-release';
    const plan = buildPlatformPlan({
      profileId,
      command: 'plan',
      services: 'redis',
    });
    assert.equal(plan.ok, true);
    assert.deepEqual(plan.selectedServices, ['redis']);
    assert.equal(plan.phases.length, 1);
    const phase = plan.phases[0];
    assert.equal(phase.id, 'redis');
    assert.deepEqual(phase.argv, [
      process.execPath,
      redisInstall,
      'plan',
      profileId,
      context,
    ]);
    assert.equal(phase.env, undefined);
    const joined = phase.argv.join(' ');
    assert.equal(joined.includes('dev-install.mjs'), false);
    assert.equal(joined.includes('install.sh'), false);

    const ensure = buildPlatformPlan({
      profileId,
      command: 'ensure',
      services: 'redis',
      confirmation: context,
    });
    assert.equal(ensure.ok, true);
    assert.deepEqual(ensure.phases[0].argv.slice(0, 3), [
      process.execPath,
      redisInstall,
      'ensure',
    ]);
    assert.equal(ensure.phases[0].env?.OFFSCREEN_REDIS_ENSURE, 'authorized');
    assert.equal(ensure.phases[0].env?.OFFSCREEN_DEV_REDIS_ENSURE, undefined);
    assert.ok(ensure.preflight.includes('helm'));
  }
  const releasePlan = buildPlatformPlan({
    profileId: 'release',
    command: 'plan',
    services: 'redis',
  });
  assert.deepEqual(releasePlan.excludedOptional, ['rabbitmq', 'observability']);
});

test('redis ensure runner drops supervisor timeout but plan keeps one', () => {
  const redisInstall = join(REPO_ROOT, 'infra/platform/redis/install.mjs');
  const planArgv = [
    process.execPath,
    redisInstall,
    'plan',
    'dev',
    'kind-offscreen-dev',
  ];
  const ensureArgv = [
    process.execPath,
    redisInstall,
    'ensure',
    'dev',
    'kind-offscreen-dev',
  ];
  assert.equal(platformRunnerSpawnTimeout('redis', planArgv), 600_000);
  assert.equal(platformRunnerSpawnTimeout('redis', ensureArgv), undefined);
});

test('explicit mixed selection reorders to the canonical catalog', () => {
  const observabilityInstall = join(
    REPO_ROOT,
    'infra/platform/observability/install.mjs',
  );
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
  const obsPhase = plan.phases[2];
  assert.deepEqual(obsPhase.argv, [
    process.execPath,
    observabilityInstall,
    'plan',
    'release',
    'kind-offscreen-release',
  ]);
  assert.equal(obsPhase.argv.includes('install.sh'), false);
});

test('dev refuses unsupported gateway before planning', () => {
  const plan = buildPlatformPlan({
    profileId: 'dev',
    command: 'plan',
    services: 'gateway',
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.refusals[0]?.id, 'unsupported-service');
  assert.equal(plan.phases.length, 0);
  assert.equal(plan.selectedServices.length, 0);
});

test('dev rabbitmq plan dispatches install.mjs read-only census', () => {
  const rabbitmqInstall = join(
    REPO_ROOT,
    'infra/platform/rabbitmq/install.mjs',
  );
  const plan = buildPlatformPlan({
    profileId: 'dev',
    command: 'plan',
    services: 'rabbitmq',
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.phases.length, 1);
  assert.equal(plan.phases[0].id, 'rabbitmq');
  assert.deepEqual(plan.phases[0].argv.slice(0, 4), [
    process.execPath,
    rabbitmqInstall,
    'plan',
    'dev',
  ]);
  assert.equal(plan.phases[0].mutate, false);
  assert.equal(plan.phases[0].env, undefined);
});

test('rabbitmq ensure runner drops supervisor timeout but plan keeps one', () => {
  const rabbitmqInstall = join(
    REPO_ROOT,
    'infra/platform/rabbitmq/install.mjs',
  );
  const planArgv = [
    process.execPath,
    rabbitmqInstall,
    'plan',
    'release',
    'kind-offscreen-release',
  ];
  const ensureArgv = [
    process.execPath,
    rabbitmqInstall,
    'ensure',
    'release',
    'kind-offscreen-release',
  ];
  assert.equal(platformRunnerSpawnTimeout('rabbitmq', planArgv), 600_000);
  assert.equal(platformRunnerSpawnTimeout('rabbitmq', ensureArgv), undefined);
});

test('release rabbitmq plan stays preview-only without runner calls', () => {
  const plan = buildPlatformPlan({
    profileId: 'release',
    command: 'plan',
    services: 'rabbitmq',
  });
  let calls = 0;
  const receipt = runPlatformPlan(plan, () => {
    calls += 1;
    return { ok: true };
  });
  assert.equal(receipt.ok, true);
  assert.equal(calls, 0);
  assert.equal(receipt.skipped.length, 1);
  assert.equal(receipt.phases[0]?.detail, 'preview-only');
});

test('rabbitmq output loss after worker start is possible mutation', () => {
  const plan = buildPlatformPlan({
    profileId: 'dev',
    command: 'ensure',
    services: 'rabbitmq',
    confirmation: 'kind-offscreen-dev',
  });
  const receipt = runPlatformPlan(plan, (argv, options) => {
    assert.equal(options?.phaseId, 'rabbitmq');
    return { ok: false, status: null, stdout: '', stderr: '' };
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.phases[0]?.mutation, 'possible');
  assert.match(receipt.phases[0]?.detail ?? '', /worker-receipt-missing/);
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
  runChartRenderPreflight('dev', ['postgres', 'temporal'], {
    run: fixtureHelm,
  });
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
  let legacyJsonChartTemplates = 0;
  const run = (command, args, options) => {
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
            name: 'offscreen-release-system',
            uid: 'release-baseline-uid',
          },
        }),
      };
    }
    if (command === 'helm' && args[0] === 'version') {
      return { ok: true, stdout: 'v3.22.1\n', stderr: '' };
    }
    if (
      command === 'helm' &&
      args[0] === 'version' &&
      args.includes('--short')
    ) {
      return { ok: true, stdout: 'v3.22.1\n', stderr: '' };
    }
    if (command === 'helm' && args[0] === 'template') {
      if (args.includes('-') && typeof options?.input === 'string') {
        legacyJsonChartTemplates += 1;
      }
      return {
        ok: true,
        stdout: [
          '---',
          'kind: ConfigMap',
          'metadata:',
          '  name: redis-config',
          '  namespace: lab-a',
          '---',
          'kind: Deployment',
          'metadata:',
          '  name: redis',
          '  namespace: lab-a',
          '---',
          'kind: Service',
          'metadata:',
          '  name: redis',
          '  namespace: lab-a',
        ].join('\n'),
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
  assert.equal(legacyJsonChartTemplates, 0);
  assert.equal(helmLintTargets.length, 2);
  assert.equal(
    helmLintTargets.some((path) =>
      /(?:postgres|temporal|object-storage)\/chart$/.test(path),
    ),
    false,
  );
});

test('release redis plan stays preview-only without runner calls', () => {
  const plan = buildPlatformPlan({
    profileId: 'release',
    command: 'plan',
    services: 'redis',
  });
  let calls = 0;
  const receipt = runPlatformPlan(plan, () => {
    calls += 1;
    return { ok: true };
  });
  assert.equal(receipt.ok, true);
  assert.equal(calls, 0);
  assert.equal(receipt.skipped.length, 1);
  assert.equal(receipt.phases[0]?.detail, 'preview-only');
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
  assert.equal(
    plan.phases[1].env?.OFFSCREEN_OBJECT_STORAGE_ENSURE,
    'authorized',
  );
  assert.match(
    plan.phases[1].argv[1],
    /infra\/platform\/object-storage\/providers\/seaweedfs\/install\.mjs$/,
  );
  assert.deepEqual(plan.phases[1].argv.slice(2), ['ensure', 'dev']);
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
    /fixture|tenant|rabbitmq|observabilit|content-bootstrap|cluster-up/i;
  for (const profileId of ['dev', 'release']) {
    const plan = buildPlatformPlan({ profileId, command: 'plan' });
    for (const phase of plan.phases) {
      assert.equal(forbidden.test(phase.id), false);
      assert.notEqual(phase.id, 'redis');
      const argvText = phase.argv
        .map((part) => String(part).replace(REPO_ROOT, ''))
        .join(' ');
      assert.equal(forbidden.test(argvText), false);
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
    const context =
      profileId === 'dev' ? 'kind-offscreen-dev' : 'kind-offscreen-release';
    const plan = buildPlatformPlan({
      profileId,
      command: 'ensure',
      services: 'temporal',
      confirmation: context,
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.phases.length, 1);
    const phase = plan.phases[0];
    assert.match(phase.argv[1], /infra\/platform\/temporal\/install\.mjs$/);
    assert.deepEqual(phase.argv.slice(2), ['ensure', profileId, context]);
    assert.equal(phase.env.OFFSCREEN_TEMPORAL_ENSURE, 'authorized');
    assert.ok(plan.preflight.includes('helm'));
  }
});

test('both object-storage profiles use the native installer with authorization', () => {
  for (const profileId of ['dev', 'release']) {
    const context =
      profileId === 'dev' ? 'kind-offscreen-dev' : 'kind-offscreen-release';
    const plan = buildPlatformPlan({
      profileId,
      command: 'ensure',
      services: 'object-storage',
      confirmation: context,
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.phases.length, 1);
    const phase = plan.phases[0];
    assert.match(
      phase.argv[1],
      /infra\/platform\/object-storage\/providers\/seaweedfs\/install\.mjs$/,
    );
    assert.deepEqual(phase.argv.slice(2), ['ensure', profileId]);
    assert.equal(phase.env?.OFFSCREEN_OBJECT_STORAGE_ENSURE, 'authorized');
    assert.ok(plan.preflight.includes('helm'));
  }
});

test('dev object-storage-only ensure includes helm preflight and postgres-only does not', () => {
  const s3 = buildPlatformPlan({
    profileId: 'dev',
    command: 'ensure',
    services: 'object-storage',
    confirmation: 'kind-offscreen-dev',
  });
  assert.equal(s3.ok, true);
  assert.ok(s3.preflight.includes('helm'));

  const postgres = buildPlatformPlan({
    profileId: 'dev',
    command: 'ensure',
    services: 'postgres',
    confirmation: 'kind-offscreen-dev',
  });
  assert.equal(postgres.ok, true);
  assert.equal(postgres.preflight.includes('helm'), false);
});

test('dev explicit observability and all selections route native install.mjs', () => {
  const observabilityInstall = join(
    REPO_ROOT,
    'infra/platform/observability/install.mjs',
  );
  for (const services of ['observability', 'all']) {
    const plan = buildPlatformPlan({
      profileId: 'dev',
      command: 'ensure',
      services,
      confirmation: 'kind-offscreen-dev',
    });
    assert.equal(plan.ok, true);
    const obs = plan.phases.find((phase) => phase.id === 'observability');
    assert.ok(obs, services);
    assert.deepEqual(obs.argv, [
      process.execPath,
      observabilityInstall,
      'ensure',
      'dev',
      'kind-offscreen-dev',
    ]);
    assert.equal(obs.env?.OFFSCREEN_OBSERVABILITY_ENSURE, 'authorized');
    assert.ok(plan.preflight.includes('helm'));
  }
});

test('default core plans still omit observability', () => {
  for (const profileId of ['dev', 'release']) {
    const plan = buildPlatformPlan({ profileId, command: 'plan' });
    assert.equal(
      plan.phases.some((phase) => phase.id === 'observability'),
      false,
    );
    assert.ok(plan.excludedOptional.includes('observability'));
  }
});

test('observability ensure runner is timeout-exempt only for exact native argv', () => {
  const observabilityInstall = join(
    REPO_ROOT,
    'infra/platform/observability/install.mjs',
  );
  const exactEnsure = [
    process.execPath,
    observabilityInstall,
    'ensure',
    'dev',
    'kind-offscreen-dev',
  ];
  assert.equal(
    platformRunnerSpawnTimeout('observability', exactEnsure),
    undefined,
  );
  assert.equal(
    platformRunnerSpawnTimeout('observability', [
      process.execPath,
      observabilityInstall,
      'plan',
      'dev',
      'kind-offscreen-dev',
    ]),
    600_000,
  );
  assert.equal(
    platformRunnerSpawnTimeout('observability', [
      process.execPath,
      observabilityInstall,
      'ensure',
      'dev',
      'kind-offscreen-lab',
    ]),
    600_000,
  );
  assert.equal(
    platformRunnerSpawnTimeout('postgres', [
      process.execPath,
      observabilityInstall,
      'ensure',
      'dev',
      'kind-offscreen-dev',
    ]),
    1_830_000,
  );
});

test('observability ensure with malformed child receipt returns public exit 1', () => {
  const plan = buildPlatformPlan({
    profileId: 'dev',
    command: 'ensure',
    services: 'observability',
    confirmation: 'kind-offscreen-dev',
  });
  const receipt = runPlatformPlan(plan, (argv, options) => {
    assert.equal(options?.phaseId, 'observability');
    return {
      ok: true,
      status: 0,
      stdout: '{"not":"a-receipt"}\n',
      stderr: '',
    };
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.exitCode, 1);
  assert.match(receipt.phases[0]?.detail ?? '', /invalid-receipt/);
});

test('platformRunnerSpawnTimeout leaves object-storage unbounded and honors core budgets', () => {
  assert.equal(
    platformRunnerSpawnTimeout('object-storage', [
      process.execPath,
      'install.mjs',
      'ensure',
      'dev',
    ]),
    undefined,
  );
  assert.equal(
    platformRunnerSpawnTimeout('temporal', [
      process.execPath,
      'install.mjs',
      'ensure',
      'dev',
    ]),
    1_200_000,
  );
  assert.equal(
    platformRunnerSpawnTimeout('cnpg', [
      process.execPath,
      'install.mjs',
      'ensure',
    ]),
    1_830_000,
  );
});
