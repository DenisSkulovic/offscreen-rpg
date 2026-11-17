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

  check('current change none does not invent a packet', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-guard-none-'));
    write(root, 'work/changes/README.md', '# Queue\n\nCurrent change: none\n');
    const result = guardChange({ repo: root, mode: 'plan', changePath: null });
    assert.equal(result.status, 'no-selected-change');
    assert.match(result.findings[0].message, /No selected Change/);
  });

  if (failures.length > 0) {
    console.error('CHANGE-GUARD SELF-TEST FAILURES:');
    for (const failure of failures) console.error(failure);
    return 1;
  }
  console.log(
    'Change-guard self-test passed: unratified GM07, path ratification, unchanged target, shallow checkbox, tooling exception, not-run, paid claim, owner review, missing heading, archive immutability, empty queue.',
  );
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  process.exit(runChangeGuardSelfTest());
}
