import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { inflateRawSync } from 'node:zlib';
import { createSnapshot } from './chatgpt-snapshot.mjs';
import { buildPortableWikiIndex, safeGithubOrigin } from './chatgpt-snapshot-knowledge.mjs';

function git(dir, ...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}
function put(root, relative, value) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, value);
}
function listZip(filename) {
  const file = readFileSync(filename);
  let end = -1;
  for (let i = file.length - 22; i >= Math.max(0, file.length - 65557); i--) {
    if (file.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  assert.ok(end >= 0, 'ZIP has end of central directory');
  const count = file.readUInt16LE(end + 10);
  let pos = file.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(file.readUInt32LE(pos), 0x02014b50);
    const method = file.readUInt16LE(pos + 10);
    const size = file.readUInt32LE(pos + 20);
    const nameLen = file.readUInt16LE(pos + 28);
    const extraLen = file.readUInt16LE(pos + 30);
    const commentLen = file.readUInt16LE(pos + 32);
    const offset = file.readUInt32LE(pos + 42);
    const name = file.subarray(pos + 46, pos + 46 + nameLen).toString();
    entries.set(name, () => {
      assert.equal(file.readUInt32LE(offset), 0x04034b50);
      const start = offset + 30 + file.readUInt16LE(offset + 26) + file.readUInt16LE(offset + 28);
      const data = file.subarray(start, start + size);
      if (method === 8) return inflateRawSync(data).toString();
      assert.equal(method, 0);
      return data.toString();
    });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

test('committed-only lean/full ZIPs preserve source, exclude secrets and identify dirty worktrees', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'snapshot-fixture-'));
  try {
    git(root, 'init', '-q');
    git(root, 'config', 'user.name', 'Fixture');
    git(root, 'config', 'user.email', 'fixture@example.test');
    put(root, '.gitignore', 'out/\n');
    put(root, 'AGENTS.md', 'rules');
    put(root, 'docs/product/vision.md', 'approved design');
    put(root, 'packages/game/src/main.ts', 'committed source');
    put(root, 'work/changes/open/active/CHANGE.md', 'Proposed');
    put(root, 'work/changes/archive/old/CHANGE.md', 'retired');
    put(root, 'evidence/runs/screenshot.png', 'fake png');
    put(root, 'evidence/README.md', 'evidence map');
    put(root, 'node_modules/bad/index.js', 'bad dependency');
    put(root, '.env.secret', 'TOPSECRET');
    put(root, 'out/tracked-output.txt', 'generated');
    put(root, 'scripts/repo-tools/wiki-core/route.mjs', 'tracked parser');
    git(root, 'add', '-f', '.');
    git(root, 'commit', '-qm', 'fixture');
    put(root, 'packages/game/src/main.ts', 'UNCOMMITTED CHANGES');
    put(root, 'local-untracked.txt', 'not tracked');
    const lean = await createSnapshot({
      repoRoot: root, now: new Date('2026-11-17T13:05:02.000Z'),
      indexBuilder: async ({ stagedRoot, head }) => {
        assert.equal(readFileSync(path.join(stagedRoot, 'packages/game/src/main.ts'), 'utf8'), 'committed source');
        return { schema: 'wiki.portable-snapshot.v1', source: { commit: head }, sections: [], omittedLinks: [], unresolvedLinks: [], summary: { pages: 0, sections: 0, omittedLinkCount: 0, brokenLinkCount: 0 } };
      },
      requireIndex: true,
    });
    assert.ok(lean.destination.replaceAll('\\', '/').includes('out/chatgpt-snapshots'));
    assert.equal(lean.manifest.source.worktreeDirtyAtExport, true);
    const entries = listZip(lean.destination);
    const names = [...entries.keys()];
    const name = relative => names.find(x => x.endsWith('/' + relative));
    assert.ok(name('docs/product/vision.md'));
    assert.ok(name('AGENTS.md'));
    assert.ok(name('work/changes/open/active/CHANGE.md'));
    assert.ok(name('evidence/README.md'));
    assert.equal(name('work/changes/archive/old/CHANGE.md'), undefined);
    assert.equal(name('evidence/runs/screenshot.png'), undefined);
    assert.equal(name('node_modules/bad/index.js'), undefined);
    assert.equal(name('.env.secret'), undefined);
    assert.equal(name('local-untracked.txt'), undefined);
    assert.equal(name('out/tracked-output.txt'), undefined);
    assert.equal(entries.get(name('packages/game/src/main.ts'))(), 'committed source');
    const metadata = JSON.parse(entries.get(name('SNAPSHOT.json'))());
    assert.equal(metadata.source.commit, git(root, 'rev-parse', 'HEAD'));
    assert.equal(metadata.profile, 'lean');
    assert.equal(metadata.schema, 'offscreen.chatgpt-snapshot.v2');
    assert.equal(metadata.portableWiki.status, 'ready');
    assert.equal(metadata.source.trackedModifiedPathCount, 1);
    assert.deepEqual(metadata.source.trackedModifiedPaths, ['packages/game/src/main.ts']);
    assert.equal(metadata.source.untrackedPathCount, 1);
    assert.ok(name('WIKI-INDEX.json'));
    assert.equal(JSON.parse(entries.get(name('WIKI-INDEX.json'))()).source.commit, metadata.source.commit);
    assert.equal(createHash('sha256').update(readFileSync(lean.destination)).digest('hex'), lean.sha256);
    await assert.rejects(() => createSnapshot({ repoRoot: root, strict: true }), /dirty/);
    assert.equal(git(root, 'check-ignore', '-q', lean.destination), '');
    const full = await createSnapshot({
      repoRoot: root, profile: 'full', now: new Date('2026-11-17T13:05:03.000Z'),
      skipIndex: true, indexBuilder: async () => { throw new Error('Never execute indexBuilder'); },
    });
    assert.equal(full.manifest.portableWiki.status, 'disabled');
    assert.ok(![...listZip(full.destination).keys()].some(x => x.endsWith('/WIKI-INDEX.json')));
    await assert.rejects(() => createSnapshot({
      repoRoot: root, indexBuilder: async () => { throw new Error('Missing index'); },
    }), /Portable wiki index required/);
    await assert.rejects(() => createSnapshot({
      repoRoot: root, requireIndex: true, indexBuilder: async () => { throw new Error('No parser'); },
    }), /Portable wiki index required/);
    const fullNames = [...listZip(full.destination).keys()];
    assert.ok(fullNames.some(x => x.endsWith('work/changes/archive/old/CHANGE.md')));
    assert.ok(fullNames.some(x => x.endsWith('evidence/runs/screenshot.png')));
    assert.ok(!fullNames.some(x => x.endsWith('.env.secret')));
    const fullIndexed = await createSnapshot({
      repoRoot: root, profile: 'full', now: new Date('2026-11-17T13:05:04.000Z'),
      requireIndex: true,
      indexBuilder: async ({ stagedRoot, profile }) => {
        assert.equal(profile, 'full');
        assert.equal(readFileSync(path.join(stagedRoot, 'work/changes/archive/old/CHANGE.md'), 'utf8'), 'retired');
        return { schema: 'wiki.portable-snapshot.v1', sections: [], summary: { sections: 0 } };
      },
    });
    assert.equal(fullIndexed.manifest.portableWiki.status, 'ready');

    put(root, '.env.secret', 'changed secret');
    const redacted = await createSnapshot({
      repoRoot: root, now: new Date('2026-11-17T13:05:05.000Z'),
      indexBuilder: async () => ({ schema: 'wiki.portable-snapshot.v1', sections: [], summary: {} }),
    });
    assert.equal(redacted.manifest.source.trackedModifiedRedactedCount, 1);
    assert.ok(!redacted.manifest.source.trackedModifiedPaths.includes('.env.secret'));
    put(root, 'scripts/repo-tools/wiki-core/route.mjs', 'dirty parser');
    await assert.rejects(() => createSnapshot({
      repoRoot: root, requireIndex: true,
      indexBuilder: async () => ({ schema: 'wiki.portable-snapshot.v1', sections: [], summary: {} }),
    }), /uncommitted code edits/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('index classifies intentionally omitted history separately from broken links', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'snapshot-knowledge-'));
  try {
    put(root, 'docs/README.md', '# Docs\n[History](../work/changes/archive/old/CHANGE.md)\n[Secret](../.env.secret)\n[Bad](missing.md)\n[Fine](owner.md#contract)\n');
    put(root, 'docs/owner.md', '# Owner\n## Contract\nRule.');
    const engine = {
      routePages: () => ['docs/README.md', 'docs/owner.md'],
      buildSectionIndex: () => ({
        sections: [
          { path: 'docs/README.md', anchor: 'docs', heading: 'Docs', depth: 1, lineStart: 1, lineEnd: 4, bytes: 120,
            preview: 'Docs', rowContext: '', authority: 'router', lane: 'normative', kind: 'canonical-router',
            outbound: [{ path: 'docs/owner.md', anchor: 'contract', label: 'Fine' }] },
          { path: 'docs/owner.md', anchor: 'owner', heading: 'Owner', depth: 1, lineStart: 1, lineEnd: 3, bytes: 28,
            preview: 'Owner', rowContext: '', authority: 'selected-support', lane: 'normative', kind: 'canonical-support',
            outbound: [] },
          { path: 'docs/owner.md', anchor: 'contract', heading: 'Contract', depth: 2, lineStart: 2, lineEnd: 3, bytes: 20,
            preview: 'Rule', rowContext: '', authority: 'selected-support', lane: 'normative', kind: 'canonical-support',
            outbound: [] },
        ],
      }),
      parseMarkdownDocument: text => ({
        headings: [...text.matchAll(/^#{1,3}\s+(.+)$/gm)].map(x => ({ id: x[1].toLowerCase(), text: x[1] })),
        references: [...text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map(x => ({
          kind: 'link', href: x[2], line: text.slice(0, x.index).split('\n').length,
        })),
      }),
      resolveHref: (staged, from, href) => {
        const [linkPath, fragment = null] = href.split('#');
        const rel = linkPath ? path.posix.normalize(path.posix.join(path.posix.dirname(from), linkPath)) : from;
        const abs = path.join(staged, rel);
        return requireExists(abs) ? { class: 'local', ok: true, rel, abs, fragment }
          : { class: 'local', ok: false, code: 'broken-path', rel, requested: rel, fragment };
      },
    };
    const result = await buildPortableWikiIndex({
      stagedRoot: root, head: 'a'.repeat(40), engine,
      trackedPaths: ['docs/README.md', 'docs/owner.md', 'work/changes/archive/old/CHANGE.md', '.env.secret'],
      repositoryUrl: 'https://github.com/Example/Repo',
    });
    assert.equal(result.summary.omittedLinkCount, 2);
    const privateTarget = result.omittedLinks.find(x => x.state === 'excluded-sensitive-file');
    assert.equal(privateTarget.target, null);
    assert.equal(privateTarget.href, '[redacted-sensitive-path]');
    assert.equal(privateTarget.githubUrl, null);
    assert.equal(result.summary.brokenLinkCount, 1);
    const historical = result.omittedLinks.find(x => x.state === 'excluded-by-snapshot-profile');
    assert.ok(historical.githubUrl.includes('/blob/' + 'a'.repeat(40) + '/work/changes/archive/old/CHANGE.md'));
    assert.equal(result.unresolvedLinks[0].state, 'missing-at-source-revision');
    assert.equal(result.summary.reachedCanonical, 2);
    assert.equal(safeGithubOrigin('git@github.com:Example/Repo.git'), 'https://github.com/Example/Repo');
    assert.equal(safeGithubOrigin('https://private:password@github.com/Example/Repo.git'), 'https://github.com/Example/Repo');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function requireExists(filename) {
  try { return readFileSync(filename) !== null; } catch { return false; }
}
