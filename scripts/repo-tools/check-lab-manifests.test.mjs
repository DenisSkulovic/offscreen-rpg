import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  checkLabManifests,
  collectLabYamlFiles,
  parseLabYamlFile,
} from './check-lab-manifests.mjs';
import { fileURLToPath } from 'node:url';

const repoRoot = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../..',
);
const labRoot = join(repoRoot, 'infra/kubernetes/lab');

test('lab tree contains Kubernetes YAML manifests', () => {
  const files = collectLabYamlFiles(labRoot);
  assert.ok(files.length > 20, 'expected many lab yaml files');
  assert.ok(
    files.some((file) => file.endsWith('namespaces.yaml')),
    'namespaces.yaml is included',
  );
});

test('all lab Kubernetes YAML parses', () => {
  const result = checkLabManifests(labRoot);
  assert.ok(result.fileCount > 0);
});

test('deliberately invalid YAML fails the checker', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lab-manifest-invalid-'));
  const bad = join(dir, 'broken.yaml');
  writeFileSync(
    bad,
    'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: [unclosed\n',
    'utf8',
  );
  assert.throws(() => parseLabYamlFile(bad), (error) => {
    assert.ok(error);
    return true;
  });
  assert.throws(() => checkLabManifests(dir));
});