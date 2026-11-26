import test from 'node:test';
import assert from 'node:assert/strict';
import { readPlatformProfile } from '../../common/profile.mjs';
import { expectedClusterSpec } from '../bootstrap/compatibility.mjs';
import { assessBaselineObservation } from '../bootstrap/observation.mjs';

function specimen(id = 'dev') {
  const profile = readPlatformProfile(id);
  const ns = profile.namespaces.postgres;
  const name = id === 'dev' ? 'dev-pg' : 'lab-pg';
  const spec = expectedClusterSpec(id);
  spec.instances = 2;
  return {
    profile, operator: { state: 'ready' },
    namespace: { state: 'present', object: { apiVersion: 'v1', kind: 'Namespace',
      metadata: { name: ns, uid: 'ns-1', labels: { [profile.ownerLabel + (id === 'dev' ? '/owner' : '/lab')]: profile.ownerValue } },
      status: { phase: 'Active' } } },
    cluster: { state: 'present', object: { apiVersion: 'postgresql.cnpg.io/v1', kind: 'Cluster',
      metadata: { name, namespace: ns, uid: 'pg-1', labels: { 'offscreen.dev/owner': profile.ownerValue } },
      spec, status: { instances: 2, readyInstances: 2, phase: 'Cluster in healthy state',
        currentPrimary: name + '-2', conditions: [{ type: 'Ready', status: 'True' }] } } },
  };
}

for (const id of ['dev', 'release']) {
  test(id + ': compatible topology preserves observed count', () => {
    const result = assessBaselineObservation(specimen(id));
    assert.deepEqual(result.refusals, []);
    assert.equal(result.namespace, 'compatible');
    assert.equal(result.cluster, 'ready');
    assert.equal(result.observedInstances, 2);
  });
  test(id + ': extra HBA, superuser access and storage changes refuse', () => {
    for (const alter of [
      spec => { spec.postgresql.pg_hba = ['host all all all trust']; },
      spec => { spec.enableSuperuserAccess = true; },
      spec => { spec.storage.size = '999Gi'; },
    ]) {
      const observation = specimen(id);
      alter(observation.cluster.object.spec);
      assert.equal(assessBaselineObservation(observation).cluster, 'incompatible');
    }
  });
  test(id + ': missing namespace, foreign ownership and partial operator refuse', () => {
    for (const alter of [
      observation => { observation.namespace = { state: 'absent' }; },
      observation => { observation.namespace.object.metadata.labels = {}; },
      observation => { observation.operator.state = 'partial'; },
    ]) {
      const observation = specimen(id);
      alter(observation);
      assert.ok(assessBaselineObservation(observation).refusals.length);
    }
  });
}
