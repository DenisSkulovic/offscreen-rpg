import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { renderDevSlotAppGraph } from '../../../../tools/dev-environments/src/rendering/dev-slot-app-graph.mjs';
import { assertDevWebFallbackContract } from './dev-tiltfile-web.test.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const devTiltfilePath = join(repoRoot, 'Tiltfile');
const devTiltfile = readFileSync(devTiltfilePath, 'utf8');

/**
 * Dev API/GA use tsc-watch: readiness must track the serving process (tcp), not exec true.
 * @param {import('../../../../tools/dev-environments/src/rendering/dev-slot-app-graph.mjs').DeploymentDoc} deployment
 * @param {string} label
 */
export function assertDevWatchReadinessContract(deployment, label) {
  const probe = deployment.spec.template.spec.containers[0].readinessProbe;
  assert.ok(probe, `${label} readinessProbe expected`);
  assert.equal(probe.exec, undefined, `${label} must not use an always-ready exec probe`);
  assert.equal(probe.tcpSocket?.port, 'http', `${label} must use tcpSocket readiness tied to the HTTP port`);
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
    assert.match(
      tiltfile,
      new RegExp(`['"]${name}['"]`),
      `expected tilt graph to include ${name}`,
    );
  }
  assert.doesNotMatch(tiltfile, /trigger_mode\s*=\s*TRIGGER_MODE_MANUAL/);
  assert.doesNotMatch(tiltfile, /readiness_probe/);
}

test('root Tiltfile game-api live_update syncs apps/api only', () => {
  assertDevApiTiltContract(devTiltfile);
  assert.doesNotMatch(devTiltfile, /infra\/workloads\/dev\/api\.yaml/);
  assert.doesNotMatch(devTiltfile, /port_forwards/);
});

test('root Tiltfile game-authority live_update syncs apps/game-authority only', () => {
  assertDevGaTiltContract(devTiltfile);
  assert.doesNotMatch(devTiltfile, /infra\/workloads\/dev\/authority\.yaml/);
});

test('slot graph api and authority use process-bound readiness probes', () => {
  const graph = renderDevSlotAppGraph('dev-1', { schemaReady: true, ports: { game: 3100 } });
  for (const name of ['game-api', 'game-authority']) {
    const deployment = graph.documents.find((item) => item.kind === 'Deployment' && item.metadata.name === name);
    assert.ok(deployment);
    assertDevWatchReadinessContract(deployment, name);
  }
});

test('slot graph runs package dev watch commands without envFrom', () => {
  const graph = renderDevSlotAppGraph('dev-1', { schemaReady: true, ports: { game: 3100 } });
  for (const name of ['game-api', 'game-authority']) {
    const deployment = graph.documents.find((item) => item.kind === 'Deployment' && item.metadata.name === name);
    const command = deployment.spec.template.spec.containers[0].command.join(' ');
    assert.match(command, /compile-watch\.mjs/);
    assert.equal(deployment.spec.template.spec.containers[0].envFrom, undefined);
  }
});

test('always-true readiness exec probe is rejected for watch workloads', () => {
  /** @type {any} */
  const blind = {
    spec: {
      template: {
        spec: {
          containers: [{ readinessProbe: { exec: { command: ['true'] } } }],
        },
      },
    },
  };
  assert.throws(
    () => assertDevWatchReadinessContract(blind, 'synthetic'),
    /always-ready exec probe/,
  );
});

test('dev Tilt k8s_resource does not blind-readiness API or GA', () => {
  assertDevTiltReadinessNotBlind(devTiltfile);
});