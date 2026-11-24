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

test('same digest skips Deployment mutation in the apply manifest', () => {
  assert.equal(deploymentRolloutRequired(CONFIG_DIGEST, CONFIG_DIGEST), false);
  const filtered = buildFilteredApplyManifest({
    section: 'edge',
    documents: edgeDocs,
    selectedFamilies: parseReleaseImageSelection('web'),
    loaderReceipts: { web: JSON.parse(loaderReceipt('offscreen-lab-game-web:turn02')) },
    existingDeployments: {
      'lab-edge/game-web': annotateDeploymentPodTemplate(webDeployment, CONFIG_DIGEST),
    },
  });
  assert.equal(filtered.some((doc) => doc.kind === 'Deployment'), false);
});

test('verifyDeploymentRolloutExecution rejects unknown pod image identity', () => {
  const deployment = annotateDeploymentPodTemplate(apiDeployment, CONFIG_DIGEST);
  const run = (command, args) => {
    if (command !== 'kubectl') {
      return { ok: false, status: 1, stdout: '', stderr: '', timedOut: false, missing: false };
    }
    const joined = args.join(' ');
    if (
      joined.includes('game-api') &&
      joined.includes('get') &&
      joined.includes('deployment') &&
      !joined.includes('pods') &&
      !joined.includes('rollout')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: { name: 'game-api', namespace: 'lab-edge' },
          spec: deployment.spec,
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (joined.includes('get pods') && joined.includes('app=game-api')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          items: [
            {
              status: {
                containerStatuses: [
                  {
                    ready: true,
                    imageID: `docker.io/library/app@${FOREIGN_DIGEST}`,
                  },
                ],
              },
            },
          ],
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return { ok: false, status: 1, stdout: '', stderr: '', timedOut: false, missing: false };
  };
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
  const deployment = annotateDeploymentPodTemplate(apiDeployment, CONFIG_DIGEST);
  const run = (command, args) => {
    if (command === 'docker' || command === 'kind') {
      return { ok: true, status: 0, stdout: '{}', stderr: '', timedOut: false, missing: false };
    }
    if (command !== 'kubectl') {
      return { ok: false, status: 1, stdout: '', stderr: '', timedOut: false, missing: false };
    }
    const joined = args.join(' ');
    if (joined.includes('rollout status deployment/game-api')) {
      return { ok: true, status: 0, stdout: '', stderr: '', timedOut: false, missing: false };
    }
    if (
      joined.includes('game-api') &&
      joined.includes('get') &&
      joined.includes('deployment') &&
      !joined.includes('pods') &&
      !joined.includes('rollout')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          metadata: { name: 'game-api', namespace: 'lab-edge' },
          spec: deployment.spec,
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (joined.includes('get pods') && joined.includes('app=game-api')) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          items: [
            {
              status: {
                containerStatuses: [
                  {
                    ready: true,
                    imageID: `docker.io/library/app@${MANIFEST_DIGEST}`,
                  },
                ],
              },
            },
          ],
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return { ok: true, status: 0, stdout: '{}', stderr: '', timedOut: false, missing: false };
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