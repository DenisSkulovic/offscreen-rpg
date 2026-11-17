import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSectionIndex, findSections, readSection } from './route.mjs';

function write(root, rel, text) {
  const abs = path.join(root, ...rel.split('/'));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, 'utf8');
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'wiki-route-'));
  write(
    root,
    'docs/README.md',
    [
      '# Docs',
      '',
      '| Question | Owner |',
      '| --- | --- |',
      '| Who awards a mechanical reward? | [Rewards](product/rewards.md#award) |',
      '| When does made-up time advance? | [Time](product/time.md#advance) |',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/product/rewards.md',
    ['# Rewards', '', '## Award', '', 'The steward awards the mechanical reward.', ''].join('\n'),
  );
  write(
    root,
    'docs/product/time.md',
    ['# Time', '', '## Advance', '', 'Time advances only when the clock rule says so.', ''].join('\n'),
  );
  write(
    root,
    'docs/technical/rewards.md',
    ['# Technical reward', '', '## Owner', '', 'The selected contract names who awards a mechanical reward.', ''].join('\n'),
  );
  write(
    root,
    'docs/technical/observability/capture.md',
    [
      '# Capture',
      '',
      'This page is proposal only and not installed or authorized.',
      '',
      '## Mechanical reward',
      '',
      'A proposal may also mention a mechanical reward. It is not selected.',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/technical/client/architecture.md',
    [
      '# Architecture',
      '',
      'Not authorized by this target alone. The architecture is selected.',
      '',
      '## Transport',
      '',
      'The selected client transport is server-sent events.',
      '',
    ].join('\n'),
  );
  write(
    root,
    'STATUS.md',
    ['# Status', '', '## Orientation', '', 'The reward command is implemented and tested in the source map.', ''].join('\n'),
  );
  write(
    root,
    'docs/technical/nested.md',
    [
      '# Nested',
      '',
      '## Parent',
      '',
      'Parent intro.',
      '',
      '### Child',
      '',
      'Child only.',
      '',
      '### Sibling',
      '',
      'Sibling only.',
      '',
      '## Next',
      '',
      'After the parent.',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/technical/fence.md',
    ['# Fence', '', '## Actual', '', '```', '## Fake heading', '```', '', 'Real body.', '', '## Next', '', 'Done.', ''].join('\n'),
  );
  write(
    root,
    'docs/technical/twins.md',
    ['# Twins', '', '## Twin', '', 'First twin.', '', '## Twin', '', 'Second twin.', ''].join('\n'),
  );
  const long = Array.from({ length: 200 }, (_, index) => `Line ${index} keeps the rule.`).join('\n');
  write(root, 'docs/technical/long.md', `# Long\n\n## Huge\n\n${long}\n\nFINAL_NEGATIVE_CASE\n`);
  write(root, 'evidence/old.md', '# Old\n\n## Mechanical reward\n\nHistorical notes are not the current rule.\n');
  write(root, 'scripts/repo-tools/wiki-benchmarks/secret.md', '# Secret\n\nZEBRA_GOLD_KEY must not be retrieved.\n');
  return root;
}

export function runRouteSelfTest() {
  const failures = [];
  function check(name, fn) {
    try {
      fn();
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  check('question-row context stays on its own link', () => {
    const root = fixture();
    const index = buildSectionIndex(root, { repoSha: 'fixture', dirty: false });
    const found = findSections(index, 'Who awards a mechanical reward?');
    const award = found.normative.find((item) => item.ref === 'docs/product/rewards.md#award');
    const time = index.sections.find((item) => item.path === 'docs/product/time.md' && item.anchor === 'advance');
    assert.ok(award, JSON.stringify(found.normative, null, 2));
    assert.match(award.rowContext, /mechanical reward/i);
    assert.equal(/mechanical reward/i.test(time.rowContext), false);
    assert.equal(award.match, 'question-row');
  });

  check('a fenced heading is not a section and nested H3 stops at the next H3', () => {
    const root = fixture();
    const index = buildSectionIndex(root);
    const fence = index.sections.filter((item) => item.path === 'docs/technical/fence.md').map((item) => item.anchor);
    assert.deepEqual(fence, ['fence', 'actual', 'next']);
    const child = readSection(root, 'docs/technical/nested.md#child');
    assert.equal(child.ok, true);
    assert.match(child.text, /Child only/);
    assert.equal(child.text.includes('Sibling only'), false);
    assert.equal(child.text.includes('After the parent'), false);
  });

  check('duplicate slugs get distinct ranges', () => {
    const root = fixture();
    const first = readSection(root, 'docs/technical/twins.md#twin');
    const second = readSection(root, 'docs/technical/twins.md#twin-1');
    assert.match(first.text, /First twin/);
    assert.equal(first.text.includes('Second twin'), false);
    assert.match(second.text, /Second twin/);
    assert.equal(second.text.includes('First twin'), false);
  });

  check('a long section truncates visibly and can be expanded', () => {
    const root = fixture();
    const short = readSection(root, 'docs/technical/long.md#huge', { maxChars: 400 });
    assert.equal(short.truncated, true);
    assert.ok(short.continuation);
    assert.equal(short.text.includes('FINAL_NEGATIVE_CASE'), false);
    const rest = readSection(root, 'docs/technical/long.md#huge', {
      maxChars: 400,
      fromLine: short.continuation.fromLine,
    });
    const expanded = readSection(root, 'docs/technical/long.md#huge', { maxChars: 20000 });
    assert.equal(expanded.truncated, false);
    assert.match(expanded.text, /FINAL_NEGATIVE_CASE/);
    assert.ok(rest.ok);
  });

  check('proposal lane cannot outrank a selected owner, and status queries keep STATUS', () => {
    const root = fixture();
    const found = findSections(indexOf(root), 'Is the mechanical reward implemented?');
    assert.equal(found.normative.some((item) => item.authority === 'proposal'), false);
    assert.ok(found.proposalLane.some((item) => item.notice === 'NOT SELECTED'));
    assert.equal(found.statusCompanion && found.statusCompanion.path, 'STATUS.md');
    assert.equal(found.normative[0].lane === 'proposal', false);
    const architecture = indexOf(root).sections.find((item) => item.path === 'docs/technical/client/architecture.md');
    assert.equal(architecture.authority, 'selected-technical');
  });

  check('historic pages and benchmark gold stay out of the default index', () => {
    const root = fixture();
    const hidden = findSections(buildSectionIndex(root), 'mechanical reward');
    assert.equal(hidden.historic.length, 0);
    assert.equal(hidden.normative.some((item) => item.path.startsWith('evidence/')), false);
    const shown = findSections(buildSectionIndex(root, { includeHistoric: true }), 'historical notes', {
      includeHistoric: true,
    });
    assert.ok(shown.historic.some((item) => item.path === 'evidence/old.md'));
    const gold = findSections(buildSectionIndex(root), 'ZEBRA_GOLD_KEY');
    assert.equal(gold.normative.length, 0);
    assert.equal(gold.proposalLane.length, 0);
  });

  check('a missing heading reports neighbors and does not invent a match', () => {
    const root = fixture();
    const missing = readSection(root, 'docs/product/rewards.md#not-a-heading');
    assert.equal(missing.ok, false);
    assert.equal(missing.error, 'missing-heading');
    assert.ok(missing.nearby.some((item) => item.anchor === 'award'));
    const outline = readSection(root, 'docs/technical/nested.md', { outline: true });
    assert.equal(outline.mode, 'outline');
    assert.ok(outline.headings.every((item) => item.bytes > 0));
    assert.equal(outline.text, undefined);
  });

  if (failures.length > 0) {
    console.error('ROUTE SELF-TEST FAILURES:');
    for (const failure of failures) console.error(failure);
    return 1;
  }
  console.log(
    'Route self-test passed: row context, fenced heading, nested range, truncation, proposal lane, status companion, historic opt-in, missing heading.',
  );
  return 0;
}

function indexOf(root) {
  return buildSectionIndex(root, { repoSha: 'fixture', dirty: false });
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  process.exit(runRouteSelfTest());
}
