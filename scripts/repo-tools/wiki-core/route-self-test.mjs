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
    'docs/product/README.md',
    [
      '# Product',
      '',
      '| Question | Owner |',
      '| --- | --- |',
      '| What persistent life are we building? | [Vision](foundations/vision.md) |',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/product/foundations/vision.md',
    ['# A character with a life of their own', '', 'The game is a life that continues when you leave.', ''].join('\n'),
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
  write(
    root,
    'docs/technical/observability/forensic.md',
    ['# Forensic read', '', '**Status: proposed security/read architecture.** No new staff grants are authorized.', '', '## Authoritative read models', '', 'These read models are not the staff console.', ''].join('\n'),
  );
  write(
    root,
    'docs/technical/observability/evidence.md',
    ['# Evidence graph', '', 'Status: technical target proposal, not a second authority.', '', '## Selected contract', '', 'This evidence graph is the selected observability contract.', ''].join('\n'),
  );
  const filler = Array.from({ length: 400 }, () => 'padding sentence for a large page title.').join(' ');
  write(
    root,
    'docs/runbooks/local-development.md',
    ['# Local development', '', filler, '', '## Fast frontend workflow', '', 'Use pnpm test:fast only after its command exists.', ''].join('\n'),
  );
  write(
    root,
    '.agents/rules/documentation.md',
    ['# Documentation', '', '## Admission: ratified target versus realization', '', 'A ratified target is admitted before the code exists.', ''].join('\n'),
  );
  write(
    root,
    'docs/technical/client/selected-target.md',
    ['# Selected target', '', 'Architecture selected is not the same as code implemented.', ''].join('\n'),
  );
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

  check('a large page title yields to the section that holds the specific token', () => {
    const found = findSections(indexOf(fixture()), 'Where do local development instructions mention test:fast?');
    assert.equal(found.normative[0].ref, 'docs/runbooks/local-development.md#fast-frontend-workflow');
  });

  check('a subject map yields to the linked owner, and a proposal question uses that lane', () => {
    const root = fixture();
    const index = indexOf(root);
    const vision = findSections(index, 'What is the product vision of the game?', { kind: 'product' });
    assert.equal(vision.normative[0].path, 'docs/product/foundations/vision.md');
    const proposed = findSections(index, 'Which telemetry page is still only a proposal?', { kind: 'technical' });
    assert.equal(proposed.primaryLane, 'proposal');
    assert.equal(proposed.proposalLane[0].path, 'docs/technical/observability/capture.md');
    const forensic = index.sections.find((item) => item.path === 'docs/technical/observability/forensic.md');
    const evidence = index.sections.find((item) => item.path === 'docs/technical/observability/evidence.md');
    assert.equal(forensic.lane, 'proposal');
    assert.equal(evidence.authority, 'selected-technical');
  });

  check('the admission rule is indexed from the agent rules', () => {
    const found = findSections(indexOf(fixture()), 'Which rule admits a ratified target before the code exists?');
    assert.equal(found.normative[0].ref, '.agents/rules/documentation.md#admission-ratified-target-versus-realization');
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
