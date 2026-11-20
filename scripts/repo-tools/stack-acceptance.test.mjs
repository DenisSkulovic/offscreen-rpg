import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTEXT_NAME } from './stack-preflight.mjs';
import { EXPECTED_IMPORT_ROOTS } from './stack-health.mjs';
import {
  assessAcceptance,
  assessBrowserProof,
  probeAnonymousMe,
  resolveAcceptanceArgs,
} from './stack-acceptance.mjs';

function readyDeployments() {
  return [
    { namespace: 'lab-edge', name: 'game-web', ready: true },
    { namespace: 'lab-edge', name: 'game-api', ready: true },
    { namespace: 'lab-authority', name: 'game-authority', ready: true },
    { namespace: 'lab-workers', name: 'game-control', ready: true },
    { namespace: 'lab-workers', name: 'game-executor', ready: true },
    { namespace: 'lab-workers', name: 'game-relay', ready: true },
  ];
}

function passing(overrides = {}) {
  return {
    mode: 'check',
    execute: false,
    context: CONTEXT_NAME,
    apiServerAddress: '127.0.0.1',
    portConflict: false,
    nodesReady: true,
    migration: 'complete',
    deployments: readyDeployments(),
    pinnedObjectPresent: true,
    importRoots: { ...EXPECTED_IMPORT_ROOTS },
    composeBootPresent: false,
    origin: 'http://127.0.0.1:3000',
    actor: { email: 'player@localhost', role: 'player' },
    healthOnly: false,
    wrongActorStatus: 403,
    storyId: 'story-1',
    checkpointId: 'checkpoint-1',
    durations: { coldMs: 90_000, warmMs: 12_000 },
    peakMemoryKib: 5_000_000,
    preserved: null,
    ...overrides,
  };
}

test('check passes only with player, story, checkpoint, and a denied wrong actor', () => {
  const result = assessAcceptance(passing());
  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.dataReset, false);
  assert.deepEqual(result.commands, []);
  assert.equal(result.durations.coldMs, 90_000);
  assert.equal(result.durations.warmMs, 12_000);
  assert.equal(result.peakMemoryKib, 5_000_000);
});

test('health-only green cluster is not acceptance', () => {
  const result = assessAcceptance(passing({ actor: null, healthOnly: true, storyId: null, checkpointId: null }));
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 1);
  assert.ok(result.diagnostics.some((line) => /green health check without a signed-in player/.test(line)));
  assert.deepEqual(result.commands, []);
});

test('wrong context fails and issues no command', () => {
  const result = assessAcceptance(passing({ context: 'kind-other', mode: 'cold', execute: true }));
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((line) => line.includes('kind-offscreen-lab')));
  assert.deepEqual(result.commands, []);
  assert.equal(result.dataReset, false);
});

test('missing game-web Pod fails visibly', () => {
  const deployments = readyDeployments().filter((item) => item.name !== 'game-web');
  const result = assessAcceptance(passing({ deployments }));
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((line) => line.includes('game-web') && line.includes('lab-edge')));
});

test('failed migration fails visibly and does not reset', () => {
  const result = assessAcceptance(passing({ migration: 'failed', mode: 'cold', execute: true }));
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((line) => /game-migrate/.test(line) && /failed/.test(line)));
  assert.deepEqual(result.commands, []);
  assert.equal(result.dataReset, false);
});

test('port conflict fails and issues no command', () => {
  const result = assessAcceptance(passing({ portConflict: true, mode: 'warm', execute: true }));
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((line) => /port is occupied/.test(line)));
  assert.deepEqual(result.commands, []);
});

test('broad bind and compose boot are refused', () => {
  const result = assessAcceptance(
    passing({ apiServerAddress: '0.0.0.0', composeBootPresent: true, mode: 'cold', execute: true }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((line) => /not loopback|external port/i.test(line)));
  assert.ok(result.diagnostics.some((line) => /Compose boot path/.test(line)));
  assert.deepEqual(result.commands, []);
});

test('staff role is not a player session', () => {
  const result = assessAcceptance(passing({ actor: { email: 'staff@localhost', role: 'staff' } }));
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((line) => /role must be player/.test(line)));
});

test('warm repeat must keep the same story, checkpoint, and email', () => {
  const lost = assessAcceptance(
    passing({
      mode: 'warm',
      preserved: { email: 'other@localhost', storyId: 'story-1', checkpointId: 'checkpoint-1' },
    }),
  );
  assert.equal(lost.ok, false);
  assert.ok(lost.diagnostics.some((line) => /did not preserve/.test(line)));

  const kept = assessAcceptance(
    passing({
      mode: 'warm',
      execute: true,
      preserved: { email: 'player@localhost', storyId: 'story-1', checkpointId: 'checkpoint-1' },
    }),
  );
  assert.equal(kept.ok, true);
  assert.deepEqual(kept.commands, [['pnpm', 'dev']]);
  assert.equal(kept.dataReset, false);
});

test('reset is refused before any assessment', () => {
  const result = resolveAcceptanceArgs(['cold', '--reset']);
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 2);
  assert.match(result.error, /reset is not an acceptance command/);
});

test('the command cannot execute a mutation', () => {
  const check = resolveAcceptanceArgs(['check', '--execute']);
  const cold = resolveAcceptanceArgs(['cold', '--execute']);
  assert.equal(check.ok, false);
  assert.equal(check.exitCode, 2);
  assert.equal(cold.ok, false);
  assert.match(cold.error, /read-only/);
});

test('browser smoke that only saw health fails', () => {
  const result = assessBrowserProof({ healthOnly: true });
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 1);
  assert.ok(result.diagnostics.some((line) => /only saw \/health/.test(line)));
  assert.equal(result.dataReset, false);
});

test('browser proof records an unrun Headlamp click without treating it as a health pass', () => {
  const result = assessBrowserProof({
    signedIn: true,
    started: true,
    acted: true,
    continued: true,
    readBack: true,
    forked: true,
    adminControlStatus: 200,
    wrongActorStatus: 403,
    tiltRecovered: true,
    headlampDesktop: false,
  });
  assert.equal(result.ok, true);
  assert.ok(result.residual.some((line) => /Headlamp desktop/.test(line)));
});

test('anonymous loopback probe keeps the 401 and does not invent a player', () => {
  const result = probeAnonymousMe(() => ({ status: 0, stdout: '401' }));
  assert.deepEqual(result, { origin: 'http://127.0.0.1:3000', wrongActorStatus: 401 });
});

test('browser proof fails when the wrong actor is allowed', () => {
  const result = assessBrowserProof({
    signedIn: true,
    started: true,
    acted: true,
    continued: true,
    readBack: true,
    forked: true,
    adminControlStatus: 200,
    wrongActorStatus: 200,
    tiltRecovered: true,
  });
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((line) => /Wrong actor/.test(line)));
});
