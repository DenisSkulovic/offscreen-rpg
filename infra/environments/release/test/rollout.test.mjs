import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderWorkloadDocuments, renderWorkloadYaml } from '../../../workloads/render.mjs';
import {
  annotateDeploymentPodTemplate,
  buildFilteredApplyManifest,
  deploymentRolloutRequired,
  familyForWorkloadName,
  parseReleaseImageSelection,
  prepareReleaseApplyManifest,
  verifyDeploymentRolloutExecution,
  verifySelectedReleaseRollouts,
} from '../rollout.mjs';

const CONFIG_DIGEST =
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
const MANIFEST_DIGEST =
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
const FOREIGN_DIGEST =
  'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const DEPLOYMENT_UID = '11111111-1111-4111-8111-111111111111';
const CURRENT_RS_UID = '22222222-2222-4222-8222-222222222222';
const OLD_RS_UID = '33333333-3333-4333-8333-333333333333';
const MAIN_CONTAINER = 'api';

/**
 * @param {{ replicas?: number }} [spec]
 * @param {{ status?: object, metadata?: object }} [overrides]
 */
function rolloutDeployment(spec = {}, overrides = {}) {
  const replicas = spec.replicas ?? 1;
  return {
    metadata: {
      name: 'game-api',
      namespace: 'lab-edge',
      uid: DEPLOYMENT_UID,
      generation: 2,
      ...overrides.metadata,
    },
    spec: {
      replicas,
      template: {
        metadata: {
          annotations: { 'offscreen.rpg/deployment-image-id': CONFIG_DIGEST },
        },
        spec: {
          containers: [
            { name: MAIN_CONTAINER, image: 'offscreen-lab-app-release-api:turn02' },
          ],
        },
      },
      ...spec,
    },
    status: {
      observedGeneration: 2,
      readyReplicas: replicas,
      updatedReplicas: replicas,
      ...overrides.status,
    },
  };
}

/**
 * @param {number} [replicas]
 * @param {string} [digest]
 */
function currentReplicaSet(replicas = 1, digest = CONFIG_DIGEST) {
  return {
    metadata: {
      name: 'game-api-current',
      uid: CURRENT_RS_UID,
      ownerReferences: [
        {
          kind: 'Deployment',
          name: 'game-api',
          uid: DEPLOYMENT_UID,
          controller: true,
        },
      ],
    },
    spec: {
      replicas,
      template: {
        metadata: {
          annotations: { 'offscreen.rpg/deployment-image-id': digest },
        },
      },
    },
  };
}

/**
 * @param {string} [digest]
 */
function oldReplicaSet(digest = FOREIGN_DIGEST) {
  return {
    metadata: {
      name: 'game-api-old',
      uid: OLD_RS_UID,
      ownerReferences: [
        {
          kind: 'Deployment',
          name: 'game-api',
          uid: DEPLOYMENT_UID,
          controller: true,
        },
      ],
    },
    spec: {
      replicas: 0,
      template: {
        metadata: {
          annotations: { 'offscreen.rpg/deployment-image-id': digest },
        },
      },
    },
  };
}

/**
 * @param {string} name
 * @param {string} rsName
 * @param {string} rsUid
 * @param {string} imageDigest
 * @param {{ terminating?: boolean, ready?: boolean }} [options]
 */
function rolloutPod(name, rsName, rsUid, imageDigest, options = {}) {
  const pod = {
    metadata: {
      name,
      ownerReferences: [
        { kind: 'ReplicaSet', name: rsName, uid: rsUid, controller: true },
      ],
    },
    status: {
      containerStatuses: [
        {
          name: MAIN_CONTAINER,
          ready: options.ready ?? true,
          imageID: `docker.io/library/app@${imageDigest}`,
        },
      ],
    },
  };
  if (options.terminating) {
    pod.metadata.deletionTimestamp = '2026-11-24T00:00:00Z';
  }
  return pod;
}

/**
 * @param {{ deployment: object, replicaSets?: object[], pods?: object[] }} fixture
 */
function createRolloutRun(fixture) {
  return (command, args) => {
    if (command !== 'kubectl') {
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    const joined = args.join(' ');
    if (
      joined.includes('game-api') &&
      joined.includes('get') &&
      joined.includes('deployment') &&
      !joined.includes('pods') &&
      !joined.includes('replicasets') &&
      !joined.includes('rollout')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify(fixture.deployment),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (joined.includes('get replicasets') && joined.includes('app=game-api')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({ items: fixture.replicaSets ?? [] }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (joined.includes('get pods') && joined.includes('app=game-api')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({ items: fixture.pods ?? [] }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: '',
      timedOut: false,
      missing: false,
    };
  };
}

const loaderReceipt = (ref) =>
  JSON.stringify({ ref, digest: CONFIG_DIGEST, loadedNodes: [], reusedNodes: ['n1'] });

const edgeDocs = renderWorkloadDocuments({ profile: 'release', section: 'edge' });
const webDeployment = edgeDocs.find((doc) => doc.metadata?.name === 'game-web');
const apiDeployment = edgeDocs.find((doc) => doc.metadata?.name === 'game-api');

test('familyForWorkloadName maps the six app Deployments', () => {
  assert.equal(familyForWorkloadName('game-web'), 'web');
  assert.equal(familyForWorkloadName('game-api'), 'api');
  assert.equal(familyForWorkloadName('game-authority'), 'game-authority');
  assert.equal(familyForWorkloadName('game-control'), 'worker');
  assert.equal(familyForWorkloadName('foreign'), null);
});

test('web-only apply manifest omits game-api Deployment', () => {
  const manifests = buildFilteredApplyManifest({
    section: 'edge',
    documents: edgeDocs,
    selectedFamilies: parseReleaseImageSelection('web'),
    loaderReceipts: { web: JSON.parse(loaderReceipt('offscreen-lab-game-web:turn02')) },
    existingDeployments: {},
  });
  const names = manifests.filter((doc) => doc.kind === 'Deployment').map((doc) => doc.metadata.name);
  assert.deepEqual(names, ['game-web']);
  assert.equal(
    manifests.some((doc) => doc.kind === 'Service' && doc.metadata.name === 'game-api'),
    false,
  );
});

test('worker-only selection does not reference migration workloads', () => {
  const workers = renderWorkloadDocuments({ profile: 'release', section: 'workers' });
  const manifests = buildFilteredApplyManifest({
    section: 'workers',
    documents: workers,
    selectedFamilies: parseReleaseImageSelection('worker'),
    loaderReceipts: {
      worker: JSON.parse(loaderReceipt('offscreen-lab-app-release-worker:turn02')),
    },
    existingDeployments: {},
  });
  assert.equal(manifests.some((doc) => doc.kind === 'Job'), false);
  assert.equal(
    manifests.filter((doc) => doc.kind === 'Deployment').length,
    3,
  );
});

test('digest change annotates the selected Pod template and is included for apply', () => {
  const annotated = buildFilteredApplyManifest({
    section: 'edge',
    documents: edgeDocs,
    selectedFamilies: parseReleaseImageSelection('api'),
    loaderReceipts: { api: JSON.parse(loaderReceipt('offscreen-lab-app-release-api:turn02')) },
    existingDeployments: {
      'lab-edge/game-api': {
        spec: {
          template: {
            metadata: {
              annotations: { 'offscreen.rpg/deployment-image-id': FOREIGN_DIGEST },
            },
          },
        },
      },
    },
  });
  const api = annotated.find(
    (doc) => doc.kind === 'Deployment' && doc.metadata?.name === 'game-api',
  );
  assert.ok(api);
  assert.equal(
    api.spec.template.metadata.annotations['offscreen.rpg/deployment-image-id'],
    CONFIG_DIGEST,
  );
});

test('same digest with changed resources still appears in the prepared apply manifest', () => {
  assert.equal(deploymentRolloutRequired(CONFIG_DIGEST, CONFIG_DIGEST), false);
  const renderedWeb = edgeDocs.find(
    (doc) => doc.kind === 'Deployment' && doc.metadata?.name === 'game-web',
  );
  assert.ok(renderedWeb);
  const desiredWeb = structuredClone(renderedWeb);
  desiredWeb.spec.replicas = (desiredWeb.spec.replicas ?? 1) + 2;
  desiredWeb.spec.template.spec.containers[0].env = [
    ...(desiredWeb.spec.template.spec.containers[0].env ?? []),
    { name: 'INF32_PROBE', value: '1' },
  ];
  const documents = edgeDocs.map((doc) =>
    doc.metadata?.name === 'game-web' ? desiredWeb : doc,
  );
  const filtered = buildFilteredApplyManifest({
    section: 'edge',
    documents,
    selectedFamilies: parseReleaseImageSelection('web'),
    loaderReceipts: { web: JSON.parse(loaderReceipt('offscreen-lab-game-web:turn02')) },
    existingDeployments: {
      'lab-edge/game-web': annotateDeploymentPodTemplate(renderedWeb, CONFIG_DIGEST),
    },
  });
  const web = filtered.find(
    (doc) => doc.kind === 'Deployment' && doc.metadata?.name === 'game-web',
  );
  assert.ok(web);
  assert.equal(web.spec.replicas, desiredWeb.spec.replicas);
  assert.equal(
    web.spec.template.metadata.annotations['offscreen.rpg/deployment-image-id'],
    CONFIG_DIGEST,
  );
});

test('same desired manifest keeps an identical pod template annotation', () => {
  const renderedWeb = edgeDocs.find(
    (doc) => doc.kind === 'Deployment' && doc.metadata?.name === 'game-web',
  );
  assert.ok(renderedWeb);
  const filtered = buildFilteredApplyManifest({
    section: 'edge',
    documents: edgeDocs,
    selectedFamilies: parseReleaseImageSelection('web'),
    loaderReceipts: { web: JSON.parse(loaderReceipt('offscreen-lab-game-web:turn02')) },
    existingDeployments: {
      'lab-edge/game-web': annotateDeploymentPodTemplate(renderedWeb, CONFIG_DIGEST),
    },
  });
  const web = filtered.find(
    (doc) => doc.kind === 'Deployment' && doc.metadata?.name === 'game-web',
  );
  assert.ok(web);
  assert.equal(
    web.spec.template.metadata.annotations['offscreen.rpg/deployment-image-id'],
    CONFIG_DIGEST,
  );
  const reannotated = annotateDeploymentPodTemplate(renderedWeb, CONFIG_DIGEST);
  assert.equal(
    web.spec.template.metadata.annotations['offscreen.rpg/deployment-image-id'],
    reannotated.spec.template.metadata.annotations['offscreen.rpg/deployment-image-id'],
  );
});

test('verifyDeploymentRolloutExecution rejects unknown pod image identity', () => {
  const run = createRolloutRun({
    deployment: rolloutDeployment(),
    replicaSets: [currentReplicaSet()],
    pods: [rolloutPod('game-api-a', 'game-api-current', CURRENT_RS_UID, FOREIGN_DIGEST)],
  });
  assert.throws(
    () =>
      verifyDeploymentRolloutExecution(
        run,
        'kind-offscreen-lab',
        'lab-edge',
        'game-api',
        CONFIG_DIGEST,
        [MANIFEST_DIGEST],
      ),
    /unknown/,
  );
});

test('verifyDeploymentRolloutExecution rejects two replicas when one pod image is wrong', () => {
  const run = createRolloutRun({
    deployment: rolloutDeployment({ replicas: 2 }),
    replicaSets: [currentReplicaSet(2)],
    pods: [
      rolloutPod('game-api-a', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST),
      rolloutPod('game-api-b', 'game-api-current', CURRENT_RS_UID, FOREIGN_DIGEST),
    ],
  });
  assert.throws(
    () =>
      verifyDeploymentRolloutExecution(
        run,
        'kind-offscreen-lab',
        'lab-edge',
        'game-api',
        CONFIG_DIGEST,
        [CONFIG_DIGEST, MANIFEST_DIGEST],
      ),
    /unknown/,
  );
});

test('verifyDeploymentRolloutExecution rejects nonterminating pods from an old ReplicaSet', () => {
  const run = createRolloutRun({
    deployment: rolloutDeployment({ replicas: 2 }),
    replicaSets: [currentReplicaSet(2), oldReplicaSet()],
    pods: [
      rolloutPod('game-api-a', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST),
      rolloutPod('game-api-old', 'game-api-old', OLD_RS_UID, FOREIGN_DIGEST),
    ],
  });
  assert.throws(
    () =>
      verifyDeploymentRolloutExecution(
        run,
        'kind-offscreen-lab',
        'lab-edge',
        'game-api',
        CONFIG_DIGEST,
        [CONFIG_DIGEST, MANIFEST_DIGEST],
      ),
    /old ReplicaSet/,
  );
});

test('verifyDeploymentRolloutExecution ignores terminating pods from an old ReplicaSet', () => {
  const run = createRolloutRun({
    deployment: rolloutDeployment(),
    replicaSets: [currentReplicaSet(), oldReplicaSet()],
    pods: [
      rolloutPod('game-api-a', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST),
      rolloutPod('game-api-old', 'game-api-old', OLD_RS_UID, FOREIGN_DIGEST, {
        terminating: true,
      }),
    ],
  });
  assert.doesNotThrow(() =>
    verifyDeploymentRolloutExecution(
      run,
      'kind-offscreen-lab',
      'lab-edge',
      'game-api',
      CONFIG_DIGEST,
      [CONFIG_DIGEST, MANIFEST_DIGEST],
    ),
  );
});

test('verifyDeploymentRolloutExecution rejects a foreign pod with the app selector', () => {
  const run = createRolloutRun({
    deployment: rolloutDeployment({ replicas: 2 }),
    replicaSets: [currentReplicaSet(2)],
    pods: [
      rolloutPod('game-api-a', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST),
      {
        metadata: { name: 'game-api-foreign' },
        status: {
          containerStatuses: [
            {
              name: MAIN_CONTAINER,
              ready: true,
              imageID: `docker.io/library/app@${MANIFEST_DIGEST}`,
            },
          ],
        },
      },
    ],
  });
  assert.throws(
    () =>
      verifyDeploymentRolloutExecution(
        run,
        'kind-offscreen-lab',
        'lab-edge',
        'game-api',
        CONFIG_DIGEST,
        [CONFIG_DIGEST, MANIFEST_DIGEST],
      ),
    /foreign pod/,
  );
});

test('verifyDeploymentRolloutExecution rejects missing deployment replica status', () => {
  const deployment = rolloutDeployment();
  deployment.status = { observedGeneration: 2 };
  const run = createRolloutRun({
    deployment,
    replicaSets: [currentReplicaSet()],
    pods: [rolloutPod('game-api-a', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST)],
  });
  assert.throws(
    () =>
      verifyDeploymentRolloutExecution(
        run,
        'kind-offscreen-lab',
        'lab-edge',
        'game-api',
        CONFIG_DIGEST,
        [CONFIG_DIGEST, MANIFEST_DIGEST],
      ),
    /replica status is incomplete/,
  );
});

test('verifyDeploymentRolloutExecution accepts multiple ready replicas', () => {
  const run = createRolloutRun({
    deployment: rolloutDeployment({ replicas: 3 }),
    replicaSets: [currentReplicaSet(3)],
    pods: [
      rolloutPod('game-api-a', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST),
      rolloutPod('game-api-b', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST),
      rolloutPod('game-api-c', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST),
    ],
  });
  assert.doesNotThrow(() =>
    verifyDeploymentRolloutExecution(
      run,
      'kind-offscreen-lab',
      'lab-edge',
      'game-api',
      CONFIG_DIGEST,
      [CONFIG_DIGEST, MANIFEST_DIGEST],
    ),
  );
});

// Release chart values fix replicas minimum at 1; no zero-replica success path is modeled.

test('prepareReleaseApplyManifest writes filtered YAML for selected edge family', () => {
  const work = mkdtempSync(join(tmpdir(), 'inf25-rollout-'));
  const renderedPath = join(work, 'edge.yaml');
  const applyPath = join(work, 'apply.yaml');
  const receiptsPath = join(work, 'receipts.json');
  writeFileSync(renderedPath, renderWorkloadYaml(edgeDocs));
  writeFileSync(
    receiptsPath,
    JSON.stringify({
      web: loaderReceipt('offscreen-lab-game-web:turn02'),
    }),
  );
  const receipt = prepareReleaseApplyManifest({
    section: 'edge',
    renderedYamlPath: renderedPath,
    outputYamlPath: applyPath,
    selected: 'web',
    loaderReceiptsJsonPath: receiptsPath,
    run: () => ({ ok: true, status: 0, stdout: '', stderr: '', timedOut: false, missing: false }),
  });
  assert.equal(receipt.applyCount, 1);
  const text = readFileSync(applyPath, 'utf8');
  assert.doesNotMatch(text, /"name":"game-api"/);
  assert.match(text, /deployment-image-id/);
});

test('verifySelectedReleaseRollouts accepts a matching pod manifest digest', () => {
  const work = mkdtempSync(join(tmpdir(), 'inf25-rollout-verify-'));
  const receiptsPath = join(work, 'receipts.json');
  writeFileSync(
    receiptsPath,
    JSON.stringify({
      api: loaderReceipt('offscreen-lab-app-release-api:turn02'),
    }),
  );
  const baseRun = createRolloutRun({
    deployment: rolloutDeployment(),
    replicaSets: [currentReplicaSet()],
    pods: [
      rolloutPod('game-api-a', 'game-api-current', CURRENT_RS_UID, MANIFEST_DIGEST),
    ],
  });
  const run = (command, args) => {
    if (command === 'docker' || command === 'kind') {
      return { ok: true, status: 0, stdout: '{}', stderr: '', timedOut: false, missing: false };
    }
    const joined = args.join(' ');
    if (joined.includes('rollout status deployment/game-api')) {
      return { ok: true, status: 0, stdout: '', stderr: '', timedOut: false, missing: false };
    }
    return baseRun(command, args);
  };
  const result = verifySelectedReleaseRollouts({
    selected: 'api',
    loaderReceiptsJsonPath: receiptsPath,
    run,
    collectAcceptedIds: () => [CONFIG_DIGEST, MANIFEST_DIGEST],
  });
  assert.equal(result.ok, true);
});

test('install.sh passes bash -n after rollout wiring', () => {
  const installSh = join(fileURLToPath(new URL('..', import.meta.url)), 'install.sh');
  const result = spawnSync('bash', ['-n', installSh], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});