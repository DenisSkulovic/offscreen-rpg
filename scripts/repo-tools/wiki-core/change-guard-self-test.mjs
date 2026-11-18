import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { guardChange } from './change-guard.mjs';

function write(root, rel, text) {
  const abs = path.join(root, ...rel.split('/'));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, 'utf8');
  return abs;
}

const LEDGER_HEAD = [
  '| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |',
  '| --- | --- | --- | --- | --- | --- | --- |',
].join('\n');

function packet({ state = 'Implementing', authority, code, negative, extra = '', ledger }) {
  return [
    '# Change: fixture',
    '',
    `**State:** ${state}`,
    '',
    '## Authority and baseline',
    '',
    `- ${authority}`,
    '',
    '## Code scope and exclusions',
    '',
    `- Expected touched code: \`${code}\``,
    '',
    '## Acceptance and negative proof',
    '',
    `- Negative case: ${negative}`,
    '',
    extra,
    '',
    '## Reconciliation ledger',
    '',
    ledger,
    '',
  ].join('\n');
}

export function runChangeGuardSelfTest() {
  const failures = [];
  function check(name, fn) {
    try {
      fn();
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  check('proposed GM07 reference is flagged and does not write product canon', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-gm07-'));
    const product = 'docs/product/gameplay/time-and-autonomy.md';
    write(root, product, '# Time\n\n## Unanswered choice\n\nConsent is required.\n');
    const before = readFileSync(path.join(root, ...product.split('/')));
    write(
      root,
      'work/changes/open/gm07-sneak/CHANGE.md',
      packet({
        state: 'Proposed',
        authority: 'Product: GM07 delegated decision is now accepted as the product authority.',
        code: 'packages/game/src/fallback.ts',
        negative: 'a player receives a fallback they did not consent to.',
        ledger: `${LEDGER_HEAD}\n| docs/product/gameplay/time-and-autonomy.md#unanswered-choice | product | unchanged: not this row | packages/game/src/fallback.ts | absent | player did not consent | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/gm07-sneak/CHANGE.md',
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'unratified-product-reference'));
    assert.deepEqual(readFileSync(path.join(root, ...product.split('/'))), before);
  });

  check('negated GM07 citation is not promoted and is not flagged', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-gm07-ok-'));
    write(
      root,
      'work/changes/open/gm07-held/CHANGE.md',
      packet({
        state: 'Proposed',
        authority:
          'Owner remains docs/product/gameplay/time-and-autonomy.md. GM07 remains proposed and is not ratified.',
        code: 'scripts/repo-tools/wiki-change-guard.mjs',
        negative: 'an unratified default still does nothing.',
        ledger: `${LEDGER_HEAD}\n| no product/technical behavior impacted | none | unchanged: GM07 stays proposed so no canon edit is authorized | no source behavior changed | absent | unratified default does nothing | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/gm07-held/CHANGE.md',
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
  });

  check('technical path alone does not ratify a proposal', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-path-'));
    write(
      root,
      'work/changes/open/path-ratify/CHANGE.md',
      packet({
        authority:
          'docs/technical/observability/capture-and-provenance.md is selected because its path is under docs/technical.',
        code: 'scripts/repo-tools/wiki-change-guard.mjs',
        negative: 'a folder name is not an owner decision.',
        ledger: LEDGER_HEAD,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/path-ratify/CHANGE.md',
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'path-is-not-ratification'));
  });

  check('unchanged selected target passes when source and status move', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-target-'));
    write(
      root,
      'docs/technical/storyteller/prompts-and-tools.md',
      '# Prompts\n\n## Selected loop\n\nThe selected loop stays the contract.\n',
    );
    write(root, 'STATUS.md', '# Status\n\n## Orientation\n\nBounded loop is source-observed.\n');
    write(root, 'apps/api/README.md', '# API\n\nSource map for the bounded loop.\n');
    write(root, 'packages/storyteller/src/loop.ts', 'export const loop = true;\n');
    const change = 'work/changes/open/loop/CHANGE.md';
    write(
      root,
      change,
      packet({
        authority: 'Technical owner docs/technical/storyteller/prompts-and-tools.md#selected-loop stays the ratified target.',
        code: 'packages/storyteller/src/loop.ts',
        negative: 'a one-shot call is still rejected when the bounded loop is the tested path.',
        ledger: [
          LEDGER_HEAD,
          '| docs/technical/storyteller/prompts-and-tools.md#selected-loop | technical | unchanged: the selected loop contract did not change when the bounded source loop landed | packages/storyteller/src/loop.ts, STATUS.md, apps/api/README.md inspected at abcdef1 | source-observed | one-shot path still rejected | apps/api/README.md route updated |',
        ].join('\n'),
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: change,
      changedPaths: ['packages/storyteller/src/loop.ts', 'STATUS.md', 'apps/api/README.md'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.equal(result.findings.some((item) => /product page/i.test(item.message)), false);
  });

  check('docs updated checkbox fails close', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-shallow-'));
    write(
      root,
      'work/changes/open/shallow/CHANGE.md',
      [
        '# Change: shallow',
        '',
        '**State:** Implementing',
        '',
        'Negative case: source moved and the canon stayed silent.',
        '',
        'Touched `packages/game/src/loop.ts`. Owner docs/technical/storyteller/prompts-and-tools.md.',
        '',
        '## Reconciliation ledger',
        '',
        'docs updated',
        '',
      ].join('\n'),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/shallow/CHANGE.md',
      changedPaths: ['packages/game/src/loop.ts'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'shallow-docs-checkbox'));
  });

  check('not needed is not an unchanged reason', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-reason-'));
    write(root, 'scripts/repo-tools/wiki-change-guard.mjs', 'export {};\n');
    write(
      root,
      'work/changes/open/reason/CHANGE.md',
      packet({
        authority: 'No product/technical behavior impacted.',
        code: 'scripts/repo-tools/wiki-change-guard.mjs',
        negative: 'a blank unchanged cell still fails.',
        ledger: `${LEDGER_HEAD}\n| no product/technical behavior impacted | none | unchanged: not needed | scripts/repo-tools/wiki-change-guard.mjs @ abcdef1 | fixture-tested | blank reason fails | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/reason/CHANGE.md',
      changedPaths: ['scripts/repo-tools/wiki-change-guard.mjs'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'empty-unchanged-reason'));
  });

  check('internal tooling with an explicit no-product reason passes', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-tool-'));
    write(root, 'scripts/repo-tools/wiki-change-guard.mjs', 'export {};\n');
    write(
      root,
      'work/changes/open/tool/CHANGE.md',
      packet({
        authority: 'No product/technical behavior impacted. The checker is an agent tool.',
        code: 'scripts/repo-tools/wiki-change-guard.mjs',
        negative: 'a shallow docs checkbox still fails close.',
        ledger: `${LEDGER_HEAD}\n| no product/technical behavior impacted | none | unchanged: this checker does not alter gameplay or selected product rules | scripts/repo-tools/wiki-change-guard.mjs @ abcdef1 | fixture-tested | shallow checkbox fails | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/tool/CHANGE.md',
      changedPaths: ['scripts/repo-tools/wiki-change-guard.mjs'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
  });

  check('Done plus not-run blocker cannot close', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-notrun-'));
    write(root, 'scripts/repo-tools/wiki-change-guard.mjs', 'export {};\n');
    write(
      root,
      'work/changes/open/notrun/CHANGE.md',
      packet({
        state: 'Done',
        authority: 'No product/technical behavior impacted.',
        code: 'scripts/repo-tools/wiki-change-guard.mjs',
        negative: 'not run; remaining blocker is the unpaid provider cap.',
        ledger: `${LEDGER_HEAD}\n| no product/technical behavior impacted | none | unchanged: proof was not executed so the packet cannot close | scripts/repo-tools/wiki-change-guard.mjs | not run | not run; remaining blocker is the unpaid provider cap | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/notrun/CHANGE.md',
      changedPaths: ['scripts/repo-tools/wiki-change-guard.mjs'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'not-run-blocks-done'));
  });

  check('a claimed paid pass without a run is rejected', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-paid-'));
    write(root, 'scripts/repo-tools/wiki-change-guard.mjs', 'export {};\n');
    write(
      root,
      'work/changes/open/paid/CHANGE.md',
      packet({
        state: 'Done',
        authority: 'No product/technical behavior impacted.',
        code: 'scripts/repo-tools/wiki-change-guard.mjs',
        negative: 'a missing provider run must not look green.',
        extra: 'Paid provider acceptance test passed.',
        ledger: `${LEDGER_HEAD}\n| no product/technical behavior impacted | none | unchanged: no gameplay contract moved | scripts/repo-tools/wiki-change-guard.mjs @ abcdef1 | fixture-tested | missing provider run is not green | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/paid/CHANGE.md',
      changedPaths: ['scripts/repo-tools/wiki-change-guard.mjs'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'unperformed-paid-claim'));
  });

  check('rewriting product to match code needs owner review', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-rewrite-'));
    write(root, 'docs/product/gameplay/time-and-autonomy.md', '# Time\n\n## Unanswered choice\n\nHold.\n');
    write(root, 'packages/game/src/loop.ts', 'export {};\n');
    write(
      root,
      'work/changes/open/rewrite/CHANGE.md',
      packet({
        state: 'Done',
        authority: 'Product docs/product/gameplay/time-and-autonomy.md#unanswered-choice.',
        code: 'packages/game/src/loop.ts',
        negative: 'silent product edits must not launder a code drift.',
        ledger: `${LEDGER_HEAD}\n| docs/product/gameplay/time-and-autonomy.md#unanswered-choice | product | changed: rewrote the product page so the implementation looks compliant | packages/game/src/loop.ts @ abcdef1 | source-observed | silent rewrite is the failure | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/rewrite/CHANGE.md',
      changedPaths: ['packages/game/src/loop.ts', 'docs/product/gameplay/time-and-autonomy.md'],
    });
    assert.equal(result.status, 'failed');
    const review = result.findings.find((item) => item.code === 'needs-owner-review');
    assert.ok(review);
    assert.match(review.message, /needs independent owner review/);
  });

  check('missing heading is reported and not invented', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-heading-'));
    write(root, 'docs/technical/storyteller/prompts-and-tools.md', '# Prompts\n\n## Selected loop\n\nStay.\n');
    write(root, 'packages/storyteller/src/loop.ts', 'export {};\n');
    write(
      root,
      'work/changes/open/heading/CHANGE.md',
      packet({
        authority: 'docs/technical/storyteller/prompts-and-tools.md.',
        code: 'packages/storyteller/src/loop.ts',
        negative: 'a renamed heading must fail rather than match a neighbor.',
        ledger: `${LEDGER_HEAD}\n| docs/technical/storyteller/prompts-and-tools.md#not-a-real-heading | technical | unchanged: the contract text was not edited | packages/storyteller/src/loop.ts @ abcdef1 | source-observed | unknown anchor fails | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/heading/CHANGE.md',
      changedPaths: ['packages/storyteller/src/loop.ts'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'missing-heading'));
  });

  check('source-observed tier without a path or SHA fails', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-sha-'));
    write(root, 'packages/storyteller/src/loop.ts', 'export {};\n');
    write(
      root,
      'work/changes/open/sha/CHANGE.md',
      packet({
        authority: 'No product/technical behavior impacted.',
        code: 'packages/storyteller/src/loop.ts',
        negative: 'a tier without an inspection is not evidence.',
        ledger: `${LEDGER_HEAD}\n| no product/technical behavior impacted | none | unchanged: tooling only and the selected contract stayed put | inspected somewhere | source-observed | no path is not an inspection | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/sha/CHANGE.md',
      changedPaths: ['packages/storyteller/src/loop.ts'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'status-without-inspection'));
  });

  check('archived packet is left byte-for-byte alone', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-archive-'));
    const rel = 'work/changes/archive/2026-11/other/old/CHANGE.md';
    const abs = write(root, rel, '# Old\n\n**State:** Done\n\ndocs updated\n');
    const before = readFileSync(abs);
    const result = guardChange({ repo: root, mode: 'close', changePath: rel, changedPaths: ['packages/game/src/loop.ts'] });
    assert.equal(result.status, 'historical');
    assert.deepEqual(readFileSync(abs), before);
    assert.equal(result.findings.some((item) => item.code === 'historical-packet'), true);
  });

  function impactPacket(state, rows) {
    return [
      '# Change: impact fixture',
      '',
      `**State:** ${state}`,
      '',
      'Negative case: a missing plane must fail plan mode.',
      '',
      'Owner docs/product/gameplay/time-and-autonomy.md.',
      '',
      '## Planned specification and implementation delta | planned-impact.v1',
      '',
      '| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
    ].join('\n');
  }

  const validPlanes = [
    '| Product | unchanged because the selected player time promise is not part of this tooling change | none | no game edit |',
    '| Technical | unchanged because no engine, API, or retry contract is in this diff | none | no wire change |',
    '| Code | change: scripts/repo-tools/wiki-core/change-guard-self-test.mjs covers the no-op; negative: a missing product row fails | self-test | fixture |',
    '| Related | unchanged because this fixture does not add a second documentation registry | queue | no new registry |',
  ];

  check('a Ready test-only planned-impact packet passes plan mode', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-plan-ok-'));
    write(root, 'scripts/repo-tools/wiki-core/change-guard-self-test.mjs', 'export {};\n');
    write(
      root,
      'work/changes/open/plan-ok/CHANGE.md',
      impactPacket('Ready', validPlanes),
    );
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/plan-ok/CHANGE.md',
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
  });

  check('a Ready planned-impact packet missing the product row fails', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-plan-missing-'));
    write(root, 'scripts/repo-tools/wiki-core/change-guard-self-test.mjs', 'export {};\n');
    write(
      root,
      'work/changes/open/plan-missing/CHANGE.md',
      impactPacket('Ready', validPlanes.filter((row) => !row.startsWith('| Product'))),
    );
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/plan-missing/CHANGE.md',
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'plan-missing-plane' && item.field === 'product'));
  });

  check('an unreasoned N/A disposition fails plan mode', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-plan-na-'));
    write(root, 'scripts/repo-tools/wiki-core/change-guard-self-test.mjs', 'export {};\n');
    const rows = validPlanes.map((row) => (row.startsWith('| Product') ? '| Product | N/A | none | none |' : row));
    write(root, 'work/changes/open/plan-na/CHANGE.md', impactPacket('Ready', rows));
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/plan-na/CHANGE.md',
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'plan-placeholder' && item.field === 'product'));
  });

  check('code authority over an unratified promise fails plan mode', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-plan-contradict-'));
    write(root, 'packages/game/src/fallback.ts', 'export {};\n');
    const rows = validPlanes.map((row) =>
      row.startsWith('| Code')
        ? '| Code | change: packages/game/src/fallback.ts becomes the authority over an unratified game promise; negative: this must fail | code | rejected |'
        : row,
    );
    write(root, 'work/changes/open/plan-contradict/CHANGE.md', impactPacket('Ready', rows));
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/plan-contradict/CHANGE.md',
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'plan-contradiction'));
  });

  check('a Proposed partial plan is a diagnostic and still passes', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-plan-proposed-'));
    write(root, 'scripts/repo-tools/wiki-core/change-guard-self-test.mjs', 'export {};\n');
    write(
      root,
      'work/changes/open/plan-proposed/CHANGE.md',
      impactPacket('Proposed', validPlanes.filter((row) => row.startsWith('| Code'))),
    );
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/plan-proposed/CHANGE.md',
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.ok(result.findings.some((item) => item.severity === 'warning' && item.code === 'plan-missing-plane'));
  });

  check('a legacy Ready packet without the schema stays green and warns', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-plan-legacy-'));
    write(
      root,
      'work/changes/open/legacy-ready/CHANGE.md',
      packet({
        state: 'Ready',
        authority: 'docs/product/gameplay/time-and-autonomy.md stays the selected owner.',
        code: 'packages/game/src/fallback.ts',
        negative: 'a legacy Ready packet must not turn the queue red.',
        ledger: LEDGER_HEAD,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'plan',
      changePath: 'work/changes/open/legacy-ready/CHANGE.md',
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.ok(result.findings.some((item) => item.severity === 'warning' && item.code === 'schema-upgrade'));
    assert.equal(result.findings.some((item) => item.severity === 'error'), false);
  });

  check('current change none does not invent a packet', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-none-'));
    write(root, 'work/changes/README.md', '# Queue\n\nCurrent change: none\n');
    const result = guardChange({ repo: root, mode: 'plan', changePath: null });
    assert.equal(result.status, 'no-selected-change');
    assert.match(result.findings[0].message, /No selected Change/);
  });

  function v1Packet(state, ledgerRows) {
    return [
      '# Change: close fixture',
      '',
      `**State:** ${state}`,
      '',
      'Negative case: an omitted dependent must fail close.',
      '',
      '## Planned specification and implementation delta | planned-impact.v1',
      '',
      '| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |',
      '| --- | --- | --- | --- |',
      '| Product | unchanged because the selected player promise stays in force for this fixture | none | no game edit |',
      '| Technical | unchanged because the execution gate contract stays in force for this fixture | none | no wire edit |',
      '| Code | change: packages/game/src/fallback.ts adds the fixture assertion; negative: a missing dependent fails | test | fixture |',
      '| Related | unchanged because this fixture does not add a documentation registry | none | no registry |',
      '',
      '## Reconciliation ledger',
      '',
      LEDGER_HEAD,
      ...ledgerRows,
      '',
    ].join('\n');
  }

  function clockPages(root, { contract = true, seeAlso = false, citation = false } = {}) {
    write(root, 'docs/product/time.md', '# Time\n\n## Pace\n\nAn accepted action owns duration.\n');
    write(root, 'packages/game/src/fallback.ts', 'export {};\n');
    const lines = ['# Clock', '', '## Permission to advance', '', 'The gate follows the product rule.'];
    if (seeAlso) lines.push('', 'See also [Pace](../product/time.md#pace).');
    if (citation) lines.push('', 'Reviewed `packages/game/src/fallback.ts`.');
    if (contract) {
      lines.push(
        '',
        '### Contract dependencies',
        '',
        '| This claim | Relation | Governing claim | Why a change triggers review |',
        '| --- | --- | --- | --- |',
        '| Permission to advance | constrained-by | [Pace](../product/time.md#pace) | The gate must keep the accepted duration rule |',
      );
    }
    write(root, 'docs/technical/clock.md', lines.join('\n'));
  }

  check('a test-only v1 diff with reasoned no-ops closes', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-noop-'));
    write(root, 'packages/game/src/fallback.ts', 'export {};\n');
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| no product/technical behavior impacted | none | unchanged because this fixture only adds a test and no player promise moved | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | a missing dependent would fail | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['packages/game/src/fallback.ts'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.ok(result.findings.some((item) => item.code === 'no-known-relation'));
  });

  check('an omitted constrained-by dependent fails close', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-omit-'));
    clockPages(root);
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| docs/product/time.md#pace | product | changed: the pace sentence gained a clause the gate must review | docs/product/time.md @ abcdef12 | fixture-tested | omitting the gate fails | N/A |',
        '| no product/technical behavior impacted | none | unchanged because the fixture file is only the carrier | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | the omitted gate is the failure | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['docs/product/time.md', 'packages/game/src/fallback.ts'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'missing-dependent-disposition' && item.field === 'docs/technical/clock.md'));
  });

  check('naming the dependent with a concrete reason clears close', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-clear-'));
    clockPages(root);
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| docs/product/time.md#pace | product | changed: the pace sentence gained a clause and the gate was reviewed | docs/product/time.md @ abcdef12 | fixture-tested | an omitted gate would fail | N/A |',
        '| docs/technical/clock.md#permission-to-advance | technical | unchanged because the execution gate still matches the pace rule and was read | docs/technical/clock.md @ abcdef12 | fixture-tested | a silent gate edit would fail | N/A |',
        '| no product/technical behavior impacted | none | unchanged because the fixture file is only the carrier | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | the carrier is not the rule | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['docs/product/time.md', 'packages/game/src/fallback.ts'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.equal(result.findings.some((item) => item.code === 'missing-dependent-disposition'), false);
  });

  check('a see-also link does not force a dependent disposition', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-seealso-'));
    clockPages(root, { contract: false, seeAlso: true });
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| docs/product/time.md#pace | product | unchanged because the pace rule was reviewed and the see-also link is not a gate | docs/product/time.md @ abcdef12 | fixture-tested | a see-also link must not fail close | N/A |',
        '| no product/technical behavior impacted | none | unchanged because the fixture file is only the carrier | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | see-also is not an edge | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['docs/product/time.md', 'packages/game/src/fallback.ts'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.equal(result.findings.some((item) => item.code === 'missing-dependent-disposition'), false);
  });

  check('a blanket docs-unaffected row cannot cover a known dependent', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-blanket-'));
    clockPages(root);
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| docs/product/time.md#pace | product | unchanged: docs unaffected for every neighboring page in this set | docs/product/time.md @ abcdef12 | fixture-tested | a blanket row must fail | N/A |',
        '| no product/technical behavior impacted | none | unchanged because the fixture file is only the carrier | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | the blanket row is the failure | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['docs/product/time.md'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'blanket-disposition'));
  });

  check('a changed selected contract missing from the ledger fails', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-undeclared-'));
    clockPages(root, { contract: false });
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| no product/technical behavior impacted | none | unchanged because the ledger forgot the product file on purpose | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | a silent product diff fails | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['docs/product/time.md'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'undeclared-changed-contract'));
  });

  check('a changed contract file without a heading warns and still closes', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-ambiguous-'));
    clockPages(root, { contract: false });
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| docs/product/time.md | product | unchanged because the whole pace file was reviewed without naming one heading | docs/product/time.md @ abcdef12 | fixture-tested | the missing fragment is a warning | N/A |',
        '| no product/technical behavior impacted | none | unchanged because the fixture file is only the carrier | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | the fragment warning is not a failure | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['docs/product/time.md'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.ok(result.findings.some((item) => item.code === 'ambiguous-heading' && item.severity === 'warning'));
  });

  check('shallow history warns and does not invent a fresh impact set', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-shallow-'));
    write(root, 'packages/game/src/fallback.ts', 'export {};\n');
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| no product/technical behavior impacted | none | unchanged because history was unavailable so no freshness was claimed | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | a shallow history must not look fresh | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['packages/game/src/fallback.ts'],
      historyStatus: 'unavailable',
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.ok(result.findings.some((item) => item.code === 'proof-blocked'));
    assert.equal(result.findings.some((item) => item.code === 'no-known-relation'), false);
  });

  check('a citation is a review candidate and not a close failure', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-cite-'));
    clockPages(root, { contract: false, citation: true });
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| no product/technical behavior impacted | none | unchanged because the cited page is a candidate rather than a failed gate | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | a citation must not fail close by itself | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['packages/game/src/fallback.ts'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.ok(result.findings.some((item) => item.code === 'citation-candidate' && item.severity === 'warning'));
  });

  check('a Proposed v1 packet keeps an omitted dependent as a diagnostic', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-proposed-'));
    clockPages(root);
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Proposed', [
        '| docs/product/time.md#pace | product | changed: the pace sentence is still only a proposal | docs/product/time.md @ abcdef12 | fixture-tested | a proposal must not pretend to be Ready | N/A |',
        '| no product/technical behavior impacted | none | unchanged because the fixture file is only the carrier | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | the diagnostic stays a warning | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['docs/product/time.md'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.ok(result.findings.some((item) => item.code === 'missing-dependent-disposition' && item.severity === 'warning'));
    assert.equal(result.findings.some((item) => item.severity === 'error'), false);
  });

  check('a legacy close without planned-impact.v1 does not grow new impact errors', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-legacy-'));
    write(root, 'scripts/repo-tools/wiki-change-guard.mjs', 'export {};\n');
    write(
      root,
      'work/changes/open/tool/CHANGE.md',
      packet({
        authority: 'No product/technical behavior impacted. The checker is an agent tool.',
        code: 'scripts/repo-tools/wiki-change-guard.mjs',
        negative: 'a legacy packet must not fail the new dependent rule.',
        ledger: `${LEDGER_HEAD}\n| no product/technical behavior impacted | none | unchanged: this checker does not alter gameplay or selected product rules | scripts/repo-tools/wiki-change-guard.mjs @ abcdef12 | fixture-tested | the new rule stays opt-in | N/A |`,
      }),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/tool/CHANGE.md',
      changedPaths: ['scripts/repo-tools/wiki-change-guard.mjs'],
    });
    assert.equal(result.status, 'ok', JSON.stringify(result.findings, null, 2));
    assert.equal(result.findings.some((item) => item.code === 'missing-dependent-disposition'), false);
  });

  check('a v1 ledger heading that does not exist still fails', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-close-heading-'));
    clockPages(root, { contract: false });
    write(
      root,
      'work/changes/open/close-v1/CHANGE.md',
      v1Packet('Done', [
        '| docs/technical/clock.md#not-a-real-heading | technical | unchanged because the contract text was not the thing being renamed | docs/technical/clock.md @ abcdef12 | fixture-tested | an invented heading fails | N/A |',
        '| no product/technical behavior impacted | none | unchanged because the fixture file is only the carrier | packages/game/src/fallback.ts @ abcdef12 | fixture-tested | the invented heading is the failure | N/A |',
      ]),
    );
    const result = guardChange({
      repo: root,
      mode: 'close',
      changePath: 'work/changes/open/close-v1/CHANGE.md',
      changedPaths: ['docs/technical/clock.md'],
    });
    assert.equal(result.status, 'failed');
    assert.ok(result.findings.some((item) => item.code === 'missing-heading'));
  });

  if (failures.length > 0) {
    console.error('CHANGE-GUARD SELF-TEST FAILURES:');
    for (const failure of failures) console.error(failure);
    return 1;
  }
  console.log(
    'Change-guard self-test passed: unratified GM07, path ratification, unchanged target, shallow checkbox, tooling exception, not-run, paid claim, owner review, missing heading, archive immutability, planned-impact.v1, legacy Ready warning, impact closure, empty queue.',
  );
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  process.exit(runChangeGuardSelfTest());
}
