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
  assert.throws(
    () => parseLauncherFlags(['--packet-review', '--story-mode']),
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
