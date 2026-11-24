import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));
const dockerCli =
  process.env.DOCKER ?? join(process.env.HOME ?? '', '.local/bin/docker');

function loadPins() {
  return Object.fromEntries(
    readFileSync(join(appReleaseDir, 'images.pin'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('=', 2)),
  );
}

function imageReady(image) {
  try {
    execFileSync(dockerCli, ['image', 'inspect', image], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensureBuilt(pins) {
  if (imageReady(pins.API_IMAGE) && imageReady(pins.GA_IMAGE)) {
    return;
  }
  execFileSync(join(appReleaseDir, 'build.sh'), [], {
    stdio: 'inherit',
    env: { ...process.env, DOCKER: dockerCli },
  });
}

test('built images resolve workspace exports and exclude checkout content/', async (t) => {
  const pins = loadPins();
  if (process.env.APP_RELEASE_SKIP_DOCKER === '1') {
    t.skip('APP_RELEASE_SKIP_DOCKER=1');
    return;
  }
  try {
    execFileSync(dockerCli, ['version'], { stdio: 'ignore' });
  } catch {
    t.skip('Docker is unavailable');
    return;
  }

  ensureBuilt(pins);

  const importCheck = (image, script) =>
    spawnSync(
      dockerCli,
      ['run', '--rm', image, 'node', '--input-type=module', '-e', script],
      { encoding: 'utf8' },
    );

  const apiImport = importCheck(
    pins.API_IMAGE,
    `import { readConfig } from './apps/api/dist/src/config.js';
import { existsSync } from 'node:fs';
if (existsSync('content')) throw new Error('content tree must not ship in the API image');
if (existsSync('/app/content')) throw new Error('content tree must not ship in the API image');
if (!existsSync('packages/db/migrations/meta/_journal.json')) throw new Error('db migrations must ship in the API image');
readConfig({ API_HOST: '127.0.0.1', API_PORT: '3001' });
console.log('api-closure-ok');`,
  );
  assert.equal(apiImport.status, 0, apiImport.stderr || apiImport.stdout);

  const gaImport = importCheck(
    pins.GA_IMAGE,
    `import { readGameAuthorityConfig } from './apps/game-authority/dist/src/config.js';
import { existsSync } from 'node:fs';
if (existsSync('content')) throw new Error('content tree must not ship in the GA image');
readGameAuthorityConfig({
  GAME_AUTHORITY_SERVICE_TOKEN: 'smoke-service-token-01',
  GAME_AUTHORITY_CONTROL_TOKEN: 'smoke-control-token-02',
});
console.log('ga-closure-ok');`,
  );
  assert.equal(gaImport.status, 0, gaImport.stderr || gaImport.stdout);

  const negative = spawnSync(
    dockerCli,
    [
      'run',
      '--rm',
      pins.API_IMAGE,
      'node',
      '--input-type=module',
      '-e',
      "import './apps/api/dist/src/missing-entry.js'",
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(negative.status, 0, 'missing runtime module should fail to import');
});

test('images use pinned Node 24 runtime', () => {
  const pins = loadPins();
  for (const image of [pins.API_IMAGE, pins.GA_IMAGE]) {
    if (!imageReady(image)) {
      return;
    }
    const version = spawnSync(
      dockerCli,
      ['run', '--rm', image, 'node', '-p', 'process.version'],
      { encoding: 'utf8' },
    );
    assert.equal(version.status, 0, version.stderr);
    assert.equal(version.stdout.trim(), 'v24.19.0');
  }
});