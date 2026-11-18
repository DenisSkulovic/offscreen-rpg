import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseLauncherFlags } from '../src/modes/cli-flags.js';
import {
  evaluationAuthorizationDenial,
  planLaunch,
} from '../src/modes/plan-launch.js';

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../src/modes/plan-launch.ts'),
  'utf8',
);

test('the launch plan does not import a provider, a port, or a process', () => {
  assert.equal(source.includes('createOpenRouterProvider'), false);
  assert.equal(source.includes('story-provider'), false);
  assert.equal(source.includes('node:net'), false);
  assert.equal(source.includes('child_process'), false);
  assert.equal(source.includes('fetch('), false);
});

test('ordinary Chamber stays provider-disabled on the local database', () => {
  const plan = planLaunch({ flags: parseLauncherFlags([]) });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.mode, 'default');
  assert.equal(plan.providerDispatch, 'disabled');
  assert.equal(plan.databaseName, 'offscreen_chamber');
  assert.equal(plan.resetDatabase, false);
  assert.equal(plan.story, null);
  assert.equal(plan.ports.web, 3100);
  assert.equal(plan.databaseUrl.includes('127.0.0.1'), true);
});

test('reset stays behind the explicit flag and the named local database', () => {
  const plan = planLaunch({ flags: parseLauncherFlags(['--reset-database']) });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.resetDatabase, true);
  assert.equal(plan.databaseName, 'offscreen_chamber');
  assert.equal(plan.providerDispatch, 'disabled');
});

test('packet, forensic, and smoke modes do not enable provider dispatch', () => {
  for (const argv of [
    ['--smoke'],
    ['--forensic-campaigns'],
    ['--packet-review'],
    ['--memory-evaluation-packet', '--config=packet.json'],
  ]) {
    const plan = planLaunch({ flags: parseLauncherFlags(argv) });
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.providerDispatch, 'disabled');
    assert.equal(plan.databaseName, 'offscreen_chamber');
  }
});

test('story mode names its database and still requires later authority', () => {
  const plan = planLaunch({
    flags: parseLauncherFlags(['--story-mode', '--no-browser']),
  });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.mode, 'story');
  assert.equal(plan.databaseName, 'offscreen_story_local');
  assert.equal(plan.providerDispatch, 'story-after-authority');
  assert.equal(plan.ports.web, null);
  assert.equal(plan.story?.model, 'openai/gpt-5.6-luna');
  assert.equal(plan.story?.maxMicrousd, 10_000);
  assert.equal('apiKey' in plan, false);
});

test('a non-default Story route or a raised cap needs the matching authorization', () => {
  const terra = planLaunch({
    flags: parseLauncherFlags([
      '--story-mode',
      '--story-model=openai/gpt-5.6-terra',
    ]),
  });
  assert.equal(terra.ok, false);
  if (terra.ok) return;
  assert.match(terra.reason, /authorize-story-model=openai\/gpt-5\.6-terra@10000/);
  const raised = planLaunch({
    flags: parseLauncherFlags([
      '--story-mode',
      '--story-max-microusd=10001',
    ]),
  });
  assert.equal(raised.ok, false);
  const allowed = planLaunch({
    flags: parseLauncherFlags([
      '--story-mode',
      '--story-model=openai/gpt-5.6-terra',
      '--authorize-story-model=openai/gpt-5.6-terra@10000',
    ]),
  });
  assert.equal(allowed.ok, true);
  if (!allowed.ok) return;
  assert.equal(allowed.story?.route, 'openrouter:gpt-5.6-terra');
});

test('a remote, queried, or wrongly named database is denied', () => {
  const remote = planLaunch({
    flags: parseLauncherFlags([]),
    chamberDatabaseUrl:
      'postgresql://offscreen:local@evil.example:5432/offscreen_chamber',
  });
  assert.equal(remote.ok, false);
  if (remote.ok) return;
  assert.match(remote.reason, /offscreen_chamber/);
  const queried = planLaunch({
    flags: parseLauncherFlags([]),
    chamberDatabaseUrl:
      'postgresql://offscreen:local@127.0.0.1:5432/offscreen_chamber?ssl=true',
  });
  assert.equal(queried.ok, false);
  const wrong = planLaunch({
    flags: parseLauncherFlags(['--story-mode']),
    storyDatabaseUrl:
      'postgresql://offscreen:local@127.0.0.1:5432/offscreen',
  });
  assert.equal(wrong.ok, false);
  if (wrong.ok) return;
  assert.match(wrong.reason, /offscreen_story_local/);
});

test('evaluation dispatch stays unauthorized until the config id matches', () => {
  const plan = planLaunch({
    flags: parseLauncherFlags(['--evaluation-run', '--config=packet.json']),
  });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.providerDispatch, 'evaluation-after-authorization');
  assert.equal(plan.databaseName, 'offscreen_chamber');
  assert.equal(
    evaluationAuthorizationDenial({
      evaluationRun: true,
      memoryEvaluationRun: false,
      authorize: null,
      evaluationId: 'eval-1',
    }),
    '--evaluation-run requires --authorize=<evaluation-id> matching the config.',
  );
  assert.equal(
    evaluationAuthorizationDenial({
      evaluationRun: false,
      memoryEvaluationRun: true,
      authorize: 'other',
      evaluationId: 'memory-1',
    }),
    '--memory-evaluation-run requires --authorize=<evaluation-id> matching the config.',
  );
  assert.equal(
    evaluationAuthorizationDenial({
      evaluationRun: true,
      memoryEvaluationRun: false,
      authorize: 'eval-1',
      evaluationId: 'eval-1',
    }),
    null,
  );
});
