import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { renderDevSlotAppGraph } from '../../../../tools/dev-environments/src/rendering/dev-slot-app-graph.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const devTiltfilePath = join(repoRoot, 'Tiltfile');
const releaseTiltfilePath = join(
  repoRoot,
  'infra/environments/release/Tiltfile',
);
const devTiltfile = readFileSync(devTiltfilePath, 'utf8');

/**
 * @param {string} tiltfile
 */
export function assertDevWebLiveUpdateContract(tiltfile) {
  assert.match(tiltfile, /custom_build\s*\(/);
  assert.match(tiltfile, /outputs_image_ref_to=ref_file/);
  assert.doesNotMatch(tiltfile, /kubectl\s+(patch|apply|delete)/);
  assert.match(tiltfile, /skips_local_docker\s*=\s*True/);
  assert.match(tiltfile, /steps = dev_live_update\(image_key\)/);
  assert.match(
    tiltfile,
    /dev_workspace_docker_build\(DEV_WORKSPACE_IMAGE,\s*'web'\)/,
    'expected game-web build to use production-closure sync dirs',
  );
  assert.match(tiltfile, /deps=rebuild_deps/);
  assert.doesNotMatch(
    tiltfile,
    /only=\[[\s\S]*?'apps'/,
    'watching the whole apps tree makes an API edit rebuild every image',
  );
  assert.match(
    tiltfile,
    /sync\(REPO_ROOT \+ sub, '\/app' \+ sub\)/,
    'expected live_update to sync closure workspace subtrees into the container',
  );
  assert.match(tiltfile, /load-dev-slot-image\.sh/);
  assert.match(tiltfile, /--tilt-ref /);
  assert.match(tiltfile, /sync-plan\.mjs --tilt/);
  assertDevWebFallbackContract(tiltfile);
}

/**
 * @param {string} tiltfile
 */
export function assertDevWebFallbackContract(tiltfile) {
  assert.match(
    tiltfile,
    /SYNC_CONFIG\['rebuild_paths_by_image'\]/,
    'expected fall_back_on to use sync-plan rebuild paths',
  );
  assert.match(
    tiltfile,
    /fall_back_on\(fallbacks\)/,
    'expected live_update to fall back on unsafe paths',
  );
  assert.doesNotMatch(
    tiltfile,
    /dev-warm-release-fallback/,
    'warm release fallback must stay removed',
  );
  assert.doesNotMatch(tiltfile, /build-release-images/);
  assert.doesNotMatch(tiltfile, /include\s*\(/);
}

test('root Tiltfile live_update syncs apps/web with dependency fallbacks', () => {
  assertDevWebLiveUpdateContract(devTiltfile);
  assert.match(devTiltfile, /--tilt-deployments/);
  assert.match(devTiltfile, /k8s_yaml\(rendered\)/);
  assert.doesNotMatch(devTiltfile, /infra\/workloads\/dev\//);
  assert.doesNotMatch(devTiltfile, /offscreen-lab-dev-workspace/);
  assert.doesNotMatch(devTiltfile, /port_forwards/);
});

test('release Tiltfile is retired; image build script remains the release build owner', () => {
  assert.equal(existsSync(releaseTiltfilePath), false);
  const buildScript = readFileSync(
    join(repoRoot, 'infra/images/release/build-release-images.sh'),
    'utf8',
  );
  assert.match(buildScript, /OFFSCREEN_IMAGE_BUILD_CONCURRENCY/);
});

test('slot graph game-web uses watched dev compile and slot image', () => {
  const graph = renderDevSlotAppGraph('dev-1', {
    schemaReady: true,
    ports: { game: 3100 },
  });
  const web = graph.documents.find(
    (item) => item.kind === 'Deployment' && item.metadata.name === 'game-web',
  );
  assert.ok(web);
  assert.equal(web.metadata.namespace, 'offscreen-dev-1');
  assert.match(
    web.spec.template.spec.containers[0].image,
    /^offscreen-dev-workspace:dev-1-web$/,
  );
  const command = web.spec.template.spec.containers[0].command.join(' ');
  assert.match(
    command,
    /dev-pod-web-receipt\.mjs|dev-pod-compile-watch\.mjs web/,
  );
  const readiness = web.spec.template.spec.containers[0].readinessProbe;
  assert.equal(readiness.tcpSocket.port, 'http');
});

test('dev web contract rejects missing rebuild fallbacks', () => {
  const withoutFallbackStep = devTiltfile.replace(
    /fall_back_on\(fallbacks\)/,
    'pass',
  );
  assert.doesNotMatch(withoutFallbackStep, /fall_back_on\(fallbacks\)/);

  const withWarm = `${devTiltfile}\nlocal_resource('dev-warm-release-fallback')`;
  assert.throws(
    () => assertDevWebFallbackContract(withWarm),
    /warm release fallback must stay removed/,
  );
});
