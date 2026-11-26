import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BROKER_IMAGE_PIN,
  CERT_MANAGER_RESOURCE_COUNT,
  CERT_MANAGER_SHA256,
  CLUSTER_OPERATOR_RESOURCE_COUNT,
  CLUSTER_OPERATOR_SHA256,
  DEPLOYMENT_IMAGE_PINS,
  NATIVE_DESIGN_LABEL,
  NATIVE_DESIGN_VALUE,
  bundleDocumentIdentity,
  certManagerVendorPath,
  clusterOperatorVendorPath,
  loadVendorBundle,
  parseVendorBundle,
  vendorFileSha256Hex,
} from '../vendor-bundles.mjs';

test('vendor bytes on disk match locked sha256 digests', () => {
  assert.equal(
    vendorFileSha256Hex(certManagerVendorPath()),
    CERT_MANAGER_SHA256,
  );
  assert.equal(
    vendorFileSha256Hex(clusterOperatorVendorPath()),
    CLUSTER_OPERATOR_SHA256,
  );
});

test('cert-manager inventory count and image pins', () => {
  const { objects, identities } = loadVendorBundle('cert-manager');
  assert.equal(identities.length, CERT_MANAGER_RESOURCE_COUNT);
  const deployments = objects.filter((object) => object.kind === 'Deployment');
  assert.equal(deployments.length, 3);
  const images = deployments.map(
    (deployment) => deployment.spec.template.spec.containers[0].image,
  );
  assert.deepEqual(
    images.sort(),
    [
      DEPLOYMENT_IMAGE_PINS['quay.io/jetstack/cert-manager-cainjector:v1.21.3'],
      DEPLOYMENT_IMAGE_PINS['quay.io/jetstack/cert-manager-controller:v1.21.3'],
      DEPLOYMENT_IMAGE_PINS['quay.io/jetstack/cert-manager-webhook:v1.21.3'],
    ].sort(),
  );
  const namespace = objects.find(
    (object) =>
      object.kind === 'Namespace' && object.metadata.name === 'cert-manager',
  );
  assert.equal(
    namespace?.metadata?.labels?.[NATIVE_DESIGN_LABEL],
    NATIVE_DESIGN_VALUE,
  );
});

test('cluster-operator inventory count and image pin', () => {
  const { objects, identities } = loadVendorBundle('cluster-operator');
  assert.equal(identities.length, CLUSTER_OPERATOR_RESOURCE_COUNT);
  const deployment = objects.find((object) => object.kind === 'Deployment');
  assert.equal(
    deployment?.spec?.template?.spec?.containers?.[0]?.image,
    DEPLOYMENT_IMAGE_PINS['ghcr.io/rabbitmq/cluster-operator:2.23.3'],
  );
  const namespace = objects.find(
    (object) =>
      object.kind === 'Namespace' && object.metadata.name === 'rabbitmq-system',
  );
  assert.equal(
    namespace?.metadata?.labels?.[NATIVE_DESIGN_LABEL],
    NATIVE_DESIGN_VALUE,
  );
});

test('all four controller images transform from pinned tags', () => {
  const cert = loadVendorBundle('cert-manager');
  const operator = loadVendorBundle('cluster-operator');
  const images = [...cert.objects, ...operator.objects]
    .filter((object) => object.kind === 'Deployment')
    .map((object) => object.spec.template.spec.containers[0].image);
  assert.equal(images.length, 4);
  for (const image of images) {
    assert.ok(image.includes('@sha256:'), `expected digest suffix on ${image}`);
    assert.equal(Object.values(DEPLOYMENT_IMAGE_PINS).includes(image), true);
  }
});

test('malformed vendor document is refused', () => {
  const parts = readFileSync(certManagerVendorPath(), 'utf8').split(/^---$/m);
  parts[12] = '\napiVersion: v1\nkind: [\nmetadata:\n  name: broken\n';
  const text = parts.join('---');
  assert.throws(
    () =>
      parseVendorBundle(text, {
        bundle: 'cert-manager',
        enforceCanonicalIdentities: false,
      }),
    /malformed cert-manager document/,
  );
});

test('duplicate vendor identity is refused', () => {
  const text = readFileSync(certManagerVendorPath(), 'utf8');
  assert.throws(
    () =>
      parseVendorBundle(
        `${text}\n---\napiVersion: v1\nkind: Namespace\nmetadata:\n  name: cert-manager\n`,
        {
          bundle: 'cert-manager',
          enforceCanonicalIdentities: false,
        },
      ),
    /inventory count mismatch|duplicate platform identity/,
  );
});

test('unexpected extra vendor identity is refused', () => {
  const text = readFileSync(certManagerVendorPath(), 'utf8');
  assert.throws(
    () =>
      parseVendorBundle(
        `${text}\n---\napiVersion: v1\nkind: Namespace\nmetadata:\n  name: extra-rabbitmq-ns\n`,
        {
          bundle: 'cert-manager',
          enforceCanonicalIdentities: false,
        },
      ),
    /inventory count mismatch/,
  );
});

test('wrong deployment image name is refused', () => {
  const text = readFileSync(clusterOperatorVendorPath(), 'utf8').replace(
    'ghcr.io/rabbitmq/cluster-operator:2.23.3',
    'ghcr.io/rabbitmq/cluster-operator:9.9.9',
  );
  assert.throws(
    () =>
      parseVendorBundle(text, {
        bundle: 'cluster-operator',
        enforceCanonicalIdentities: false,
      }),
    /unexpected deployment image/,
  );
});

test('wrong deployment image count is refused', () => {
  const text = readFileSync(clusterOperatorVendorPath(), 'utf8').replace(
    /kind: Deployment\n/,
    'kind: ConfigMap\n',
  );
  assert.throws(
    () =>
      parseVendorBundle(text, {
        bundle: 'cluster-operator',
        enforceCanonicalIdentities: false,
      }),
    /unexpected deployment image count/,
  );
});

test('canonical identities are stable parser-derived keys', () => {
  const { identities } = loadVendorBundle('cert-manager');
  assert.equal(
    identities[0],
    bundleDocumentIdentity({
      kind: 'Namespace',
      metadata: { name: 'cert-manager' },
    }),
  );
});

test('broker chart image pin constant matches R4', () => {
  assert.match(
    BROKER_IMAGE_PIN,
    /^docker\.io\/library\/rabbitmq:4\.3\.4-management@sha256:/,
  );
});


import { discoverApiVersion, rabbitmqTargetFromProfile } from '../inventory.mjs';

test('discovery recognizes actual kubectl NotFound without treating process exit as HTTP status', () => {
  const target = rabbitmqTargetFromProfile('dev');
  const probe = (result) => discoverApiVersion(target, 'rabbitmq.com', 'v1beta1', (command, args) => {
    assert.equal(command, 'kubectl');
    assert.deepEqual(args, ['--context', target.contextName, '--request-timeout=10s', 'get', '--raw', '/apis/rabbitmq.com/v1beta1']);
    return { ok: false, status: 1, stdout: '', stderr: '', ...result };
  });
  const stderr = 'Error from server (NotFound): the server could not find the requested resource\n';
  assert.deepEqual(probe({ stderr }), { state: 'absent' });
  assert.deepEqual(probe({ stderr, timedOut: true }), { state: 'unknown', reason: 'discovery-timeout' });
  assert.deepEqual(probe({ stderr: 'Error from server (Forbidden): denied' }), { state: 'unknown', reason: 'discovery-denied' });
  assert.deepEqual(probe({ stderr: 'Error from server (Unauthorized): denied' }), { state: 'unknown', reason: 'discovery-denied' });
  for (const failure of ['connection refused', 'HTTP 404', 'unexpected NotFound', 'Error from server (InternalError): failed']) {
    assert.deepEqual(probe({ stderr: failure }), { state: 'unknown', reason: 'discovery-failed' });
  }
  assert.deepEqual(probe({ status: 404 }), { state: 'unknown', reason: 'discovery-failed' });
  assert.deepEqual(probe({ ok: true, status: 0, stdout: JSON.stringify({ kind: 'APIResourceList', groupVersion: 'rabbitmq.com/v1beta1', resources: [{ name: 'rabbitmqclusters' }] }) }), { state: 'present', resources: [{ name: 'rabbitmqclusters' }] });
});
