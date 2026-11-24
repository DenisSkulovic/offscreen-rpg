import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  checkLabManifests,
  collectLabYamlFiles,
  discoverImplementedPlatformCharts,
  isExcludedFromRawYamlScan,
  isPlatformServiceTemplatePath,
  parseLabYamlFile,
} from './check-lab-manifests.mjs';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '../..');
const releaseEnvRoot = join(repoRoot, 'infra/environments/release');
const probeFixturesRoot = join(
  repoRoot,
  'infra/verification/fixtures/probes',
);

test('infra tree contains Kubernetes YAML manifests', () => {
  const files = collectLabYamlFiles(releaseEnvRoot);
  assert.ok(files.length > 0, 'expected release environment yaml files');
  assert.ok(
    !files.some((file) => file.endsWith('namespaces.yaml')),
    'release environment must not bootstrap verification probe namespaces',
  );
  const probeNamespaces = join(probeFixturesRoot, 'namespaces.yaml');
  const probeFiles = collectLabYamlFiles(probeFixturesRoot);
  assert.ok(
    probeFiles.some((file) => file.endsWith('namespaces.yaml')),
    'probe namespaces live under infra/verification/fixtures/probes',
  );
  assert.doesNotThrow(() => parseLabYamlFile(probeNamespaces));
});

test('all lab Kubernetes YAML parses', () => {
  const result = checkLabManifests(undefined, { helm: true });
  assert.ok(result.fileCount > 0);
  assert.ok(result.helm);
  assert.equal(result.helm.releaseDocumentCount, 12);
});

test('raw yaml scan skips helm chart templates only', () => {
  const workloadsRoot = join(repoRoot, 'infra/workloads');
  const files = collectLabYamlFiles(workloadsRoot);
  assert.ok(files.some((file) => file.endsWith('chart/Chart.yaml')));
  assert.ok(files.some((file) => file.endsWith('profiles/release.yaml')));
  assert.ok(!files.some((file) => file.includes('chart/templates/')));
  assert.equal(
    isExcludedFromRawYamlScan(
      join(workloadsRoot, 'chart/templates/deployments.yaml'),
    ),
    true,
  );
  assert.equal(
    isExcludedFromRawYamlScan(join(workloadsRoot, 'chart/values.yaml')),
    false,
  );
});

test('raw yaml scan skips platform chart templates and offline fixtures', () => {
  const platformRoot = join(repoRoot, 'infra/platform');
  const files = collectLabYamlFiles(platformRoot);
  assert.ok(!files.some((file) => file.includes('tiny-chart/templates/')));
  assert.ok(!files.some((file) => file.includes('/chart/templates/')));
  const postgresTemplate = join(
    platformRoot,
    'postgres/chart/templates/cluster.yaml',
  );
  assert.equal(isPlatformServiceTemplatePath(postgresTemplate), true);
  assert.equal(
    isExcludedFromRawYamlScan(postgresTemplate),
    true,
    'platform chart templates are validated via Helm lint/template',
  );

  const fixtureTemplate = join(
    platformRoot,
    'common/tests/fixtures/tiny-chart/templates/manifests.yaml',
  );
  assert.equal(isExcludedFromRawYamlScan(fixtureTemplate), true);
});

test('implemented platform charts are discovered without requiring future services', () => {
  const charts = discoverImplementedPlatformCharts();
  assert.deepEqual(
    charts.map((chart) => chart.service),
    [
      'object-storage',
      'observability',
      'postgres',
      'rabbitmq',
      'redis',
      'temporal',
    ],
  );
});

test('explicit --root scan skips helm validation', () => {
  const result = checkLabManifests(releaseEnvRoot, { helm: false });
  assert.ok(result.fileCount > 0);
  assert.equal(result.helm, null);
});

test('deliberately invalid YAML fails the checker', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lab-manifest-invalid-'));
  const bad = join(dir, 'broken.yaml');
  writeFileSync(
    bad,
    'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: [unclosed\n',
    'utf8',
  );
  assert.throws(
    () => parseLabYamlFile(bad),
    (error) => {
      assert.ok(error);
      return true;
    },
  );
  assert.throws(() => checkLabManifests(dir));
});
