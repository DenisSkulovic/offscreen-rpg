import assert from 'node:assert/strict';
import test from 'node:test';
import { observeTemporalReady, observeTemporalRelease } from '../readiness.mjs';

const context = 'kind-offscreen-dev';
const namespace = 'offscreen-dev-temporal';

function fixture({ releaseStatus = 'deployed', absent = false, unreadable = false, stale = false, foreign = false, health = 'SERVING', ui = true } = {}) {
  const calls = [];
  const ok = (value) => ({
    ok: true, status: 0, stdout: typeof value === 'string' ? value : JSON.stringify(value),
  });
  const run = (command, args) => {
    calls.push({ command, args });
    if (command === 'kind') return ok('offscreen-dev\n');
    if (command === 'helm') {
      assert.equal(args[0], 'list');
      assert.ok(args.includes(context));
      assert.ok(args.includes(namespace));
      if (unreadable) return { ok: false, stdout: '' };
      return ok(absent ? [] : [{
        name: 'temporal', namespace, chart: 'temporal-1.8.0',
        app_version: '1.32.2', revision: '1', status: releaseStatus,
      }]);
    }
    assert.equal(command, 'kubectl');
    assert.equal(args[1], context);
    if (args.includes('config')) {
      return ok({
        contexts: [{ name: context, context: { cluster: context } }],
        clusters: [{ name: context, cluster: { server: 'https://127.0.0.1:24443' } }],
      });
    }
    if (args.includes('exec')) return ok(health);
    const get = args.indexOf('get');
    assert.ok(get >= 0, 'only reads and health exec are allowed');
    const type = args[get + 1];
    const name = args[get + 2] === '-n' ? args[get + 4] : args[get + 2];
    if (type === 'namespace') {
      return ok({ metadata: { name, uid: 'baseline-uid', labels: { 'offscreen.dev/owner': 'offscreen-dev' } } });
    }
    const metadata = {
      name, namespace, generation: 2,
      labels: {
        'app.kubernetes.io/instance': 'temporal',
        'app.kubernetes.io/managed-by': 'Helm',
      },
      annotations: {
        'meta.helm.sh/release-name': foreign && name === 'temporal-frontend' ? 'foreign' : 'temporal',
        'meta.helm.sh/release-namespace': namespace,
      },
    };
    if (type === 'deployment') {
      if (!ui && name === 'temporal-web') return ok('');
      return ok({
        metadata, spec: { replicas: 1 },
        status: {
          observedGeneration: stale && name === 'temporal-history' ? 1 : 2,
          replicas: 1, readyReplicas: 1, updatedReplicas: 1, availableReplicas: 1,
        },
      });
    }
    if (type === 'service') {
      return ok({
        metadata,
        spec: {
          type: 'ClusterIP', clusterIP: '10.96.0.23',
          selector: {
            'app.kubernetes.io/instance': 'temporal',
            'app.kubernetes.io/name': 'temporal',
            'app.kubernetes.io/component': 'frontend',
          },
          ports: [{ port: 7233, targetPort: 'rpc', protocol: 'TCP' }],
        },
      });
    }
    throw new Error('unexpected resource');
  };
  return { run, calls };
}

test('absent and unreadable release are distinct', () => {
  assert.equal(observeTemporalRelease('dev', fixture({ absent: true })).state, 'absent');
  assert.equal(observeTemporalRelease('dev', fixture({ unreadable: true })).state, 'unreadable');
});

test('pending release is not ready and does not invoke the health command', () => {
  const f = fixture({ releaseStatus: 'pending-upgrade' });
  assert.equal(observeTemporalReady('dev', f).ok, false);
  assert.ok(!f.calls.some(({ args }) => args.includes('exec')));
});

test('owned current deployments and serving frontend establish readiness', () => {
  const f = fixture();
  assert.deepEqual(observeTemporalReady('dev', f), {
    ok: true, detail: 'Temporal core and UI ready',
    coreReady: true, adminReady: true, webReady: true,
  });
  assert.ok(f.calls.some(({ args }) => args.includes('exec')));
});

test('foreign, stale, or non-serving core refuses readiness', () => {
  for (const options of [{ foreign: true }, { stale: true }, { health: 'NOT_SERVING' }, { health: 'unexpected SERVING text' }]) {
    assert.equal(observeTemporalReady('dev', fixture(options)).ok, false);
  }
});

test('UI absence does not prevent core application readiness', () => {
  const result = observeTemporalReady('dev', fixture({ ui: false }));
  assert.equal(result.ok, true);
  assert.equal(result.webReady, false);
});
