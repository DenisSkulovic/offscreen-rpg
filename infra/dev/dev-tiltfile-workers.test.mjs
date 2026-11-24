import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { renderDevSlotAppGraph } from '../../tools/dev-environments/src/rendering/dev-slot-app-graph.mjs';
import { renderWorkloadDocuments } from '../workloads/render.mjs';
import {
  assertDevApiTiltContract,
  assertDevGaTiltContract,
} from './dev-tiltfile-api-authority.test.mjs';
import { assertDevWebLiveUpdateContract } from './dev-tiltfile-web.test.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const devTiltfilePath = join(repoRoot, 'infra/dev/Tiltfile');
const workerPackagePath = join(repoRoot, 'apps/worker/package.json');
const devWatchCompilationPath = join(repoRoot, 'infra/dev/dev-watch-compilation.mjs');
const devTiltfile = readFileSync(devTiltfilePath, 'utf8');
const workerPackage = JSON.parse(readFileSync(workerPackagePath, 'utf8'));

/**
 * @param {Array<{ kind?: string, metadata?: { name?: string, namespace?: string } }>} documents
 * @param {string} deploymentName
 */
function deploymentFromDocs(documents, deploymentName) {
  const deployment = documents.find(
    (item) => item.kind === 'Deployment' && item.metadata?.name === deploymentName,
  );
  assert.ok(deployment, `expected deployment ${deploymentName}`);
  return deployment;
}

/**
 * Release overlay withholds broad DB client env from control and executor.
 * @param {ReturnType<typeof renderWorkloadDocuments>} releaseDocs
 * @param {ReturnType<typeof renderDevSlotAppGraph>} devGraph
 */
export function assertDevWorkerDbEnvMatchesReleaseContract(releaseDocs, devGraph) {
  for (const role of ['game-control', 'game-executor']) {
    const releaseBlock = deploymentFromDocs(releaseDocs, role);
    const devBlock = deploymentFromDocs(devGraph.documents, role);
    const releaseText = JSON.stringify(releaseBlock.spec.template.spec.containers[0].env ?? []);
    const devText = JSON.stringify(devBlock.spec.template.spec.containers[0].env ?? []);
    assert.doesNotMatch(releaseText, /DATABASE_URL/, `release ${role} must not expose DATABASE_URL`);
    assert.doesNotMatch(devText, /DATABASE_URL/, `dev ${role} must not expose DATABASE_URL`);
    assert.doesNotMatch(devText, /postgres/i, `dev ${role} must not reference postgres connection strings`);
  }
  const relayBlock = deploymentFromDocs(devGraph.documents, 'game-relay');
  assert.match(
    JSON.stringify(relayBlock.spec.template.spec.containers[0].env ?? []),
    /DATABASE_URL/,
    'dev game-relay must keep DATABASE_URL like release relay',
  );
}

/**
 * @param {Record<string, string>} scripts
 */
export function assertWorkerDevBootstrapScripts(scripts) {
  assert.match(
    scripts['dev:relay'],
    /dist\/src\/bootstrap\/main\.js/,
    'dev:relay must run bootstrap/main.js',
  );
  assert.match(
    scripts['dev:control'],
    /dist\/src\/bootstrap\/control-main\.js/,
    'dev:control must run bootstrap/control-main.js',
  );
  assert.match(
    scripts['dev:executor'],
    /dist\/src\/bootstrap\/executor-main\.js/,
    'dev:executor must run bootstrap/executor-main.js',
  );
  const watchCompilation = readFileSync(devWatchCompilationPath, 'utf8');
  assert.match(
    watchCompilation,
    /--env-file-if-exists=\.\.\/\.\.\/\.env/,
    'dev-watch-compilation must keep optional repo-root .env loading',
  );
  for (const name of ['dev:relay', 'dev:control', 'dev:executor']) {
    assert.match(
      scripts[name],
      /dev-watch-compilation\.mjs/,
      `${name} must route process start through dev-watch-compilation`,
    );
  }
}

/**
 * @param {string} tiltfile
 */
export function assertDevWorkerTiltContract(tiltfile) {
  assert.match(
    tiltfile,
    /dev_workspace_docker_build\(DEV_WORKSPACE_WORKER_IMAGE,\s*'worker'\)/,
  );
  assert.match(tiltfile, /SYNC_CONFIG\['sync_dirs_by_image'\]/);
  for (const name of ['game-control', 'game-executor', 'game-relay', 'game-web', 'game-api', 'game-authority']) {
    assert.match(
      tiltfile,
      new RegExp(`['"]${name}['"]`),
      `expected tilt graph to include ${name}`,
    );
  }
  assert.match(tiltfile, /--tilt-deployments/);
  assert.doesNotMatch(tiltfile, /infra\/workloads\/dev\/workers\.yaml/);
}

test('dev Tiltfile worker live_update syncs apps/worker only on worker resources', () => {
  assertDevWorkerTiltContract(devTiltfile);
  assertDevWebLiveUpdateContract(devTiltfile);
  assertDevApiTiltContract(devTiltfile);
  assertDevGaTiltContract(devTiltfile);
});

test('dev worker package scripts target the three bootstrap entrypoints', () => {
  assertWorkerDevBootstrapScripts(workerPackage.scripts);
});

test('slot worker graph mirrors release DB env boundaries', () => {
  const devGraph = renderDevSlotAppGraph('dev-1', { schemaReady: true, ports: { game: 3100 } });
  const releaseDocs = renderWorkloadDocuments({ profile: 'release', section: 'workers' });
  assertDevWorkerDbEnvMatchesReleaseContract(releaseDocs, devGraph);
  const control = deploymentFromDocs(devGraph.documents, 'game-control');
  const executor = deploymentFromDocs(devGraph.documents, 'game-executor');
  const relay = deploymentFromDocs(devGraph.documents, 'game-relay');
  assert.match(control.spec.template.spec.containers[0].command.join(' '), /control-main\.js/);
  assert.match(executor.spec.template.spec.containers[0].command.join(' '), /executor-main\.js/);
  assert.match(relay.spec.template.spec.containers[0].command.join(' '), /bootstrap\/main\.js/);
  assert.match(
    relay.spec.template.spec.containers[0].image,
    /^offscreen-dev-workspace:dev-1-worker$/,
    'all worker roles share the dev worker image family',
  );
});

test('control with DATABASE_URL is rejected (negative)', () => {
  const devGraph = renderDevSlotAppGraph('dev-1', { schemaReady: true, ports: { game: 3100 } });
  const control = deploymentFromDocs(devGraph.documents, 'game-control');
  const poisoned = JSON.stringify(control.spec.template.spec.containers[0].env).replace(
    'TEMPORAL_ADDRESS',
    'DATABASE_URL',
  );
  assert.throws(
    () => {
      assert.doesNotMatch(poisoned, /DATABASE_URL/);
    },
    /DATABASE_URL/,
  );
});