import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildWikiModel } from './model.mjs';
import { githubHeadingSlug } from './slug.mjs';

function write(root, rel, text) {
  const abs = path.join(root, ...rel.split('/'));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, 'utf8');
}

function codes(model, severity) {
  return model.issues.filter((item) => !severity || item.severity === severity).map((item) => item.code);
}

function goodTree() {
  const root = mkdtempSync(path.join(tmpdir(), 'wiki-good-'));
  const padding = 'coherent specification sentence. '.repeat(2000);
  write(
    root,
    'docs/README.md',
    [
      '# Documentation',
      '',
      '[Product](product/)',
      '[Leaf](product/leaf.md)',
      '[Spec](technical/spec.md)',
      '[Cafe](product/caf%C3%A9.md)',
      '[Space](product/a%20b.md)',
      '[Dup A](technical/dup-a.md)',
      '[Dup B](technical/dup-b.md)',
      '',
    ].join('\n'),
  );
  write(
    root,
    'docs/product/README.md',
    [
      '# Product',
      '',
      'See [the leaf][leaf].',
      '',
      '| Topic | Page |',
      '| --- | --- |',
      '| Leaf | [table leaf](leaf.md) |',
      '',
      '[leaf]: leaf.md',
      '',
      'Also [only](only-via-subject.md).',
      '',
    ].join('\n'),
  );
  write(root, 'docs/product/leaf.md', '# Leaf\n\nA complete terminal page.\n');
  write(root, 'docs/product/only-via-subject.md', '# Via\n\nReached only through the subject router.\n');
  write(root, 'docs/product/café.md', '# Café\n\nUnicode file name.\n');
  write(root, 'docs/product/a b.md', '# Space\n\nEncoded file name.\n');
  write(root, 'docs/technical/dup-a.md', '# Dup\n\nSame body.\n');
  write(root, 'docs/technical/dup-b.md', '# Dup\n\nSame body.\n');
  write(
    root,
    'docs/technical/spec.md',
    [
      '# Spec',
      '',
      '## Contents',
      '',
      '## Section A',
      '',
      '## Section B',
      '',
      '[leaf](../product/leaf.md)',
      '[leaf again](../product/leaf.md)',
      '[note](../../evidence/inspections/note.md)',
      '[page](../../apps/web/app/(authenticated)/play/page.tsx)',
      '![pic](pic.png)',
      '',
      'Example `[ghost](also-missing.md)` is not a link.',
      '',
      '```md',
      '[ghost](totally-missing.md)',
      '```',
      '',
      '[thread](thread:the-warning)',
      '[site](https://example.com/a)',
      '[mail](mailto:a@b.example)',
      '',
      '## Name',
      '',
      'First.',
      '',
      '## Name',
      '',
      '[second](#name-1)',
      '',
      '## Memory reinspection — 2026-10-23',
      '',
      '[memory](#memory-reinspection--2026-10-23)',
      '',
      padding,
      '',
    ].join('\n'),
  );
  write(root, 'docs/technical/pic.png', '');
  write(root, 'apps/web/app/(authenticated)/play/page.tsx', 'export {}\n');
  write(
    root,
    'apps/web/README.md',
    '# Web\n\n[spec](../../docs/technical/spec.md)\n[note](../../evidence/inspections/note.md)\n',
  );
  write(root, 'evidence/inspections/note.md', '# Note\n\nDated observation.\n');
  write(root, 'work/designs/open/ok.md', '# Ok\n\n[leaf](../../../docs/product/leaf.md)\n');
  write(
    root,
    'work/changes/open/sample/CHANGE.md',
    '# Sample\n\n[leaf](../../../../docs/product/leaf.md)\n',
  );
  write(root, 'work/changes/archive/old/CHANGE.md', '# Old\n\n[broken historical](../../nope.md)\n');
  return root;
}

export function runSelfTest() {
  /** @type {string[]} */
  const failures = [];
  function check(label, fn) {
    try {
      fn();
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  check('heading slug', () => {
    assert.equal(githubHeadingSlug('Memory reinspection — 2026-10-23'), 'memory-reinspection--2026-10-23');
    assert.equal(githubHeadingSlug('Owner map'), 'owner-map');
  });

  check('valid graph', () => {
    const root = goodTree();
    const meta = { repoSha: 'fixture', dirty: false };
    const first = buildWikiModel(root, meta);
    const second = buildWikiModel(root, meta);
    const hard = first.issues.filter((item) => item.severity === 'error');
    assert.deepEqual(hard, [], `hard issues:\n${hard.map((item) => JSON.stringify(item)).join('\n')}`);
    assert.equal(first.graph.schema, 'wiki.graph.v1');
    assert.equal(first.health.schema, 'wiki.health.v1');
    assert.equal(
      JSON.stringify({ nodes: first.graph.nodes, edges: first.graph.edges }),
      JSON.stringify({ nodes: second.graph.nodes, edges: second.graph.edges }),
    );
    const spec = first.graph.nodes.find((node) => node.id === 'docs/technical/spec.md');
    assert.ok(spec && spec.bytes >= 60_000);
    assert.equal(spec.kind, 'canonical-technical');
    const leafDistance = first.distance.get('docs/product/only-via-subject.md');
    assert.equal(leafDistance, 2);
    const leafEdges = first.graph.edges.filter(
      (edge) => edge.from === 'docs/technical/spec.md' && edge.to === 'docs/product/leaf.md' && edge.toAnchor === null,
    );
    assert.equal(leafEdges.length, 1);
    assert.equal(leafEdges[0].occurrences, 2);
    const evidence = first.graph.edges.find(
      (edge) => edge.from === 'docs/technical/spec.md' && edge.to === 'evidence/inspections/note.md',
    );
    assert.equal(evidence?.kind, 'evidence-citation');
    const evidenceNode = first.graph.nodes.find((node) => node.id === 'evidence/inspections/note.md');
    assert.equal(evidenceNode?.kind, 'evidence');
    assert.equal(evidenceNode?.distanceFromRoot, null);
    const source = first.graph.edges.find(
      (edge) => edge.from === 'docs/technical/spec.md' && edge.to.endsWith('page.tsx'),
    );
    assert.equal(source?.kind, 'observed-in');
    assert.equal(
      first.graph.nodes.some((node) => node.id.startsWith('work/changes/archive/')),
      false,
    );
    assert.equal(JSON.stringify(first.issues).includes('nope.md'), false);
    assert.equal(JSON.stringify(first.issues).includes('totally-missing.md'), false);
    assert.equal(JSON.stringify(first.issues).includes('also-missing.md'), false);
    assert.equal(JSON.stringify(first.issues).includes('thread:the-warning'), false);
    assert.ok(first.health.counts.custom >= 1);
    assert.ok(first.health.counts.external >= 2);
    assert.ok(codes(first, 'warning').includes('duplicate-canonical'));
    assert.equal(codes(first, 'warning').includes('large-page-navigation'), false);
    const router = first.graph.nodes.find((node) => node.id === 'docs/README.md');
    assert.ok(router && router.distinctOut >= 5);
    const terminal = first.graph.nodes.find((node) => node.id === 'docs/product/leaf.md');
    assert.equal(terminal?.distinctOut, 0);
    assert.equal(first.health.integrity.hardErrors, 0);
  });

  check('wrong open-design relative path', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-path-'));
    write(root, 'docs/README.md', '# Docs\n');
    write(root, 'work/designs/open/example.md', '# Example\n\n[docs](../../docs/README.md)\n');
    const model = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    const found = model.issues.find((item) => item.code === 'broken-path' && item.path === 'work/designs/open/example.md');
    assert.ok(found, JSON.stringify(model.issues, null, 2));
    assert.equal(found.line, 3);
    assert.match(String(found.target), /\.\.\/\.\.\/docs\/README\.md/);
  });

  check('missing heading is not a missing file', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-anchor-'));
    write(root, 'docs/README.md', '# Docs\n\n## Real heading\n');
    write(root, 'docs/other.md', '# Other\n\n[missing](README.md#no-such-heading)\n');
    write(root, 'docs/README.md', '# Docs\n\n## Real heading\n\n[other](other.md)\n');
    const model = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    const anchor = model.issues.find((item) => item.code === 'broken-anchor');
    assert.ok(anchor, JSON.stringify(model.issues, null, 2));
    assert.equal(anchor.path, 'docs/other.md');
    assert.equal(
      model.issues.some((item) => item.code === 'broken-path' && String(item.target).includes('README.md')),
      false,
    );
  });

  check('windows case mismatch', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-case-'));
    write(root, 'docs/README.md', '# Docs\n\n[leaf](product/leaf.md)\n');
    write(root, 'docs/product/leaf.md', '# Leaf\n\nSee [readme](../readme.md).\n');
    const model = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    const found = model.issues.find((item) => item.code === 'case-mismatch');
    assert.ok(found, JSON.stringify(model.issues, null, 2));
    assert.equal(found.path, 'docs/product/leaf.md');
  });

  check('unreachable canonical page', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-orphan-'));
    write(root, 'docs/README.md', '# Docs\n\n[Product](product/README.md)\n');
    write(root, 'docs/product/README.md', '# Product\n');
    write(root, 'docs/product/secret.md', '# Secret\n');
    const model = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    const found = model.issues.find((item) => item.code === 'unreachable-canonical' && item.path === 'docs/product/secret.md');
    assert.ok(found, JSON.stringify(model.issues, null, 2));
    assert.equal(model.distance.has('docs/product/secret.md'), false);
    assert.equal(model.graph.nodes.find((node) => node.id === 'docs/product/secret.md')?.distanceFromRoot, null);
  });

  check('entry routers are not docs reachability failures', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-agents-'));
    write(root, 'docs/README.md', '# Docs\n');
    write(root, 'AGENTS.md', '# Agents\n\n[Runbooks](docs/runbooks/README.md)\n');
    write(root, 'docs/runbooks/README.md', '# Runbooks\n\n[Self](#runbooks)\n');
    write(root, 'docs/technical/solo.md', '# Solo\n\n[again](#solo)\n');
    const model = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    assert.equal(
      model.issues.some((item) => item.code === 'unreachable-canonical' && item.path === 'AGENTS.md'),
      false,
    );
    assert.ok(
      model.issues.some((item) => item.code === 'unreachable-canonical' && item.path === 'docs/runbooks/README.md'),
    );
    assert.ok(model.issues.some((item) => item.code === 'orphan-canonical' && item.path === 'docs/technical/solo.md'));
  });

  check('deleting one canonical inbound link fails reachability without shrinking the denominator', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-unlink-'));
    write(root, 'docs/README.md', '# Docs\n\n[Product](product/README.md)\n');
    write(root, 'docs/product/README.md', '# Product\n\n[Secret](secret.md)\n');
    write(root, 'docs/product/secret.md', '# Secret\n');
    const linked = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    assert.equal(linked.distance.has('docs/product/secret.md'), true);
    const denominator = linked.health.denominators.canonicalPages;
    write(root, 'docs/product/README.md', '# Product\n');
    const dropped = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    assert.equal(dropped.health.denominators.canonicalPages, denominator);
    const found = dropped.issues.find(
      (item) => item.code === 'unreachable-canonical' && item.path === 'docs/product/secret.md',
    );
    assert.ok(found, JSON.stringify(dropped.issues, null, 2));
  });

  check('proposal labeled as current implemented design', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-proposal-claim-'));
    write(
      root,
      'docs/README.md',
      '# Docs\n\nThe [current implemented design](../work/designs/open/capture.md) owns this rule.\n',
    );
    write(root, 'work/designs/open/capture.md', '# Capture\n');
    const model = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    const found = model.issues.find((item) => item.code === 'authority-route' && item.path === 'docs/README.md');
    assert.ok(found, JSON.stringify(model.issues, null, 2));
    assert.match(found.message, /open proposal/);
    assert.equal(
      model.health.denominators.canonicalPages,
      model.graph.nodes.filter((node) => String(node.kind).startsWith('canonical')).length,
    );
    assert.equal(model.graph.nodes.some((node) => node.id === 'work/designs/open/capture.md' && node.kind === 'open-design'), true);
  });

  check('disclosed proposal is navigable and not canonical', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-proposal-ok-'));
    write(
      root,
      'docs/README.md',
      '# Docs\n\n[Proposed capture](../work/designs/open/capture.md) is not a selected contract.\n',
    );
    write(root, 'work/designs/open/capture.md', '# Capture\n\n[Docs](../../docs/README.md)\n');
    const model = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    assert.equal(model.issues.some((item) => item.code === 'authority-route'), false);
    assert.equal(
      model.graph.nodes.find((node) => node.id === 'work/designs/open/capture.md')?.kind,
      'open-design',
    );
    const edge = model.graph.edges.find((item) => item.to === 'work/designs/open/capture.md');
    assert.equal(edge?.kind, 'proposal-navigation');
    assert.equal(model.distance.has('work/designs/open/capture.md'), false);
    assert.equal(model.health.denominators.canonicalPages, 1);
  });

  check('moving an unaccepted proposal emits a reclassification receipt', () => {
    const beforeRoot = mkdtempSync(path.join(tmpdir(), 'wiki-reclass-before-'));
    write(beforeRoot, 'docs/README.md', '# Docs\n\n[Capture](technical/observability/capture.md)\n');
    write(beforeRoot, 'docs/technical/observability/capture.md', '# Capture\n\nProposal only.\n');
    const before = buildWikiModel(beforeRoot, { repoSha: 'fixture', dirty: false });
    const afterRoot = mkdtempSync(path.join(tmpdir(), 'wiki-reclass-after-'));
    write(
      afterRoot,
      'docs/README.md',
      '# Docs\n\n[Proposed capture](../work/designs/open/capture-proposal/README.md) is not selected.\n',
    );
    write(afterRoot, 'work/designs/open/capture-proposal/README.md', '# Capture\n\nProposal only.\n\n[Docs](../../../docs/README.md)\n');
    const after = buildWikiModel(afterRoot, { repoSha: 'fixture', dirty: false });
    const reclassificationReceipt = {
      name: 'reclassification-receipt',
      before: {
        path: 'docs/technical/observability/capture.md',
        kind: before.graph.nodes.find((node) => node.id === 'docs/technical/observability/capture.md')?.kind,
        canonicalPages: before.health.denominators.canonicalPages,
        reachableCanonical: before.health.denominators.reachableCanonical,
      },
      after: {
        path: 'work/designs/open/capture-proposal/README.md',
        kind: after.graph.nodes.find((node) => node.id === 'work/designs/open/capture-proposal/README.md')?.kind,
        canonicalPages: after.health.denominators.canonicalPages,
        reachableCanonical: after.health.denominators.reachableCanonical,
        proposalEdge: after.graph.edges.some(
          (edge) => edge.to === 'work/designs/open/capture-proposal/README.md' && edge.kind === 'proposal-navigation',
        ),
      },
    };
    assert.equal(reclassificationReceipt.before.kind, 'canonical-technical');
    assert.equal(reclassificationReceipt.before.canonicalPages, 2);
    assert.equal(reclassificationReceipt.before.reachableCanonical, 2);
    assert.equal(reclassificationReceipt.after.kind, 'open-design');
    assert.equal(reclassificationReceipt.after.canonicalPages, 1);
    assert.equal(reclassificationReceipt.after.reachableCanonical, 1);
    assert.equal(reclassificationReceipt.after.proposalEdge, true);
    assert.equal(after.distance.has('work/designs/open/capture-proposal/README.md'), false);
    assert.equal(after.issues.some((item) => item.code === 'unreachable-canonical'), false);
  });

  check('a historic Change link does not become current canonical proof', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-historic-proof-'));
    write(
      root,
      'docs/README.md',
      '# Docs\n\nHistorical [archived Change](../work/changes/archive/old/CHANGE.md) is not the current contract.\n',
    );
    write(root, 'work/changes/archive/old/CHANGE.md', '# Old\n\nDone packet.\n');
    const cited = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    assert.equal(cited.issues.some((item) => item.code === 'authority-route'), false);
    assert.equal(cited.distance.has('work/changes/archive/old/CHANGE.md'), false);
    assert.equal(cited.health.denominators.canonicalPages, 1);
    write(
      root,
      'docs/README.md',
      '# Docs\n\nThe [replacement specification](../work/changes/archive/old/CHANGE.md) owns this rule.\n',
    );
    const claimed = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    assert.ok(claimed.issues.some((item) => item.code === 'authority-route' && item.path === 'docs/README.md'));
    assert.equal(claimed.distance.has('work/changes/archive/old/CHANGE.md'), false);
  });

  check('normative archive route', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wiki-authority-'));
    write(
      root,
      'docs/README.md',
      '# Start\n\nThe [replacement specification](../work/changes/archive/old/HANDOFF.md) owns this rule.\n',
    );
    write(root, 'work/changes/archive/old/HANDOFF.md', '# Old\n\n[broken historical](../../nope.md)\n');
    const model = buildWikiModel(root, { repoSha: 'fixture', dirty: false });
    const found = model.issues.find((item) => item.code === 'authority-route');
    assert.ok(found, JSON.stringify(model.issues, null, 2));
    assert.equal(found.path, 'docs/README.md');
    assert.equal(JSON.stringify(model.issues).includes('nope.md'), false);
  });

  if (failures.length > 0) {
    console.error('SELF-TEST FAILURES:');
    for (const failure of failures) console.error(failure);
    return 1;
  }
  console.log(
    'Self-test passed: GFM links, anchors, Unicode, parentheses, archive exemption, case mismatch, unreachable page, authority route, proposal classification, reclassification receipt, duplicate edge.',
  );
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  process.exit(runSelfTest());
}
