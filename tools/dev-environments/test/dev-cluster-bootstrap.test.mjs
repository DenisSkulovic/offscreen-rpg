import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { collectDevClusterProbe, parseLoopbackListenPorts, parseMeminfoMiB } from '../src/adapters/dev-cluster-host-probe.mjs';
import {
  DEV_API_PORT_RANGE,
  DEV_BASELINE_NAMESPACE,
  DEV_KIND_CLUSTER_NAME,
  DEV_KIND_CONTEXT_NAME,
  DEV_NODE_IMAGE,
  MIN_HOST_MEMORY_MIB,
  RELEASE_API_PORT,
  RELEASE_KIND_CLUSTER_NAME,
  RELEASE_KIND_CONTEXT_NAME,
  ensureDevCluster,
  executeAuthorizedDevCluster,
  renderBaselineNamespace,
  planDevCluster,
  renderDevKindConfig,
  statusDevCluster,
} from '../src/adapters/dev-cluster-bootstrap.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const readyProbe = {
  dockerAvailable: true,
  kindAvailable: true,
  memoryMiB: MIN_HOST_MEMORY_MIB,
  clusters: [{ name: RELEASE_KIND_CLUSTER_NAME, owner: 'release', uid: 'lab-uid' }],
  contexts: [{ name: RELEASE_KIND_CONTEXT_NAME, cluster: RELEASE_KIND_CLUSTER_NAME, owner: 'release', uid: 'lab-uid' }],
  namespaces: [],
  listeningPorts: [RELEASE_API_PORT],
  currentContext: RELEASE_KIND_CONTEXT_NAME,
};

test('plan names the dev cluster, loopback API, and a port other than the release API', () => {
  const plan = planDevCluster(readyProbe);
  assert.equal(plan.readOnly, true);
  assert.equal(plan.clusterName, DEV_KIND_CLUSTER_NAME);
  assert.equal(plan.contextName, DEV_KIND_CONTEXT_NAME);
  assert.equal(plan.apiServerAddress, '127.0.0.1');
  assert.notEqual(plan.apiServerPort, RELEASE_API_PORT);
  assert.ok(plan.apiServerPort >= DEV_API_PORT_RANGE.start);
  assert.equal(plan.nodeImage, DEV_NODE_IMAGE);
  assert.equal(plan.currentContext, RELEASE_KIND_CONTEXT_NAME);
  assert.equal(plan.releasePresent, true);
  assert.deepEqual(plan.actions, []);
  assert.deepEqual(plan.refusals, []);
  const committed = readFileSync(join(here, '../../../infra/kubernetes/lab/dev/kind.yaml'), 'utf8');
  assert.match(committed, /127\.0\.0\.1/);
  assert.doesNotMatch(committed, /apiServerPort:\s*6443/);
  assert.doesNotMatch(committed, new RegExp(`name:\\s*${RELEASE_KIND_CLUSTER_NAME}`));
  const rendered = renderDevKindConfig(plan.apiServerPort);
  assert.match(rendered, new RegExp(`apiServerPort: ${plan.apiServerPort}`));
  assert.match(rendered, /apiServerAddress: "127.0.0.1"/);
});

test('status distinguishes an absent cluster from an owned one', () => {
  assert.equal(statusDevCluster(readyProbe).cluster, 'absent');
  const owned = statusDevCluster({
    ...readyProbe,
    clusters: [
      ...readyProbe.clusters,
      { name: DEV_KIND_CLUSTER_NAME, owner: 'offscreen-dev', uid: 'dev-uid' },
    ],
    namespaces: [
      {
        cluster: DEV_KIND_CLUSTER_NAME,
        name: DEV_BASELINE_NAMESPACE,
        owner: 'offscreen-dev',
        uid: 'ns-uid',
      },
    ],
  });
  assert.equal(owned.cluster, 'owned');
  assert.equal(owned.namespace, 'owned');
  assert.deepEqual(owned.actions, []);
});

test('authorized ensure creates only the dev cluster and restores the current context', () => {
  const result = ensureDevCluster(readyProbe, { authorize: true });
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.actions.map((action) => action.op),
    ['create-cluster', 'ensure-namespace', 'restore-context'],
  );
  assert.equal(result.actions[0].name, DEV_KIND_CLUSTER_NAME);
  assert.equal(result.actions[0].context, DEV_KIND_CONTEXT_NAME);
  assert.equal(result.actions[0].apiServerAddress, '127.0.0.1');
  assert.equal(result.actions[2].context, RELEASE_KIND_CONTEXT_NAME);
  assert.equal(result.actions.some((action) => String(action.op).includes('delete')), false);
  assert.equal(
    result.actions.some((action) => action.name === RELEASE_KIND_CLUSTER_NAME || action.cluster === RELEASE_KIND_CLUSTER_NAME),
    false,
  );
});

test('re-entry of an owned cluster is a no-op', () => {
  const result = ensureDevCluster(
    {
      ...readyProbe,
      clusters: [
        ...readyProbe.clusters,
        { name: DEV_KIND_CLUSTER_NAME, owner: 'offscreen-dev', uid: 'dev-uid' },
      ],
      contexts: [
        ...readyProbe.contexts,
        {
          name: DEV_KIND_CONTEXT_NAME,
          cluster: DEV_KIND_CLUSTER_NAME,
          owner: 'offscreen-dev',
          uid: 'dev-uid',
        },
      ],
      namespaces: [
        {
          cluster: DEV_KIND_CLUSTER_NAME,
          name: DEV_BASELINE_NAMESPACE,
          owner: 'offscreen-dev',
          uid: 'ns-uid',
        },
      ],
    },
    { authorize: true },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.actions, [{ op: 'noop', cluster: DEV_KIND_CLUSTER_NAME }]);
});

test('foreign cluster, occupied port, missing tools, wrong context, low memory, and stale uid refuse without deletion', () => {
  const cases = [
    {
      id: 'foreign-cluster',
      probe: {
        ...readyProbe,
        clusters: [
          ...readyProbe.clusters,
          { name: DEV_KIND_CLUSTER_NAME, owner: 'someone-else', uid: 'foreign' },
        ],
      },
    },
    {
      id: 'api-port-occupied',
      probe: { ...readyProbe, listeningPorts: [24443] },
      options: { portRange: { start: 24443, end: 24443 } },
    },
    { id: 'docker-unavailable', probe: { ...readyProbe, dockerAvailable: false } },
    { id: 'kind-unavailable', probe: { ...readyProbe, kindAvailable: false } },
    {
      id: 'foreign-context',
      probe: {
        ...readyProbe,
        contexts: [
          ...readyProbe.contexts,
          {
            name: DEV_KIND_CONTEXT_NAME,
            cluster: RELEASE_KIND_CLUSTER_NAME,
            owner: 'release',
            uid: 'lab-uid',
          },
        ],
      },
    },
    { id: 'insufficient-memory', probe: { ...readyProbe, memoryMiB: 512 } },
    {
      id: 'stale-registry-owner',
      probe: {
        ...readyProbe,
        registryClusterUid: 'expected',
        clusters: [
          ...readyProbe.clusters,
          { name: DEV_KIND_CLUSTER_NAME, owner: 'offscreen-dev', uid: 'actual' },
        ],
        contexts: [
          ...readyProbe.contexts,
          {
            name: DEV_KIND_CONTEXT_NAME,
            cluster: DEV_KIND_CLUSTER_NAME,
            owner: 'offscreen-dev',
            uid: 'actual',
          },
        ],
      },
    },
  ];
  for (const entry of cases) {
    const result = ensureDevCluster(entry.probe, { authorize: true, ...entry.options });
    assert.equal(result.ok, false, entry.id);
    assert.ok(result.refusals.some((refusal) => refusal.id === entry.id), entry.id);
    assert.equal(result.actions.some((action) => String(action.op).includes('delete')), false);
  }
});

test('a partial create refuses without deleting the release cluster or the new cluster', () => {
  const result = ensureDevCluster(readyProbe, {
    authorize: true,
    failAfterClusterCreate: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].id, 'partial-create');
  assert.deepEqual(
    result.actions.map((action) => action.op),
    ['create-cluster', 'restore-context'],
  );
});

test('unverified ownership stays unknown and is not treated as owned', () => {
  const status = statusDevCluster({
    ...readyProbe,
    clusters: [
      ...readyProbe.clusters,
      { name: DEV_KIND_CLUSTER_NAME, owner: null, ownership: 'unknown' },
    ],
  });
  assert.equal(status.cluster, 'unknown');
  const ensured = ensureDevCluster(
    {
      ...readyProbe,
      clusters: [
        ...readyProbe.clusters,
        { name: DEV_KIND_CLUSTER_NAME, owner: null, ownership: 'unknown' },
      ],
    },
    { authorize: true },
  );
  assert.equal(ensured.ok, false);
  assert.ok(ensured.refusals.some((refusal) => refusal.id === 'ownership-unknown'));
  assert.equal(ensured.apiServerPortStatus, 'candidate-unreserved');
  assert.deepEqual(ensured.actions, []);
});

function commandResult(overrides) {
  return {
    command: 'docker',
    ok: true,
    missing: false,
    timedOut: false,
    stdout: '',
    stderr: '',
    ...overrides,
  };
}

test('host probe reports unreachable docker, missing kind, foreign ownership, and timeouts', () => {
  const calls = [];
  const probe = collectDevClusterProbe({
    readMeminfo: () => 'MemTotal:     8388608 kB\nMemAvailable:  1048576 kB\n',
    readTcp: () => 'sl local_address rem_address st\n0: 0100007F:1F90 00000000:0000 0A\n',
    run(command, args) {
      calls.push([command, ...args]);
      if (command === 'docker') return commandResult({ command, ok: false, timedOut: true });
      if (command === 'kind') return commandResult({ command, ok: false, missing: true });
      if (command === 'kubectl' && args[0] === 'config' && args[1] === 'current-context') {
        return commandResult({ command, stdout: 'kind-offscreen-lab\n' });
      }
      if (command === 'kubectl') return commandResult({ command, stdout: 'kind-offscreen-lab\n' });
      return commandResult({ command, ok: false });
    },
  });
  assert.equal(probe.dockerAvailable, false);
  assert.equal(probe.kindAvailable, false);
  assert.deepEqual(probe.timedOutCommands, ['docker']);
  assert.equal(probe.capacity.memAvailableMiB, 1024);
  assert.equal(probe.listeningPorts.includes(8080), true);
  assert.equal(probe.currentContext, 'kind-offscreen-lab');
  assert.equal(calls.some((call) => call.includes('use-context')), false);
  const plan = planDevCluster(probe);
  assert.ok(plan.refusals.some((refusal) => refusal.id === 'command-timeout'));
  assert.ok(plan.refusals.some((refusal) => refusal.id === 'docker-unavailable'));
  assert.ok(plan.refusals.some((refusal) => refusal.id === 'kind-unavailable'));
  assert.equal(plan.apiServerPortStatus, 'candidate-unreserved');
  assert.equal(plan.releasePresent, null);
  assert.equal(statusDevCluster({ ...probe, timedOutCommands: ['kind'] }).cluster, 'unknown');
});

test('a same-name cluster without a verified label is unknown, and a foreign label is foreign', () => {
  const unknown = collectDevClusterProbe({
    readMeminfo: () => 'MemAvailable: 8388608 kB\nMemTotal: 8388608 kB\n',
    readTcp: () => '',
    run(command, args) {
      if (command === 'docker') return commandResult({ command, stdout: '29.9.3\n' });
      if (command === 'kind') return commandResult({ command, stdout: 'offscreen-dev\noffscreen-lab\n' });
      if (command === 'kubectl' && args.includes('current-context')) {
        return commandResult({ command, stdout: 'kind-offscreen-lab\n' });
      }
      if (command === 'kubectl' && args[0] === 'config') {
        return commandResult({ command, stdout: 'kind-offscreen-lab\n' });
      }
      return commandResult({ command, ok: false });
    },
  });
  const dev = unknown.clusters.find((cluster) => cluster.name === 'offscreen-dev');
  assert.equal(dev.ownership, 'unknown');
  assert.equal(unknown.releaseClusterObserved, true);
  assert.equal(statusDevCluster(unknown).cluster, 'unknown');

  const foreign = collectDevClusterProbe({
    readMeminfo: () => 'MemAvailable: 8388608 kB\nMemTotal: 8388608 kB\n',
    readTcp: () => '',
    run(command, args) {
      if (command === 'docker') return commandResult({ command, stdout: '29.9.3\n' });
      if (command === 'kind') return commandResult({ command, stdout: 'offscreen-dev\n' });
      if (command === 'kubectl' && args.includes('get')) {
        return commandResult({
          command,
          stdout: JSON.stringify({
            metadata: { labels: { 'offscreen.dev/owner': 'someone-else' }, uid: 'uid-1' },
          }),
        });
      }
      if (command === 'kubectl' && args.includes('current-context')) {
        return commandResult({ command, stdout: 'kind-offscreen-dev\n' });
      }
      return commandResult({ command, stdout: 'kind-offscreen-dev\n' });
    },
  });
  assert.equal(foreign.clusters[0].ownership, 'foreign');
  assert.equal(statusDevCluster(foreign).cluster, 'foreign');
  assert.equal(parseLoopbackListenPorts('').length, 0);
  assert.equal(parseMeminfoMiB('').memAvailableMiB, null);
});

test('the CLI plans from an injected probe and refuses live ensure', () => {
  const script = join(here, '../src/adapters/dev-cluster-bootstrap-cli.mjs');
  const plan = spawnSync(process.execPath, [script, 'plan'], {
    encoding: 'utf8',
    env: { ...process.env, OFFSCREEN_DEV_CLUSTER_PROBE: JSON.stringify(readyProbe) },
  });
  assert.equal(plan.status, 0);
  const body = JSON.parse(plan.stdout);
  assert.equal(body.contextName, DEV_KIND_CONTEXT_NAME);
  assert.deepEqual(body.actions, []);
  const ensure = spawnSync(process.execPath, [script, 'ensure'], { encoding: 'utf8' });
  assert.equal(ensure.status, 2);
  assert.match(ensure.stderr, /refusing live ensure/);
  const injected = spawnSync(process.execPath, [script, 'ensure'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OFFSCREEN_DEV_CLUSTER_ENSURE: 'authorized',
      OFFSCREEN_DEV_CLUSTER_PROBE: JSON.stringify(readyProbe),
    },
  });
  assert.equal(injected.status, 2);
  assert.match(injected.stderr, /injected probe cannot authorize/);
});

test('authorized execution rechecks, creates only the owned baseline, and restores context', () => {
  const calls = [];
  let checks = 0;
  const result = executeAuthorizedDevCluster({
    collect() {
      checks += 1;
      return readyProbe;
    },
    run(command, args, options = {}) {
      calls.push({ command, args, input: options.input ?? null });
      return { ok: true, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(checks, 2);
  assert.equal(calls[0].command, 'kind');
  assert.match(calls[0].input, /apiServerAddress: "127.0.0.1"/);
  assert.match(calls[1].input, new RegExp(`name: ${DEV_BASELINE_NAMESPACE}`));
  assert.match(renderBaselineNamespace(), /offscreen.dev\/owner: offscreen-dev/);
  assert.deepEqual(calls.at(-1).args, ['config', 'use-context', 'kind-offscreen-lab']);
  assert.equal(calls.some((call) => call.args.includes('delete')), false);
});

test('a changed preflight cancels creation before kind runs', () => {
  const calls = [];
  let checks = 0;
  const result = executeAuthorizedDevCluster({
    collect() {
      checks += 1;
      return checks === 1 ? readyProbe : { ...readyProbe, memoryMiB: 100 };
    },
    run(command, args) {
      calls.push({ command, args });
      return { ok: true };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutated, false);
  assert.equal(calls.length, 0);
  assert.equal(result.refusals[0].id, 'insufficient-memory');
});
