import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runStaticBenchmark, validateCases } from './bench.mjs';
import { summarizeHopper } from './hopper.mjs';
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
    'Static bench self-test passed: route, vague label, disconnection, vocabulary gap, mandatory recall, historic bait, gold validation, seeded hopper.',
  );
  return 0;
}
