import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  assertPlatformRenderRequest,
  documentIdentity,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../../common/render.mjs';

const observabilityRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const chartRoot = join(observabilityRoot, 'chart');
const collectorConfig = readFileSync(
  join(chartRoot, 'files/collector-config.yaml'),
  'utf8',
).trimEnd();

const COLLECTOR_IMAGE =
  'docker.io/otel/opentelemetry-collector:0.165.0@sha256:34b24b740c3c88d3467740e8642a397c13898ef76d7295c5425164c482ed1b73';

function helmRun(command, args, options) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  return runPlatformCommand(command, args, options);
}

function docMap(docs) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const doc of docs) {
    map.set(documentIdentity(doc), doc);
  }
  return map;
}

test('lintPlatformChart succeeds for observability release', () => {
  lintPlatformChart(
    { service: 'observability', profile: 'release' },
    { chartRoot, run: helmRun },
  );
});

test('assertPlatformRenderRequest refuses observability on dev profile', () => {
  assert.throws(
    () => assertPlatformRenderRequest('observability', 'dev', 'all'),
    /release-only/,
  );
});

test('release render matches disposable lab collector meaningful fields', () => {
  const docs = renderPlatformDocuments(
    { service: 'observability', profile: 'release', section: 'all' },
    { chartRoot, run: helmRun },
  );
  assert.equal(docs.length, 3);
  const byId = docMap(docs);

  const config = byId.get('ConfigMap/lab-a/otel-collector-config');
  assert.ok(config);
  assert.equal(String(config.data['config.yaml']).trim(), collectorConfig);

  const deployment = byId.get('Deployment/lab-a/otel-collector');
  assert.ok(deployment);
  const container = deployment.spec.template.spec.containers[0];
  assert.equal(container.image, COLLECTOR_IMAGE);
  assert.deepEqual(container.args, ['--config=/etc/otelcol/config.yaml']);
  assert.deepEqual(container.resources, {
    requests: { cpu: '20m', memory: '64Mi' },
    limits: { cpu: '200m', memory: '192Mi' },
  });
  assert.equal(container.ports[0].containerPort, 4318);
  assert.equal(container.ports[1].containerPort, 13133);
  const security = container.securityContext;
  assert.equal(security.runAsUser, 10001);
  assert.equal(security.readOnlyRootFilesystem, true);
  assert.equal(
    deployment.spec.template.spec.volumes[0].configMap.name,
    'otel-collector-config',
  );

  const service = byId.get('Service/lab-a/otel-collector');
  assert.ok(service);
  assert.equal(service.spec.type, 'ClusterIP');
  assert.equal(service.spec.ports[0].port, 4318);
  assert.equal(service.spec.ports[0].targetPort, 'otlp-http');

  for (const doc of docs) {
    const blob = JSON.stringify(doc);
    assert.doesNotMatch(blob, /hop-a/);
    assert.doesNotMatch(blob, /hop-b/);
    assert.doesNotMatch(blob, /synthetic-hop/);
  }
});