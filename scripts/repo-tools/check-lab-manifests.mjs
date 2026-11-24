#!/usr/bin/env node
/**
 * Parse Kubernetes YAML under the relocated platform, verification, cluster, and release trees.
 * Static files under infra/workloads/chart/templates are validated via Helm lint/template instead.
 *
 * Usage:
 *   node scripts/repo-tools/check-lab-manifests.mjs [--root DIR]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveDevWorkloadBindings } from '../../infra/workloads/tests/helpers/dev-bindings.mjs';
import {
  assertHelmAvailable,
  renderWorkloadDocuments,
} from '../../infra/workloads/render.mjs';

const REPO_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const WORKLOADS_ROOT = path.join(REPO_ROOT, 'infra/workloads');
const CHART_PATH = path.join(WORKLOADS_ROOT, 'chart');
const CHART_TEMPLATES_DIR = path.join(CHART_PATH, 'templates');
const RELEASE_PROFILE = path.join(WORKLOADS_ROOT, 'profiles/release.yaml');
const DEV_PROFILE = path.join(WORKLOADS_ROOT, 'profiles/development.yaml');

const DEFAULT_ROOTS = [
  path.join(REPO_ROOT, 'infra/platform'),
  path.join(REPO_ROOT, 'infra/verification'),
  path.join(REPO_ROOT, 'infra/clusters/kind'),
  path.join(REPO_ROOT, 'infra/workloads'),
  path.join(REPO_ROOT, 'infra/environments/release'),
];

const RELEASE_DEPLOYMENT_NAMES = [
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
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
 * @param {string} filePath
 */
export function isExcludedFromRawYamlScan(filePath) {
  const resolved = path.resolve(filePath);
  const relative = path.relative(CHART_TEMPLATES_DIR, resolved);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
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
        if (!isExcludedFromRawYamlScan(full)) {
          files.push(full);
        }
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
 * @param {ReturnType<typeof renderWorkloadDocuments>} documents
 * @param {number} expectedCount
 * @param {string[]} deploymentNames
 */
export function assertRenderedDeployments(documents, expectedCount, deploymentNames) {
  if (documents.length !== expectedCount) {
    throw new Error(
      `expected ${expectedCount} rendered manifest documents, got ${documents.length}`,
    );
  }
  const deployments = documents.filter((doc) => doc.kind === 'Deployment');
  const names = new Set(deployments.map((doc) => doc.metadata?.name));
  for (const expectedName of deploymentNames) {
    if (!names.has(expectedName)) {
      throw new Error(`missing rendered Deployment ${expectedName}`);
    }
  }
}

/**
 * @param {import('node:child_process').SpawnSyncOptions} options
 */
function helmLint(argv, options = {}) {
  const result = spawnSync('helm', argv, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  });
  if (result.error || result.status !== 0 || result.signal) {
    const detail = (result.stderr ?? result.stdout ?? '').trim().slice(0, 800);
    throw new Error(`helm lint failed: ${detail || 'unknown error'}`);
  }
}

/**
 * @returns {{ releaseDocumentCount: number, devSlotCounts: Record<string, number> }}
 */
export function validateWorkloadHelmManifests() {
  const helmVersion = assertHelmAvailable();

  helmLint(['lint', CHART_PATH, '-f', RELEASE_PROFILE]);

  const devSlots = [
    ['dev-1', 3100],
    ['dev-2', 3200],
  ];
  /** @type {Record<string, number>} */
  const devSlotCounts = {};
  for (const [slotId, gamePort] of devSlots) {
    const overlay = deriveDevWorkloadBindings(slotId, gamePort);
    helmLint(['lint', CHART_PATH, '-f', DEV_PROFILE, '-f', '-'], {
      input: `${JSON.stringify(overlay)}\n`,
    });
    const docs = renderWorkloadDocuments({
      profile: 'development',
      section: 'all',
      bindings: overlay.bindings,
    });
    assertRenderedDeployments(docs, 10, RELEASE_DEPLOYMENT_NAMES);
    devSlotCounts[slotId] = docs.length;
  }

  const releaseDocs = renderWorkloadDocuments({ profile: 'release', section: 'all' });
  assertRenderedDeployments(releaseDocs, 12, RELEASE_DEPLOYMENT_NAMES);

  return {
    helmVersion,
    releaseDocumentCount: releaseDocs.length,
    devSlotCounts,
  };
}

/**
 * @param {string | string[]} [roots]
 * @param {{ helm?: boolean }} [options]
 */
export function checkLabManifests(roots = DEFAULT_ROOTS, options = {}) {
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

  /** @type {ReturnType<typeof validateWorkloadHelmManifests> | null} */
  let helm = null;
  if (options.helm === true) {
    helm = validateWorkloadHelmManifests();
  }

  return {
    roots: resolvedRoots.map((r) => path.resolve(r)),
    fileCount: unique.length,
    files: unique,
    helm,
  };
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
  const result = checkLabManifests(root ? [root] : DEFAULT_ROOTS, { helm: !root });
  const helmSuffix = result.helm
    ? `; helm ${result.helm.helmVersion} lint/template release + dev-1/dev-2 (${result.helm.releaseDocumentCount} release docs)`
    : '';
  console.log(
    `Parsed ${result.fileCount} lab Kubernetes manifest file(s) under ${result.roots.join(', ')}${helmSuffix}`,
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