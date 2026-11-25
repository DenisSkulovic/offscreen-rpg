import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CATALOG_SCENARIO_IDS } from '../../../../infra/verification/verify.mjs';
import { validateChildReportPath } from '../../runner/report.mjs';
import {
  createInfraScenarioRunner,
  extractChildReportPath,
  invokeInfraVerifyChild,
  mapInfraScenarioFromChild,
  parseInfraChildReport,
} from './adapter.mjs';

test('parseInfraChildReport accepts explicit json only', () => {
  const ok = parseInfraChildReport(
    JSON.stringify({ suite: 'source', scenarios: [], exitCode: 0 }),
  );
  assert.equal(ok.ok, true);
  const malformed = parseInfraChildReport('not-json');
  assert.equal(malformed.ok, false);
});

test('mapInfraScenarioFromChild maps source coverage and preserves live NOT-RUN', () => {
  const pass = mapInfraScenarioFromChild(
    'source',
    {
      scenarios: [
        { id: 'REL-02', sourceCoverage: 'COVERED', liveStatus: 'NOT-RUN' },
      ],
    },
    'REL-02',
    false,
  );
  assert.equal(pass.status, 'PASS');

  const diagnostic = mapInfraScenarioFromChild(
    'diagnostic',
    {
      capabilities: [
        {
          id: 'CL-01',
          liveAcceptance: 'NOT-RUN',
          observations: [{ status: 'PASS', tier: 'LIVE-OBSERVATION' }],
        },
      ],
    },
    'CL-01',
    false,
  );
  assert.equal(diagnostic.status, 'NOT-RUN');
});

test('invokeInfraVerifyChild rejects malformed and never runs provisioning', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-infra-adapter-'));
  let commandSeen = '';
  const result = await invokeInfraVerifyChild({
    repoRoot,
    childSuite: 'source',
    run: async (command, args) => {
      commandSeen = [command, ...args].join(' ');
      return { code: 0, stdout: 'plain-text-not-json', stderr: '' };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.outcome.status, 'FAIL');
  assert.ok(commandSeen.includes('infra/verification/verify.mjs'));
  assert.ok(!commandSeen.includes('provisioning.mjs'));
});

test('createInfraScenarioRunner uses one child invocation per section', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-infra-adapter-'));
  let invokeCount = 0;
  const childJson = JSON.stringify({
    suite: 'source',
    exitCode: 0,
    scenarios: CATALOG_SCENARIO_IDS.map((id) => ({
      id,
      liveStatus: 'NOT-RUN',
      sourceCoverage: id === 'REL-02' ? 'COVERED' : 'NOT-RUN',
    })),
  });
  const runner = createInfraScenarioRunner(
    {
      subject: { kind: 'infra', id: 'infra' },
      sections: [{ id: 'source-suite', scenarioIds: ['REL-02', 'HOST-02'] }],
    },
    {
      repoRoot,
      run: async () => {
        invokeCount += 1;
        return {
          code: 0,
          stdout: childJson,
          stderr: `Diagnostic report: ${join(repoRoot, '.offscreen/verification/run-child/report.json')}\n`,
        };
      },
    },
  );
  const section = {
    id: 'source-suite',
    scenarioIds: ['REL-02', 'HOST-02'],
  };
  const first = await runner({ section, scenarioId: 'REL-02', runContext: { live: false } });
  const second = await runner({ section, scenarioId: 'HOST-02', runContext: { live: false } });
  assert.equal(invokeCount, 1);
  assert.equal(first.status, 'PASS');
  assert.equal(second.status, 'NOT-RUN');
  assert.equal(first.childReportPath, '.offscreen/verification/run-child/report.json');
  const validated = validateChildReportPath(
    repoRoot,
  `.offscreen/verification/run-child/report.json`);
  assert.equal(validated.ok, true);
});

test('adapter child path leaves foreign report roots untouched', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-infra-adapter-'));
  const before = existsSync(join(repoRoot, '.offscreen'));
  await invokeInfraVerifyChild({
    repoRoot,
    childSuite: 'source',
    run: async () => ({ code: 0, stdout: '{"suite":"source","exitCode":0,"scenarios":[]}', stderr: '' }),
  });
  assert.equal(existsSync(join(repoRoot, '.offscreen')), before);
});

test('extractChildReportPath keeps repository report pointer', () => {
  const stderr =
    'Diagnostic report: /repo/.offscreen/verification/run-abc/report.json\n';
  assert.equal(
    extractChildReportPath(stderr),
    '/repo/.offscreen/verification/run-abc/report.json',
  );
});