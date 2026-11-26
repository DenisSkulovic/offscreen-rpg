import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { renderWorkloadDocuments } from '../render.mjs';
import { validateObjectStorageBinding } from '../../platform/object-storage/binding.mjs';
import { deriveDevWorkloadBindings } from './helpers/dev-bindings.mjs';
import { documentKey, helmTemplate, parseHelmJsonDocuments } from './helpers/helm-render.mjs';
import {
  indexDocuments,
  normalizeDevDocument,
  normalizeReleaseDocument,
} from './helpers/normalize.mjs';

const testsRoot = dirname(fileURLToPath(import.meta.url));
const workloadsRoot = join(testsRoot, '..');
const chartPath = join(workloadsRoot, 'chart');
const fixtures = join(testsRoot, 'fixtures');
const releaseBaseline = JSON.parse(readFileSync(join(fixtures, 'release-baseline.json'), 'utf8'));
const dev1Baseline = JSON.parse(readFileSync(join(fixtures, 'dev-1-baseline.json'), 'utf8'));
const dev2Baseline = JSON.parse(readFileSync(join(fixtures, 'dev-2-baseline.json'), 'utf8'));

function loadYamlHttpRoute() {
  const text = readFileSync(join(workloadsRoot, '../environments/release/game-edge-route.yaml'), 'utf8');
  const script = `import json,sys,yaml; print(json.dumps(list(yaml.safe_load_all(sys.stdin.read()))[0]))`;
  const result = spawnSync('python3', ['-c', script], { input: text, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function render(profile, overlay = {}) {
  const result = helmTemplate({ profile, overlay });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return parseHelmJsonDocuments(result.stdout);
}

function expectHelmFails(profile, overlay, pattern) {
  const result = helmTemplate({ profile, overlay });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, pattern);
}

test('helm lint: release profile', () => {
  const result = spawnSync('helm', ['lint', chartPath, '-f', join(workloadsRoot, 'profiles/release.yaml')], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('helm lint: development profile with dev-1 bindings', () => {
  const overlay = deriveDevWorkloadBindings('dev-1', 3100);
  const result = spawnSync(
    'helm',
    ['lint', chartPath, '-f', join(workloadsRoot, 'profiles/development.yaml'), '-f', '-'],
    { input: `${JSON.stringify(overlay)}\n`, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('release all: structural equivalence to captured baseline (chart resources)', () => {
  const rendered = render('release', { section: 'all' });
  const renderedByKey = indexDocuments(rendered.map(normalizeReleaseDocument));
  const baselineWorkload = releaseBaseline.filter((doc) => doc.kind !== 'HTTPRoute' && doc.kind !== 'Job');
  for (const expected of baselineWorkload) {
    const key = `${expected.kind}/${expected.metadata.namespace}/${expected.metadata.name}`;
    assert.ok(renderedByKey.has(key), `missing ${key}`);
    assert.deepEqual(renderedByKey.get(key), normalizeReleaseDocument(expected));
  }
  assert.equal(rendered.length, 12);
});

test('release migration job matches migrate.yaml baseline', () => {
  const rendered = render('release', { section: 'migration' });
  assert.equal(rendered.length, 1);
  const expected = releaseBaseline.find((doc) => doc.kind === 'Job');
  assert.deepEqual(normalizeReleaseDocument(rendered[0]), normalizeReleaseDocument(expected));
});

test('moved HTTPRoute matches release baseline object', () => {
  const route = loadYamlHttpRoute();
  const expected = releaseBaseline.find((doc) => doc.kind === 'HTTPRoute');
  assert.deepEqual(route, expected);
});

test('dev-1 and dev-2 graphs match baselines except selected deltas', () => {
  for (const [slot, baseline, port] of [
    ['dev-1', dev1Baseline, 3100],
    ['dev-2', dev2Baseline, 3200],
  ]) {
    const rendered = render('development', { section: 'all', ...deriveDevWorkloadBindings(slot, port) });
    assert.equal(rendered.length, 10);
    const renderedByKey = indexDocuments(rendered.map(normalizeDevDocument));
    for (const expected of baseline) {
      const key = `${expected.kind}/${expected.metadata.namespace}/${expected.metadata.name}`;
      assert.ok(renderedByKey.has(key), `${slot} missing ${key}`);
      assert.deepEqual(renderedByKey.get(key), normalizeDevDocument(expected), key);
    }
  }
});

test('dev refuses release sections', () => {
  expectHelmFails('development', { section: 'migration', ...deriveDevWorkloadBindings('dev-1', 3100) }, /release section/);
});

test('negative: defaults without profile mode refuse', () => {
  const result = spawnSync('helm', ['template', 'offscreen-app', chartPath], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing property 'mode'|profile must set mode/);
});

test('negative: development without bindings refuses', () => {
  expectHelmFails('development', { section: 'all' }, /missing property 'bindings'|development bindings are required/);
});

test('negative: foreign slot namespace refuses', () => {
  const overlay = deriveDevWorkloadBindings('dev-1', 3100);
  overlay.bindings.namespace = 'offscreen-dev-2';
  expectHelmFails('development', overlay, /bindings\.namespace must derive/);
});

test('negative: missing secret name refuses', () => {
  const overlay = deriveDevWorkloadBindings('dev-1', 3100);
  overlay.bindings.dbSecret = '';
  expectHelmFails('development', overlay, /missing bindings\.dbSecret|minLength/);
});

test('negative: unsupported section refuses', () => {
  expectHelmFails('release', { section: 'not-a-section' }, /unsupported section|value must be one of/);
});

test('negative: release profile with bindings refuses', () => {
  expectHelmFails('release', { section: 'all', bindings: { slotId: 'dev-1' } }, /does not accept bindings|maxProperties/);
});

test('parsed documents use unique kind/namespace/name keys', () => {
  const docs = render('release', { section: 'all' });
  const keys = docs.map(documentKey);
  assert.equal(new Set(keys).size, keys.length);
});

test('nondefault replicas and imagePullPolicy change rendered deployment fields', () => {
  const rendered = render('release', { section: 'edge', replicas: 2, imagePullPolicy: 'IfNotPresent' });
  const web = rendered.find((doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-web');
  assert.ok(web);
  assert.equal(web.spec.replicas, 2);
  assert.equal(web.spec.template.spec.containers[0].imagePullPolicy, 'IfNotPresent');
});

test('negative: schema rejects invalid replicas', () => {
  const result = helmTemplate({ profile: 'release', overlay: { section: 'edge', replicas: 0 } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /replicas|minimum|schema/i);
});

test('replicasByRole: release executor 3 and api 2 change only those deployments', () => {
  const rendered = render('release', {
    section: 'all',
    replicasByRole: { executor: 3, api: 2 },
  });
  const deployments = rendered.filter((doc) => doc.kind === 'Deployment');
  for (const doc of deployments) {
    const name = doc.metadata.name;
    const expected = name === 'game-executor' ? 3 : name === 'game-api' ? 2 : 1;
    assert.equal(doc.spec.replicas, expected, name);
  }
});

test('experiments/release-replicas.yaml: api/authority 2, executor 3, other roles default 1', () => {
  const examplePath = join(workloadsRoot, 'profiles/experiments/release-replicas.yaml');
  const docs = renderWorkloadDocuments({
    profile: 'release',
    section: 'all',
    valuesPath: examplePath,
  });
  const expectedByDeployment = {
    'game-api': 2,
    'game-authority': 2,
    'game-executor': 3,
    'game-web': 1,
    'game-control': 1,
    'game-relay': 1,
  };
  const deployments = docs.filter((doc) => doc.kind === 'Deployment');
  assert.equal(deployments.length, 6);
  for (const doc of deployments) {
    const name = doc.metadata.name;
    assert.ok(name in expectedByDeployment, `unexpected deployment ${name}`);
    assert.equal(doc.spec.replicas, expectedByDeployment[name], name);
  }
});

test('negative: replicasByRole rejects unknown role key', () => {
  const result = helmTemplate({
    profile: 'release',
    overlay: { section: 'edge', replicasByRole: { worker: 2 } },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /replicasByRole|additionalProperties|schema/i);
});

test('negative: replicasByRole rejects zero count', () => {
  const result = helmTemplate({
    profile: 'release',
    overlay: { section: 'edge', replicasByRole: { api: 0 } },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /replicasByRole|minimum|schema/i);
});

test('negative: development refuses multi-replica global or per-role', () => {
  expectHelmFails(
    'development',
    { section: 'all', replicas: 2, ...deriveDevWorkloadBindings('dev-1', 3100) },
    /development requires replicas=1/,
  );
  expectHelmFails(
    'development',
    {
      section: 'all',
      replicasByRole: { api: 2 },
      ...deriveDevWorkloadBindings('dev-1', 3100),
    },
    /development requires one replica per role/,
  );
});

const SIX_ROLES = ['game-web', 'game-api', 'game-authority', 'game-control', 'game-executor', 'game-relay'];

function deploymentContainer(doc) {
  assert.equal(doc.kind, 'Deployment');
  return doc.spec.template.spec.containers[0];
}

function secretEnvNames(doc) {
  const container = deploymentContainer(doc);
  return (container.env ?? [])
    .filter((item) => item.valueFrom?.secretKeyRef)
    .map((item) => `${item.valueFrom.secretKeyRef.name}/${item.valueFrom.secretKeyRef.key}`)
    .sort();
}

test('trimmed profiles: six roles, migration, identities unchanged', () => {
  const releaseAll = render('release', { section: 'all' });
  const releaseDeployments = releaseAll.filter((doc) => doc.kind === 'Deployment');
  assert.deepEqual(releaseDeployments.map((doc) => doc.metadata.name).sort(), [...SIX_ROLES].sort());

  const migrateOnly = render('release', { section: 'migration' });
  assert.equal(migrateOnly.length, 1);
  assert.equal(migrateOnly[0].kind, 'Job');
  assert.equal(migrateOnly[0].metadata.name, 'game-migrate');
  assert.equal(migrateOnly[0].metadata.namespace, 'lab-edge');

  const releaseNamespaces = new Set(
    releaseAll.filter((doc) => doc.metadata?.namespace).map((doc) => doc.metadata.namespace),
  );
  assert.deepEqual([...releaseNamespaces].sort(), ['lab-authority', 'lab-edge', 'lab-workers']);

  const web = releaseAll.find((doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-web');
  const api = releaseAll.find((doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-api');
  assert.equal(deploymentContainer(web).image, 'offscreen-lab-game-web:turn02');
  assert.equal(deploymentContainer(api).image, 'offscreen-lab-app-release-api:turn02');
  assert.equal(deploymentContainer(web).ports[0].containerPort, 3000);
  assert.equal(deploymentContainer(api).ports[0].containerPort, 3001);
  assert.equal(web.spec.template.spec.securityContext.runAsUser, 1001);
  assert.equal(api.spec.template.spec.securityContext.runAsUser, 1000);
  assert.deepEqual(secretEnvNames(api), ['game-db/uri', 'game-runtime/better-auth-secret', 'game-runtime/game-authority-service-token', 'game-runtime/github-client-id', 'game-runtime/github-client-secret', 'game-s3/access-key-id', 'game-s3/secret-access-key']);

  const devOverlay = deriveDevWorkloadBindings('dev-1', 3100);
  const devAll = render('development', { section: 'all', ...devOverlay });
  const devDeployments = devAll.filter((doc) => doc.kind === 'Deployment');
  assert.deepEqual(devDeployments.map((doc) => doc.metadata.name).sort(), [...SIX_ROLES].sort());
  assert.ok(devAll.every((doc) => !doc.metadata?.namespace || doc.metadata.namespace === 'offscreen-dev-1'));
  assert.ok(
    devDeployments.every(
      (doc) => doc.metadata.labels['offscreen.dev/slot'] === 'dev-1' && doc.spec.template.metadata.labels['offscreen.dev/slot'] === 'dev-1',
    ),
  );

  const devApi = devAll.find((doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-api');
  assert.equal(deploymentContainer(devApi).image, 'offscreen-dev-workspace:dev-1-api');
  assert.deepEqual(secretEnvNames(devApi), ['dev-1-app/better-auth-secret', 'dev-1-app/game-authority-service-token', 'dev-1-app/github-client-id', 'dev-1-app/github-client-secret', 'dev-1-run-auth/uri', 'dev-1-s3/access-key-id', 'dev-1-s3/secret-access-key']);
});

function deploymentEnv(doc) {
  return deploymentContainer(doc).env ?? [];
}

function envLiteral(doc, name) {
  return deploymentEnv(doc).find((item) => item.name === name);
}

test('objectStorage helper: web has no S3 credentials', () => {
  const releaseAll = render('release', { section: 'all' });
  const web = releaseAll.find((doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-web');
  const envText = JSON.stringify(deploymentEnv(web));
  assert.doesNotMatch(envText, /OFFSCREEN_DOCUMENT_S3_/);
  assert.doesNotMatch(envText, /secretKeyRef/);

  const devAll = render('development', { section: 'all', ...deriveDevWorkloadBindings('dev-1', 3100) });
  const devWeb = devAll.find((doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-web');
  const devEnvText = JSON.stringify(deploymentEnv(devWeb));
  assert.doesNotMatch(devEnvText, /OFFSCREEN_DOCUMENT_S3_/);
  assert.doesNotMatch(devEnvText, /secretKeyRef/);
});

test('objectStorage helper: api exposes region and path-style secret binding', () => {
  const api = render('release', { section: 'edge' }).find(
    (doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-api',
  );
  assert.equal(envLiteral(api, 'OFFSCREEN_DOCUMENT_S3_REGION')?.value, 'us-east-1');
  assert.equal(envLiteral(api, 'OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE')?.value, 'true');
  assert.equal(
    envLiteral(api, 'OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID')?.valueFrom?.secretKeyRef?.name,
    'game-s3',
  );
});

test('external objectStorage overlay renders https endpoint without access-key env', () => {
  const overlay = deriveDevWorkloadBindings('dev-1', 3100);
  overlay.bindings.objectStorage = validateObjectStorageBinding({
    bucket: 'external-bucket',
    region: 'eu-west-1',
    endpoint: 'https://s3.example.com',
    forcePathStyle: false,
    credentials: { mode: 'default-chain' },
  });
  const rendered = render('development', { section: 'all', ...overlay });
  const api = rendered.find((doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-api');
  assert.equal(envLiteral(api, 'OFFSCREEN_DOCUMENT_S3_ENDPOINT')?.value, 'https://s3.example.com');
  assert.equal(envLiteral(api, 'OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE')?.value, 'false');
  const names = deploymentEnv(api).map((item) => item.name);
  assert.ok(!names.includes('OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID'));
  assert.ok(!names.includes('OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY'));
});