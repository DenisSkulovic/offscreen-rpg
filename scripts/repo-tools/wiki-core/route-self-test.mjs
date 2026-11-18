import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSectionIndex, findSections, readSection } from './route.mjs';

function write(root, rel, text) {
  const abs = path.join(root, ...rel.split('/'));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, 'utf8');
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'wiki-route-'));
  write(root, 'ENGINEERING.md', '# Engineering System Tour\n\nDocumented AI engineering methodology and agent workflow.\n');
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
    'docs/technical/lab/chamber.md',
    [
      '# Chamber laboratory',
      '',
      'The chamber laboratory is not paid-provider permission. A lane being present is not a second engine.',
      '',
      filler,
      '',
      '## Operating model',
      '',
      'The chamber laboratory separates a fixture lane from a provider lane. The provider lane is never the default.',
      '',
    ].join('\n'),
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
  write(
    root,
    'docs/product/examples.md',
    [
      '# Example rewards',
      '',
      '## Award note',
      '',
      'The proposed companion schedule is mentioned only as a pointer, and this award note stays the product rule.',
      '',
      'For example, the steward records one selected gift. ZED_EXAMPLE_PRODUCT stays product.',
      '',
      '## Proposed aside',
      '',
      'This section is proposed. It does not become the award rule. ZED_NESTED_PROPOSAL',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/technical/capsule-page.md',
    [
      '# Evidence sample',
      '',
      '**Status: selected evidence-graph target, 2026-11-15. Not implemented.** This page is not a proposal.',
      '',
      '## Owner map',
      '',
      'The capsule stays a proposed read. This map does not authorize that read. ZED_MENTION_PROPOSAL',
      '',
      '## Turn evidence capsule',
      '',
      '**Status: proposed read contract, 2026-11-15. No table, API or code is authorized by this section.** ZED_CAPSULE',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/technical/retention-like.md',
    [
      '# Retention sample',
      '',
      '**Status: technical/product recommendation, 2026-11-15; not approved for implementation.** ZED_RETENTION',
      '',
      '## Windows',
      '',
      'These are proposed starting policies for review, not legal commitments.',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/technical/conditional-production.md',
    [
      '# Conditional production',
      '',
      '**State:** **CONDITIONAL TECHNICAL TARGET**, design approved for investigation but **no automatic provider-writing change is approved**. ZED_CONDITIONAL',
      '',
      '## Proposed publication protocol',
      '',
      'Do not call a provider. ZED_PAID_PRODUCTION',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/technical/mixed-status.md',
    ['# Mixed status', '', '**Status: selected and proposed for this same section.** ZED_MIXED', ''].join('\n'),
  );
  write(
    root,
    'docs/product/admin-sample.md',
    [
      '# Admin sample',
      '',
      '**Owns:** the console surface.',
      '**Status: proposed, 2026-11-14.** This is not a live dashboard. ZED_OWNS_THEN_STATUS',
      '',
    ].join('\n'),
  );
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

  check('root engineering tour is indexed and discoverable by question', () => {
    const index = buildSectionIndex(fixture(), { repoSha: 'fixture', dirty: false });
    const tour = index.sections.find((item) => item.path === 'ENGINEERING.md' && item.heading === 'Engineering System Tour');
    assert.ok(tour);
    assert.equal(tour.authority, 'router');
    const hits = findSections(index, 'Documented AI engineering methodology and agent workflow');
    assert.ok(hits.normative.some((item) => item.path === 'ENGINEERING.md'), JSON.stringify(hits.normative, null, 2));
  });

  check('question-row context stays on its own link', () => {
    const root = fixture();
    const index = buildSectionIndex(root, { repoSha: 'fixture', dirty: false });
    const found = findSections(index, 'Who awards a mechanical reward?');
    const award = found.normative.find((item) => item.ref === 'docs/product/rewards.md#award');
    const time = index.sections.find((item) => item.path === 'docs/product/time.md' && item.anchor === 'advance');
    assert.ok(award, JSON.stringify(found.normative, null, 2));
    assert.match(award.rowContext, /mechanical reward/i);
    assert.equal(/mechanical reward/i.test(time.rowContext), false);
    assert.ok(found.normative[0].ref === 'docs/product/rewards.md#award');
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

  check('a page title stays when its opening already contains the child query words', () => {
    const found = findSections(indexOf(fixture()), 'How does the chamber laboratory separate a paid provider lane?');
    assert.equal(found.normative[0].ref, 'docs/technical/lab/chamber.md#chamber-laboratory');
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
    const contract = index.sections.find((item) => item.path === 'docs/technical/observability/evidence.md' && item.anchor === 'selected-contract');
    assert.equal(forensic.lane, 'proposal');
    assert.equal(evidence.lane, 'uncertain');
    assert.equal(evidence.authority, 'uncertain');
    assert.equal(contract.authority, 'selected-technical');
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

  check('section authority stays local, and uncertain headings do not become normative', () => {
    const root = fixture();
    const index = indexOf(root);
    assert.equal(index.schema, 'wiki.route.v2');
    assert.equal(index.repoSha, 'fixture');
    assert.equal(index.dirty, false);
    const mention = index.sections.find((item) => item.path === 'docs/product/examples.md' && item.anchor === 'award-note');
    const nested = index.sections.find((item) => item.path === 'docs/product/examples.md' && item.anchor === 'proposed-aside');
    const examplePage = index.sections.find((item) => item.path === 'docs/product/examples.md' && item.depth === 1);
    assert.equal(mention.authority, 'ratified-product');
    assert.equal(mention.lane, 'normative');
    assert.equal(examplePage.authority, 'ratified-product');
    assert.match(mention.preview, /For example/);
    assert.equal(nested.authority, 'proposal');
    assert.equal(nested.lane, 'proposal');
    const status = index.sections.find((item) => item.path === 'STATUS.md');
    assert.equal(status.authority, 'status');
    assert.equal(status.lane, 'status');
    assert.notEqual(status.authority, 'ratified-product');
    const statusHit = findSections(index, 'Is the reward command implemented?');
    const statusRow = statusHit.normative.find((item) => item.path === 'STATUS.md');
    assert.ok(statusRow);
    assert.equal(statusRow.selected, false);
    assert.equal(statusRow.authority, 'status');
    assert.equal(statusRow.repoSha, 'fixture');
    assert.equal(statusRow.dirty, false);
    assert.match(statusRow.ref, /^STATUS\.md#/);
    const sample = index.sections.find((item) => item.path === 'docs/technical/capsule-page.md' && item.depth === 1);
    const mentioned = index.sections.find((item) => item.path === 'docs/technical/capsule-page.md' && item.anchor === 'owner-map');
    const capsule = index.sections.find((item) => item.path === 'docs/technical/capsule-page.md' && item.anchor === 'turn-evidence-capsule');
    assert.equal(sample.authority, 'selected-technical');
    assert.equal(sample.lane, 'normative');
    assert.equal(sample.realization, 'unimplemented');
    assert.equal(mentioned.authority, 'selected-technical');
    assert.match(mentioned.preview, /proposed read/);
    assert.equal(capsule.authority, 'proposal');
    assert.equal(capsule.lane, 'proposal');
    const capsuleHits = findSections(index, 'ZED_CAPSULE');
    assert.equal(capsuleHits.normative.some((item) => item.anchor === 'turn-evidence-capsule'), false);
    assert.ok(capsuleHits.proposalLane.some((item) => item.ref === 'docs/technical/capsule-page.md#turn-evidence-capsule'));
    assert.equal(capsuleHits.proposalLane[0].authority, capsule.authority);
    assert.equal(capsuleHits.proposalLane[0].lane, capsule.lane);
    const retention = index.sections.filter((item) => item.path === 'docs/technical/retention-like.md');
    assert.ok(retention.length >= 2);
    assert.equal(retention.some((item) => item.authority === 'selected-technical' || item.lane === 'normative'), false);
    assert.equal(retention[0].authority, 'proposal');
    const conditional = index.sections.find((item) => item.path === 'docs/technical/conditional-production.md' && item.depth === 1);
    const protocol = index.sections.find((item) => item.path === 'docs/technical/conditional-production.md' && item.heading === 'Proposed publication protocol');
    assert.equal(conditional.authority, 'uncertain');
    assert.equal(conditional.lane, 'uncertain');
    assert.equal(conditional.realization, 'not-paid-production');
    assert.equal(protocol.lane, 'proposal');
    const conditionalHits = findSections(index, 'ZED_CONDITIONAL');
    assert.equal(conditionalHits.normative.some((item) => item.path === 'docs/technical/conditional-production.md'), false);
    assert.ok(conditionalHits.uncertain.some((item) => item.ref === 'docs/technical/conditional-production.md#conditional-production'));
    assert.equal(conditionalHits.uncertain[0].notice, 'UNCERTAIN — not a grant');
    const mixed = index.sections.find((item) => item.path === 'docs/technical/mixed-status.md');
    assert.equal(mixed.lane, 'uncertain');
    const chamber = index.sections.find((item) => item.path === 'docs/technical/lab/chamber.md' && item.depth === 1);
    assert.equal(chamber.authority, 'selected-technical');
    assert.notEqual(chamber.lane, 'uncertain');
    const admin = index.sections.find((item) => item.path === 'docs/product/admin-sample.md' && item.depth === 1);
    assert.equal(admin.authority, 'proposal');
    assert.equal(admin.lane, 'proposal');
    assert.equal(admin.authorityBasis, 'status');
  });

  check('checked-in headings keep section authority and source identity', () => {
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const index = buildSectionIndex(repo, { repoSha: 'self-test-tree', dirty: true });
    const byHeading = (rel, heading) => index.sections.find((item) => item.path === rel && item.heading === heading);
    const h1 = (rel) => index.sections.find((item) => item.path === rel && item.depth === 1);
    const retention = h1('docs/technical/observability/retention-and-access.md');
    assert.ok(retention);
    assert.equal(retention.authority, 'proposal');
    assert.equal(retention.lane, 'proposal');
    assert.notEqual(retention.authority, 'selected-technical');
    const retentionSections = index.sections.filter((item) => item.path === retention.path);
    assert.equal(retentionSections.some((item) => item.lane === 'normative' || item.authority === 'selected-technical'), false);
    const capsule = byHeading('docs/technical/observability/identities-and-evidence.md', 'Turn Evidence Capsule');
    const evidence = h1('docs/technical/observability/identities-and-evidence.md');
    const ownerMap = byHeading('docs/technical/observability/identities-and-evidence.md', 'Owner map');
    const decision = byHeading('docs/technical/observability/identities-and-evidence.md', '1. Decision: no mega-GameData blob, no telemetry-as-history');
    assert.equal(evidence.authority, 'selected-technical');
    assert.equal(evidence.realization, 'unimplemented');
    assert.equal(ownerMap.authority, 'selected-technical');
    const ownerText = readSection(repo, `${ownerMap.path}#${ownerMap.anchor}`, { maxChars: 8000 });
    assert.match(ownerText.text, /proposed/i);
    assert.equal(decision.authority, 'selected-technical');
    const decisionText = readSection(repo, `${decision.path}#${decision.anchor}`, { maxChars: 8000 });
    assert.match(decisionText.text, /proposals/i);
    assert.equal(capsule.authority, 'proposal');
    assert.equal(capsule.lane, 'proposal');
    assert.equal(`${capsule.path}#${capsule.anchor}`, 'docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule');
    const capsuleHits = findSections(index, 'Turn Evidence Capsule');
    assert.equal(capsuleHits.normative.some((item) => item.anchor === 'turn-evidence-capsule'), false);
    assert.ok(capsuleHits.proposalLane.some((item) => item.ref.endsWith('#turn-evidence-capsule')));
    assert.equal(capsuleHits.proposalLane.find((item) => item.anchor === 'turn-evidence-capsule').repoSha, 'self-test-tree');
    assert.equal(capsuleHits.proposalLane.find((item) => item.anchor === 'turn-evidence-capsule').dirty, true);
    const scene = h1('docs/technical/client/scene-direction-production.md');
    const sceneSections = index.sections.filter((item) => item.path === scene.path);
    assert.equal(scene.authority, 'uncertain');
    assert.equal(scene.lane, 'uncertain');
    assert.equal(scene.realization, 'not-paid-production');
    assert.equal(sceneSections.some((item) => item.lane === 'normative'), false);
    assert.equal(sceneSections.some((item) => item.realization === 'implemented'), false);
    const multiDay = byHeading('docs/product/storyteller/behavior-and-quality.md', 'Multi-day evaluation family');
    const solo = byHeading('docs/product/storyteller/behavior-and-quality.md', 'Selected solo proof boundary');
    assert.equal(multiDay.lane, 'proposal');
    assert.equal(solo.authority, 'ratified-product');
    assert.match(solo.preview, /Proposed\/Blocked/);
    const routine = byHeading('docs/product/gameplay/time-and-autonomy.md', 'Routine execution and event escalation');
    const queue = byHeading('docs/product/gameplay/time-and-autonomy.md', 'Bounded plans for absence');
    const routineText = readSection(repo, `${routine.path}#${routine.anchor}`, { maxChars: 20000 });
    const soloText = readSection(repo, `${solo.path}#${solo.anchor}`, { maxChars: 4000 });
    assert.equal(routine.authority, 'ratified-product');
    assert.match(routineText.text, /For example/);
    assert.match(routineText.text, /proposed first solo policy/);
    assert.equal(queue.lane, 'proposal');
    assert.match(soloText.text, /Proposed\/Blocked/);
    const chamber = h1('docs/technical/lab/chamber-and-fixtures.md');
    assert.equal(chamber.authority, 'selected-technical');
    assert.equal(chamber.realization, 'not-paid-production');
    assert.equal(chamber.lane, 'normative');
  });

  if (failures.length > 0) {
    console.error('ROUTE SELF-TEST FAILURES:');
    for (const failure of failures) console.error(failure);
    return 1;
  }
  console.log(
    'Route self-test passed: row context, fenced heading, nested range, truncation, proposal lane, section authority, status companion, historic opt-in, missing heading.',
  );
  return 0;
}

function indexOf(root) {
  return buildSectionIndex(root, { repoSha: 'fixture', dirty: false });
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  process.exit(runRouteSelfTest());
}
