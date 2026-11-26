import { assertPlatformTarget, readPlatformObject, runPlatformCommand } from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { baselineCnpgClusterName } from '../config.mjs';
import { assessCnpgClusterTopologyReadiness } from '../cluster-readiness.mjs';
import { assessClusterSpec } from './compatibility.mjs';
import { assessOperatorInventory } from './operator.mjs';

const clusterApi = 'postgresql.cnpg.io/v1';
const condition = (object, type) => object?.status?.conditions?.some(c => c.type === type && c.status === 'True') === true;
const validIdentity = (object, apiVersion, kind, name, namespace) =>
  object?.apiVersion === apiVersion && object.kind === kind &&
  object.metadata?.name === name && object.metadata?.namespace === namespace &&
  typeof object.metadata.uid === 'string' && object.metadata.uid.length > 0 &&
  !object.metadata.deletionTimestamp;

export function readBaselineObject(profileId, resource, name, namespace, run) {
  return readPlatformObject({ profileId, resource, name, namespace }, { run });
}

function listObjects(profile, resource, args, run) {
  const result = run('kubectl', ['--context', profile.contextName, 'get', resource, ...args, '-o', 'json']);
  if (!result.ok) return null;
  try {
    const body = JSON.parse(result.stdout);
    return Array.isArray(body.items) ? body.items : null;
  } catch { return null; }
}

export function readyEndpoint(profile, namespace, service, pod, run) {
  const slices = listObjects(profile, 'endpointslices.discovery.k8s.io',
    ['-n', namespace, '-l', 'kubernetes.io/service-name=' + service], run);
  if (!slices || slices.some(slice => !Array.isArray(slice.endpoints))) return false;
  const ready = slices.flatMap(slice => slice.endpoints ?? []).filter(endpoint =>
    endpoint.conditions?.ready === true && endpoint.conditions?.serving === true &&
    endpoint.conditions?.terminating === false);
  return ready.length > 0 && ready.every(endpoint =>
    endpoint.targetRef?.kind === 'Pod' && endpoint.targetRef?.name === pod.metadata.name &&
    endpoint.targetRef?.namespace === namespace && endpoint.targetRef?.uid === pod.metadata.uid);
}

function ownerMatches(object, owner, kind) {
  return object.metadata?.ownerReferences?.some(ref =>
    ref.controller === true && ref.kind === kind && ref.name === owner.metadata.name &&
    ref.uid === owner.metadata.uid) === true;
}

function podReady(pod) {
  return pod?.status?.phase === 'Running' && condition(pod, 'Ready') && !pod.metadata?.deletionTimestamp;
}

function operatorReady(profile, inventory, observations, run) {
  const objects = inventory.map(entry => observations.get(entry.id)?.object);
  const crds = objects.filter(object => object?.kind === 'CustomResourceDefinition');
  if (crds.length !== 11 || !crds.every(crd => condition(crd, 'Established') && condition(crd, 'NamesAccepted'))) return false;
  const namespace = objects.find(object => object?.kind === 'Namespace');
  if (namespace?.status?.phase !== 'Active') return false;
  const deployment = objects.find(object => object?.kind === 'Deployment');
  if (!deployment || deployment.status?.observedGeneration !== deployment.metadata.generation ||
    deployment.status?.updatedReplicas !== deployment.spec.replicas ||
    deployment.status?.availableReplicas !== deployment.spec.replicas || !condition(deployment, 'Available')) return false;
  const pods = listObjects(profile, 'pods', ['-n', 'cnpg-system'], run);
  const replicas = listObjects(profile, 'replicasets.apps', ['-n', 'cnpg-system'], run);
  if (!pods || !replicas) return false;
  const operatorImage = deployment.spec?.template?.spec?.containers?.[0]?.image;
  const owned = pods.filter(pod => podReady(pod) &&
    pod.spec?.containers?.length === 1 && pod.spec.containers[0].image === operatorImage &&
    pod.status?.containerStatuses?.length === 1 && pod.status.containerStatuses[0].ready === true &&
    replicas.some(replica => ownerMatches(replica, deployment, 'Deployment') && ownerMatches(pod, replica, 'ReplicaSet')));
  return owned.length === 1 && readyEndpoint(profile, 'cnpg-system', 'cnpg-webhook-service', owned[0], run);
}

function competingOperator(profile, run) {
  const crds = listObjects(profile, 'customresourcedefinitions.apiextensions.k8s.io', [], run);
  const deployments = listObjects(profile, 'deployments.apps', ['-A'], run);
  const mutating = listObjects(profile, 'mutatingwebhookconfigurations.admissionregistration.k8s.io', [], run);
  const validating = listObjects(profile, 'validatingwebhookconfigurations.admissionregistration.k8s.io', [], run);
  if (!crds || !deployments || !mutating || !validating) return 'unknown';
  const found = crds.some(crd => crd.spec?.group === 'postgresql.cnpg.io') ||
    deployments.some(deployment => deployment.spec?.template?.spec?.containers?.some(container =>
      /cloudnative-pg|cnpg-controller-manager/i.test(container.image ?? ''))) ||
    [...mutating, ...validating].some(config => config.webhooks?.some(webhook =>
      webhook.rules?.some(rule => rule.apiGroups?.includes('postgresql.cnpg.io'))));
  return found ? 'present' : 'absent';
}

/** Reject external credential execution before any API request. */
export function assertBaselineKubeconfig(profile, run) {
  const result = run('kubectl', ['--context', profile.contextName, 'config', 'view', '--minify', '-o', 'json']);
  if (!result.ok) throw new Error('Kubeconfig unavailable');
  const config = JSON.parse(result.stdout);
  if (!Array.isArray(config.users) || config.users.length !== 1 ||
    !Array.isArray(config.clusters) || config.clusters.length !== 1 ||
    !Array.isArray(config.contexts) || config.contexts.length !== 1 ||
    config.contexts[0].name !== profile.contextName ||
    config.contexts[0].context?.user !== config.users[0].name ||
    config.contexts[0].context?.cluster !== config.clusters[0].name ||
    config.users[0].user?.exec || config.users[0].user?.['auth-provider'] ||
    config.clusters[0].cluster?.['proxy-url'] ||
    config.clusters[0].cluster?.['insecure-skip-tls-verify'] === true)
    throw new Error('Unsafe PostgreSQL kubeconfig');
}

export function collectBaselineObservation(profileId, { artifact, run = runPlatformCommand } = {}) {
  const profile = readPlatformProfile(profileId);
  assertBaselineKubeconfig(profile, run);
  const target = assertPlatformTarget(profileId, { run });
  const observations = new Map();
  for (const entry of artifact.inventory) {
    const observed = readBaselineObject(profileId, entry.resource, entry.name, entry.namespace, run);
    observations.set(entry.id, observed);
  }
  let operator = assessOperatorInventory(artifact.inventory, observations);
  if (operator.state === 'absent') {
    const competing = competingOperator(profile, run);
    if (competing !== 'absent') operator = { state: competing === 'unknown' ? 'unknown' : 'incompatible' };
  } else if (operator.state === 'compatible') {
    operator = { state: operatorReady(profile, artifact.inventory, observations, run) ? 'ready' : 'pending' };
  }
  const namespaceName = profile.namespaces.postgres;
  const namespace = readBaselineObject(profileId, 'namespace', namespaceName, undefined, run);
  const crd = artifact.inventory.find(entry => entry.name === 'clusters.postgresql.cnpg.io');
  const crdObservation = observations.get(crd.id);
  const cluster = crdObservation?.state === 'present' && condition(crdObservation.object, 'Established')
    ? readBaselineObject(profileId, 'cluster.postgresql.cnpg.io', baselineCnpgClusterName(profileId), namespaceName, run)
    : operator.state === 'absent' ? { state: 'absent', unavailableByCrd: true } : { state: 'unreadable', unavailableByCrd: crdObservation?.state === 'present' };
  return { profile, target, operator, observations, namespace, cluster };
}

export function assessBaselineObservation(observation) {
  const { profile, operator, namespace, cluster } = observation;
  const refusals = [];
  const refuse = (id, detail) => refusals.push({ id, detail });
  if (!['absent', 'pending', 'ready'].includes(operator.state))
    refuse('operator-' + operator.state, operator.path ?? operator.id ?? 'operator inventory not compatible');
  let namespaceState = namespace.state;
  if (namespace.state === 'present') {
    const object = namespace.object;
    const label = profile.ownerLabel + (profile.id === 'dev' ? '/owner' : '/lab');
    namespaceState = validIdentity(object, 'v1', 'Namespace', profile.namespaces.postgres, undefined) &&
      object.metadata.labels?.[label] === profile.ownerValue && object.status?.phase === 'Active'
      ? 'compatible' : 'incompatible';
  }
  if (!['absent', 'compatible'].includes(namespaceState)) refuse('namespace-' + namespaceState, 'namespace identity or ownership not verified');
  let clusterState = cluster.state;
  let observedInstances;
  if (cluster.state === 'present') {
    const object = cluster.object;
    const valid = validIdentity(object, clusterApi, 'Cluster', baselineCnpgClusterName(profile.id), profile.namespaces.postgres) &&
      (profile.id !== 'dev' || object.metadata.labels?.['offscreen.dev/owner'] === profile.ownerValue);
    const spec = valid ? assessClusterSpec(profile.id, object.spec) : { ok: false, path: '/metadata' };
    if (!spec.ok) {
      clusterState = 'incompatible';
      refuse('cluster-spec-mismatch', spec.path);
    } else {
      observedInstances = spec.instances;
      clusterState = assessCnpgClusterTopologyReadiness(object, spec.instances).ok ? 'ready' : 'pending';
    }
    if (namespaceState !== 'compatible') refuse('cluster-namespace-conflict', 'existing Cluster requires compatible namespace');
  }
  if (clusterState === 'unreadable' && !(operator.state === 'pending' && cluster.unavailableByCrd === true)) refuse('cluster-unreadable', 'Cluster observation unavailable');
  return { operator: operator.state, namespace: namespaceState, cluster: clusterState, observedInstances, refusals };
}

export function observeWritablePrimary(profileId, { run = runPlatformCommand } = {}) {
  const profile = readPlatformProfile(profileId);
  const ns = profile.namespaces.postgres;
  const name = baselineCnpgClusterName(profileId);
  const read = (resource, objectName, namespace) => readBaselineObject(profileId, resource, objectName, namespace, run).object;
  const fail = detail => ({ ok: false, detail });
  const namespace = read('namespace', ns, undefined);
  const cluster = read('cluster.postgresql.cnpg.io', name, ns);
  const assessment = assessBaselineObservation({ profile, operator: { state: 'ready' },
    namespace: namespace ? { state: 'present', object: namespace } : { state: 'unreadable' },
    cluster: cluster ? { state: 'present', object: cluster } : { state: 'unreadable' } });
  if (assessment.refusals.length || assessment.cluster !== 'ready') return fail('baseline identity or topology not ready');
  const primary = cluster.status.currentPrimary;
  const pod = read('pod', primary, ns);
  if (!validIdentity(pod, 'v1', 'Pod', primary, ns) || !podReady(pod) ||
    pod.metadata.labels?.['cnpg.io/cluster'] !== name || pod.metadata.labels?.['cnpg.io/instanceRole'] !== 'primary' ||
    !ownerMatches(pod, cluster, 'Cluster') || !readyEndpoint(profile, ns, name + '-rw', pod, run))
    return fail('primary identity or RW endpoint not ready');
  const sql = run('kubectl', ['--context', profile.contextName, '-n', ns, 'exec', primary, '-c', 'postgres', '--',
    'psql', '-X', '-w', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc',
    "SELECT NOT pg_is_in_recovery() AND current_setting('transaction_read_only') = 'off';"], { timeoutMs: 30000 });
  if (!sql.ok || sql.stdout.trim() !== 't') return fail('primary is not SQL-writable');
  const nsAfter = read('namespace', ns, undefined);
  const clusterAfter = read('cluster.postgresql.cnpg.io', name, ns);
  const podAfter = read('pod', primary, ns);
  const after = assessBaselineObservation({ profile, operator: { state: 'ready' },
    namespace: nsAfter ? { state: 'present', object: nsAfter } : { state: 'unreadable' },
    cluster: clusterAfter ? { state: 'present', object: clusterAfter } : { state: 'unreadable' } });
  if (after.refusals.length || after.namespace !== 'compatible' || after.cluster !== 'ready' ||
    after.observedInstances !== assessment.observedInstances ||
    nsAfter.metadata.uid !== namespace.metadata.uid || clusterAfter.metadata.uid !== cluster.metadata.uid ||
    clusterAfter.status?.currentPrimary !== primary ||
    !validIdentity(podAfter, 'v1', 'Pod', primary, ns) || podAfter.metadata.uid !== pod.metadata.uid ||
    podAfter.metadata.labels?.['cnpg.io/cluster'] !== name || podAfter.metadata.labels?.['cnpg.io/instanceRole'] !== 'primary' ||
    !podReady(podAfter) || !ownerMatches(podAfter, clusterAfter, 'Cluster') ||
    !readyEndpoint(profile, ns, name + '-rw', podAfter, run)) return fail('primary identity changed during SQL observation');
  return { ok: true, primaryPod: primary, namespaceUid: namespace.metadata.uid, clusterUid: cluster.metadata.uid, podUid: pod.metadata.uid, instances: after.observedInstances };
}
