import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { renderPlatformDocuments } from '../../common/render.mjs';
import { baselineCnpgClusterName } from '../config.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { assessClusterSpec } from './compatibility.mjs';
import { createBaselineCustody } from './custody.mjs';
import { loadOperatorArtifact, operatorIdentity } from './operator.mjs';
import { collectBaselineObservation, assessBaselineObservation, observeWritablePrimary } from './observation.mjs';

const manager = profileId => profileId === 'dev' ? 'offscreen-dev-cnpg' : 'offscreen-release-cnpg';

function renderBaseline(profileId, run) {
  const profile = readPlatformProfile(profileId);
  const render = section => renderPlatformDocuments({ service: 'postgres', profile: profileId, section }, { run });
  const namespaces = render('namespace');
  const clusters = render('cluster');
  const namespace = namespaces[0];
  const cluster = clusters[0];
  if (namespaces.length !== 1 || clusters.length !== 1 ||
    namespace?.apiVersion !== 'v1' || namespace.kind !== 'Namespace' ||
    namespace.metadata?.name !== profile.namespaces.postgres ||
    cluster?.apiVersion !== 'postgresql.cnpg.io/v1' || cluster.kind !== 'Cluster' ||
    cluster.metadata?.name !== baselineCnpgClusterName(profileId) ||
    cluster.metadata?.namespace !== profile.namespaces.postgres)
    throw new Error('Rendered baseline identity mismatch');
  return { namespace, cluster };
}

function memoryAdmitted() {
  const available = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(readFileSync('/proc/meminfo', 'utf8'));
  return available !== null && Number(available[1]) >= 4194304;
}

function parseObject(result) {
  if (!result.ok) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

function confirmedIdentity(object, expected) {
  return object?.apiVersion === expected.apiVersion && object.kind === expected.kind &&
    object.metadata?.name === expected.metadata.name &&
    object.metadata?.namespace === expected.metadata.namespace &&
    typeof object.metadata.uid === 'string' && object.metadata.uid.length > 0;
}

/** Require a complete native acknowledgment; no inferred success from exit code. */
export function acknowledgeOperatorApply(result, inventory) {
  if (!result.ok) return false;
  const body = parseObject(result);
  const objects = body?.kind === 'List' ? body.items : null;
  if (!Array.isArray(objects) || objects.length !== inventory.length) return false;
  const expected = new Set(inventory.map(entry => entry.id));
  for (const object of objects) {
    if (!object?.metadata?.uid || !expected.delete(operatorIdentity(object))) return false;
  }
  return expected.size === 0;
}

/** Shared native baseline worker. No existing-object mutation or write retries. */
export function ensureBaseline(profileId, deps = {}) {
  const custody = deps.custody ?? createBaselineCustody();
  const run = custody.run;
  const actions = [];
  const confirmedMutations = [];
  let stage = 'preflight';
  let outcome = 'refused';
  let writeInFlight = false;
  const receipt = (ok, refusals = [], extra = {}) => ({
    ok, stage, outcome, confirmedMutations, actions, refusals,
    mutated: confirmedMutations.length > 0, ...extra,
  });
  const refuse = (id, detail, state = 'refused') => {
    outcome = state;
    return receipt(false, [{ id, detail }]);
  };
  try {
    if (deps.authorized !== true) return refuse('ensure-not-authorized', 'Baseline ensure requires explicit authorization');
    const artifact = loadOperatorArtifact({ path: deps.operatorManifestPath });
    const profile = readPlatformProfile(profileId);
    const rendered = renderBaseline(profileId, run);
    const collect = () => collectBaselineObservation(profileId, { artifact, run });
    const kubectl = (args, options) => run('kubectl', ['--context', profile.contextName, ...args], options);
    stage = 'observe';
    let observed = collect();
    let assessed = assessBaselineObservation(observed);
    if (assessed.refusals.length) return receipt(false, assessed.refusals);
    const initialNamespaceUid = observed.namespace.object?.metadata.uid;
    let initialClusterUid = observed.cluster.object?.metadata.uid;
    let initialInstances = assessed.observedInstances;
    const initialClusterUnknown = assessed.cluster === 'unreadable';
    let locked = false;
    const requiresWrite = state => state.operator === 'absent' || state.namespace === 'absent' || state.cluster === 'absent';
    if (requiresWrite(assessed)) {
      if (deps.maintenance !== true) return refuse('maintenance-required', 'Owner maintenance quiescence required for baseline creation');
      stage = 'lock';
      custody.acquire();
      locked = true;
      if (!(deps.memoryAdmitted ?? memoryAdmitted)()) return refuse('insufficient-memory', 'Host memory admission failed');
      stage = 'observe';
      observed = collect();
      assessed = assessBaselineObservation(observed);
      if (assessed.refusals.length) return receipt(false, assessed.refusals);
    }

    if (assessed.operator === 'absent') {
      if (observed.namespace.object?.metadata.uid !== initialNamespaceUid || observed.cluster.object?.metadata.uid !== initialClusterUid)
        return refuse('identity-changed', 'Baseline changed while acquiring custody');
      if (!locked) return refuse('maintenance-lock-required', 'Operator installation requires custody');
      stage = 'operator';
      writeInFlight = true;
      actions.push({ op: 'apply-operator', outcome: 'attempted' });
      const applied = kubectl(['apply', '--server-side', '--field-manager=' + manager(profileId), '-f', '-', '-o', 'json'],
        { input: artifact.body, timeoutMs: 180000, mutation: true });
      writeInFlight = false;
      const acknowledged = acknowledgeOperatorApply(applied, artifact.inventory);
      actions[actions.length - 1].outcome = acknowledged ? 'acknowledged' : 'unknown';
      if (!acknowledged) return refuse('operator-apply-unknown', 'Operator installation outcome unknown; re-observe explicitly', 'unknown');
      confirmedMutations.push({ op: 'apply-operator', identities: artifact.inventory.map(entry => entry.id) });
    }

    stage = 'operator';
    const operatorDeadline = custody.remaining();
    do {
      observed = collect();
      assessed = assessBaselineObservation(observed);
      // A freshly acknowledged multi-object installation may still be converging,
      // but an incomplete inventory is never a reason to replay the manifest.
      if (assessed.refusals.length) return receipt(false, assessed.refusals);
      if (assessed.operator === 'ready') break;
      if (assessed.operator !== 'pending') return refuse('operator-not-ready', 'Operator inventory is not complete');
      custody.sleep(5000);
    } while (custody.remaining() > 0 && operatorDeadline - custody.remaining() < 420000);
    if (assessed.operator !== 'ready') return refuse('operator-readiness-failed', 'Operator readiness deadline exhausted', 'failed');
    actions.push({ op: 'verify-operator', outcome: 'ready' });

    function create(expected, op) {
      if (deps.maintenance !== true || !locked) return { error: 'maintenance-lock-required', state: 'refused' };
      writeInFlight = true;
      actions.push({ op, outcome: 'attempted' });
      const result = kubectl(['create', '-f', '-', '-o', 'json'], {
        input: JSON.stringify(expected), timeoutMs: 60000, mutation: true,
      });
      writeInFlight = false;
      const object = parseObject(result);
      if (!confirmedIdentity(object, expected)) {
        const collision = !result.ok && result.status === 1 && /\(AlreadyExists\)/.test(result.stderr);
        actions[actions.length - 1].outcome = collision ? 'refused' : 'unknown';
        return { error: collision ? 'already-exists' : 'creation-unknown', state: collision ? 'refused' : 'unknown' };
      }
      actions[actions.length - 1].outcome = 'acknowledged';
      confirmedMutations.push({ op, kind: object.kind, name: object.metadata.name, uid: object.metadata.uid });
      return { object };
    }

    if (initialClusterUnknown) {
      // CRD establishment was pending, not evidence of absence. Re-observe under
      // custody before any creation; never treat an unreadable object as absent.
      if (assessed.cluster === 'absent' && !locked) {
        if (deps.maintenance !== true) return refuse('maintenance-required', 'Owner maintenance required');
        custody.acquire();
        locked = true;
        if (!(deps.memoryAdmitted ?? memoryAdmitted)()) return refuse('insufficient-memory', 'Host memory admission failed');
        observed = collect();
        assessed = assessBaselineObservation(observed);
        if (assessed.refusals.length) return receipt(false, assessed.refusals);
        if (assessed.operator !== 'ready' || assessed.cluster !== 'absent')
          return refuse('identity-changed', 'Baseline changed while acquiring custody');
      }
      initialClusterUid = observed.cluster.object?.metadata.uid;
      initialInstances = assessed.observedInstances;
    }
    if (initialNamespaceUid !== observed.namespace.object?.metadata.uid ||
      initialClusterUid !== observed.cluster.object?.metadata.uid ||
      (initialInstances !== undefined && assessed.observedInstances !== initialInstances))
      return refuse('identity-changed', 'Baseline changed during operator observation');
    let namespaceUid = observed.namespace.object?.metadata.uid;
    let clusterUid = observed.cluster.object?.metadata.uid;
    const clusterWasAbsent = assessed.cluster === 'absent';
    if (assessed.namespace === 'absent') {
      if (!locked) return refuse('maintenance-lock-required', 'Namespace creation requires custody');
      stage = 'namespace';
      const created = create(rendered.namespace, 'create-namespace');
      if (created.error) return refuse(created.error, 'Namespace creation stopped', created.state);
      namespaceUid = created.object.metadata.uid;
    }

    stage = 'observe';
    observed = collect();
    assessed = assessBaselineObservation(observed);
    if (assessed.refusals.length) return receipt(false, assessed.refusals);
    if (observed.namespace.object?.metadata.uid !== namespaceUid || assessed.namespace !== 'compatible' ||
      assessed.operator !== 'ready' || (clusterWasAbsent ? assessed.cluster !== 'absent' : observed.cluster.object?.metadata.uid !== clusterUid))
      return refuse('identity-changed', 'Baseline changed before admission probe');

    stage = 'cluster';
    const probe = structuredClone(rendered.cluster);
    probe.metadata.name = 'offscreen-pg-admission-' + randomBytes(8).toString('hex');
    const admitted = parseObject(kubectl(['create', '--dry-run=server', '-f', '-', '-o', 'json'],
      { input: JSON.stringify(probe), timeoutMs: 30000 }));
    if (!admitted || admitted.kind !== 'Cluster' || admitted.apiVersion !== probe.apiVersion ||
      admitted.metadata?.name !== probe.metadata.name || admitted.metadata?.namespace !== probe.metadata.namespace ||
      !assessClusterSpec(profileId, admitted.spec, { exactInstances: true }).ok)
      return refuse('admission-probe-failed', 'Trusted Cluster admission reference mismatch');
    actions.push({ op: 'verify-admission', outcome: 'ready' });

    observed = collect();
    assessed = assessBaselineObservation(observed);
    if (assessed.refusals.length) return receipt(false, assessed.refusals);
    if (assessed.operator !== 'ready' || assessed.namespace !== 'compatible' ||
      observed.namespace.object?.metadata.uid !== namespaceUid ||
      (clusterWasAbsent ? assessed.cluster !== 'absent' : observed.cluster.object?.metadata.uid !== clusterUid) ||
      (initialInstances !== undefined && assessed.observedInstances !== initialInstances))
      return refuse('identity-changed', 'Baseline changed during admission probe');

    if (assessed.cluster === 'absent') {
      const created = create(rendered.cluster, 'create-cluster');
      if (created.error) return refuse(created.error, 'Cluster creation stopped', created.state);
      clusterUid = created.object.metadata.uid;
    }

    stage = 'readiness';
    const expectedInstances = initialInstances ?? rendered.cluster.spec.instances;
    const readinessStart = custody.remaining();
    do {
      observed = collect();
      assessed = assessBaselineObservation(observed);
      if (assessed.refusals.length) return receipt(false, assessed.refusals);
      if (observed.namespace.object?.metadata.uid !== namespaceUid || observed.cluster.object?.metadata.uid !== clusterUid)
        return refuse('identity-changed', 'Baseline UID changed during readiness');
      if (assessed.observedInstances !== expectedInstances) return refuse('topology-changed', 'Baseline instance count changed');
      if (assessed.operator === 'ready' && assessed.cluster === 'ready') {
        const ready = observeWritablePrimary(profileId, { run });
        if (ready.ok && ready.namespaceUid === namespaceUid && ready.clusterUid === clusterUid && ready.instances === expectedInstances) {
          if (custody.remaining() < 1) break;
          actions.push({ op: 'wait-cluster-ready', outcome: 'ready' });
          if (!confirmedMutations.length) actions.push({ op: 'noop', outcome: 'ready' });
          outcome = 'ready';
          return receipt(true, [], { instances: assessed.observedInstances, phase: observed.cluster.object.status.phase,
            primaryPod: ready.primaryPod, readiness: { ok: true, stage: 'ready', primaryPod: ready.primaryPod } });
        }
      }
      custody.sleep(5000);
    } while (custody.remaining() > 0 && readinessStart - custody.remaining() < 600000);
    return refuse('cluster-readiness-failed', 'Writable primary readiness deadline exhausted', 'failed');
  } catch {
    return refuse('baseline-worker-failed', 'Baseline worker stopped; inspect stage and re-observe',
      writeInFlight ? 'unknown' : 'failed');
  } finally {
    custody.close();
  }
}
