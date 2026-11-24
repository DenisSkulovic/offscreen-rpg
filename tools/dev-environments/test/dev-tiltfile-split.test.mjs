import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { renderTiltDeploymentDocuments } from '../src/rendering/dev-slot-app-graph.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const rootTiltfile = readFileSync(join(repoRoot, 'Tiltfile'), 'utf8');
const releaseTiltfilePath = join(
  repoRoot,
  'infra/environments/release/Tiltfile',
);
const releaseBuildScriptPath = join(
  repoRoot,
  'infra/images/release/build-release-images.sh',
);
const releaseInstallPath = join(
  repoRoot,
  'infra/environments/release/install.sh',
);
const graphCli = join(
  repoRoot,
  'tools/dev-environments/src/rendering/dev-slot-app-graph.mjs',
);

test('root Tiltfile is the dev profile without release image builds', () => {
  assert.doesNotMatch(rootTiltfile, /app-release-images/);
  assert.doesNotMatch(rootTiltfile, /build-release-images\.sh/);
  assert.match(
    rootTiltfile,
    /allow_k8s_contexts\s*\(\s*['"]kind-offscreen-dev['"]\s*\)/,
  );
  assert.match(rootTiltfile, /assert_dev_slot_env/);
  assert.doesNotMatch(rootTiltfile, /kind-offscreen-lab/);
  assert.match(
    rootTiltfile,
    /include\s*\(\s*['"]\.\/infra\/dev\/Tiltfile['"]\s*\)/,
  );
});

test('root Tiltfile refuses missing slot env before renderer runs', () => {
  const result = spawnSync(process.execPath, [graphCli, '--tilt-deployments'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      OFFSCREEN_DEV_SLOT: '',
      OFFSCREEN_DEV_NAMESPACE: '',
      OFFSCREEN_DEV_GAME_PORT: '',
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OFFSCREEN_DEV_SLOT/);
});

test('renderer refuses release namespace bindings from dev env', () => {
  assert.throws(
    () =>
      renderTiltDeploymentDocuments({
        OFFSCREEN_DEV_SLOT: 'dev-1',
        OFFSCREEN_DEV_NAMESPACE: 'lab-edge',
        OFFSCREEN_DEV_GAME_PORT: '3100',
      }),
    /namespace-mismatch|lab-edge/,
  );
});

test('release profile uses explicit image build and install.sh, not a release Tiltfile', () => {
  assert.equal(existsSync(releaseTiltfilePath), false);
  assert.equal(existsSync(releaseBuildScriptPath), true);
  assert.equal(existsSync(releaseInstallPath), true);
  assert.match(
    readFileSync(releaseBuildScriptPath, 'utf8'),
    /build-release-images\.sh/,
  );
});
