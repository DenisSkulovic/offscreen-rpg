import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { execPath } from 'node:process';
import { allocateDevWorktreeOwner } from '../src/domain/dev-worktree-allocator.mjs';
import {
  applyOwnedSlotWorkloads,
  reconcileDevSlot,
  planSlotImageBuilds,
  describeImageLoadFailure,
  resolveOauthReadiness,
  ensureOwnedSlotImages,
} from '../src/application/dev-slot-startup.mjs';
import { renderDevSlotAppGraph } from '../src/rendering/dev-slot-app-graph.mjs';

const record = {
  slotId: 'dev-3',
  cluster: 'kind-offscreen-dev',
  namespace: 'offscreen-dev-3',
  ports: { game: 13108, control: 13109, tilt: 13110, spare: 13111 },
};

function healthy() {
  return { ok: true, cluster: 'kind-offscreen-dev', memoryMiB: 4096 };
}

function deps(overrides = {}) {
  const calls = [];
  const base = {
    calls,
    allocate: () => record,
    probeCluster: async () => healthy(),
    ensureSql: async () => {
      calls.push('sql');
      return {
        ok: true,
        retained: [{ name: 'dev-3-run-auth', uid: 'sql-uid' }],
      };
    },
    ensureMigration: async () => {
      calls.push('migration');
      return {
        ok: true,
        slotId: record.slotId,
        appliedMigrations: 25,
        expectedMigrations: 25,
      };
    },
    ensureS3: async () => {
      calls.push('s3');
      return { ok: true, retained: [{ name: 'dev-3-s3', uid: 's3-uid' }] };
    },
    ensureTemporal: async () => {
      calls.push('temporal');
      return { ok: true, namespace: 'offscreen-dev-3', id: 'temporal-id' };
    },
    project: async (_rec, migration) => {
      calls.push('project');
      assert.equal(migration?.ok, true);
      assert.equal(migration?.appliedMigrations, migration?.expectedMigrations);
      return {
        ok: true,
        dbUid: 'db',
        s3Uid: 's3',
        appUid: 'app',
        images: { api: 'offscreen-dev-workspace:dev-3-api' },
      };
    },
    ensureImages: async () => {
      calls.push('images');
      return {
        ok: true,
        refs: { api: 'offscreen-dev-workspace:dev-3-api' },
        rebuilt: false,
      };
    },
    prepareMigrationArtifact: async () => {
      calls.push('artifact');
      return { ok: true };
    },
  };
  return { ...base, ...overrides, calls };
}

test('a new slot runs sql, migration, s3, temporal, project, then images', async () => {
  const used = deps();
  const result = await reconcileDevSlot(
    { worktree: '/tmp/new', registryRoot: '/tmp/reg' },
    used,
  );
  assert.equal(result.ok, true);
  assert.equal(result.readyForWorkloads, true);
  assert.deepEqual(used.calls, [
    'artifact',
    'sql',
    'migration',
    's3',
    'temporal',
    'project',
    'images',
  ]);
  assert.equal(result.identities.secretUids.db, 'db');
});

test('an existing slot reuses the same identities without a rebuild flag', async () => {
  const used = deps({
    ensureImages: async () => ({
      ok: true,
      refs: { api: 'offscreen-dev-workspace:dev-3-api' },
      rebuilt: false,
    }),
  });
  const first = await reconcileDevSlot(
    { worktree: '/tmp/same', registryRoot: '/tmp/reg' },
    used,
  );
  const second = await reconcileDevSlot(
    { worktree: '/tmp/same', registryRoot: '/tmp/reg' },
    used,
  );
  assert.equal(
    first.identities.secretUids.app,
    second.identities.secretUids.app,
  );
  assert.equal(second.ok, true);
});

test('sql, s3, and temporal failures stop before workloads and keep retained ids', async () => {
  for (const [phase, key] of [
    ['sql', 'ensureSql'],
    ['s3', 'ensureS3'],
    ['temporal', 'ensureTemporal'],
  ]) {
    const used = deps({
      [key]: async () => ({
        ok: false,
        refusals: [{ id: 'partial', detail: `${phase} partial` }],
        retained: [{ uid: `${phase}-kept` }],
      }),
    });
    const result = await reconcileDevSlot(
      { worktree: '/tmp/partial', registryRoot: '/tmp/reg' },
      used,
    );
    assert.equal(result.ok, false);
    assert.equal(result.phase, phase);
    assert.equal(result.readyForWorkloads, false);
    assert.equal(used.calls.includes('images'), false);
  }
});

test('a foreign cluster, secret uid, occupied port, stale process, and low memory refuse', async () => {
  const foreign = await reconcileDevSlot(
    { worktree: '/tmp/a', registryRoot: '/tmp/reg' },
    deps({
      allocate: () => ({ ...record, cluster: 'kind-offscreen-lab' }),
    }),
  );
  assert.equal(foreign.phase, 'cluster');

  const secret = await reconcileDevSlot(
    { worktree: '/tmp/a', registryRoot: '/tmp/reg' },
    deps({
      ensureS3: async () => ({
        ok: false,
        refusals: [{ id: 'foreign-secret', detail: 'secret uid mismatch' }],
        retained: [],
      }),
    }),
  );
  assert.equal(secret.phase, 's3');

  const port = await reconcileDevSlot(
    { worktree: '/tmp/a', registryRoot: '/tmp/reg', portOccupied: true },
    deps(),
  );
  assert.equal(port.phase, 'port');

  const stale = await reconcileDevSlot(
    { worktree: '/tmp/a', registryRoot: '/tmp/reg', processOwned: false },
    deps(),
  );
  assert.equal(stale.phase, 'process');

  const memory = await reconcileDevSlot(
    { worktree: '/tmp/a', registryRoot: '/tmp/reg', memoryMiB: 256 },
    deps(),
  );
  assert.equal(memory.phase, 'capacity');
});

test('two concurrent startups of one worktree keep a single slot', async () => {
  const root = mkdtempSync(join(tmpdir(), 'offscreen-reg-'));
  const worktree = mkdtempSync(join(tmpdir(), 'offscreen-wt-'));
  const allocate = (path, registry) =>
    allocateDevWorktreeOwner(path, registry, { isPortAvailable: () => true });
  const [left, right] = await Promise.all([
    reconcileDevSlot({ worktree, registryRoot: root }, deps({ allocate })),
    reconcileDevSlot({ worktree, registryRoot: root }, deps({ allocate })),
  ]);
  assert.equal(left.identities.slotId, right.identities.slotId);
});

test('missing slot images are rebuilt and present images are skipped', () => {
  const plan = planSlotImageBuilds('dev-4', (ref) => ref.endsWith('-web'));
  assert.equal(
    plan.missing.some((image) => image.role === 'web'),
    false,
  );
  assert.deepEqual(
    plan.missing.map((image) => image.role),
    ['api', 'authority', 'worker'],
  );
});

test('reports omit credential material and local registry files stay untracked', async () => {
  const used = deps({
    project: async () => ({
      ok: true,
      dbUid: 'db',
      s3Uid: 's3',
      appUid: 'app',
      password: 'should-not-be-copied',
    }),
  });
  const result = await reconcileDevSlot(
    { worktree: '/tmp/new', registryRoot: '/tmp/reg' },
    used,
  );
  assert.equal(
    JSON.stringify(result.identities).includes('should-not-be-copied'),
    false,
  );
  const ignored = spawnSync(
    'git',
    ['check-ignore', '-q', '.offscreen/dev-session.json'],
    { encoding: 'utf8' },
  );
  assert.equal(ignored.status, 0);
});

test('image load failure names role, phase, node, exit and redacts secrets', () => {
  const secret = 'super-secret-value';
  const failure = describeImageLoadFailure(
    { role: 'authority' },
    {
      status: 1,
      stderr: [
        'phase=docker-build role=authority',
        'phase=kind-load role=authority node=offscreen-dev-control-plane',
        `postgres://dev_3_run:${secret}@postgres/dev_3 password=${secret}`,
        'AKIAIOSFODNN7EXAMPLE',
        'accept4 failed 110',
      ].join('\n'),
    },
  );
  assert.match(failure.detail, /role=authority/);
  assert.match(failure.detail, /phase=kind-load/);
  assert.match(failure.detail, /node=offscreen-dev-control-plane/);
  assert.match(failure.detail, /exit=1/);
  assert.match(failure.detail, /accept4 failed 110/);
  assert.equal(failure.detail.includes(secret), false);
  assert.equal(failure.detail.includes('AKIAIOSFODNN7EXAMPLE'), false);
});

test('slot image script reports build, control-plane and worker failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'img-load-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const script = join(
    repoRoot,
    'infra/images/development/load-dev-slot-image.sh',
  );
  const mark = join(root, 'fingerprint.mark');
  const run = (mode) =>
    spawnSync(
      'bash',
      [script, 'dev-3', 'authority', '@offscreen/game-authority'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          OFFSCREEN_REAL_NODE: execPath,
          IMG_MODE: mode,
          OFFSCREEN_IMAGE_FINGERPRINT: 'test-fingerprint',
        },
      },
    );
  writeFileSync(
    join(bin, 'node'),
    `#!/bin/bash
if [[ "\${1:-}" == *kind-image-loader.mjs ]]; then
  if [[ "$IMG_MODE" == "control-fail" ]]; then echo "control load failed" >&2; exit 8; fi
  if [[ "$IMG_MODE" == "worker-fail" ]]; then echo "worker load failed" >&2; exit 9; fi
  ref="\$3"
  echo "{\\"ref\\":\\"\$ref\\",\\"digest\\":\\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\",\\"loadedNodes\\":[\\"offscreen-dev-control-plane\\"],\\"reusedNodes\\":[]}"
  exit 0
fi
exec "\${OFFSCREEN_REAL_NODE}" "$@"
`,
  );
  writeFileSync(
    join(bin, 'docker'),
    `#!/bin/bash
if [[ "$1" == "image" && "$2" == "inspect" ]]; then
  if [[ "$*" == *offscreen.fingerprint* ]]; then
    if [[ "$IMG_MODE" == "build-fail" ]]; then exit 0; fi
    if [[ -f "${mark}" ]]; then cat "${mark}"; else printf 'test-fingerprint'; fi
    exit 0
  fi
  echo sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  exit 0
fi
if [[ "$1" == "build" ]]; then
  if [[ "$IMG_MODE" == "build-fail" ]]; then echo "build exploded password=hidden-secret" >&2; exit 7; fi
  printf 'test-fingerprint' > "${mark}"
  exit 0
fi
if [[ "$1" == "tag" ]]; then exit 0; fi
if [[ "$1" == "exec" && "$*" == *"images ls"* ]]; then
  for r in \\
    offscreen-dev-workspace:union-test-fingerpri \\
    offscreen-dev-workspace:dev-3-authority; do
    printf 'docker.io/library/%s application/vnd.oci.image.index.v1+json sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n' "$r"
  done
  exit 0
fi
exit 0
`,
  );
  writeFileSync(join(bin, 'kind'), '#!/bin/bash\nexit 0\n');
  chmodSync(join(bin, 'node'), 0o755);
  chmodSync(join(bin, 'docker'), 0o755);
  chmodSync(join(bin, 'kind'), 0o755);
  const ok = run('ok');
  assert.equal(ok.status, 0, ok.stderr);
  const build = describeImageLoadFailure(
    { role: 'authority' },
    run('build-fail'),
  );
  assert.match(build.detail, /phase=docker-build/);
  assert.match(build.detail, /exit=7/);
  assert.equal(build.detail.includes('hidden-secret'), false);
  const control = describeImageLoadFailure(
    { role: 'authority' },
    run('control-fail'),
  );
  assert.match(control.detail, /exit=8/);
  const worker = describeImageLoadFailure(
    { role: 'authority' },
    run('worker-fail'),
  );
  assert.match(worker.detail, /exit=9/);
});

test('concurrent slot loads of one fingerprint build once', async () => {
  const root = mkdtempSync(join(tmpdir(), 'img-lock-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const mark = join(root, 'marked');
  const counter = join(root, 'builds');
  writeFileSync(
    join(bin, 'node'),
    `#!/bin/bash
if [[ "\${1:-}" == *kind-image-loader.mjs ]]; then
  ref="\$3"
  echo "{\\"ref\\":\\"\$ref\\",\\"digest\\":\\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\",\\"loadedNodes\\":[],\\"reusedNodes\\":[]}"
  exit 0
fi
exec "\${OFFSCREEN_REAL_NODE}" "$@"
`,
  );
  writeFileSync(
    join(bin, 'docker'),
    `#!/bin/bash
if [[ "$1" == "image" && "$2" == "inspect" ]]; then
  if [[ "$*" == *offscreen.fingerprint* ]]; then
    if [[ -f "${mark}" ]]; then cat "${mark}"; fi
    exit 0
  fi
  echo sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  exit 0
fi
if [[ "$1" == "build" ]]; then
  echo 1 >> "${counter}"
  sleep 0.4
  printf '%s' "$OFFSCREEN_IMAGE_FINGERPRINT" > "${mark}"
  exit 0
fi
if [[ "$1" == "tag" ]]; then exit 0; fi
if [[ "$1" == "exec" && "$*" == *"images ls"* ]]; then
  for r in \\
    offscreen-dev-workspace:union-same-fp \\
    offscreen-dev-workspace:dev-3-web \\
    offscreen-dev-workspace:dev-3-api \\
    offscreen-dev-workspace:dev-3-authority \\
    offscreen-dev-workspace:dev-3-worker \\
    offscreen-dev-workspace:dev-4-web; do
    printf 'docker.io/library/%s application/vnd.oci.image.index.v1+json sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n' "$r"
  done
  exit 0
fi
exit 0
`,
  );
  writeFileSync(join(bin, 'kind'), '#!/bin/bash\nexit 0\n');
  chmodSync(join(bin, 'node'), 0o755);
  chmodSync(join(bin, 'docker'), 0o755);
  chmodSync(join(bin, 'kind'), 0o755);
  const script = join(
    repoRoot,
    'infra/images/development/load-dev-slot-image.sh',
  );
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    OFFSCREEN_REAL_NODE: execPath,
    OFFSCREEN_IMAGE_FINGERPRINT: 'same-fp',
    TMPDIR: root,
  };
  const run = (slot, role) =>
    new Promise((resolve) => {
      const child = spawn('bash', [script, slot, role], { env, cwd: repoRoot });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('close', (status) => resolve({ status, stdout, stderr }));
    });
  const [left, right] = await Promise.all([
    run('dev-3', 'all'),
    run('dev-4', 'web'),
  ]);
  assert.equal(left.status, 0, left.stderr);
  assert.equal(right.status, 0, right.stderr);
  const builds = (left.stdout + right.stdout).match(/builds=1/g) ?? [];
  assert.equal(builds.length, 1);
  assert.match(left.stdout + right.stdout, /builds=0/);
  assert.equal(readFileSync(counter, 'utf8').trim().split('\n').length, 1);
});

test('shared core readiness failure refuses before sql without tenant mutations', async () => {
  const used = deps({
    verifySharedCore: async () => ({
      ok: false,
      detail: 'shared CNPG cluster is not Ready',
    }),
  });
  const result = await reconcileDevSlot(
    { worktree: '/tmp/core', registryRoot: '/tmp/reg' },
    used,
  );
  assert.equal(result.ok, false);
  assert.equal(result.phase, 'platform');
  assert.equal(used.calls.includes('artifact'), false);
  assert.equal(used.calls.includes('sql'), false);
  assert.equal(used.calls.includes('migration'), false);
});

test('projection failure stops before images with zero later mutation', async () => {
  const used = deps({
    project: async () => {
      throw new Error('selected owner is missing');
    },
  });
  const result = await reconcileDevSlot(
    {
      worktree: '/tmp/project-fail',
      registryRoot: '/tmp/reg',
      owner: record,
    },
    used,
  );
  assert.equal(result.ok, false);
  assert.equal(result.phase, 'project');
  assert.equal(result.detail, 'selected owner is missing');
  assert.equal(result.identities, undefined);
  assert.equal(used.calls.includes('images'), false);
});

test('migration failure prevents projection and later workload stages', async () => {
  const used = deps({
    ensureMigration: async () => ({
      ok: false,
      refusals: [{ id: 'schema-not-verified', detail: 'dev_3' }],
    }),
  });
  const result = await reconcileDevSlot(
    { worktree: '/tmp/migrate-fail', registryRoot: '/tmp/reg' },
    used,
  );
  assert.equal(result.ok, false);
  assert.equal(result.phase, 'migration');
  assert.equal(used.calls.includes('project'), false);
  assert.equal(used.calls.includes('images'), false);
});

test('migration artifact failure refuses before sql with empty retained', async () => {
  const used = deps({
    prepareMigrationArtifact: async () => ({
      ok: false,
      detail: 'packages/db build failed before tenant mutation',
    }),
  });
  const result = await reconcileDevSlot(
    { worktree: '/tmp/artifact', registryRoot: '/tmp/reg' },
    used,
  );
  assert.equal(result.ok, false);
  assert.equal(result.phase, 'artifact');
  assert.deepEqual(result.retained, []);
  assert.equal(used.calls.includes('sql'), false);
});

test('probeCluster observation does not run oauth or artifact before gates', async () => {
  const events = [];
  const used = deps({
    validateOauth: async () => {
      events.push('oauth');
      return {
        ok: false,
        detail: 'approved local OAuth configuration is missing',
      };
    },
    probeCluster: async () => {
      events.push('probe');
      return { ok: true, cluster: 'kind-offscreen-dev', memoryMiB: 4096 };
    },
    prepareMigrationArtifact: async () => {
      events.push('artifact');
      return { ok: true };
    },
  });
  const result = await reconcileDevSlot(
    { worktree: '/tmp/oauth-gate', registryRoot: '/tmp/reg' },
    used,
  );
  assert.equal(result.phase, 'oauth');
  assert.deepEqual(events, ['probe', 'oauth']);
  assert.equal(used.calls.includes('sql'), false);
});

test('oauth readiness refuses before sql for a missing, incomplete, short, or unreadable file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'oauth-ready-'));
  const worktree = join(root, 'wt');
  mkdirSync(worktree);
  const home = join(root, 'home');
  const shared = join(home, '.local/state/offscreen-rpg/dev-oauth.env');
  mkdirSync(join(home, '.local/state/offscreen-rpg'), { recursive: true });
  const valid =
    'GITHUB_CLIENT_ID=id\nGITHUB_CLIENT_SECRET=secret\nBETTER_AUTH_SECRET=12345678901234567890123456789012\n';
  const previousHome = process.env.HOME;
  process.env.HOME = home;
  try {
    const missing = await resolveOauthReadiness(worktree, {});
    assert.equal(missing.ok, false);
    assert.equal(missing.detail, 'approved local OAuth file is missing');

    writeFileSync(shared, 'GITHUB_CLIENT_ID=id\n');
    const incomplete = await resolveOauthReadiness(worktree, {});
    assert.equal(
      incomplete.detail,
      'approved local OAuth configuration is missing',
    );

    writeFileSync(
      shared,
      'GITHUB_CLIENT_ID=id\nGITHUB_CLIENT_SECRET=secret\nBETTER_AUTH_SECRET=short\n',
    );
    const short = await resolveOauthReadiness(worktree, {});
    assert.equal(short.detail, 'approved local OAuth configuration is missing');

    writeFileSync(shared, valid);
    chmodSync(shared, 0);
    const unreadable = await resolveOauthReadiness(worktree, {});
    assert.equal(
      unreadable.detail,
      'approved local OAuth configuration is unreadable',
    );
    assert.equal(JSON.stringify(unreadable).includes('GITHUB'), false);

    chmodSync(shared, 0o600);
    const ready = await resolveOauthReadiness(worktree, {});
    assert.equal(ready.ok, true);
    assert.equal(ready.path, shared);

    const override = join(root, 'override.env');
    writeFileSync(override, 'GITHUB_CLIENT_ID=only\n');
    const overridden = await resolveOauthReadiness(worktree, {
      OFFSCREEN_DEV_OAUTH_FILE: override,
    });
    assert.equal(overridden.ok, false);
    assert.equal(
      overridden.detail,
      'approved local OAuth configuration is missing',
    );
  } finally {
    chmodSync(shared, 0o600);
    process.env.HOME = previousHome;
  }

  const used = deps({
    validateOauth: async () => ({
      ok: false,
      detail: 'approved local OAuth configuration is missing',
    }),
  });
  const imageRoot = mkdtempSync(join(tmpdir(), 'oauth-image-'));
  const images = await ensureOwnedSlotImages(
    { slotId: 'dev-9' },
    imageRoot,
    () => ({ status: 0, stdout: 'builds=0' }),
  );
  assert.equal(images.ok, false);
  assert.equal(images.refusals[0].detail.includes('unreadable-recipe'), true);

  const blocked = await reconcileDevSlot(
    { worktree, registryRoot: root },
    used,
  );
  assert.equal(blocked.phase, 'oauth');
  assert.equal(used.calls.includes('artifact'), false);
  assert.equal(used.calls.includes('sql'), false);
});

function workloadProjected(slotId = 'dev-4') {
  const gamePort = 13112;
  const graph = renderDevSlotAppGraph(slotId, {
    schemaReady: true,
    ports: { game: gamePort },
  });
  return {
    record: {
      slotId,
      namespace: graph.namespace,
      ports: { game: gamePort },
    },
    documents: graph.documents,
    graph,
  };
}

function helmOk(run, kubectlCalls) {
  return (cmd, args, options) => {
    const joined = [cmd, ...(args ?? [])].join(' ');
    kubectlCalls.push(joined);
    if (joined.includes('helm version')) {
      return {
        status: 0,
        stdout: 'v3.22.1+gabc\n',
        stderr: '',
        error: undefined,
        signal: null,
      };
    }
    if (joined.includes('helm template')) {
      return spawnSync(cmd, args, options);
    }
    throw new Error(`unexpected command: ${joined}`);
  };
}

function ownedDeployment(name, slotId) {
  return {
    kind: 'Deployment',
    metadata: {
      name,
      labels: {
        'offscreen.dev/owner': 'offscreen-dev',
        'offscreen.dev/slot': slotId,
      },
    },
  };
}

function ownedService(name, slotId, ports) {
  return {
    kind: 'Service',
    metadata: {
      name,
      labels: {
        'offscreen.dev/owner': 'offscreen-dev',
        'offscreen.dev/slot': slotId,
      },
    },
    spec: { ports },
  };
}

function mockWorkloadKubectl(projected, kubectlCalls, handlers) {
  const nsDoc = projected.documents.find((item) => item.kind === 'Namespace');
  helmOk(runPlaceholder, kubectlCalls);
  function runPlaceholder(cmd, args, options) {
    const joined = [cmd, ...(args ?? [])].join(' ');
    kubectlCalls.push(joined);
    if (joined.includes('helm version')) {
      return {
        status: 0,
        stdout: 'v3.22.1+gabc\n',
        stderr: '',
        error: undefined,
        signal: null,
      };
    }
    if (joined.includes('helm template')) {
      return spawnSync(cmd, args, options);
    }
    if (joined.includes('get namespace')) {
      return (
        handlers.namespace?.(nsDoc) ?? {
          status: 0,
          stdout: JSON.stringify({
            metadata: {
              name: nsDoc.metadata.name,
              labels: nsDoc.metadata.labels,
            },
          }),
          stderr: '',
          error: undefined,
          signal: null,
        }
      );
    }
    if (joined.includes('get deployments,services')) {
      return (
        handlers.inventory?.() ?? {
          status: 0,
          stdout: JSON.stringify({ items: [] }),
          stderr: '',
          error: undefined,
          signal: null,
        }
      );
    }
    if (joined.includes(' create ')) {
      return (
        handlers.create?.(options) ?? {
          status: 0,
          stdout: '',
          stderr: '',
          error: undefined,
          signal: null,
        }
      );
    }
    if (joined.includes(' apply ')) {
      return (
        handlers.apply?.(options) ?? {
          status: 0,
          stdout: '',
          stderr: '',
          error: undefined,
          signal: null,
        }
      );
    }
    throw new Error(`unexpected command: ${joined}`);
  }
  return runPlaceholder;
}

test('deployment inventory failure applies nothing', async () => {
  const projected = workloadProjected('dev-4');
  const kubectlCalls = [];
  const run = mockWorkloadKubectl(projected, kubectlCalls, {
    inventory: () => ({
      status: 1,
      stdout: '',
      stderr: 'forbidden',
      error: undefined,
      signal: null,
    }),
  });
  const result = await applyOwnedSlotWorkloads(projected, {
    run,
    helmRun: run,
  });
  assert.equal(result.ok, false);
  assert.match(result.refusals[0].detail, /inventory/);
  assert.equal(result.workloadsTouched, false);
  assert.equal(
    kubectlCalls.some((line) => line.includes('apply')),
    false,
  );
  assert.equal(
    kubectlCalls.some((line) => line.includes('create')),
    false,
  );
});

test('foreign managed-name collision is rejected before writes', async () => {
  const projected = workloadProjected('dev-4');
  const kubectlCalls = [];
  const run = mockWorkloadKubectl(projected, kubectlCalls, {
    inventory: () => ({
      status: 0,
      stdout: JSON.stringify({
        items: [
          ownedDeployment('game-web', 'dev-9'),
          ownedService('game-web', 'dev-4', [{ port: 3000 }]),
        ],
      }),
      stderr: '',
      error: undefined,
      signal: null,
    }),
  });
  const result = await applyOwnedSlotWorkloads(projected, {
    run,
    helmRun: run,
  });
  assert.equal(result.ok, false);
  assert.match(result.refusals[0].detail, /collision/);
  assert.equal(result.workloadsTouched, false);
  assert.equal(
    kubectlCalls.some((line) => line.includes('create')),
    false,
  );
  assert.equal(
    kubectlCalls.some((line) => line.includes('apply')),
    false,
  );
});

test('an absent deployment is created on cold start', async () => {
  const projected = workloadProjected('dev-4');
  const kubectlCalls = [];
  let createdPayload = null;
  const run = mockWorkloadKubectl(projected, kubectlCalls, {
    inventory: () => ({
      status: 0,
      stdout: JSON.stringify({ items: [] }),
      stderr: '',
      error: undefined,
      signal: null,
    }),
    create: (options) => {
      createdPayload = options?.input ?? null;
      return {
        status: 0,
        stdout: '',
        stderr: '',
        error: undefined,
        signal: null,
      };
    },
  });
  const result = await applyOwnedSlotWorkloads(projected, {
    run,
    helmRun: run,
  });
  assert.equal(result.ok, true);
  assert.equal(result.workloadsTouched, true);
  assert.ok(createdPayload);
  const parsed = JSON.parse(createdPayload);
  assert.equal(
    parsed.items.some(
      (item) => item.kind === 'Deployment' && item.metadata.name === 'game-web',
    ),
    true,
  );
});

test('existing active deployments are not overwritten on cold start', async () => {
  const projected = workloadProjected('dev-4');
  const kubectlCalls = [];
  let createdPayload = null;
  const deployments = [
    'game-web',
    'game-api',
    'game-authority',
    'game-control',
    'game-executor',
    'game-relay',
  ].map((name) => ownedDeployment(name, 'dev-4'));
  const run = mockWorkloadKubectl(projected, kubectlCalls, {
    inventory: () => ({
      status: 0,
      stdout: JSON.stringify({ items: deployments }),
      stderr: '',
      error: undefined,
      signal: null,
    }),
    create: (options) => {
      createdPayload = options?.input ?? null;
      return {
        status: 0,
        stdout: '',
        stderr: '',
        error: undefined,
        signal: null,
      };
    },
  });
  const result = await applyOwnedSlotWorkloads(projected, {
    run,
    helmRun: run,
  });
  assert.equal(result.ok, true);
  assert.equal(createdPayload, null);
  assert.equal(
    kubectlCalls.some((line) => line.includes(' create ')),
    false,
  );
  assert.equal(
    kubectlCalls.some((line) => line.includes(' apply ')),
    true,
  );
});

test('partial workload apply failure still reports workloadsTouched', async () => {
  const projected = workloadProjected('dev-4');
  const kubectlCalls = [];
  const run = mockWorkloadKubectl(projected, kubectlCalls, {
    inventory: () => ({
      status: 0,
      stdout: JSON.stringify({ items: [] }),
      stderr: '',
      error: undefined,
      signal: null,
    }),
    create: () => ({
      status: 0,
      stdout: '',
      stderr: '',
      error: undefined,
      signal: null,
    }),
    apply: () => ({
      status: 1,
      stdout: '',
      stderr: 'apply refused',
      error: undefined,
      signal: null,
    }),
  });
  const result = await applyOwnedSlotWorkloads(projected, {
    run,
    helmRun: run,
  });
  assert.equal(result.ok, false);
  assert.equal(result.workloadsTouched, true);
  assert.equal(result.refusals[0].id, 'workload-apply');
});

test('helm failure refuses before workload apply', async () => {
  const projected = {
    record: {
      slotId: 'dev-4',
      namespace: 'offscreen-dev-4',
      ports: { game: 13112 },
    },
    documents: [],
  };
  const run = (cmd) => {
    if (cmd === 'helm') {
      return {
        status: 127,
        stdout: '',
        stderr: 'not found',
        error: undefined,
        signal: null,
      };
    }
    throw new Error('kubectl must not run when helm is missing');
  };
  const result = await applyOwnedSlotWorkloads(projected, {
    run,
    helmRun: run,
    skipRenderCheck: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'helm');
});
