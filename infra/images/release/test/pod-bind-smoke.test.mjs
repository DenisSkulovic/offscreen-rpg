import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));
const dockerCli =
  process.env.DOCKER ?? join(process.env.HOME ?? '', '.local/bin/docker');
const curlImage = 'docker.io/curlimages/curl:8.5.0';
const postgresImage = 'docker.io/library/postgres:17.11-bookworm';

function loadPins() {
  return Object.fromEntries(
    readFileSync(join(appReleaseDir, 'images.pin'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('=', 2)),
  );
}

function docker(args, options = {}) {
  return spawnSync(dockerCli, args, { encoding: 'utf8', ...options });
}

function imageReady(image) {
  return docker(['image', 'inspect', image]).status === 0;
}

function runId() {
  return `app-release-smoke-${randomBytes(4).toString('hex')}`;
}

function rmQuiet(name) {
  docker(['rm', '-f', name], { stdio: 'ignore' });
}

function waitForPostgres(name, network) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const probe = docker([
      'run',
      '--rm',
      '--network',
      network,
      postgresImage,
      'pg_isready',
      '-h',
      name,
      '-U',
      'offscreen',
      '-d',
      'offscreen',
    ]);
    if (probe.status === 0) {
      return;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
  }
  throw new Error(`Postgres ${name} did not become ready`);
}

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function runMinimalServer(image, name, network, envMap, entrypoint) {
  const envExports = [
    'PATH="$PATH"',
    ...Object.entries(envMap).map(
      ([key, value]) => `${key}=${shellQuote(value)}`,
    ),
  ].join(' ');
  const command = `exec env -i ${envExports} node --import ./release-process-env-shim.mjs ${entrypoint}`;
  return docker([
    'run',
    '-d',
    '--name',
    name,
    '--network',
    network,
    '--entrypoint',
    'sh',
    image,
    '-c',
    command,
  ]);
}

function waitForHttp(network, url, attempts = 45) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const probe = docker([
      'run',
      '--rm',
      '--network',
      network,
      curlImage,
      '-fsS',
      url,
    ]);
    if (probe.status === 0) {
      return probe.stdout.trim();
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

test('API and GA listen on 0.0.0.0 and answer from a sibling container', async (t) => {
  const pins = loadPins();
  if (process.env.APP_RELEASE_SKIP_DOCKER === '1') {
    t.skip('APP_RELEASE_SKIP_DOCKER=1');
    return;
  }
  if (docker(['version']).status !== 0) {
    t.skip('Docker is unavailable');
    return;
  }

  if (!imageReady(pins.API_IMAGE) || !imageReady(pins.GA_IMAGE)) {
    execFileSync(join(appReleaseDir, 'build.sh'), [], {
      stdio: 'inherit',
      env: { ...process.env, DOCKER: dockerCli },
    });
  }

  docker(['pull', curlImage]);
  docker(['pull', postgresImage]);

  const id = runId();
  const network = `${id}-net`;
  const postgresName = `${id}-pg`;
  const apiName = `${id}-api`;
  const gaName = `${id}-ga`;

  t.after(() => {
    rmQuiet(apiName);
    rmQuiet(gaName);
    rmQuiet(postgresName);
    docker(['network', 'rm', network], { stdio: 'ignore' });
  });

  assert.equal(docker(['network', 'create', network]).status, 0);

  assert.equal(
    docker([
      'run',
      '-d',
      '--name',
      postgresName,
      '--network',
      network,
      '-e',
      'POSTGRES_USER=offscreen',
      '-e',
      'POSTGRES_PASSWORD=smoke-only',
      '-e',
      'POSTGRES_DB=offscreen',
      postgresImage,
    ]).status,
    0,
  );

  waitForPostgres(postgresName, network);

  const databaseUrl =
    'postgresql://offscreen:smoke-only@' +
    `${postgresName}:5432/offscreen`;

  const apiEnv = {
    DATABASE_URL: databaseUrl,
    APP_ORIGIN: 'http://127.0.0.1:18080',
    BETTER_AUTH_SECRET: 'smoke-secret-abcdefghijklmnopqrstuv',
    GITHUB_CLIENT_ID: 'smoke-github-client',
    GITHUB_CLIENT_SECRET: 'smoke-github-secret',
    API_HOST: '0.0.0.0',
    API_PORT: '3001',
  };

  const gaEnv = {
    DATABASE_URL: databaseUrl,
    GAME_AUTHORITY_SERVICE_TOKEN: 'smoke-service-token-01',
    GAME_AUTHORITY_HOST: '0.0.0.0',
    GAME_AUTHORITY_PORT: '3002',
  };

  assert.equal(
    runMinimalServer(
      pins.API_IMAGE,
      apiName,
      network,
      apiEnv,
      'apps/api/dist/src/main.js',
    ).status,
    0,
  );

  assert.equal(
    runMinimalServer(
      pins.GA_IMAGE,
      gaName,
      network,
      gaEnv,
      'apps/game-authority/dist/src/bootstrap/main.js',
    ).status,
    0,
  );

  const apiHealth = waitForHttp(
    network,
    `http://${apiName}:3001/api/health/live`,
  );
  assert.match(apiHealth, /"status":"ok"/);

  const gaHealth = waitForHttp(
    network,
    `http://${gaName}:3002/internal/v1/health/live`,
  );
  assert.match(gaHealth, /"status":"ok"/);

  const loopbackName = `${id}-api-loopback`;
  t.after(() => {
    rmQuiet(loopbackName);
  });
  assert.equal(
    runMinimalServer(
      pins.API_IMAGE,
      loopbackName,
      network,
      { ...apiEnv, API_HOST: '127.0.0.1' },
      'apps/api/dist/src/main.js',
    ).status,
    0,
  );
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3_000);
  const loopbackDenied = docker([
    'run',
    '--rm',
    '--network',
    network,
    curlImage,
    '-fsS',
    '--max-time',
    '3',
    `http://${loopbackName}:3001/api/health/live`,
  ]);
  assert.notEqual(loopbackDenied.status, 0);
});