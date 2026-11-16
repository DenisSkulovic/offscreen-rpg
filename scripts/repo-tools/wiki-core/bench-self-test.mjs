import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pageNdcgAt, retrievalMetrics, runStaticBenchmark, runStaticBenchmarkV2, validateCases } from './bench.mjs';
import { scoreVisibleChoice, summarizeHopper, summarizeHopperV2, walkHopperV2 } from './hopper.mjs';
import { rankPages } from './search.mjs';

function write(root, rel, text) {
  const abs = path.join(root, ...rel.split('/'));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, 'utf8');
}

function baseCase(extra = {}) {
  return {
    id: 'Q',
    category: 'P',
    question: 'Does fictional time advance without an accepted action?',
    entrypoint: 'docs/README.md',
    owners: [
      {
        path: 'docs/product/time.md',
        headingText: 'Response windows and absence',
        role: 'mandatory',
        grade: 3,
        hopper: true,
      },
    ],
    prohibited: [],
    ...extra,
  };
}

export function runBenchSelfTest() {
  const failures = [];
  function check(label, fn) {
    try {
      fn();
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  check('labeled route beats a vague label', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-bench-'));
    write(
      root,
      'docs/README.md',
      '# Docs\n\n[Time and autonomy](product/owner.md)\n[Notes](product/other.md)\n',
    );
    write(
      root,
      'docs/product/owner.md',
      '# Owner\n\n## Response windows and absence\n\nFictional time does not advance without an accepted action.\n',
    );
    write(root, 'docs/product/other.md', '# Other\n\nMail and weather.\n');
    const labeled = baseCase({
      owners: [
        {
          path: 'docs/product/owner.md',
          headingText: 'Response windows and absence',
          role: 'mandatory',
          grade: 3,
          hopper: true,
        },
      ],
    });
    const meta = { repoSha: 'fixture', dirty: false, seed: 20261116, trials: 20 };
    const report = runStaticBenchmark(root, [labeled], meta);
    const again = runStaticBenchmark(root, [labeled], meta);
    assert.equal(report.benchmarkStatus, 'measured');
    assert.equal(report.rows[0].routeSuccess, true);
    assert.equal(report.rows[0].routes[0].hops, 1);
    assert.equal(report.rows[0].recallAt5, 1);
    assert.equal(report.rows[0].hopper.greedyHit, true);
    assert.equal(report.rows[0].wrongAuthority, false);
    assert.equal(JSON.stringify(report.rows), JSON.stringify(again.rows));
    write(root, 'docs/README.md', '# Docs\n\n[here](product/owner.md)\n[Time and autonomy](product/other.md)\n');
    const swapped = runStaticBenchmark(root, [labeled], meta);
    assert.equal(swapped.rows[0].hopper.greedyHit, false);
    assert.equal(swapped.rows[0].routeSuccess, true);
  });

  check('disconnected owner fails the route and keeps lexical search', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-cut-'));
    write(root, 'docs/README.md', '# Docs\n\n[Other](product/other.md)\n');
    write(
      root,
      'docs/product/time.md',
      '# Time\n\n## Response windows and absence\n\nFictional time does not advance without an accepted action.\n',
    );
    write(root, 'docs/product/other.md', '# Other\n\nMail.\n');
    const report = runStaticBenchmark(root, [baseCase()], {
      repoSha: 'fixture',
      dirty: false,
      seed: 1,
      trials: 5,
    });
    assert.equal(report.benchmarkStatus, 'blocked-by-graph-integrity');
    assert.equal(report.rows[0].routeSuccess, false);
    assert.equal(report.rows[0].top5[0].path, 'docs/product/time.md');
    assert.equal(report.graphHardErrors.some((item) => item.path === 'docs/product/time.md'), true);
  });

  check('no shared vocabulary still has a route', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-vocab-'));
    write(root, 'docs/README.md', '# Docs\n\n[Owner](product/time.md)\n');
    write(root, 'docs/product/time.md', '# Time\n\n## Response windows and absence\n\nClock policy.\n');
    const item = baseCase({ question: 'xylophonequartz ceremony' });
    const report = runStaticBenchmark(root, [item], { repoSha: 'fixture', dirty: false, seed: 1, trials: 5 });
    assert.equal(report.rows[0].routeSuccess, true);
    assert.equal(report.rows[0].recallAt5, 0);
  });

  check('missing mandatory page cannot score full recall', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-two-'));
    const links = ['[A](a.md)', '[B](b.md)'];
    for (let index = 0; index < 8; index += 1) {
      links.push(`[Filler ${index}](filler-${index}.md)`);
      write(
        root,
        `docs/filler-${index}.md`,
        `# Filler ${index}\n\n## Topic\n\nfictional time advance accepted action policy notes ${index}\n`,
      );
    }
    write(root, 'docs/README.md', `# Docs\n\n${links.join('\n')}\n`);
    write(root, 'docs/a.md', '# A\n\n## Accepted\n\nfictional time advance accepted action\n');
    write(root, 'docs/b.md', '# B\n\n## Proposal\n\nmail weather harbor\n');
    const item = baseCase({
      owners: [
        { path: 'docs/a.md', headingText: 'Accepted', role: 'mandatory', grade: 3, hopper: true },
        { path: 'docs/b.md', headingText: 'Proposal', role: 'mandatory', grade: 3 },
      ],
    });
    const report = runStaticBenchmark(root, [item], { repoSha: 'fixture', dirty: false, seed: 1, trials: 5 });
    assert.equal(report.rows[0].recallAt5, 0);
    assert.equal(report.rows[0].reciprocal, 0);
  });

  check('historic bait is detectable and excluded from the normative index', () => {
    const ranked = rankPages(
      [
        { id: 'docs/real.md', kind: 'canonical-product', title: 'Time', headings: 'absence', body: 'clock' },
        {
          id: 'work/changes/archive/old.md',
          kind: 'historic',
          title: 'Time autonomy',
          headings: 'time advance',
          body: 'fictional time advance accepted action '.repeat(10),
        },
      ],
      'Does fictional time advance without an accepted action?',
    );
    assert.equal(ranked[0].kind, 'historic');
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-bait-'));
    write(root, 'docs/README.md', '# Docs\n\n[Time and autonomy](product/time.md)\n');
    write(
      root,
      'docs/product/time.md',
      '# Time\n\n## Response windows and absence\n\nFictional time does not advance without an accepted action.\n',
    );
    write(
      root,
      'work/changes/archive/old/CHANGE.md',
      '# Old\n\n' + 'fictional time advance accepted action '.repeat(30),
    );
    const report = runStaticBenchmark(root, [baseCase()], { repoSha: 'fixture', dirty: false, seed: 1, trials: 5 });
    assert.equal(report.rows[0].wrongAuthority, false);
    assert.equal(report.rows[0].top5.some((row) => row.kind === 'historic'), false);
  });

  check('dataset validation catches a missing heading', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-gold-'));
    write(root, 'docs/product/time.md', '# Time\n\n## Real heading\n');
    const errors = validateCases(root, [baseCase()]);
    assert.ok(errors.some((error) => error.includes('heading not found')));
  });

  check('complete answer, owner recall and standard MRR stay distinct', () => {
    const owners = [
      { path: 'docs/a.md', role: 'mandatory', grade: 3 },
      { path: 'docs/b.md', role: 'mandatory', grade: 2 },
    ];
    const missing = retrievalMetrics(['docs/a.md', 'docs/c.md'], owners);
    assert.equal(missing.completeAnswerAt5, 0);
    assert.equal(missing.ownerRecallAt5, 0.5);
    assert.equal(missing.mrr, 1);
    const both = retrievalMetrics(['docs/a.md', 'docs/c.md', 'docs/d.md', 'docs/b.md'], owners);
    assert.equal(both.completeAnswerAt5, 1);
    assert.equal(both.ownerRecallAt5, 1);
    assert.equal(both.mrr, 1);
    const absent = retrievalMetrics(['docs/c.md', 'docs/d.md'], owners);
    assert.equal(absent.mrr, 0);
    assert.equal(absent.ownerRecallAt5, 0);
    assert.equal(absent.completeAnswerAt5, 0);
  });

  check('two headings on one page are one ideal document', () => {
    const owners = [
      { path: 'docs/story.md', role: 'mandatory', grade: 3 },
      { path: 'docs/story.md', role: 'companion', grade: 2 },
    ];
    const metrics = retrievalMetrics(['docs/story.md'], owners);
    assert.equal(metrics.pageGrades.length, 1);
    assert.equal(metrics.pageGrades[0].grade, 3);
    assert.equal(metrics.ndcgAt5, 1);
    assert.equal(pageNdcgAt([3], [3, 2], 5) === 1, false);
  });

  check('normative authority risk is not a measured zero', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-v2-auth-'));
    write(
      root,
      'docs/README.md',
      '# Docs\n\n[Time](product/time.md)\n\nHistorical [old packet](../work/changes/archive/old/CHANGE.md) is not the current contract.\n',
    );
    write(root, 'docs/product/time.md', '# Time\n\n## Response windows and absence\n\nFictional time.\n');
    write(root, 'work/changes/archive/old/CHANGE.md', '# Old\n\n' + 'fictional time advance accepted action '.repeat(30));
    const report = runStaticBenchmarkV2(root, [baseCase()], { repoSha: 'fixture', dirty: false, seed: 1, trials: 2 });
    assert.equal(report.rows[0].authority.normative.evaluated, false);
    assert.equal(report.rows[0].authority.adversarial.evaluated, true);
    assert.equal(report.rows[0].authority.adversarial.historicInTop5, true);
  });

  check('a proposal can support a question without becoming the gameplay owner', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-v2-prop-'));
    write(root, 'docs/README.md', '# Docs\n\n[Time](product/time.md)\n[Proposed standing life](../work/designs/open/standing.md)\n');
    write(root, 'docs/product/time.md', '# Time\n\n## Response windows and absence\n\nAccepted absence rule.\n');
    write(
      root,
      'work/designs/open/standing.md',
      '# Standing\n\n## Proposal\n\nstanding life fictional time advance accepted action proposal only\n',
    );
    const item = baseCase({
      question: 'standing life fictional time advance accepted action',
      owners: [
        { path: 'docs/product/time.md', headingText: 'Response windows and absence', role: 'mandatory', grade: 3, hopper: true },
        { path: 'work/designs/open/standing.md', headingText: 'Proposal', role: 'companion', grade: 1 },
      ],
    });
    const report = runStaticBenchmarkV2(root, [item], { repoSha: 'fixture', dirty: false, seed: 1, trials: 2 });
    assert.equal(report.rows[0].corpus, 'proposal-aware');
    assert.equal(report.rows[0].proposedIsMandatoryOwner.includes('work/designs/open/standing.md'), false);
    assert.equal(report.rows[0].primaryRecallAt5, 1);
  });

  check('question table row chooses the link the label cannot', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-row-'));
    write(
      root,
      'docs/README.md',
      [
        '# Docs',
        '',
        '| Question | Owner |',
        '| --- | --- |',
        '| What is the game, in one place? | [Vision](vision.md) |',
        '| Who may change dice, items and commitments? | [Rules](rules.md) |',
        '',
      ].join('\n'),
    );
    write(root, 'docs/vision.md', '# Vision\n\n## Earned life\n\nA world.\n');
    write(root, 'docs/rules.md', '# Rules\n\n## Dice\n\nDice.\n');
    const item = baseCase({
      question: 'What is the game, in one place?',
      owners: [{ path: 'docs/vision.md', headingText: 'Earned life', role: 'mandatory', grade: 3, hopper: true }],
    });
    const report = runStaticBenchmarkV2(root, [item], { repoSha: 'fixture', dirty: false, seed: 1, trials: 2 });
    assert.equal(report.rows[0].hopperRow.greedyHit, true);
    assert.equal(report.rows[0].hopperLabel.greedyHit, false);
    assert.equal(report.rows[0].hopperLabel.stopped, 'no-candidate');
  });

  check('backtracked clicks count against hit@3', () => {
    const edges = [
      { from: 'start', to: 'bad1', label: 'time autonomy extra', kind: 'canonical-navigation', context: '' },
      { from: 'bad1', to: 'bad2', label: 'time autonomy extra', kind: 'canonical-navigation', context: '' },
      { from: 'bad2', to: 'bad3', label: 'time autonomy extra', kind: 'canonical-navigation', context: '' },
      { from: 'bad2', to: 'start', label: 'time autonomy extra', kind: 'canonical-navigation', context: '' },
      { from: 'bad3', to: 'bad4', label: 'time autonomy extra', kind: 'canonical-navigation', context: '' },
      { from: 'start', to: 'mid', label: 'time notes', kind: 'canonical-navigation', context: '' },
      { from: 'mid', to: 'goal', label: 'time notes', kind: 'canonical-navigation', context: '' },
    ];
    const walk = walkHopperV2({
      start: 'start',
      edges,
      headingText: new Map(),
      question: 'time autonomy',
      policy: 'greedy',
      random: () => 0,
      target: 'goal',
      contextMode: 'label',
      hopCap: 8,
    });
    assert.equal(walk.hit, true);
    assert.ok(walk.hitForwardOpens > 3);
    assert.equal(walk.routeEdges, 2);
    assert.equal(walk.hit && walk.hitForwardOpens <= 3, false);
    assert.ok(walk.backtracks >= 2);
    assert.ok(walk.preventedRevisits > 0);
    assert.equal(walk.events.some((event) => event.type === 'loop-prevention'), true);
    assert.equal(walk.events.some((event) => event.type === 'backtrack'), true);
  });

  check('no visible match stops instead of counting as success', () => {
    const walk = walkHopperV2({
      start: 'start',
      edges: [{ from: 'start', to: 'other', label: 'mail', kind: 'canonical-navigation', context: 'weather' }],
      headingText: new Map(),
      question: 'xylophonequartz ceremony',
      policy: 'greedy',
      random: () => 0,
      target: 'other',
      contextMode: 'row',
    });
    assert.equal(walk.hit, false);
    assert.equal(walk.stopped, 'no-candidate');
  });

  check('destination body is not a ranking feature', () => {
    const tokens = ['game', 'place'];
    const wrong = scoreVisibleChoice(tokens, {
      label: 'Vision',
      headingText: '',
      rowContext: '',
      to: 'docs/vision.md',
      body: 'game place game place',
    }, 'row');
    const right = scoreVisibleChoice(tokens, {
      label: 'Vision',
      headingText: '',
      rowContext: 'What is the game, in one place?',
      to: 'docs/vision.md',
      body: '',
    }, 'row');
    assert.equal(wrong, 0);
    assert.ok(right > wrong);
  });

  check('row-aware hopper repeats for one seed', () => {
    const edges = [
      { from: 'docs/README.md', to: 'docs/a.md', label: 'Vision', context: 'What is the game', kind: 'canonical-navigation' },
      { from: 'docs/README.md', to: 'docs/b.md', label: 'Rules', context: 'Who changes dice', kind: 'canonical-navigation' },
    ];
    const args = {
      start: 'docs/README.md',
      edges,
      headingText: new Map(),
      question: 'What is the game',
      target: 'docs/a.md',
      seed: 20261116,
      trials: 20,
      contextMode: 'row',
    };
    assert.deepEqual(summarizeHopperV2(args), summarizeHopperV2(args));
    const other = summarizeHopperV2({ ...args, seed: 7 });
    assert.equal(typeof other.stochastic.hitAt3, 'number');
  });

  check('hopper seed repeats', () => {
    const edges = [
      { from: 'docs/README.md', to: 'docs/a.md', label: 'Time and autonomy', fromHeading: null, kind: 'canonical-navigation' },
      { from: 'docs/README.md', to: 'docs/b.md', label: 'Time notes', fromHeading: null, kind: 'canonical-navigation' },
      { from: 'docs/README.md', to: 'docs/c.md', label: 'Other', fromHeading: null, kind: 'canonical-navigation' },
    ];
    const headingText = new Map();
    const first = summarizeHopper({
      start: 'docs/README.md',
      edges,
      headingText,
      question: 'time autonomy',
      target: 'docs/a.md',
      seed: 20261116,
      trials: 30,
    });
    const second = summarizeHopper({
      start: 'docs/README.md',
      edges,
      headingText,
      question: 'time autonomy',
      target: 'docs/a.md',
      seed: 20261116,
      trials: 30,
    });
    assert.deepEqual(first, second);
  });

  if (failures.length > 0) {
    console.error('BENCH SELF-TEST FAILURES:');
    for (const failure of failures) console.error(failure);
    return 1;
  }
  console.log(
    'Static bench self-test passed: v1 route and recall, v2 complete-answer/MRR/nDCG, authority lanes, table-row hopper, click cost, seeded walks.',
  );
  return 0;
}
