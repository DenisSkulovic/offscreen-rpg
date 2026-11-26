import { createHash, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { parseAllDocuments } from 'yaml';
import { parseCnpgPin } from '../config.mjs';
import { firstMismatch } from './compatibility.mjs';

const root = new URL('../', import.meta.url);
const scopes = Object.freeze({
  'v1/Namespace': ['namespace', false],
  'v1/ServiceAccount': ['serviceaccount', true],
  'v1/ConfigMap': ['configmap', true],
  'v1/Service': ['service', true],
  'apps/v1/Deployment': ['deployment.apps', true],
  'apiextensions.k8s.io/v1/CustomResourceDefinition': ['customresourcedefinition.apiextensions.k8s.io', false],
  'rbac.authorization.k8s.io/v1/ClusterRole': ['clusterrole.rbac.authorization.k8s.io', false],
  'rbac.authorization.k8s.io/v1/ClusterRoleBinding': ['clusterrolebinding.rbac.authorization.k8s.io', false],
  'admissionregistration.k8s.io/v1/MutatingWebhookConfiguration': ['mutatingwebhookconfiguration.admissionregistration.k8s.io', false],
  'admissionregistration.k8s.io/v1/ValidatingWebhookConfiguration': ['validatingwebhookconfiguration.admissionregistration.k8s.io', false],
});

export function operatorIdentity(object) {
  return [object.apiVersion, object.kind, object.metadata?.namespace ?? '', object.metadata?.name].join('/');
}

export function loadOperatorArtifact({ path, bytes } = {}) {
  const pin = parseCnpgPin(readFileSync(new URL('operator.pin', root), 'utf8'));
  if (pin.version !== '1.30.2' || pin.sha256 !== 'ea4cc355b394e10661d30c6b409cefb19029dd973bccb76b1ed8c789985bc68c')
    throw new Error('Unsupported operator policy pin');
  const body = bytes ?? readFileSync(path ?? new URL('vendor/cnpg-1.30.2.yaml', root));
  if (createHash('sha256').update(body).digest('hex') !== pin.sha256)
    throw new Error('Operator artifact checksum mismatch');
  const seen = new Set();
  const inventory = parseAllDocuments(body.toString('utf8')).map(doc => {
    if (doc.errors.length || doc.warnings.length) throw new Error('Invalid operator YAML');
    const object = doc.toJS({ maxAliasCount: 0 });
    const scope = scopes[object?.apiVersion + '/' + object?.kind];
    const name = object?.metadata?.name;
    const namespace = object?.metadata?.namespace;
    if (!scope || typeof name !== 'string' || !/^[a-z0-9][a-z0-9.-]*$/.test(name) ||
      (scope[1] ? namespace !== 'cnpg-system' : namespace !== undefined))
      throw new Error('Unexpected operator object identity');
    const id = operatorIdentity(object);
    if (seen.has(id)) throw new Error('Duplicate operator identity');
    seen.add(id);
    return { id, resource: scope[0], name, namespace, object };
  });
  const deployment = inventory.find(entry => entry.object.kind === 'Deployment');
  if (inventory.length !== 26 || deployment?.object.spec?.template?.spec?.containers?.[0]?.image !== pin.operatorImage)
    throw new Error('Unexpected pinned operator inventory');
  return { pin, body, inventory };
}

function addDefaults(target, defaults) {
  for (const [key, value] of Object.entries(defaults)) {
    if (Object.hasOwn(target, key)) throw new Error('Operator default conflicts with vendor field: ' + key);
    target[key] = value;
  }
}

/** Fixed additions measured from the clean pinned Kubernetes 1.37 specimen. */
export function expectedOperatorObject(vendor) {
  const expected = structuredClone(vendor);
  switch (expected.kind) {
    case 'CustomResourceDefinition':
      addDefaults(expected.spec, { conversion: { strategy: 'None' } });
      break;
    case 'Namespace':
      expected.metadata.labels ??= {};
      addDefaults(expected.metadata.labels, { 'kubernetes.io/metadata.name': 'cnpg-system' });
      addDefaults(expected, { spec: { finalizers: ['kubernetes'] } });
      break;
    case 'Deployment': {
      addDefaults(expected.spec, {
        progressDeadlineSeconds: 600,
        revisionHistoryLimit: 10,
        strategy: { rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' }, type: 'RollingUpdate' },
      });
      const pod = expected.spec.template.spec;
      const container = pod.containers[0];
      addDefaults(container.env[1].valueFrom.fieldRef, { apiVersion: 'v1' });
      for (const probe of [container.livenessProbe, container.readinessProbe])
        addDefaults(probe, { failureThreshold: 3, periodSeconds: 10, successThreshold: 1, timeoutSeconds: 1 });
      addDefaults(container.startupProbe, { successThreshold: 1, timeoutSeconds: 1 });
      addDefaults(container, { terminationMessagePath: '/dev/termination-log', terminationMessagePolicy: 'File' });
      addDefaults(pod, { dnsPolicy: 'ClusterFirst', restartPolicy: 'Always', schedulerName: 'default-scheduler', serviceAccount: 'cnpg-manager' });
      break;
    }
    case 'Service':
      addDefaults(expected.spec, { internalTrafficPolicy: 'Cluster', ipFamilies: ['IPv4'], ipFamilyPolicy: 'SingleStack', sessionAffinity: 'None', type: 'ClusterIP' });
      addDefaults(expected.spec.ports[0], { protocol: 'TCP' });
      break;
    case 'MutatingWebhookConfiguration':
    case 'ValidatingWebhookConfiguration':
      for (const webhook of expected.webhooks) {
        addDefaults(webhook.clientConfig.service, { port: 443 });
        addDefaults(webhook, { matchPolicy: 'Equivalent', namespaceSelector: {}, objectSelector: {}, timeoutSeconds: 10 });
        addDefaults(webhook.rules[0], { scope: '*' });
        if (expected.kind === 'MutatingWebhookConfiguration') addDefaults(webhook, { reinvocationPolicy: 'Never' });
      }
      break;
  }
  return expected;
}

function validBundle(bundle, now) {
  if (typeof bundle !== 'string' || bundle.length > 32768) return false;
  try {
    const decoded = Buffer.from(bundle, 'base64');
    if (decoded.toString('base64') !== bundle) return false;
    const pem = decoded.toString('utf8').trim();
    if (!/^-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----$/.test(pem)) return false;
    const cert = new X509Certificate(pem);
    const host = 'cnpg-webhook-service.cnpg-system.svc';
    return !cert.ca && cert.subjectAltName === 'DNS:' + host &&
      cert.checkHost(host, { subject: 'never', wildcards: false }) === host &&
      Date.parse(cert.validFrom) <= now && now < Date.parse(cert.validTo);
  } catch { return false; }
}

export function assessOperatorObject(vendor, live, { now = Date.now() } = {}) {
  if (!live?.metadata?.uid || live.metadata.deletionTimestamp || operatorIdentity(live) !== operatorIdentity(vendor))
    return { ok: false, path: '/metadata' };
  const expected = expectedOperatorObject(vendor);
  const actual = structuredClone(live);
  delete actual.status;
  for (const key of ['uid', 'resourceVersion', 'creationTimestamp', 'generation', 'managedFields']) delete actual.metadata[key];
  let pending = false;
  const bundles = [];
  if (actual.kind === 'Deployment') {
    const revision = actual.metadata.annotations?.['deployment.kubernetes.io/revision'];
    if (revision === undefined) pending = true;
    else if (typeof revision !== 'string' || !/^[1-9][0-9]*$/.test(revision))
      return { ok: false, path: '/metadata/annotations/deployment.kubernetes.io~1revision' };
    if (actual.metadata.annotations) delete actual.metadata.annotations['deployment.kubernetes.io/revision'];
    if (actual.metadata.annotations && Object.keys(actual.metadata.annotations).length === 0 && !expected.metadata.annotations)
      delete actual.metadata.annotations;
  }
  if (actual.kind === 'Service') {
    const ip = actual.spec?.clusterIP;
    if (isIP(ip ?? '') !== 4 || ip === '0.0.0.0' || Number(ip.split('.')[0]) >= 224 ||
      actual.spec.clusterIPs?.length !== 1 || actual.spec.clusterIPs[0] !== ip)
      return { ok: false, path: '/spec/clusterIP' };
    delete actual.spec.clusterIP;
    delete actual.spec.clusterIPs;
  }
  if (actual.kind.endsWith('WebhookConfiguration')) {
    if (!Array.isArray(actual.webhooks)) return { ok: false, path: '/webhooks' };
    for (const [index, webhook] of actual.webhooks.entries()) {
      const bundle = webhook.clientConfig?.caBundle;
      if (bundle === undefined || bundle === '') pending = true;
      else if (!validBundle(bundle, now)) return { ok: false, path: '/webhooks/' + index + '/clientConfig/caBundle' };
      else bundles.push(bundle);
      if (webhook.clientConfig) delete webhook.clientConfig.caBundle;
    }
  }
  const mismatch = firstMismatch(expected, actual);
  return mismatch === null ? { ok: true, pending, bundles } : { ok: false, path: mismatch };
}

export function assessOperatorInventory(inventory, observations, options = {}) {
  const entries = inventory.map(entry => ({ ...entry, observation: observations.get(entry.id) }));
  if (entries.some(e => !e.observation || !['present', 'absent'].includes(e.observation.state)))
    return { state: 'unknown' };
  const present = entries.filter(e => e.observation.state === 'present');
  if (!present.length) return { state: 'absent' };
  const bundles = new Set();
  let pending = false;
  for (const entry of present) {
    const assessed = assessOperatorObject(entry.object, entry.observation.object, options);
    if (!assessed.ok) return { state: 'incompatible', id: entry.id, path: assessed.path };
    pending ||= assessed.pending;
    for (const bundle of assessed.bundles) bundles.add(bundle);
  }
  if (present.length !== entries.length) return { state: 'partial' };
  return { state: pending || bundles.size !== 1 ? 'pending' : 'compatible' };
}
