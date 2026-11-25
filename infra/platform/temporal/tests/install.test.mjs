import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { ensureTemporal } from '../install.mjs';

const context = 'kind-offscreen-dev';
const namespace = 'offscreen-dev-temporal';
const authorization = { confirmContext: context };

function fixture({ state = 'absent', namespaceExists = false, lowMemory = false, changedValues = false, badDownload = false } = {}) {
  const calls = [];
  let archive;
  const ok = (value = '') => ({ ok: true, status: 0, stdout: typeof value === 'string' ? value : JSON.stringify(value) });
  const run = (command, args, options = {}) => {
    calls.push({ command, args });
    if (command === 'kind') return ok('offscreen-dev\n');
    if (command === 'cat') return ok('MemAvailable: ' + (lowMemory ? '1024' : '16777216') + ' kB\n');
    if (command === 'curl') {
      assert.equal(badDownload, true);
      archive = args[args.indexOf('--output') + 1];
      writeFileSync(archive, 'not the pinned chart');
      return ok();
    }
    if (command === 'helm') {
      if (args[0] === 'list') return ok(state === 'absent' ? [] : [{
        name: 'temporal', namespace, chart: 'temporal-1.8.0',
        app_version: '1.32.2', revision: '1', status: state,
      }]);
      if (args[0] === 'get') {
        const values = parse(readFileSync(new URL('../values.yaml', import.meta.url), 'utf8'));
        for (const store of ['default', 'visibility']) {
          values.server.config.persistence.datastores[store].sql.connectAddr =
            'dev-pg-rw.offscreen-dev-postgres.svc:5432';
        }
        if (changedValues) values.server.replicaCount = 2;
        return ok(values);
      }
      throw new Error('unexpected Helm mutation');
    }
    assert.equal(command, 'kubectl');
    if (args.includes('config')) return ok({
      contexts: [{ name: context, context: { cluster: context } }],
      clusters: [{ name: context, cluster: { server: 'https://127.0.0.1:24443' } }],
    });
    if (args.includes('exec')) return ok('SERVING');
    const get = args.indexOf('get');
    assert.ok(get >= 0, 'unexpected Kubernetes mutation');
    const type = args[get + 1];
    const name = args[get + 2] === '-n' ? args[get + 4] : args[get + 2];
    if (type === 'namespace') {
      if (name === namespace && !namespaceExists) return ok();
      return ok({ metadata: { name, uid: 'namespace-uid', labels: { 'offscreen.dev/owner': 'offscreen-dev' } } });
    }
    const metadata = {
      name, namespace, generation: 1,
      labels: { 'app.kubernetes.io/instance': 'temporal', 'app.kubernetes.io/managed-by': 'Helm' },
      annotations: { 'meta.helm.sh/release-name': 'temporal', 'meta.helm.sh/release-namespace': namespace },
    };
    if (type === 'deployment') return ok({
      metadata, spec: { replicas: 1 },
      status: { observedGeneration: 1, replicas: 1, updatedReplicas: 1, readyReplicas: 1, availableReplicas: 1 },
    });
    if (type === 'service') return ok({
      metadata, spec: {
        type: 'ClusterIP', clusterIP: '10.96.0.42',
        selector: { 'app.kubernetes.io/instance': 'temporal', 'app.kubernetes.io/name': 'temporal', 'app.kubernetes.io/component': 'frontend' },
        ports: [{ port: 7233, targetPort: 'rpc', protocol: 'TCP' }],
      },
    });
    throw new Error('unexpected resource');
  };
  return { run, calls, archivePath: () => archive };
}

test('wrong context refuses without invoking commands', () => {
  const f = fixture();
  assert.throws(() => ensureTemporal('dev', { confirmContext: 'wrong' }, f), /confirmation/);
  assert.equal(f.calls.length, 0);
});

test('memory admission refuses before Helm or download', () => {
  const f = fixture({ lowMemory: true });
  assert.throws(() => ensureTemporal('dev', authorization, f), /memory admission/);
  assert.ok(f.calls.every(({ command }) => command !== 'helm' && command !== 'curl'));
});

test('pending release and existing namespace refuse without download', () => {
  for (const options of [{ state: 'pending-install' }, { namespaceExists: true }]) {
    const f = fixture(options);
    assert.throws(() => ensureTemporal('dev', authorization, f), /pending|namespace already exists/);
    assert.ok(f.calls.every(({ command }) => command !== 'curl'));
  }
});

test('healthy matching release is a no-op; different values refuse', () => {
  const f = fixture({ state: 'deployed' });
  assert.equal(ensureTemporal('dev', authorization, f).mutated, false);
  assert.ok(f.calls.every(({ command }) => command !== 'curl'));
  const mismatch = fixture({ state: 'deployed', changedValues: true });
  assert.throws(() => ensureTemporal('dev', authorization, mismatch), /values differ/);
  assert.ok(mismatch.calls.every(({ command }) => command !== 'curl'));
});

test('invalid downloaded archive refuses before persistence and removes temporary file', () => {
  const f = fixture({ badDownload: true });
  assert.throws(() => ensureTemporal('dev', authorization, f), /sha256 mismatch/);
  assert.ok(f.archivePath());
  assert.equal(existsSync(f.archivePath()), false);
  assert.ok(f.calls.every(({ args }) => !args.includes('create') && !args.includes('patch') && !args.includes('exec')));
});
