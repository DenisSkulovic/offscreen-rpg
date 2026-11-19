import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  appendFile,
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { LocalDocumentStore } from '../../packages/documents/dist/index.js';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, 'scripts', 'repo-tools', 'import-pinned-fixture.mjs');
const readScript = join(repo, 'scripts', 'repo-tools', 'read-pinned-fixture.mjs');
const worldId = '7c14e5bc-4d72-4f8c-9a6b-97f334b83c11';
const worldRoot =
  '5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9';
const ruleRoot =
  'd643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab';
const startRoot =
  'e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813';

function runScript(args) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: repo });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      resolveRun({ code, stdout, stderr });
    });
  });
}

async function runOk(args) {
  const result = await runScript(args);
  assert.equal(result.code, 0, result.stderr);
  return JSON.parse(result.stdout);
}

async function previousPinSurvives(mutate, stderrPattern) {
  const store = await mkdtemp(join(tmpdir(), 'boot02-store-'));
  const fixture = await mkdtemp(join(tmpdir(), 'boot02-fixture-'));
  try {
    const seeded = await runOk(['--store', store]);
    assert.equal(seeded.worldRootHash, worldRoot);
    assert.equal(seeded.ruleRootHash, ruleRoot);
    assert.equal(seeded.startRootHash, startRoot);
    await cp(join(repo, 'content'), join(fixture, 'content'), {
      recursive: true,
    });
    await mutate(fixture);
    const pinBefore = await readFile(join(store, 'fixture-pin.json'), 'utf8');
    const failed = await runScript([
      '--store',
      store,
      '--fixture-root',
      fixture,
    ]);
    assert.notEqual(failed.code, 0);
    assert.match(failed.stderr, stderrPattern);
    assert.equal(failed.stdout, '');
    const pinAfter = await readFile(join(store, 'fixture-pin.json'), 'utf8');
    assert.equal(pinAfter, pinBefore);
    const documents = new LocalDocumentStore(store);
    const world = await documents.readWorldPackageManifest(worldRoot);
    assert.equal(world.worldId, worldId);
    assert.equal(world.revision, 1);
    const pin = JSON.parse(pinAfter);
    assert.equal(pin.start.rootHash, startRoot);
    assert.equal(pin.openingCandidate, false);
    assert.equal(pin.catalogue, false);
    assert.equal(pin.campaignCreated, false);
  } finally {
    await rm(store, { recursive: true, force: true });
    await rm(fixture, { recursive: true, force: true });
  }
}

test('a second import writes the same fixture root hashes', async () => {
  const store = await mkdtemp(join(tmpdir(), 'boot02-idempotent-'));
  try {
    const first = await runOk(['--store', store]);
    const pin = await readFile(join(store, 'fixture-pin.json'), 'utf8');
    const second = await runOk(['--store', store]);
    const pinAgain = await readFile(join(store, 'fixture-pin.json'), 'utf8');
    assert.equal(first.worldRootHash, worldRoot);
    assert.equal(first.ruleRootHash, ruleRoot);
    assert.equal(first.startRootHash, startRoot);
    assert.equal(second.worldRootHash, first.worldRootHash);
    assert.equal(second.ruleRootHash, first.ruleRootHash);
    assert.equal(second.startRootHash, first.startRootHash);
    assert.equal(second.revision, 1);
    assert.equal(pinAgain, pin);
    assert.equal(first.catalogue, false);
    assert.equal(first.openingCandidate, false);
    assert.equal(first.campaignCreated, false);
  } finally {
    await rm(store, { recursive: true, force: true });
  }
});

test('a wrong checksum leaves the previous fixture root unchanged', async () => {
  await previousPinSurvives(async (fixture) => {
    await appendFile(
      join(fixture, 'content', 'worlds', 'vvardenfell-poc', 'WORLD.md'),
      '\nThis sentence is not in the pinned package.\n',
    );
  }, /Pinned checksum mismatch for world root/);
});

test('a symlink leaves the previous fixture root unchanged', async () => {
  await previousPinSurvives(async (fixture) => {
    const page = join(
      fixture,
      'content',
      'worlds',
      'vvardenfell-poc',
      'locations',
      'seyda-neen.md',
    );
    await unlink(page);
    await symlink('WORLD.md', page);
  }, /symbolic link/);
});

test('s3 mode without store env does not write a local pin', async () => {
  const store = await mkdtemp(join(tmpdir(), 'boot02-s3-pin-'));
  try {
    const failed = await runScript(['--s3', '--store', store]);
    assert.equal(failed.code, 2);
    assert.equal(failed.stdout, '');
    await assert.rejects(() => readFile(join(store, 'fixture-pin.json')));
    const missingEnv = await new Promise((resolveRun) => {
      const child = spawn(process.execPath, [script, '--s3'], {
        cwd: repo,
        env: { ...process.env, OFFSCREEN_DOCUMENT_STORE: 's3' },
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('close', (code) => {
        resolveRun({ code, stdout, stderr });
      });
    });
    assert.notEqual(missingEnv.code, 0);
    assert.match(missingEnv.stderr, /OFFSCREEN_DOCUMENT_S3_BUCKET/);
    assert.equal(missingEnv.stdout, '');
    const readFailed = await new Promise((resolveRun) => {
      const child = spawn(process.execPath, [readScript, '--s3'], {
        cwd: repo,
        env: { ...process.env, OFFSCREEN_DOCUMENT_STORE: 's3' },
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('close', (code) => {
        resolveRun({ code, stdout, stderr });
      });
    });
    assert.notEqual(readFailed.code, 0);
    assert.match(readFailed.stderr, /OFFSCREEN_DOCUMENT_S3_BUCKET/);
    assert.equal(readFailed.stdout, '');
  } finally {
    await rm(store, { recursive: true, force: true });
  }
});

test('a missing dependency leaves the previous fixture root unchanged', async () => {
  await previousPinSurvives(async (fixture) => {
    await unlink(
      join(
        fixture,
        'content',
        'rules',
        'srd-5.2.1-subset',
        'checks',
        'ability-checks.md',
      ),
    );
  }, /Missing fixture dependency/);
});
