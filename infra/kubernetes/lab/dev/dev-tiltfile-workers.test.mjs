import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  assertDevApiTiltContract,
  assertDevGaTiltContract,
} from './dev-tiltfile-api-authority.test.mjs';
import { assertDevWebLiveUpdateContract } from './dev-tiltfile-web.test.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const devTiltfilePath = join(repoRoot, 'infra/kubernetes/lab/dev/Tiltfile');
const workersYamlPath = join(repoRoot, 'infra/workloads/dev/workers.yaml');
const workerPackagePath = join(repoRoot, 'apps/worker/package.json');
const releaseWorkersPath = join(
  repoRoot,
  'infra/workloads/release/workers.yaml',
);
const devTiltfile = readFileSync(devTiltfilePath, 'utf8');
const workersYaml = readFileSync(workersYamlPath, 'utf8');
const workerPackage = JSON.parse(readFileSync(workerPackagePath, 'utf8'));
const releaseWorkersYaml = readFileSync(releaseWorkersPath, 'utf8');

/**
 * @param {string} tiltfile
 * @param {string} marker
 */
function dockerBuildSlice(tiltfile, marker) {
  const start = tiltfile.indexOf(marker);
  assert.notEqual(start, -1, `expected Tiltfile marker ${marker}`);
  const rest = tiltfile.slice(start);
  const next = rest.indexOf(
    'dev_workspace_docker_build(',
    marker.length,
  );
  return next === -1 ? rest : rest.slice(0, next);
}

/**
 * @param {string} yaml
 * @param {string} deploymentName
 */
function deploymentSlice(yaml, deploymentName) {
  const marker = `name: ${deploymentName}\n  namespace: lab-workers`;
  const start = yaml.indexOf(marker);
  assert.notEqual(
    start,
    -1,
    `expected deployment ${deploymentName} in workers manifest`,
  );
  const rest = yaml.slice(start);
  const next = rest.indexOf('\n---\n', marker.length);
  return next === -1 ? rest : rest.slice(0, next);
}

/**
 * Release overlay withholds broad DB client env from control and executor.
 * @param {string} releaseYaml
 * @param {string} devYaml
 */
export function assertDevWorkerDbEnvMatchesReleaseContract(releaseYaml, devYaml) {
  for (const role of ['game-control', 'game-executor']) {
    const releaseBlock = deploymentSlice(releaseYaml, role);
    const devBlock = deploymentSlice(devYaml, role);
    assert.doesNotMatch(
      releaseBlock,
      /DATABASE_URL/,
      `release ${role} must not expose DATABASE_URL`,
    );
    assert.doesNotMatch(
      devBlock,
      /DATABASE_URL/,
      `dev ${role} must not expose DATABASE_URL`,
    );
    assert.doesNotMatch(
      devBlock,
      /postgres/i,
      `dev ${role} must not reference postgres connection strings`,
    );
  }
  const relayBlock = deploymentSlice(devYaml, 'game-relay');
  assert.match(
    relayBlock,
    /name: DATABASE_URL/,
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
  for (const name of ['dev:relay', 'dev:control', 'dev:executor']) {
    assert.match(
      scripts[name],
      /--env-file-if-exists=\.\.\/\.\.\/\.env/,
      `${name} must keep optional repo-root .env loading`,
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
  for (const name of ['game-control', 'game-executor', 'game-relay']) {
    assert.match(
      tiltfile,
      new RegExp(`k8s_resource\\(\\s*['"]${name}['"]\\)`),
      `expected k8s_resource for ${name}`,
    );
  }
  assert.match(tiltfile, /k8s_yaml\s*\(\s*['"]infra\/workloads\/dev\/workers\.yaml['"]\s*\)/);
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

test('dev worker manifests mirror release DB env boundaries', () => {
  assertDevWorkerDbEnvMatchesReleaseContract(releaseWorkersYaml, workersYaml);
  assert.match(
    deploymentSlice(workersYaml, 'game-control'),
    /dev:control/,
    'game-control must run dev:control',
  );
  assert.match(
    deploymentSlice(workersYaml, 'game-executor'),
    /dev:executor/,
    'game-executor must run dev:executor',
  );
  assert.match(
    deploymentSlice(workersYaml, 'game-relay'),
    /dev:relay/,
    'game-relay must run dev:relay',
  );
  assert.match(
    workersYaml,
    /offscreen-lab-dev-workspace:dxk08-worker/,
    'all worker roles share the dev worker image',
  );
});

test('control with DATABASE_URL is rejected (negative)', () => {
  const poisoned = deploymentSlice(workersYaml, 'game-control').replace(
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