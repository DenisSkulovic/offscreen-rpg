import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
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
  planDevCluster,
  renderDevKindConfig,
  statusDevCluster,
} from './dev-cluster-bootstrap.mjs';

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
  const committed = readFileSync(join(here, 'kind.yaml'), 'utf8');
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

test('the CLI plans from an injected probe and refuses live ensure', () => {
  const script = join(here, 'dev-cluster-bootstrap.mjs');
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
});
