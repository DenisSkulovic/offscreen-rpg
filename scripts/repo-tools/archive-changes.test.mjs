import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  changeNeedsLedger,
  classifyChangeText,
  depthUnderChanges,
  programForLeaf,
  monthForLeaf,
  rewriteInboundLeafPaths,
  rewriteMarkdownLinksInText,
  rewriteRelativeLink,
  targetRelFromChanges,
} from './archive-changes.mjs';

test('program and month buckets', () => {
  assert.equal(programForLeaf('2026-11-14--admin-staff-session'), 'admin');
  assert.equal(programForLeaf('2026-11-13--eng03-lock-measurement'), 'eng');
  assert.equal(programForLeaf('2026-11-13--gm-standing-life'), 'experience');
  assert.equal(
    programForLeaf('2026-11-15--obs00-c-provider-wire-equality'),
    'observability',
  );
  assert.equal(programForLeaf('2026-11-14--sa01-operation-trace'), 'storyteller');
  assert.equal(programForLeaf('2026-11-11--web-test-foundation'), 'web');
  assert.equal(programForLeaf('2026-11-18--doc17-product-experience'), 'documentation');
  assert.equal(programForLeaf('2026-11-19--wiki18-agent-execution-context-budget-and-navigation'), 'documentation');
  assert.equal(programForLeaf('2026-11-19--arch01-distributed-target-contract'), 'architecture');
  assert.equal(programForLeaf('2026-11-19--k8s01-reproducible-kind-foundation'), 'infrastructure');
  assert.equal(programForLeaf('2026-11-20--dxk06-compose-retirement'), 'infrastructure');
  assert.equal(programForLeaf('2026-11-19--dist01-ratify-game-authority-delivery-boundaries'), 'distributed');
  assert.equal(programForLeaf('2026-11-19--data01-ratify-scene-checkpoint-and-fork-schema'), 'data');
  assert.equal(programForLeaf('2026-11-17--hk06-maintenance-inventory-and-lifecycle'), 'maintenance');
  assert.equal(programForLeaf('2026-11-17--har10-retire-retrieval-experiments'), 'retrieval');
  assert.equal(programForLeaf('2026-11-18--pval01-product-source-of-truth-warning'), 'product-validation');
  assert.equal(programForLeaf('2026-11-17--ui01-semantic-tokens'), 'experience');
  assert.equal(programForLeaf('2026-11-19--story03-separate-temporal-executor-and-publication'), 'storyteller');
  assert.equal(programForLeaf('2026-11-11--s3a-continuity-report'), 'other');
  assert.equal(
    monthForLeaf('2026-11-15--qa-storyteller-integration-fixtures'),
    '2026-11',
  );
});

test('partial Done for A; B blocked stays open and does not require a terminal ledger', () => {
  const obs00 = '**State: Done for A; B blocked.** **Severity:** P0 pre-live correctness.';
  assert.equal(classifyChangeText(obs00).kind, 'open');
  assert.equal(changeNeedsLedger(obs00), false);
  assert.equal(changeNeedsLedger('**State: Done (2026-11-18).**'), true);
});

test('classify Done / Blocked / Proposed / Cancelled without false cancel on cancel-if', () => {
  assert.equal(
    classifyChangeText('**State: Done (2026-11-15).** Evidence here.').kind,
    'archive',
  );
  assert.equal(
    classifyChangeText(
      '**State: Blocked, partly repaired (2026-11-15).** Fixtures…',
    ).kind,
    'open',
  );
  assert.equal(
    classifyChangeText(
      '**State:** Proposed, **not Ready**. **cancel-if-existing-itinerary-is-enough** gate.',
    ).kind,
    'open',
  );
  assert.equal(
    classifyChangeText(
      '**State:** Cancelled / superseded on 2026-11-13 after source review.',
    ).kind,
    'archive',
  );
  assert.equal(
    classifyChangeText('**Status:** Done (2026-11-12). **Goal:** avoid…').kind,
    'archive',
  );
  assert.equal(
    classifyChangeText('**Status:** Proposed; **scheduling: Parked**').kind,
    'open',
  );
});

test('target paths and depth', () => {
  assert.equal(
    targetRelFromChanges(
      '2026-11-15--qa-storyteller-integration-fixtures',
      'open',
    ),
    'open/2026-11-15--qa-storyteller-integration-fixtures',
  );
  assert.equal(
    targetRelFromChanges('2026-11-14--admin-staff-session', 'archive'),
    'archive/2026-11/admin/2026-11-14--admin-staff-session',
  );
  assert.equal(depthUnderChanges('leaf'), 1);
  assert.equal(depthUnderChanges('open/leaf'), 2);
  assert.equal(depthUnderChanges('archive/2026-11/admin/leaf'), 4);
});

test('relative link depth from flat to archive', () => {
  const base = path.join('repo', 'docs', 'changes');
  const leaf = '2026-11-15--obs00-c-provider-wire-equality';
  const oldFile = path.join(base, leaf, 'CHANGE.md');
  const newFile = path.join(
    base,
    'archive',
    '2026-11',
    'observability',
    leaf,
    'CHANGE.md',
  );
  const next = rewriteRelativeLink(
    '../../observability/evidence/obs00-c.md',
    oldFile,
    newFile,
  );
  assert.equal(
    next.replace(/\\/g, '/'),
    '../../../../../observability/evidence/obs00-c.md',
  );
});

test('inbound leaf path rewrite', () => {
  const leaf = '2026-11-15--obs00-c-provider-wire-equality';
  const src = `See [OBS00-C](../changes/${leaf}/CHANGE.md) and work/changes/${leaf}/PLAN.md and docs/changes/${leaf}/NOTES.md`;
  const out = rewriteInboundLeafPaths(
    src,
    leaf,
    `archive/2026-11/observability/${leaf}`,
  );
  assert.match(
    out,
    /changes\/archive\/2026-11\/observability\/2026-11-15--obs00-c-provider-wire-equality\/CHANGE\.md/,
  );
  assert.match(
    out,
    /work\/changes\/archive\/2026-11\/observability\/2026-11-15--obs00-c-provider-wire-equality\/PLAN\.md/,
  );
  assert.match(
    out,
    /work\/changes\/archive\/2026-11\/observability\/2026-11-15--obs00-c-provider-wire-equality\/NOTES\.md/,
  );
});

test('grouped open packet relocation keeps relative and inbound links', () => {
  const leaf = '2026-11-27--obs-d05-foreground-connection';
  const peer = '2026-11-27--obs-d06-collector-upgrade';
  const oldFile = path.join(
    'repo',
    'work',
    'changes',
    'open',
    'observability-developer',
    leaf,
    'CHANGE.md',
  );
  const newFile = path.join(
    'repo',
    'work',
    'changes',
    'archive',
    '2026-11',
    'observability',
    leaf,
    'CHANGE.md',
  );
  const body = rewriteMarkdownLinksInText(
    'See [design](../../../../designs/open/observability-developer/README.md) and [peer](../' +
      peer +
      '/CHANGE.md).\n',
    oldFile,
    newFile,
  ).replaceAll('\\', '/');
  assert.match(body, /\(\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/designs\/open\/observability-developer\/README\.md\)/);
  assert.match(
    body,
    /\(\.\.\/\.\.\/\.\.\/\.\.\/open\/observability-developer\/2026-11-27--obs-d06-collector-upgrade\/CHANGE\.md\)/,
  );
  const inbound = rewriteInboundLeafPaths(
    `Catalog [D05](open/observability-developer/${leaf}/CHANGE.md) and work/changes/open/observability-developer/${leaf}/TASKS.md`,
    leaf,
    `archive/2026-11/observability/${leaf}`,
    `open/observability-developer/${leaf}`,
  );
  assert.match(inbound, /\(archive\/2026-11\/observability\/2026-11-27--obs-d05-foreground-connection\/CHANGE\.md\)/);
  assert.match(inbound, /work\/changes\/archive\/2026-11\/observability\/2026-11-27--obs-d05-foreground-connection\/TASKS\.md/);
  assert.equal(depthUnderChanges(`open/observability-developer/${leaf}`), 3);
});

test('markdown link rewriter leaves absolute URLs', () => {
  const oldFile = path.join('repo', 'docs', 'changes', 'leaf', 'CHANGE.md');
  const newFile = path.join(
    'repo',
    'docs',
    'changes',
    'open',
    'leaf',
    'CHANGE.md',
  );
  const text = 'See [x](https://example.com/a) and [y](../admin/README.md).';
  const out = rewriteMarkdownLinksInText(text, oldFile, newFile);
  assert.match(out, /https:\/\/example\.com\/a/);
  assert.match(out.replace(/\\/g, '/'), /\.\.\/\.\.\/admin\/README\.md/);
});
