import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assertDevWebFallbackContract } from './dev-tiltfile-web.test.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const devTiltfilePath = join(repoRoot, 'infra/kubernetes/lab/dev/Tiltfile');
const apiYamlPath = join(repoRoot, 'infra/kubernetes/lab/dev/api.yaml');
const authorityYamlPath = join(repoRoot, 'infra/kubernetes/lab/dev/authority.yaml');
const devTiltfile = readFileSync(devTiltfilePath, 'utf8');
const apiYaml = readFileSync(apiYamlPath, 'utf8');
const authorityYaml = readFileSync(authorityYamlPath, 'utf8');

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
 * Dev API/GA use tsc-watch: readiness must track the serving process (tcp), not exec true.
 * @param {string} yaml
 * @param {string} label
 */
export function assertDevWatchReadinessContract(yaml, label) {
  assert.doesNotMatch(
    yaml,
    /readinessProbe:[\s\S]*?exec:[\s\S]*?command:[\s\S]*?- true\b/,
    `${label} must not use an always-ready exec probe`,
  );
  assert.match(
    yaml,
    /readinessProbe:\s*\n\s*tcpSocket:\s*\n\s*port: http/,
    `${label} must use tcpSocket readiness tied to the HTTP port`,
  );
}

/**
 * @param {string} tiltfile
 */
export function assertDevApiTiltContract(tiltfile) {
  assert.match(
    tiltfile,
    /dev_workspace_docker_build\(DEV_WORKSPACE_API_IMAGE,\s*'api'\)/,
  );
  assert.match(tiltfile, /SYNC_CONFIG\['sync_dirs_by_image'\]/);
  assert.doesNotMatch(
    tiltfile,
    /dev_workspace_docker_build\(DEV_WORKSPACE_API_IMAGE,\s*'\/apps\/api'\)/,
  );
  assertDevWebFallbackContract(tiltfile);
}

/**
 * @param {string} tiltfile
 */
export function assertDevGaTiltContract(tiltfile) {
  assert.match(
    tiltfile,
    /dev_workspace_docker_build\(DEV_WORKSPACE_GA_IMAGE,\s*'game-authority'\)/,
  );
  assert.match(tiltfile, /SYNC_CONFIG\['sync_dirs_by_image'\]/);
  assertDevWebFallbackContract(tiltfile);
}

/**
 * Tilt must not mark API/GA ready while ignoring the container process (e.g. exec true).
 * @param {string} tiltfile
 */
export function assertDevTiltReadinessNotBlind(tiltfile) {
  for (const name of ['game-api', 'game-authority']) {
    const slice = dockerBuildSlice(tiltfile, `k8s_resource(\n    '${name}'`);
    assert.doesNotMatch(
      slice,
      /trigger_mode\s*=\s*TRIGGER_MODE_MANUAL/,
      `${name} must not ignore container readiness via manual trigger mode`,
    );
    assert.doesNotMatch(
      slice,
      /readiness_probe/,
      `${name} k8s_resource must not override Kubernetes readiness`,
    );
  }
}

test('dev Tiltfile game-api live_update syncs apps/api only', () => {
  assertDevApiTiltContract(devTiltfile);
  assert.match(devTiltfile, /k8s_yaml\s*\(\s*['"]api\.yaml['"]\s*\)/);
  assert.match(
    devTiltfile,
    /k8s_resource\s*\(\s*['"]game-api['"][\s\S]*?port_forwards\s*=\s*\[[\s\S]*?['"]127\.0\.0\.1:3001:3001['"]/,
  );
});

test('dev Tiltfile game-authority live_update syncs apps/game-authority only', () => {
  assertDevGaTiltContract(devTiltfile);
  assert.match(devTiltfile, /k8s_yaml\s*\(\s*['"]authority\.yaml['"]\s*\)/);
  assert.match(
    devTiltfile,
    /k8s_resource\s*\(\s*['"]game-authority['"][\s\S]*?port_forwards\s*=\s*\[[\s\S]*?['"]127\.0\.0\.1:3002:3002['"]/,
  );
});

test('dev api and authority manifests use process-bound readiness probes', () => {
  assertDevWatchReadinessContract(apiYaml, 'game-api');
  assertDevWatchReadinessContract(authorityYaml, 'game-authority');
});

test('dev manifests run package dev watch commands without host .env in image', () => {
  assert.match(
    apiYaml,
    /@offscreen\/api[\s\S]*?run[\s\S]*?dev/,
    'game-api should run the API package dev script',
  );
  assert.match(
    authorityYaml,
    /@offscreen\/game-authority[\s\S]*?run[\s\S]*?dev/,
    'game-authority should run the GA package dev script',
  );
  assert.doesNotMatch(apiYaml, /envFrom/);
  assert.doesNotMatch(authorityYaml, /envFrom/);
});

test('always-true readiness exec probe is rejected for watch workloads', () => {
  const blindProbeSnippet = `
readinessProbe:
  exec:
    command:
      - true
`;
  assert.throws(
    () => assertDevWatchReadinessContract(blindProbeSnippet, 'synthetic'),
    /always-ready exec probe/,
  );
});

test('dev Tilt k8s_resource does not blind-readiness API or GA', () => {
  assertDevTiltReadinessNotBlind(devTiltfile);
});