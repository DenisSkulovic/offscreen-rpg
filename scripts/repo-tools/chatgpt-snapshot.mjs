import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { buildPortableWikiIndex, safeGithubOrigin } from './chatgpt-snapshot-knowledge.mjs';
import { documentationHealthReport } from './docs-health.mjs';
import { executeWikiHealth, missingWikiDependency } from './wiki-health.mjs';
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

function portableLinkReport(index, portableStatus) {
  if (portableStatus !== 'ready' || !index) {
    return {
      status: 'NOT-RUN',
      reason: portableStatus === 'disabled'
        ? 'Portable index was not generated'
        : 'Portable index is unavailable',
    };
  }
  const unresolved = Array.isArray(index.unresolvedLinks)
    ? index.unresolvedLinks.length
    : Number.isInteger(index.summary?.brokenLinkCount)
      ? index.summary.brokenLinkCount
      : null;
  const excludedBySnapshotProfile = Array.isArray(index.omittedLinks)
    ? index.omittedLinks.filter((item) => item.state === 'excluded-by-snapshot-profile').length
    : Number.isInteger(index.summary?.omittedLinkCount)
      ? index.summary.omittedLinkCount
      : null;
  const excludedSensitive = Array.isArray(index.omittedLinks)
    ? index.omittedLinks.filter((item) => item.state === 'excluded-sensitive-file').length
    : null;
  if (unresolved == null) {
    return {
      status: 'NOT-RUN',
      reason: 'Portable index did not report included-link defects',
      excludedBySnapshotProfile,
      excludedSensitive,
    };
  }
  return {
    status: unresolved > 0 ? 'FAIL' : 'PASS',
    unresolvedIncluded: unresolved,
    excludedBySnapshotProfile,
    excludedSensitive,
    note: 'Excluded archive, evidence, and sensitive paths are omissions. Unresolved counts are defects among included files.',
  };
}

async function snapshotDocumentationHealth(repoRoot, index, portableStatus) {
  let fullCheckout;
  try {
    const report = documentationHealthReport(repoRoot);
    fullCheckout = {
      scope: 'full-checkout-before-export',
      mode: report.mode,
      status: report.status,
      regressionCount: report.regressions.length,
      expectedOmissionCount: report.expectedOmissions.length,
      pathTerminologyExemptionCount: report.pathTerminologyExemptions.length,
      note: 'Expected lean omissions are not repository regressions. This full-checkout result is independent of files left out of a lean ZIP.',
    };
  } catch (error) {
    if (!missingWikiDependency(error)) throw error;
    fullCheckout = {
      scope: 'full-checkout-before-export',
      status: 'NOT-RUN',
      reason: 'Node dependencies required by the documentation checker are not installed.',
    };
  }
  let wiki;
  try {
    const executed = await executeWikiHealth(repoRoot, { repoSha: null, dirty: null });
    wiki = {
      name: 'wiki-health',
      status: executed.status,
      ...(executed.reason ? { reason: executed.reason } : {}),
      ...(Number.isInteger(executed.hardErrors) ? { hardErrors: executed.hardErrors } : {}),
    };
  } catch (error) {
    wiki = {
      name: 'wiki-health',
      status: 'NOT-RUN',
      reason: missingWikiDependency(error)
        ? 'Node dependencies required by the wiki parser are not installed.'
        : 'Wiki health could not be executed.',
    };
  }
  return {
    schema: 'offscreen.snapshot-health.v1',
    fullCheckout,
    portableLinks: portableLinkReport(index, portableStatus),
    dependencyChecks: [wiki],
  };
}

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  }).trimEnd();
}

export async function createSnapshot({
  repoRoot = DEFAULT_ROOT, profile = 'lean', strict = false, requireIndex = true, skipIndex = false,
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
    let portableIndex = null;
    if (skipIndex) {
      manifest.portableWiki = {
        status: 'disabled', reason: 'Explicit --no-index source-only export',
        fallback: 'Read original Markdown with local filesystem search.',
      };
    } else {
      try {
        const indexOwners = [
          'scripts/repo-tools/chatgpt-snapshot.mjs',
          'scripts/repo-tools/chatgpt-snapshot-knowledge.mjs',
          'scripts/repo-tools/wiki-core/route.mjs',
          'scripts/repo-tools/wiki-core/model.mjs',
          'scripts/repo-tools/wiki-core/markdown.mjs',
          'scripts/repo-tools/wiki-core/paths.mjs',
          'scripts/repo-tools/wiki-core/search.mjs',
          'scripts/repo-tools/wiki-core/slug.mjs',
        ];
        const parserDirty = modified.filter(p => indexOwners.includes(p));
        if (parserDirty.length) throw new Error('Snapshot/index generator has uncommitted code edits');
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
          stagedRoot, head, profile, trackedPaths, repositoryUrl: safeGithubOrigin(remote),
        });
        portableIndex = index;
        writeFileSync(knowledgeFile, JSON.stringify(index) + '\n');
        manifest.portableWiki = {
          status: 'ready', schema: index.schema,
          file: 'WIKI-INDEX.json', summary: index.summary,
        };
      } catch (error) {
        if (requireIndex) throw new Error('Portable wiki index required but unavailable: ' + error.message);
        const details = String(error.message);
        const safeReason = /Cannot find package|ERR_MODULE_NOT_FOUND/i.test(details)
          ? 'Existing wiki parser dependencies are not installed locally'
          : /spawn.*tar|ENOENT.*tar/i.test(details)
            ? 'Local tar command is unavailable'
            : 'Portable index could not be generated; rerun with --require-index for local diagnostics';
        manifest.portableWiki = {
          status: 'unavailable', reason: safeReason,
          fallback: 'Read original Markdown with local filesystem search.',
        };
      }
    }
    manifest.documentationHealth = await snapshotDocumentationHealth(
      root, portableIndex, manifest.portableWiki.status,
    );
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
    console.log('Usage: pnpm repo:snapshot:chatgpt [--full] [--strict] [--no-index]');
    console.log('Creates a versioned, gitignored ZIP of committed HEAD under out/chatgpt-snapshots/.');
    console.log('Default: lean source/docs. --full adds historical Change/evidence material.');
    console.log('Uncommitted and untracked files are NEVER included. --strict rejects dirty worktrees.');
    console.log('WIKI-INDEX.json is required by default (fail-fast). --no-index explicitly exports source only.');
    return;
  }
  if (args.some(arg => !['--full', '--strict', '--no-index', '--require-index'].includes(arg))) {
    throw new Error('Unknown arguments: ' + args.join(' '));
  }
  if (args.includes('--no-index') && args.includes('--require-index')) {
    throw new Error('--no-index and --require-index cannot be combined');
  }
  const sourceOnly = args.includes('--no-index');
  const result = await createSnapshot({
    profile: args.includes('--full') ? 'full' : 'lean',
    strict: args.includes('--strict'),
    requireIndex: !sourceOnly,
    skipIndex: sourceOnly,
  });
  console.log('ChatGPT snapshot: ' + result.destination);
  console.log('Revision: ' + result.manifest.source.commit + ' (' + result.manifest.source.branch + ')');
  console.log('Profile: ' + result.manifest.profile + '; size: ' + (result.bytes / 1024 / 1024).toFixed(2) + ' MiB');
  console.log('SHA-256: ' + result.sha256);
  console.log('Portable wiki: ' + result.manifest.portableWiki.status);
  const health = result.manifest.documentationHealth;
  if (health) {
    console.log('Full-checkout documentation health: ' + health.fullCheckout.status);
    const links = health.portableLinks;
    console.log(
      'Portable links: ' + links.status
      + (Number.isInteger(links.unresolvedIncluded)
        ? `; unresolved included ${links.unresolvedIncluded}; excluded by profile ${links.excludedBySnapshotProfile}`
        : ''),
    );
    for (const check of health.dependencyChecks ?? []) {
      console.log(check.name + ': ' + check.status + (check.reason ? ' (' + check.reason + ')' : ''));
    }
  }
  if (result.manifest.portableWiki.status !== 'ready') {
    console.warn('Portable wiki not included: ' + result.manifest.portableWiki.reason);
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
