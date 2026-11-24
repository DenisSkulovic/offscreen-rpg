import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
}

const rootPkg = readJson('package.json');
const chamberPkg = readJson('tools/chamber/package.json');

const REQUIRED_ROOT_KEYS = [
  'dev',
  'build',
  'typecheck',
  'lint',
  'test:fast',
  'repo:brief',
  'wiki:find',
  'wiki:read',
  'wiki:health',
  'stack:preflight',
  'stack:up',
  'stack:status',
  'stack:down',
  'stack:reset',
  'infra:plan',
  'infra:up',
  'infra:status',
  'infra:repair',
  'fixture:import',
  'repo:commit:check',
];

const FORBIDDEN_ROOT_KEYS = [
  'dev:host',
  'infra',
  'infra:down',
  'story:local',
  'story:server',
  'chamber',
  'chamber:packet',
  'chamber:scenario',
  'story:play',
  'story:inspect',
];

test('root package.json exposes the supported public command surface', () => {
  for (const key of REQUIRED_ROOT_KEYS) {
    assert.ok(key in rootPkg.scripts, `missing root script ${key}`);
  }

  assert.equal(
    rootPkg.scripts.dev,
    'node tools/dev-environments/src/cli/dev-tilt.mjs',
  );

  for (const [key, value] of Object.entries(rootPkg.scripts)) {
    assert.equal(typeof value, 'string', `root script ${key} must be a string`);
    assert.ok(value.length > 0, `root script ${key} must be non-empty`);
    assert.doesNotMatch(
      value,
      /turbo run dev/,
      `root script ${key} must not run turbo run dev`,
    );
    assert.doesNotMatch(
      value,
      /compose\.mjs/,
      `root script ${key} must not invoke compose.mjs`,
    );
  }

  for (const key of FORBIDDEN_ROOT_KEYS) {
    assert.ok(!(key in rootPkg.scripts), `forbidden root script ${key}`);
  }
});

test('chamber package.json keeps container entry and moved story routes', () => {
  const { scripts } = chamberPkg;

  assert.ok(scripts.start?.startsWith('node dist/src/main.js'));
  assert.doesNotMatch(scripts.start ?? '', /turbo/);

  for (const key of [
    'packet',
    'story-inspect',
    'storyteller-packet-audit',
    'scenario',
  ]) {
    assert.ok(key in scripts, `missing chamber script ${key}`);
    assert.equal(typeof scripts[key], 'string');
    assert.ok(scripts[key].length > 0);
  }

  assert.match(scripts['story-inspect'], /story-session-report\.mjs/);
  assert.doesNotMatch(scripts['story-inspect'], /docker/i);
});
