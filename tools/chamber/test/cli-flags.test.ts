import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LauncherFlagError,
  parseLabCliArgs,
  parseLauncherFlags,
} from '../src/modes/cli-flags.js';

test('launcher accepts single packet-review and rejects conflicting modes', () => {
  const flags = parseLauncherFlags(['--packet-review']);
  assert.equal(flags.packetReview, true);
  assert.equal(flags.storyMode, false);
  assert.equal(
    parseLauncherFlags(['--forensic-campaigns']).forensicCampaigns,
    true,
  );
  assert.throws(
    () => parseLauncherFlags(['--packet-review', '--story-mode']),
    (error) =>
      error instanceof LauncherFlagError &&
      /at most one run mode/i.test(error.message),
  );
  assert.throws(
    () => parseLauncherFlags(['--smoke', '--forensic-campaigns']),
    (error) =>
      error instanceof LauncherFlagError &&
      /at most one run mode/i.test(error.message),
  );
  assert.throws(
    () => parseLauncherFlags(['--no-browser']),
    (error) =>
      error instanceof LauncherFlagError &&
      /only with --story-mode/i.test(error.message),
  );
  assert.throws(
    () => parseLauncherFlags(['--evaluation-run']),
    (error) =>
      error instanceof LauncherFlagError &&
      /require exactly one --config/i.test(error.message),
  );
});

test('lab CLI parses scenario lane seed and rejects nonlocal live lane', () => {
  const args = parseLabCliArgs([
    'activity-clock-wait-eighty',
    '--seed=9',
    '--lane=bench-policy',
  ]);
  assert.equal(args.scenarioId, 'activity-clock-wait-eighty');
  assert.equal(args.seed, 9);
  assert.equal(args.lane, 'bench-policy');
  assert.throws(
    () =>
      parseLabCliArgs(['activity-clock-wait-eighty', '--lane=authorized-live']),
    (error) => error instanceof LauncherFlagError,
  );
});

test('OBS00-L: story trial flags parse strictly and stay story-mode only', () => {
  const ok = parseLauncherFlags([
    '--story-mode',
    '--story-trial-max-microusd=250000',
    '--story-trial-max-attempts=4',
  ]);
  assert.deepEqual(ok.storyTrial, {
    runId: '00000000-0000-4000-8000-000000000012',
    maxMicrousd: 250_000,
    maxAttempts: 4,
  });
  assert.equal(parseLauncherFlags(['--story-mode']).storyTrial, null);
  const named = parseLauncherFlags([
    '--story-mode',
    '--story-trial-max-microusd=100000',
    '--story-trial-max-attempts=2',
    '--story-trial-id=11111111-1111-4111-8111-111111111111',
  ]);
  assert.equal(named.storyTrial?.runId, '11111111-1111-4111-8111-111111111111');

  const reject = (argv: string[], pattern: RegExp) =>
    assert.throws(
      () => parseLauncherFlags(argv),
      (error) =>
        error instanceof LauncherFlagError && pattern.test(error.message),
    );
  reject(
    ['--story-trial-max-microusd=250000', '--story-trial-max-attempts=4'],
    /only with --story-mode/i,
  );
  reject(['--story-mode', '--story-trial-max-microusd=250000'], /together/i);
  reject(['--story-mode', '--story-trial-max-attempts=4'], /together/i);
  reject(
    [
      '--story-mode',
      '--story-trial-max-microusd=250001',
      '--story-trial-max-attempts=4',
    ],
    /1 through 250000/,
  );
  reject(
    [
      '--story-mode',
      '--story-trial-max-microusd=250000',
      '--story-trial-max-attempts=5',
    ],
    /1 through 4/,
  );
  reject(
    [
      '--story-mode',
      '--story-trial-max-microusd=2.5e5',
      '--story-trial-max-attempts=4',
    ],
    /1 through 250000/,
  );
  reject(
    [
      '--story-mode',
      '--story-trial-max-microusd=1000',
      '--story-trial-max-attempts=4',
    ],
    /per-operation/i,
  );
  reject(
    [
      '--story-mode',
      '--story-trial-max-microusd=250000',
      '--story-trial-max-attempts=4',
      '--story-trial-id=not-a-uuid',
    ],
    /UUID/,
  );
});
