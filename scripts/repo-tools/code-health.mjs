/**
 * Read-only Git/FS adapter and CLI for production source-health metrics.
 *
 * pnpm repo:code-health
 * pnpm repo:code-health --json
 * pnpm repo:code-health --base <ref>
 * pnpm repo:code-health --strict-new --base <ref>
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  CODE_HEALTH_MISSING,
  isProductionSource,
  scanCodeHealth,
  THRESHOLDS,
} from './code-health-core.mjs';
import { root as defaultRoot } from './process.mjs';

export const SCHEMA = 'offscreen.code-health.v1';
export const MAX_BASELINE_SHOW_CALLS = 400;

const DESIGN_POINTER = 'work/designs/open/code-architecture-health/README.md';

export function argValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

/** @param {string} stdout */
export function parseNulPaths(stdout) {
  return stdout
    .split('\0')
    .filter(Boolean)
    .map((rel) => rel.replaceAll('\\', '/'));
}

/**
 * @param {string} repositoryRoot
 * @param {typeof execFileSync} [execFile]
 */
export function createGitCapture(repositoryRoot, execFile = execFileSync) {
  return function gitCapture(args) {
    try {
      return {
        ok: true,
        stdout: execFile('git', ['-C', repositoryRoot, ...args], {
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        }),
      };
    } catch (error) {
      return { ok: false, error };
    }
  };
}

/**
 * @param {string} repositoryRoot
 * @param {ReturnType<typeof createGitCapture>} gitCapture
 * @param {(target: string) => boolean} [exists]
 */
export function collectWorkingEntries(
  repositoryRoot,
  gitCapture,
  exists = existsSync,
) {
  const listed = gitCapture([
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ]);
  if (!listed.ok) {
    return {
      ok: false,
      entries: [],
      reason:
        'Git could not list working-tree files; this is not a green result.',
    };
  }
  const seen = new Set();
  /** @type {string[]} */
  const entries = [];
  for (const rel of parseNulPaths(listed.stdout)) {
    if (seen.has(rel)) continue;
    seen.add(rel);
    const absolute = path.join(repositoryRoot, ...rel.split('/'));
    if (!exists(absolute)) continue;
    entries.push(rel);
  }
  entries.sort((a, b) => a.localeCompare(b));
  return { ok: true, entries };
}

/**
 * @param {string} repositoryRoot
 * @param {typeof execFileSync} [execFile]
 */
export function createGitShow(repositoryRoot, execFile = execFileSync) {
  return function gitShow(ref, relPath) {
    try {
      const text = execFile(
        'git',
        ['-C', repositoryRoot, 'show', `${ref}:${relPath}`],
        { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
      );
      return { ok: true, text };
    } catch {
      return { ok: false, text: null };
    }
  };
}

class BaselineShowReader {
  /**
   * @param {(ref: string, relPath: string) => { ok: boolean; text: string | null }} gitShow
   * @param {string} ref
   * @param {number} maxCalls
   */
  constructor(gitShow, ref, maxCalls) {
    this.gitShow = gitShow;
    this.ref = ref;
    this.maxCalls = maxCalls;
    this.calls = 0;
    this.capped = false;
    /** @type {Map<string, string | null>} */
    this.cache = new Map();
  }

  /** @param {string} relPath @returns {string | null} */
  read(relPath) {
    if (this.cache.has(relPath)) {
      return this.cache.get(relPath) ?? null;
    }
    if (this.calls >= this.maxCalls) {
      this.capped = true;
      return null;
    }
    this.calls += 1;
    const shown = this.gitShow(this.ref, relPath);
    const text = shown.ok ? shown.text : null;
    this.cache.set(relPath, text);
    return text;
  }
}

/**
 * Baseline content is required only for production files that exist on the
 * comparison ref and differ in the working tree. Unchanged legacy debt is
 * classified from tree membership, so a large clean repo must not `git show`
 * every file and then treat the history cap as a failed baseline.
 *
 * @param {{
 *   preliminary: ReturnType<typeof scanCodeHealth>;
 *   baselinePaths: Set<string>;
 *   modifiedPaths: Set<string>;
 * }} input
 */
export function buildBaselineReadSet({
  preliminary,
  baselinePaths,
  modifiedPaths,
}) {
  /** @type {Set<string>} */
  const baselineReadSet = new Set();
  for (const file of preliminary.files) {
    if (!baselinePaths.has(file.path)) continue;
    if (!modifiedPaths.has(file.path)) continue;
    baselineReadSet.add(file.path);
  }
  return baselineReadSet;
}

/**
 * Directory hotspots: prefer directories at direct-file review threshold, else largest direct-file counts; ties alphabetical.
 * @param {import('./code-health-core.mjs').CodeHealthDirectoryRecord[]} directories
 * @param {number} limit
 */
export function topDirectoryHotspots(directories, limit = 8) {
  const review = directories.filter(
    (item) => item.directFiles >= THRESHOLDS.directFilesReview,
  );
  const pool =
    review.length > 0
      ? [...review].sort(
          (a, b) =>
            b.directFiles - a.directFiles || a.path.localeCompare(b.path),
        )
      : [...directories].sort(
          (a, b) =>
            b.directFiles - a.directFiles || a.path.localeCompare(b.path),
        );
  return pool.slice(0, limit);
}

/**
 * @param {import('./code-health-core.mjs').CodeHealthFileRecord[]} files
 * @param {number} limit
 */
export function topLargestFiles(files, limit = 10) {
  return [...files]
    .sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path))
    .slice(0, limit);
}

/**
 * @param {{
 *   scan: ReturnType<typeof scanCodeHealth>;
 *   head: string | null;
 *   baselineRef: string | null;
 *   forceBaselineUnavailable?: boolean;
 * }} input
 */
export function formatJsonReport({
  scan,
  head,
  baselineRef,
  forceBaselineUnavailable = false,
}) {
  return {
    schema: SCHEMA,
    head,
    baselineRef,
    baselineAvailable: forceBaselineUnavailable
      ? false
      : scan.baselineAvailable,
    summary: scan.summary,
    files: scan.files,
    directories: scan.directories,
    findings: scan.findings,
    strictRegressions: forceBaselineUnavailable ? [] : scan.strictRegressions,
    thresholdsVersion: scan.thresholdsVersion,
  };
}

/**
 * @param {ReturnType<typeof formatJsonReport>} report
 */
export function renderHuman(report) {
  const lines = [
    `${SCHEMA} ${report.head ?? 'no-sha'} baseline=${report.baselineRef ?? 'none'} available=${report.baselineAvailable}`,
    `production files ${report.summary.productionFiles}  findings ${report.summary.findings}  strict ${report.summary.strictRegressions}`,
  ];
  const largest = topLargestFiles(report.files);
  if (largest.length > 0) {
    lines.push('Largest source files:');
    for (const file of largest) {
      lines.push(`  ${file.lines} lines  ${file.path}`);
    }
  }
  const hotspots = topDirectoryHotspots(report.directories);
  if (hotspots.length > 0) {
    lines.push('Directory hotspots:');
    for (const dir of hotspots) {
      lines.push(`  ${dir.directFiles} direct files  ${dir.path || '(root)'}`);
    }
  }
  lines.push(
    `Review-only signals; see ${DESIGN_POINTER} before opening structural Changes.`,
  );
  return lines.join('\n');
}

function makeReadText(repositoryRoot, readFile = readFileSync) {
  return function readText(rel) {
    const absolute = path.join(repositoryRoot, ...rel.split('/'));
    return readFile(absolute, 'utf8');
  };
}

function missingReadText(rel) {
  const error = new Error(`missing ${rel}`);
  error.code = CODE_HEALTH_MISSING;
  throw error;
}

function safeReadText(readText, rel) {
  try {
    return readText(rel);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      /** @type {{ code?: string }} */ (error).code === CODE_HEALTH_MISSING
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * @param {{
 *   repositoryRoot: string;
 *   baselineRef?: string | null;
 *   gitCapture?: ReturnType<typeof createGitCapture>;
 *   gitShow?: ReturnType<typeof createGitShow>;
 *   exists?: (target: string) => boolean;
 *   readFile?: typeof readFileSync;
 *   maxBaselineShowCalls?: number;
 * }} options
 */
export function buildCodeHealthReport(options) {
  const repositoryRoot = options.repositoryRoot;
  const gitCapture = options.gitCapture ?? createGitCapture(repositoryRoot);
  const gitShow = options.gitShow ?? createGitShow(repositoryRoot);
  const exists = options.exists ?? existsSync;
  const readText = makeReadText(repositoryRoot, options.readFile);
  const maxCalls = options.maxBaselineShowCalls ?? MAX_BASELINE_SHOW_CALLS;

  const gitDir = path.join(repositoryRoot, '.git');
  if (!exists(gitDir)) {
    return {
      ok: false,
      failure: 'Repository has no .git directory; code-health cannot run.',
    };
  }

  const headResult = gitCapture(['rev-parse', 'HEAD']);
  const head = headResult.ok ? headResult.stdout.trim() : null;

  const listed = collectWorkingEntries(repositoryRoot, gitCapture, exists);
  if (!listed.ok) {
    return {
      ok: false,
      failure: listed.reason ?? 'Git file enumeration failed.',
    };
  }

  const baselineRef = options.baselineRef ?? null;
  let forceBaselineUnavailable = false;
  let resolvedBaseline = null;
  /** @type {string[] | undefined} */
  let baselineEntries;
  /** @type {Set<string>} */
  let modifiedPaths = new Set();

  if (baselineRef) {
    const verify = gitCapture(['rev-parse', '--verify', baselineRef]);
    if (!verify.ok) {
      return {
        ok: false,
        failure: `Baseline ref "${baselineRef}" is missing or unresolvable.`,
      };
    }
    resolvedBaseline = verify.stdout.trim();
    const tree = gitCapture([
      'ls-tree',
      '-r',
      '--name-only',
      '-z',
      resolvedBaseline,
    ]);
    if (!tree.ok) {
      return {
        ok: false,
        failure: `Git could not list baseline tree for "${baselineRef}".`,
      };
    }
    baselineEntries = parseNulPaths(tree.stdout);
    const diff = gitCapture(['diff', '--name-only', '-z', resolvedBaseline]);
    if (!diff.ok) {
      return {
        ok: false,
        failure: `Git could not diff the working tree against "${baselineRef}".`,
      };
    }
    modifiedPaths = new Set(
      parseNulPaths(diff.stdout).filter((rel) => isProductionSource(rel)),
    );
  }

  const preliminary = scanCodeHealth(listed.entries, {
    readText(rel) {
      const text = safeReadText(readText, rel);
      if (text == null) {
        return missingReadText(rel);
      }
      return text;
    },
  });

  let scan = preliminary;
  if (resolvedBaseline && baselineEntries) {
    const baselinePaths = new Set(
      baselineEntries.filter((rel) => isProductionSource(rel)),
    );
    const baselineReadSet = buildBaselineReadSet({
      preliminary,
      baselinePaths,
      modifiedPaths,
    });
    if (baselineReadSet.size > maxCalls) {
      forceBaselineUnavailable = true;
    }
    const reader = new BaselineShowReader(gitShow, resolvedBaseline, maxCalls);
    scan = scanCodeHealth(listed.entries, {
      readText(rel) {
        const text = safeReadText(readText, rel);
        if (text == null) {
          return missingReadText(rel);
        }
        return text;
      },
      baselineEntries,
      readBaseline(rel) {
        if (forceBaselineUnavailable || !baselineReadSet.has(rel)) {
          return null;
        }
        return reader.read(rel);
      },
    });
    if (forceBaselineUnavailable || reader.capped) {
      scan = {
        ...scan,
        baselineAvailable: false,
        strictRegressions: [],
      };
    }
  }

  return {
    ok: true,
    head,
    baselineRef: resolvedBaseline,
    scan,
    forceBaselineUnavailable,
  };
}

/**
 * @param {string[]} [argv]
 * @param {{ repositoryRoot?: string; execFile?: typeof execFileSync; exists?: (target: string) => boolean; readFile?: typeof readFileSync }} [overrides]
 */
export function main(argv = process.argv.slice(2), overrides = {}) {
  const json = argv.includes('--json');
  const strictNew = argv.includes('--strict-new');
  const baselineArg = argValue(argv, '--base');
  const repositoryRoot = overrides.repositoryRoot ?? defaultRoot;

  if (strictNew && !baselineArg) {
    process.stderr.write(
      'code-health: --strict-new requires --base <branch-or-sha>.\n',
    );
    return 2;
  }

  const built = buildCodeHealthReport({
    repositoryRoot,
    baselineRef: baselineArg,
    gitCapture: overrides.repositoryRoot
      ? createGitCapture(repositoryRoot, overrides.execFile)
      : undefined,
    gitShow: overrides.repositoryRoot
      ? createGitShow(repositoryRoot, overrides.execFile)
      : undefined,
    exists: overrides.exists,
    readFile: overrides.readFile,
  });

  if (!built.ok) {
    process.stderr.write(`code-health: ${built.failure}\n`);
    return 2;
  }

  const report = formatJsonReport({
    scan: built.scan,
    head: built.head,
    baselineRef: built.baselineRef,
    forceBaselineUnavailable: built.forceBaselineUnavailable,
  });

  if (json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(`${renderHuman(report)}\n`);
  }

  if (strictNew) {
    if (!baselineArg || !report.baselineAvailable) {
      return 2;
    }
    if (report.strictRegressions.length > 0) {
      return 1;
    }
  }

  return 0;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  process.exit(main());
}
