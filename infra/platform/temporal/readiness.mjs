import { readFileSync } from 'node:fs';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { parsePins } from '../common/pins.mjs';

const RELEASE = 'temporal';
const CORE_ROLES = ['frontend', 'history', 'matching', 'worker'];
const PIN_KEYS = ['CHART_VERSION', 'CHART_URL', 'CHART_SHA256'];

function readChartVersion() {
  return parsePins(
    readFileSync(new URL('./chart.pin', import.meta.url), 'utf8'),
    PIN_KEYS,
  ).CHART_VERSION;
}

/**
 * Read-only Helm release observation. A failed or malformed query is never
 * interpreted as absence.
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeTemporalRelease(profileId, { run = runPlatformCommand } = {}) {
  const profile = readPlatformProfile(profileId);
  try {
    assertPlatformTarget(profileId, { run });
  } catch {
    return { state: 'unreadable', detail: 'Temporal platform target verification failed' };
  }
  const result = run('helm', [
    'list', '--all', '--filter', '^temporal$', '--kube-context', profile.contextName,
    '--namespace', profile.namespaces.temporal, '-o', 'json',
  ]);
  if (!result.ok) {
    return { state: 'unreadable', detail: 'Temporal Helm release query failed' };
  }
  let releases;
  try {
    releases = JSON.parse(result.stdout);
  } catch {
    return { state: 'unreadable', detail: 'Temporal Helm release response is malformed' };
  }
  if (!Array.isArray(releases)) {
    return { state: 'unreadable', detail: 'Temporal Helm release response is not a list' };
  }
  if (releases.length === 0) {
    return { state: 'absent', detail: 'Temporal Helm release is absent' };
  }
  const release = releases[0];
  if (
    releases.length !== 1 ||
    release?.name !== RELEASE ||
    release.namespace !== profile.namespaces.temporal ||
    typeof release.chart !== 'string' ||
    !/^temporal-\d+\.\d+\.\d+$/.test(release.chart) ||
    typeof release.app_version !== 'string' ||
    !/^\d+$/.test(String(release.revision)) ||
    Number(release.revision) < 1
  ) {
    return { state: 'unreadable', detail: 'Temporal Helm release identity mismatch' };
  }
  const identity = {
    revision: Number(release.revision),
    chartVersion: release.chart.slice('temporal-'.length),
    appVersion: release.app_version,
  };
  if (release.status === 'deployed') {
    return { state: 'deployed', detail: 'Temporal Helm release deployed', ...identity };
  }
  if (['pending-install', 'pending-upgrade', 'pending-rollback', 'uninstalling'].includes(release.status)) {
    return { state: 'pending', detail: 'Temporal Helm operation pending', ...identity };
  }
  return { state: 'failed', detail: 'Temporal Helm release is not deployed', ...identity };
}

function isReleaseOwned(object, namespace) {
  const metadata = object?.metadata;
  return !metadata?.deletionTimestamp &&
    metadata?.labels?.['app.kubernetes.io/instance'] === RELEASE &&
    metadata.labels['app.kubernetes.io/managed-by'] === 'Helm' &&
    metadata.annotations?.['meta.helm.sh/release-name'] === RELEASE &&
    metadata.annotations?.['meta.helm.sh/release-namespace'] === namespace;
}

function deploymentReady(object) {
  const desired = object?.spec?.replicas;
  const generation = object?.metadata?.generation;
  const status = object?.status;
  return Number.isInteger(desired) && desired > 0 &&
    Number.isInteger(generation) && generation > 0 &&
    Number.isInteger(status?.observedGeneration) &&
    status.observedGeneration >= generation &&
    status.replicas === desired &&
    status.updatedReplicas === desired &&
    status.readyReplicas === desired &&
    status.availableReplicas === desired;
}

function observeDeployment(profile, component, run) {
  const namespace = profile.namespaces.temporal;
  const observation = readPlatformObject({
    profileId: profile.id,
    resource: 'deployment',
    name: `temporal-${component}`,
    namespace,
  }, { run });
  return observation.state === 'present' &&
    isReleaseOwned(observation.object, namespace) &&
    deploymentReady(observation.object);
}

function frontendServiceReady(profile, run) {
  const namespace = profile.namespaces.temporal;
  const observation = readPlatformObject({
    profileId: profile.id,
    resource: 'service',
    name: 'temporal-frontend',
    namespace,
  }, { run });
  if (observation.state !== 'present') return false;
  const service = observation.object;
  return isReleaseOwned(service, namespace) &&
    service.spec?.type === 'ClusterIP' &&
    typeof service.spec.clusterIP === 'string' &&
    service.spec.clusterIP !== 'None' &&
    service.spec.clusterIP.length > 0 &&
    service.spec.selector?.['app.kubernetes.io/instance'] === RELEASE &&
    service.spec.selector?.['app.kubernetes.io/name'] === 'temporal' &&
    service.spec.selector?.['app.kubernetes.io/component'] === 'frontend' &&
    Array.isArray(service.spec.ports) &&
    service.spec.ports.some((port) =>
      port.port === 7233 && port.targetPort === 'rpc' && port.protocol === 'TCP');
}

function clusterServing(profile, run) {
  const result = run('kubectl', [
    '--context', profile.contextName, '-n', profile.namespaces.temporal,
    'exec', 'deploy/temporal-admintools', '--', 'temporal', 'operator', 'cluster',
    'health', '--address', 'temporal-frontend:7233',
  ]);
  if (!result.ok) return false;
  // Fail closed on unknown output. Confirm this parser against the live CLI
  // before accepting the runtime installation.
  const output = String(result.stdout ?? '').trim();
  return /^(?:health(?: check)?(?: status)?\s*:\s*)?SERVING$/i.test(output);
}

/**
 * Observe the owned Helm deployment without writes, waits or credential reads.
 * Core readiness requires a real frontend health response; UI availability
 * is reported independently because application execution does not use it.
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeTemporalReady(profileId, { run = runPlatformCommand } = {}) {
  const profile = readPlatformProfile(profileId);
  const notReady = (detail) => ({
    ok: false, detail, coreReady: false, adminReady: false, webReady: false,
  });
  const release = observeTemporalRelease(profileId, { run });
  if (release.state !== 'deployed') return notReady(release.detail);
  if (release.chartVersion !== readChartVersion()) {
    return notReady('Temporal Helm chart version mismatch');
  }

  const coreDeploymentsReady = CORE_ROLES.every((role) =>
    observeDeployment(profile, role, run));
  const frontendReady = frontendServiceReady(profile, run);
  const adminReady = observeDeployment(profile, 'admintools', run);
  const webReady = observeDeployment(profile, 'web', run);
  const coreReady = coreDeploymentsReady && frontendReady && adminReady &&
    clusterServing(profile, run);
  return {
    ok: coreReady && adminReady,
    detail: coreReady
      ? (webReady ? 'Temporal core and UI ready' : 'Temporal core ready; UI unavailable')
      : 'Temporal core, frontend route, admin tools or cluster health not ready',
    coreReady,
    adminReady,
    webReady,
  };
}
