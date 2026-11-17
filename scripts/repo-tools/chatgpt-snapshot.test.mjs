import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { inflateRawSync } from 'node:zlib';
import { createSnapshot } from './chatgpt-snapshot.mjs';

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

test('committed-only lean/full ZIPs preserve source, exclude secrets and identify dirty worktrees', () => {
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
    git(root, 'add', '-f', '.');
    git(root, 'commit', '-qm', 'fixture');
    put(root, 'packages/game/src/main.ts', 'UNCOMMITTED CHANGES');
    put(root, 'local-untracked.txt', 'not tracked');
    const lean = createSnapshot({ repoRoot: root, now: new Date('2026-11-17T13:05:02.000Z') });
    assert.ok(lean.destination.includes('out/chatgpt-snapshots'));
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
    assert.equal(createHash('sha256').update(readFileSync(lean.destination)).digest('hex'), lean.sha256);
    assert.throws(() => createSnapshot({ repoRoot: root, strict: true }), /dirty/);
    assert.equal(git(root, 'check-ignore', '-q', lean.destination), '');
    const full = createSnapshot({
      repoRoot: root, profile: 'full', now: new Date('2026-11-17T13:05:03.000Z'),
    });
    const fullNames = [...listZip(full.destination).keys()];
    assert.ok(fullNames.some(x => x.endsWith('work/changes/archive/old/CHANGE.md')));
    assert.ok(fullNames.some(x => x.endsWith('evidence/runs/screenshot.png')));
    assert.ok(!fullNames.some(x => x.endsWith('.env.secret')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
