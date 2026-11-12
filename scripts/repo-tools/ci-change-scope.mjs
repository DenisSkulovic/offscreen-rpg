#!/usr/bin/env node
/**
 * Classify changed paths for GitHub Actions job selection.
 * Pure standard-library; no marketplace path-filter action.
 *
 * Usage:
 *   node scripts/repo-tools/ci-change-scope.mjs [--event NAME] [--base SHA] [--head SHA] [--paths-file FILE]
 *   node scripts/repo-tools/ci-change-scope.mjs --paths path1 path2 ...
 *
 * Prints GitHub Actions-style output lines: key=value
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DOCS_PREFIXES = [
  'docs/',
  '.agents/',
  '.claude/',
  '.cursor/',
  '.kits/',
];
const DOCS_ROOT_FILES = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'TODO.md',
  'README.md',
  'LICENSE',
  'LICENSE.md',
]);

const INTEGRATION_PREFIXES = [
  'apps/api/',
  'apps/worker/',
  'packages/',
  'tools/',
  'scripts/',
];
const INTEGRATION_FILES = new Set([
  'compose.yaml',
  'compose.yml',
  'docker-compose.yaml',
  'docker-compose.yml',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'package.json',
  'turbo.json',
  '.node-version',
  '.npmrc',
]);

function normalize(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function isDocsPath(path) {
  const p = normalize(path);
  if (DOCS_ROOT_FILES.has(p)) return true;
  if (DOCS_PREFIXES.some((prefix) => p.startsWith(prefix))) return true;
  if (p.endsWith('.md') || p.endsWith('.mdc')) {
    // Nested package/app README maps are documentation navigation, not runtime.
    if (
      p.endsWith('/README.md') ||
      p.startsWith('docs/') ||
      p.startsWith('.agents/') ||
      p.startsWith('.claude/') ||
      p.startsWith('.cursor/')
    ) {
      return true;
    }
  }
  return false;
}

export function isIntegrationPath(path) {
  const p = normalize(path);
  if (INTEGRATION_FILES.has(p)) return true;
  if (p.startsWith('.github/workflows/')) return true;
  if (INTEGRATION_PREFIXES.some((prefix) => p.startsWith(prefix))) return true;
  return false;
}

export function isWebPath(path) {
  const p = normalize(path);
  return p.startsWith('apps/web/');
}

/**
 * @param {string[]} paths
 * @param {{ eventName?: string }} [options]
 */
export function classifyChangeScope(paths, options = {}) {
  const eventName = options.eventName ?? 'push';
  const normalized = [...new Set(paths.map(normalize).filter(Boolean))];
  const docsOnly =
    normalized.length > 0 && normalized.every((path) => isDocsPath(path));
  const touchesIntegration = normalized.some((path) => isIntegrationPath(path));
  const touchesWeb = normalized.some((path) => isWebPath(path));
  const touchesCode = normalized.some((path) => !isDocsPath(path));

  const forceFull =
    eventName === 'pull_request' ||
    eventName === 'workflow_dispatch' ||
    normalized.length === 0;

  const runCode = forceFull || touchesCode;
  const runIntegration = forceFull || touchesIntegration;

  return {
    eventName,
    pathCount: normalized.length,
    docsOnly: docsOnly && !forceFull,
    touchesWeb,
    touchesIntegration,
    touchesCode,
    runCode,
    runIntegration,
  };
}

function gitDiffNames(base, head) {
  const out = execFileSync(
    'git',
    ['diff', '--name-only', `${base}...${head}`],
    { encoding: 'utf8' },
  );
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolvePaths(argv) {
  const pathsIdx = argv.indexOf('--paths');
  if (pathsIdx !== -1) {
    return argv.slice(pathsIdx + 1).filter((arg) => !arg.startsWith('--'));
  }
  const fileIdx = argv.indexOf('--paths-file');
  if (fileIdx !== -1) {
    const file = argv[fileIdx + 1];
    return readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const baseIdx = argv.indexOf('--base');
  const headIdx = argv.indexOf('--head');
  const base = baseIdx !== -1 ? argv[baseIdx + 1] : null;
  const head = headIdx !== -1 ? argv[headIdx + 1] : 'HEAD';
  if (!base) {
    throw new Error(
      'Provide --paths, --paths-file, or --base <sha> (with optional --head).',
    );
  }
  return gitDiffNames(base, head);
}

function readEventName(argv) {
  const idx = argv.indexOf('--event');
  return idx !== -1 ? argv[idx + 1] : process.env.GITHUB_EVENT_NAME || 'push';
}

function printOutputs(scope) {
  const lines = [
    `docs_only=${scope.docsOnly}`,
    `run_code=${scope.runCode}`,
    `run_integration=${scope.runIntegration}`,
    `touches_web=${scope.touchesWeb}`,
    `touches_integration=${scope.touchesIntegration}`,
    `path_count=${scope.pathCount}`,
  ];
  for (const line of lines) {
    console.log(line);
  }
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) {
    console.log(
      'Usage: node scripts/repo-tools/ci-change-scope.mjs [--event NAME] (--paths ... | --paths-file FILE | --base SHA [--head SHA])',
    );
    return;
  }
  const eventName = readEventName(argv);
  const paths = resolvePaths(argv);
  const scope = classifyChangeScope(paths, { eventName });
  printOutputs(scope);
}

const thisFile = fileURLToPath(import.meta.url);
const invoked =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(thisFile).href;

if (invoked) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
