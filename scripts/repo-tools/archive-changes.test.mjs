import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
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
  assert.equal(programForLeaf('2026-11-11--s3a-continuity-report'), 'other');
  assert.equal(
    monthForLeaf('2026-11-15--qa-storyteller-integration-fixtures'),
    '2026-11',
  );
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
