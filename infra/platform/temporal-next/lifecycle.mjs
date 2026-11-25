import { randomUUID } from 'node:crypto';
import { compactResources } from './deployment.mjs';
import { kubernetes } from './kubernetes.mjs';
import { classifySchema, inspectionJob } from './schema.mjs';

// Inspection Jobs are explicit operational probes, not read-only Kubernetes status.
async function inspectStore(config, kube, store) {
  const name = 'temporal-inspect-' + randomUUID().slice(0, 12);
  kube.command(['create', '-f', '-'], { input: JSON.stringify(inspectionJob(config, store, name)) });
  kube.command(['wait', '--for=condition=complete', 'job/' + name, '--timeout=190s'], { timeoutMs: 200_000 });
  const output = kube.command(['logs', 'job/' + name]).trim();
  return classifySchema(output, store.version);
}

export async function inspectPersistence(config, kube) {
  return {
    execution: await inspectStore(config, kube, config.execution),
    visibility: await inspectStore(config, kube, config.visibility),
  };
}

export function status(config, kube = kubernetes(config)) {
  kube.assertTarget();
  kube.requireNamespace();
  const deployment = kube.read('Deployment', 'temporal-server');
  if (!deployment) return { deployed: false, ready: false };
  kube.requireOwned(deployment, 'temporal-server');
  const ready = deployment.status?.observedGeneration === deployment.metadata.generation &&
    deployment.status?.readyReplicas === 1 && deployment.status?.updatedReplicas === 1;
  return { deployed: true, ready };
}

export async function ensureTemporal(config, kube = kubernetes(config)) {
  kube.assertTarget();
  kube.requireNamespace();
  const resources = compactResources(config);
  // Preflight every identity before issuing any writes.
  for (const resource of resources) {
    const existing = kube.read(resource.kind, resource.metadata.name);
    if (existing) kube.requireOwned(existing, resource.metadata.name);
  }
  const persistence = await inspectPersistence(config, kube);
  if (Object.values(persistence).some((state) => state !== 'compatible')) {
    throw new Error('both Temporal schemas must be compatible: ' + JSON.stringify(persistence));
  }
  for (const resource of resources) kube.apply(resource);
  kube.command(['rollout', 'status', 'deployment/temporal-server', '--timeout=300s'], { timeoutMs: 310_000 });
  const observed = status(config, kube);
  if (!observed.ready) throw new Error('Temporal deployment not ready');
  return { ...observed, persistence };
}
