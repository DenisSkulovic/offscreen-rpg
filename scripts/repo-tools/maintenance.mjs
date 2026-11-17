/**
 * Read-only repository maintenance report.
 *
 * pnpm repo:maintenance
 * pnpm repo:maintenance --json
 * pnpm repo:maintenance --strict
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadExceptionFile,
  pathsForHistory,
  scanMaintenance,
} from './maintenance-core.mjs';
import { root } from './process.mjs';

function argValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function gitCapture(args) {
  try {
    return {
      ok: true,
      stdout: execFileSync('git', args, { cwd: root, encoding: 'utf8' }),
    };
  } catch (error) {
    return { ok: false, error };
  }
}

function collectGit() {
  const listed = gitCapture(['ls-files', '-z']);
  if (!listed.ok) {
    return {
      available: false,
      complete: false,
      files: [],
      sha: null,
      dirty: null,
      reason: 'Integrity gate unavailable. Git did not list tracked files, so this is not a green result.',
    };
  }
  const files = listed.stdout.split('\0').filter(Boolean).map((rel) => rel.replaceAll('\\', '/'));
  const hasArchive = files.some((rel) => rel.startsWith('work/changes/archive/'));
  const hasEvidence = files.some((rel) => rel.startsWith('evidence/'));
  const sha = gitCapture(['rev-parse', 'HEAD']);
  const status = gitCapture(['status', '--porcelain']);
  const complete = hasArchive && hasEvidence;
  return {
    available: true,
    complete,
    files,
    sha: sha.ok ? sha.stdout.trim() : null,
    dirty: status.ok ? Boolean(status.stdout.trim()) : null,
    reason: complete
      ? undefined
      : 'Integrity gate unavailable. The archive or evidence tree is absent, so a lean export is not a full-repo failure list.',
  };
}

function renderHuman(report) {
  const lines = [
    `${report.schema} ${report.sha ?? 'no-sha'} ${report.complete ? 'complete' : 'incomplete'}`,
  ];
  if (report.unavailable) {
    lines.push(report.unavailable);
    return lines.join('\n');
  }
  const errors = report.findings.filter((item) => item.severity === 'error');
  lines.push(
    `markdown ${report.markdownCount}  strict ${errors.length}  exceptions ${report.exceptionsApplied.length}`,
  );
  lines.push(`Current change: ${report.currentChange ?? 'unreadable'}`);
  if (errors.length === 0) {
    lines.push('No high-confidence lifecycle findings.');
  } else {
    for (const item of errors) {
      lines.push(`${item.code}  ${item.path}`);
      lines.push(`  ${item.message}`);
      lines.push(`  ${item.suggestion}`);
    }
  }
  if (report.historyStatus === 'unavailable') {
    lines.push('Freshness unavailable. Missing or shallow history is not zero age.');
  } else if (report.top3?.length) {
    lines.push('Top review candidates:');
    for (const item of report.top3) {
      lines.push(`${item.code}  ${item.path}${item.dependency ? `  ->  ${item.dependency}` : ''}`);
    }
  }
  return lines.join('\n');
}

function parseCommits(stdout) {
  const commits = {};
  let sha = null;
  let at = null;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) {
      sha = null;
      at = null;
      continue;
    }
    const parts = line.split('\t');
    if (parts.length === 2 && /^[0-9a-f]{7,}$/i.test(parts[0])) {
      sha = parts[0];
      at = parts[1];
      continue;
    }
    if (!sha || commits[line]) continue;
    commits[line.replaceAll('\\', '/')] = { sha, at };
  }
  return commits;
}

function dirtyPaths() {
  const status = gitCapture(['status', '--porcelain']);
  if (!status.ok) return [];
  return status.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replaceAll('\\', '/').replace(/.* -> /, ''));
}

function historyFor(files) {
  const shallow = gitCapture(['rev-parse', '--is-shallow-repository']);
  if (!shallow.ok || shallow.stdout.trim() === 'true') {
    return { available: false, commits: {}, dirty: [], uncited: [] };
  }
  const interest = pathsForHistory(root, files, readFileFromRoot);
  const commits = {};
  for (let index = 0; index < interest.needed.length; index += 40) {
    const slice = interest.needed.slice(index, index + 40);
    const log = gitCapture(['log', '--pretty=format:%H%x09%cI', '--name-only', '--', ...slice]);
    if (!log.ok) return { available: false, commits: {}, dirty: [], uncited: [] };
    Object.assign(commits, parseCommits(log.stdout));
  }
  const dirty = dirtyPaths();
  const cited = new Set(interest.cited);
  const uncited = dirty
    .filter((rel) => !rel.endsWith('.md') && !rel.endsWith('.mdc') && !cited.has(rel))
    .slice(0, 10);
  return {
    available: true,
    commits,
    dirty,
    uncited,
    present: (rel) => existsSync(path.join(root, ...rel.split('/'))),
  };
}

export function main(argv = process.argv.slice(2)) {
  const json = argv.includes('--json');
  const strict = argv.includes('--strict');
  const outDir = argValue(argv, '--out') ?? path.join(root, 'out', 'maintenance');
  const git = collectGit();
  const exceptions = loadExceptionFile(
    path.join(root, 'scripts', 'repo-tools', 'maintenance-exceptions.json'),
  );
  const report = scanMaintenance({
    root,
    files: git.files,
    readText: (rel) =>
      readFileFromRoot(rel),
    git,
    exceptions,
    history: git.available && git.complete ? historyFor(git.files) : undefined,
    now: new Date().toISOString(),
  });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  if (json) console.log(JSON.stringify(report, null, 2));
  else console.log(renderHuman(report));
  if (report.unavailable) return 2;
  if (strict && report.findings.some((item) => item.severity === 'error')) return 1;
  return 0;
}

function readFileFromRoot(rel) {
  const absolute = path.join(root, ...rel.split('/'));
  return readFileSync(absolute, 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main());
}
