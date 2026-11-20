import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertNoDockerComposeInvocation,
  assertNoGameAuthorityComposeInstruction,
  checkDxk06ComposeRemnants,
  scanTextForComposeRemnants,
} from './check-dxk06-compose-remnants.mjs';

const repoRoot = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../..',
);
const scriptPath = join(
  repoRoot,
  'scripts/repo-tools/check-dxk06-compose-remnants.mjs',
);

test('current repo passes DXK06 compose remnant scan', () => {
  const result = checkDxk06ComposeRemnants(repoRoot);
  assert.ok(result.scannedFiles >= 1);

  const spawned = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(spawned.status, 0, spawned.stderr || spawned.stdout);
  assert.match(spawned.stdout, /DXK06 compose remnant scan OK/);
});

test('assertNoDockerComposeInvocation rejects docker compose up fixture', () => {
  assert.throws(
    () =>
      assertNoDockerComposeInvocation(
        'fixture',
        'Run docker compose up -d before tests\n',
      ),
    /stale docker compose/i,
  );
});

test('assertNoGameAuthorityComposeInstruction rejects compose mode fixture', () => {
  assert.throws(
    () =>
      assertNoGameAuthorityComposeInstruction(
        'fixture:1',
        'export GAME_AUTHORITY_MODE=compose',
      ),
    /GAME_AUTHORITY_MODE=compose/i,
  );
});

test('scanTextForComposeRemnants allows documented compose mode rejection', () => {
  assert.doesNotThrow(() =>
    scanTextForComposeRemnants(
      'docs/fixture.md',
      'GAME_AUTHORITY_MODE=compose is rejected.\n',
    ),
  );
});