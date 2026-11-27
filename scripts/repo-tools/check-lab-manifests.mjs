#!/usr/bin/env node
/**
 * Parse Kubernetes YAML under the relocated platform, verification, cluster, and release trees.
 * Helm chart template directories are validated via Helm lint/template instead.
 *
 * Usage:
 *   node scripts/repo-tools/check-lab-manifests.mjs [--root DIR]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  PLATFORM_SERVICES,
  assertPlatformRenderRequest,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../../infra/platform/common/render.mjs';
import { deriveDevWorkloadBindings } from '../../infra/workloads/tests/helpers/dev-bindings.mjs';
import {
  assertHelmAvailable,
  renderWorkloadDocuments,
} from '../../infra/workloads/render.mjs';
import { loadArtifacts } from '../../infra/platform/observability/artifacts.mjs';

const REPO_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const WORKLOADS_ROOT = path.join(REPO_ROOT, 'infra/workloads');
const PLATFORM_ROOT = path.join(REPO_ROOT, 'infra/platform');
const CHART_PATH = path.join(WORKLOADS_ROOT, 'chart');
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

/** @type {Record<string, string[]>} */
const PLATFORM_SECTIONS_BY_SERVICE = {
  postgres: ['all', 'namespace', 'cluster'],
  temporal: [
    'all',
    'namespace',
    'postgres',
    'schema',
    'server',
    'admin',
    'namespace-job',
  ],
  'object-storage': ['all', 'namespace', 'workloads'],
  redis: ['all'],
  rabbitmq: ['all', 'namespace', 'broker'],
};

/** Validated via validateNativeObservabilityManifests, not the raw YAML scan. */
export const NATIVE_OBSERVABILITY_VALUES_PATHS = Object.freeze([
  'infra/platform/observability/values/collector.yaml',
  'infra/platform/observability/values/prometheus.yaml',
  'infra/platform/observability/values/loki.yaml',
  'infra/platform/observability/values/tempo.yaml',
  'infra/platform/observability/values/grafana.yaml',
]);

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

const CHART_PACKAGE_ASSERT = `
import json
import pathlib
import sys

import yaml

chart_dir = pathlib.Path(sys.argv[1])
chart_yaml = chart_dir / "Chart.yaml"
try:
    data = yaml.safe_load(chart_yaml.read_text(encoding="utf-8"))
except yaml.YAMLError as error:
    print(f"Chart.yaml parse error: {error}", file=sys.stderr)
    sys.exit(1)

if data.get("apiVersion") != "v2":
    print(f"Chart.yaml apiVersion must be v2, got {data.get('apiVersion')!r}", file=sys.stderr)
    sys.exit(1)
if data.get("version") != "0.1.0":
    print(f"Chart.yaml version must be 0.1.0, got {data.get('version')!r}", file=sys.stderr)
    sys.exit(1)
if data.get("type") != "application":
    print(f"Chart.yaml type must be application, got {data.get('type')!r}", file=sys.stderr)
    sys.exit(1)

for name in ("values.schema.json", "templates", "profiles"):
    target = chart_dir / name
    if not target.exists():
        print(f"missing required chart path: {target}", file=sys.stderr)
        sys.exit(1)
    if name in ("templates", "profiles") and not target.is_dir():
        print(f"{name} must be a directory: {target}", file=sys.stderr)
        sys.exit(1)

profiles = chart_dir / "profiles"
allowed_profiles = {"development.yaml", "release.yaml"}
for entry in profiles.iterdir():
    if not entry.is_file():
        continue
    if entry.suffix not in (".yaml", ".yml"):
        continue
    if entry.name not in allowed_profiles:
        print(f"unknown profile file: {entry.name}", file=sys.stderr)
        sys.exit(1)

print(json.dumps({"ok": True}))
`;

function isYamlFile(name) {
  return name.endsWith('.yaml') || name.endsWith('.yml');
}

/**
 * @param {string} filePath
 */
export function isExcludedFromNativeObservabilityValues(filePath) {
  const relative = path.relative(REPO_ROOT, path.resolve(filePath));
  return NATIVE_OBSERVABILITY_VALUES_PATHS.includes(relative);
}

/**
 * @param {string} filePath
 */
export function isExcludedFromRawYamlScan(filePath) {
  if (isExcludedFromNativeObservabilityValues(filePath)) {
    return true;
  }
  const resolved = path.resolve(filePath);
  const parts = resolved.split(path.sep);
  const templatesIdx = parts.lastIndexOf('templates');
  if (templatesIdx < 1 || parts[templatesIdx] !== 'templates') {
    return false;
  }
  const chartDir = parts.slice(0, templatesIdx).join(path.sep);
  return existsSync(path.join(chartDir, 'Chart.yaml'));
}

/**
 * @param {string} filePath
 */
export function isPlatformServiceTemplatePath(filePath) {
  const resolved = path.resolve(filePath);
  for (const service of PLATFORM_SERVICES) {
    const templatesDir = path.join(
      PLATFORM_ROOT,
      service,
      'chart',
      'templates',
    );
    const relative = path.relative(templatesDir, resolved);
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      return true;
    }
  }
  return false;
}

/**
 * @returns {{ service: string, chartDir: string }[]}
 */
export function discoverImplementedPlatformCharts() {
  /** @type {{ service: string, chartDir: string }[]} */
  const charts = [];
  for (const service of PLATFORM_SERVICES) {
    const chartDir = path.join(PLATFORM_ROOT, service, 'chart');
    if (existsSync(path.join(chartDir, 'Chart.yaml'))) {
      charts.push({ service, chartDir });
    }
  }
  charts.sort((a, b) => a.service.localeCompare(b.service));
  return charts;
}

/**
 * @param {string} chartDir
 */
export function assertPlatformChartPackage(chartDir) {
  execFileSync('python3', ['-c', CHART_PACKAGE_ASSERT, chartDir], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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
export function assertRenderedDeployments(
  documents,
  expectedCount,
  deploymentNames,
) {
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
 * @returns {Omit<ReturnType<typeof validateHelmManifests>, 'helmVersion' | 'platform'>}
 */
export function validateWorkloadHelmManifests() {
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

  const releaseDocs = renderWorkloadDocuments({
    profile: 'release',
    section: 'all',
  });
  assertRenderedDeployments(releaseDocs, 12, RELEASE_DEPLOYMENT_NAMES);

  return {
    releaseDocumentCount: releaseDocs.length,
    devSlotCounts,
  };
}

/**
 * @returns {{ services: string[], renderCounts: Record<string, Record<string, Record<string, number>>> }}
 */
export function validatePlatformHelmManifests() {
  const charts = discoverImplementedPlatformCharts();
  /** @type {Record<string, Record<string, Record<string, number>>>} */
  const renderCounts = {};

  for (const { service, chartDir } of charts) {
    assertPlatformChartPackage(chartDir);
    renderCounts[service] = { dev: {}, release: {} };

    for (const profile of ['dev', 'release']) {
      try {
        assertPlatformRenderRequest(service, profile, 'all');
      } catch {
        continue;
      }
      lintPlatformChart({ service, profile }, { chartRoot: chartDir });

      for (const section of PLATFORM_SECTIONS_BY_SERVICE[service] ?? []) {
        try {
          assertPlatformRenderRequest(service, profile, section);
        } catch {
          continue;
        }
        const docs = renderPlatformDocuments(
          { service, profile, section },
          { chartRoot: chartDir },
        );
        renderCounts[service][profile][section] = docs.length;
      }
    }
  }

  return {
    services: charts.map((chart) => chart.service),
    renderCounts,
  };
}

/**
 * @returns {{ profiles: Record<'dev' | 'release', { releases: number, documents: number, releaseDocuments: Record<string, number> }> }}
 */
export function validateNativeObservabilityManifests() {
  /** @type {Record<'dev' | 'release', { releases: number, documents: number, releaseDocuments: Record<string, number> }>} */
  const profiles = {};

  for (const profileId of /** @type {const} */ (['dev', 'release'])) {
    const loaded = loadArtifacts(profileId);
    if (loaded.releases.length !== 5) {
      throw new Error(
        `expected five native observability releases for ${profileId}, got ${loaded.releases.length}`,
      );
    }
    /** @type {Record<string, number>} */
    const releaseDocuments = {};
    for (const release of loaded.releases) {
      releaseDocuments[release.name] = release.documents.length;
      if (
        typeof release.sha256 !== 'string' ||
        release.sha256.length === 0 ||
        typeof release.expectedImage?.canonicalReference !== 'string' ||
        !release.expectedImage.canonicalReference.includes('@sha256:')
      ) {
        throw new Error(
          `native observability digest contract missing for ${release.name} (${profileId})`,
        );
      }
    }
    profiles[profileId] = {
      releases: loaded.releases.length,
      documents: loaded.documents.length,
      releaseDocuments,
    };
  }

  return { profiles };
}

/**
 * @returns {{ helmVersion: string, releaseDocumentCount: number, devSlotCounts: Record<string, number>, platform: ReturnType<typeof validatePlatformHelmManifests>, nativeObservability: ReturnType<typeof validateNativeObservabilityManifests> }}
 */
export function validateHelmManifests() {
  const helmVersion = assertHelmAvailable();
  const workload = validateWorkloadHelmManifests();
  const platform = validatePlatformHelmManifests();
  const nativeObservability = validateNativeObservabilityManifests();
  return { helmVersion, ...workload, platform, nativeObservability };
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

  /** @type {ReturnType<typeof validateHelmManifests> | null} */
  let helm = null;
  if (options.helm === true) {
    helm = validateHelmManifests();
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
  const result = checkLabManifests(root ? [root] : DEFAULT_ROOTS, {
    helm: !root,
  });
  const platformSuffix =
    result.helm && result.helm.platform.services.length > 0
      ? `; platform charts ${result.helm.platform.services.join(', ')}`
      : '';
  const nativeObservabilitySuffix = result.helm?.nativeObservability
    ? '; native observability dev+release (five archives each)'
    : '';
  const helmSuffix = result.helm
    ? `; helm ${result.helm.helmVersion} lint/template release + dev-1/dev-2 (${result.helm.releaseDocumentCount} release docs)${platformSuffix}${nativeObservabilitySuffix}`
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
