#!/usr/bin/env node
/**
 * Parse Kubernetes YAML under the relocated platform, verification, cluster, and release trees.
 *
 * Usage:
 *   node scripts/repo-tools/check-lab-manifests.mjs [--root DIR]
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const DEFAULT_ROOTS = [
  path.join(REPO_ROOT, 'infra/platform'),
  path.join(REPO_ROOT, 'infra/verification'),
  path.join(REPO_ROOT, 'infra/clusters/kind'),
  path.join(REPO_ROOT, 'infra/workloads'),
  path.join(REPO_ROOT, 'infra/environments/release'),
];

const PYTHON_PARSE = `
import pathlib
import sys

import yaml

path = pathlib.Path(sys.argv[1])
try:
    text = path.read_text(encoding="utf-8")
except OSError as error:
    print(f"read error in {path}: {error}", file=sys.stderr)
    sys.exit(1)

try:
    for _ in yaml.safe_load_all(text):
        pass
except yaml.YAMLError as error:
    print(f"YAML parse error in {path}: {error}", file=sys.stderr)
    sys.exit(1)
`;

function isYamlFile(name) {
  return name.endsWith('.yaml') || name.endsWith('.yml');
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function collectLabYamlFiles(root) {
  const resolved = path.resolve(root);
  const files = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && isYamlFile(entry.name)) {
        files.push(full);
      }
    }
  }

  const stat = statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`Lab manifest root is not a directory: ${resolved}`);
  }
  walk(resolved);
  files.sort();
  return files;
}

/**
 * @param {string} filePath
 */
export function parseLabYamlFile(filePath) {
  execFileSync('python3', ['-c', PYTHON_PARSE, filePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * @param {string} [root]
 */
export function checkLabManifests(roots = DEFAULT_ROOTS) {
  const resolvedRoots = Array.isArray(roots) ? roots : [roots];
  const files = [];
  for (const root of resolvedRoots) {
    files.push(...collectLabYamlFiles(root));
  }
  const unique = [...new Set(files)].sort();
  if (unique.length === 0) {
    throw new Error(
      `No YAML manifests found under ${resolvedRoots.map((r) => path.resolve(r)).join(', ')}`,
    );
  }
  for (const file of unique) {
    parseLabYamlFile(file);
  }
  return { roots: resolvedRoots.map((r) => path.resolve(r)), fileCount: unique.length, files: unique };
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) {
    console.log(
      'Usage: node scripts/repo-tools/check-lab-manifests.mjs [--root DIR]',
    );
    return;
  }
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx !== -1 ? argv[rootIdx + 1] : undefined;
  const result = checkLabManifests(root ? [root] : DEFAULT_ROOTS);
  console.log(
    `Parsed ${result.fileCount} lab Kubernetes manifest file(s) under ${result.roots.join(', ')}`,
  );
}

const thisFile = fileURLToPath(import.meta.url);
const invoked =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href ===
    pathToFileURL(thisFile).href;

if (invoked) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error && typeof error === 'object' && 'stderr' in error) {
      const stderr = /** @type {{ stderr?: Buffer | string }} */ (error).stderr;
      if (stderr) {
        process.stderr.write(
          typeof stderr === 'string' ? stderr : stderr.toString('utf8'),
        );
      }
    }
    console.error(message);
    process.exit(1);
  }
}