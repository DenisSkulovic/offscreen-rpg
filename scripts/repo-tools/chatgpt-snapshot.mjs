import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { buildPortableWikiIndex, safeGithubOrigin } from './chatgpt-snapshot-knowledge.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SENSITIVE_EXCLUDES = [
  '**/node_modules/**', '**/.next/**', '**/.turbo/**', '**/dist/**', '**/build/**',
  '**/coverage/**', '**/out/**', '**/.env*', '**/*.pem', '**/*.key',
  '**/*.p12', '**/*.pfx', '**/credentials.json', '**/secrets.json',
  '**/id_rsa', '**/id_ed25519',
];
const LEAN_EXCLUDES = [
  'work/changes/archive/**', 'work/sessions/legacy-minutes/**',
  'evidence/runs/**', 'evidence/inspections/**', 'research/legacy-engineering/**',
];

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  }).trimEnd();
}

export async function createSnapshot({
  repoRoot = DEFAULT_ROOT, profile = 'lean', strict = false, requireIndex = false,
  now = new Date(), indexBuilder = buildPortableWikiIndex,
} = {}) {
  if (!['lean', 'full'].includes(profile)) {
    throw new Error('Unknown snapshot profile: ' + profile);
  }
  const root = path.resolve(repoRoot);
  const head = git(root, ['rev-parse', '--verify', 'HEAD']).trim();
  const branch = git(root, ['branch', '--show-current']) || 'detached';
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  const dirty = status.length > 0;
  const modified = git(root, ['diff', '--name-only', '-z', 'HEAD', '--'])
    .split('\0').filter(Boolean);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z'])
    .split('\0').filter(Boolean);
  const safeModified = modified.filter(p => !/(^|\/)(\.env[^/]*|secrets?[^/]*|credentials?[^/]*|id_rsa|id_ed25519)(\/|$)/i.test(p)
    && !/\.(pem|key|p12|pfx)$/i.test(p));
  if (strict && dirty) {
    throw new Error('Worktree is dirty. Snapshot exports committed HEAD only. Commit/stash changes, or omit --strict.');
  }

  const exclusions = [...SENSITIVE_EXCLUDES, ...(profile === 'lean' ? LEAN_EXCLUDES : [])];
  const stamp = now.toISOString().replace(/[-:.]/g, '');
  const basename = ['offscreen-rpg', profile, head.slice(0, 12), stamp].join('-') + '.zip';
  const outputDir = path.join(root, 'out', 'chatgpt-snapshots');
  mkdirSync(outputDir, { recursive: true });
  const destination = path.join(outputDir, basename);
  if (existsSync(destination)) throw new Error('Snapshot already exists: ' + destination);

  const manifest = {
    schema: 'offscreen.chatgpt-snapshot.v2',
    purpose: 'Read-only repository source and documentation for ChatGPT design investigations',
    source: {
      commit: head, branch, worktreeDirtyAtExport: dirty,
      trackedModifiedPaths: safeModified.slice(0, 100),
      trackedModifiedPathCount: modified.length,
      trackedModifiedRedactedCount: modified.length - safeModified.length,
      untrackedPathCount: untracked.length,
      includesUncommittedChanges: false,
    },
    profile,
    generatedAt: now.toISOString(),
    portableWiki: { status: 'not-attempted' },
    packaging: {
      mechanism: 'git archive from immutable committed HEAD',
      included: 'Tracked files at the specified commit, except excluded paths',
      excludedPatterns: exclusions,
      omittedUntrackedAndIgnoredFiles: true,
    },
    reading: [
      'Read AGENTS.md and STATUS.md for entry, then relevant docs/product and docs/technical headings.',
      'Treat this snapshot as a frozen source revision; ask for a refreshed snapshot or use GitHub for later commits.',
      'Do not treat source code as the ratified product specification. Open Changes and proposals are not implementation permission.',
    ],
    security: 'Review before sharing. Filename exclusions cannot detect secrets accidentally committed inside ordinary source files.',
  };

  const temporary = mkdtempSync(path.join(tmpdir(), 'offscreen-snapshot-'));
  try {
    const manifestFile = path.join(temporary, 'SNAPSHOT.json');
    const knowledgeFile = path.join(temporary, 'WIKI-INDEX.json');
    const temporaryZip = path.join(temporary, 'snapshot.zip');
    const sourceTar = path.join(temporary, 'committed.tar');
    const stagedRoot = path.join(temporary, 'source');
    mkdirSync(stagedRoot);
    const pathspecs = exclusions.map(item => ':(exclude,glob)' + item);
    try {
      // Staging uses exactly the same committed Git pathspec as the final ZIP.
      // Parser modules resolve dependencies from the local development checkout.
      git(root, [
        'archive', '--format=tar', '--output=' + sourceTar, head,
        '--', '.', ...pathspecs,
      ]);
      execFileSync('tar', ['-xf', sourceTar, '-C', stagedRoot], { cwd: root });
      let remote = null;
      try { remote = git(root, ['remote', 'get-url', 'origin']); } catch { /* local fixtures */ }
      const trackedPaths = git(root, ['ls-tree', '-r', '-z', '--name-only', head])
        .split('\0').filter(Boolean);
      const index = await indexBuilder({
        stagedRoot, head, trackedPaths, repositoryUrl: safeGithubOrigin(remote),
      });
      writeFileSync(knowledgeFile, JSON.stringify(index) + '\n');
      manifest.portableWiki = {
        status: 'ready', schema: index.schema,
        file: 'WIKI-INDEX.json', summary: index.summary,
      };
    } catch (error) {
      if (requireIndex) throw new Error('Portable wiki index required but unavailable: ' + error.message);
      manifest.portableWiki = {
        status: 'unavailable', reason: String(error.message).slice(0, 240),
        fallback: 'Read original Markdown with local filesystem search.',
      };
    }
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    git(root, [
      'archive', '--format=zip', '--prefix=offscreen-rpg-' + head.slice(0, 12) + '/',
      '--add-file=' + manifestFile,
      ...(manifest.portableWiki.status === 'ready' ? ['--add-file=' + knowledgeFile] : []),
      '--output=' + temporaryZip, head,
      '--', '.', ...pathspecs,
    ]);
    renameSync(temporaryZip, destination);
    const bytes = statSync(destination).size;
    const sha256 = createHash('sha256').update(readFileSync(destination)).digest('hex');
    return { destination, bytes, sha256, manifest };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: pnpm repo:snapshot:chatgpt [--full] [--strict] [--require-index]');
    console.log('Creates a versioned, gitignored ZIP of committed HEAD under out/chatgpt-snapshots/.');
    console.log('Default: lean source/docs. --full adds historical Change/evidence material.');
    console.log('Uncommitted and untracked files are NEVER included. --strict rejects dirty worktrees.');
    console.log('WIKI-INDEX.json uses the existing wiki parser if available. --require-index fails if not.');
    return;
  }
  if (args.some(arg => !['--full', '--strict', '--require-index'].includes(arg))) {
    throw new Error('Unknown arguments: ' + args.join(' '));
  }
  const result = await createSnapshot({
    profile: args.includes('--full') ? 'full' : 'lean',
    strict: args.includes('--strict'),
    requireIndex: args.includes('--require-index'),
  });
  console.log('ChatGPT snapshot: ' + result.destination);
  console.log('Revision: ' + result.manifest.source.commit + ' (' + result.manifest.source.branch + ')');
  console.log('Profile: ' + result.manifest.profile + '; size: ' + (result.bytes / 1024 / 1024).toFixed(2) + ' MiB');
  console.log('SHA-256: ' + result.sha256);
  console.log('Portable wiki: ' + result.manifest.portableWiki.status);
  if (result.manifest.portableWiki.status === 'unavailable') {
    console.warn('Wiki index unavailable: ' + result.manifest.portableWiki.reason);
  }
  if (result.manifest.source.worktreeDirtyAtExport) {
    console.warn('WARNING: your worktree is dirty. This ZIP includes committed HEAD only, not your uncommitted edits.');
  }
  console.log('Attach this ZIP to an ordinary ChatGPT conversation for a source-grounded design investigation.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => {
    console.error('Snapshot failed: ' + error.message);
    process.exitCode = 1;
  });
}
