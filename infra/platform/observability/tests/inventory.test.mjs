import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import {
  collectInventory,
  defaultReadPending,
  LEGACY_DIRECT_OBJECTS,
} from '../inventory.mjs';
import { classifyInventory } from '../readiness.mjs';
import { loadArtifacts } from '../artifacts.mjs';

const devKind = readKindProfile('dev');

function fakeIdentity() {
  return {
    profileId: 'dev',
    profile: { id: 'dev' },
    contextName: devKind.contextName,
    clusterName: devKind.clusterName,
    namespace: 'offscreen-dev-observability',
    snapshotPath: '/tmp/fake-kubeconfig',
    tuple: { targetNamespaceUid: null },
    cleanup: () => ({ ok: true }),
  };
}

function okJson(body) {
  return {
    ok: true,
    status: 0,
    stdout: JSON.stringify(body),
    stderr: '',
    timedOut: false,
    missing: false,
  };
}

test('defaultReadPending reports real absence when pending file missing', () => {
  const stateRoot = mkdtempSync(join(tmpdir(), 'obs-pending-read-'));
  try {
    const pending = defaultReadPending(devKind.contextName, { stateRoot });
    assert.equal(pending.pending, false);
    assert.equal(pending.valid, true);
  } finally {
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('collectInventory records explicit namespace absence', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const { run } = {
    run(command, args) {
      const joined = args.join(' ');
      if (
        command === 'kubectl' &&
        joined.includes('get') &&
        joined.includes('ignore-not-found')
      ) {
        return {
          ok: true,
          status: 0,
          stdout: '\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (command === 'kubectl' && args.includes('pv')) {
        assert.deepEqual(args.slice(0, 4), [
          '--kubeconfig', identity.snapshotPath, '--context', identity.contextName,
        ]);
        return okJson({ items: [] });
      }
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'unexpected',
        timedOut: false,
        missing: false,
      };
    },
  };
  const snapshot = collectInventory(identity, artifacts, {
    run,
    now: () => 0,
    deadline: 60_000,
    readPending: () => ({ pending: false, valid: true }),
  });
  assert.equal(snapshot.namespace.absent, true);
  const classified = classifyInventory(
    { ...snapshot, profileId: 'dev', pending: false },
    artifacts,
  );
  assert.equal(classified.state, 'absent');
});

test('collectInventory throws unreadable on pagination overflow', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const huge = Array.from({ length: 100 }, (_, index) => ({
    kind: 'ConfigMap',
    metadata: { name: `cm-${index}`, uid: `uid-${index}` },
  }));
  const { run } = {
    run(command, args) {
      const resource = args[args.indexOf('get') + 1];
      if (
        command === 'kubectl' &&
        resource === 'namespace' &&
        args.includes(identity.namespace)
      ) {
        return okJson({
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: { name: identity.namespace, uid: 'ns-uid' },
        });
      }
      if (command === 'kubectl' && args.includes('ignore-not-found')) {
        return {
          ok: true,
          status: 0,
          stdout: '\n',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (
        command === 'kubectl' &&
        resource === 'configmap' &&
        args.includes('--limit')
      ) {
        return okJson({
          items: huge,
          metadata: { continue: 'next' },
        });
      }
      if (command === 'kubectl' && args.includes('pv')) {
        return okJson({ items: [] });
      }
      if (command === 'helm') {
        return okJson([]);
      }
      if (command === 'kubectl') {
        return okJson({ items: [] });
      }
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'x',
        timedOut: false,
        missing: false,
      };
    },
  };
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        run,
        now: () => 0,
        deadline: 60_000,
      }),
    /unreadable: (pagination-overflow|total-overflow|pagination-invalid)/,
  );
});

test('classifyInventory refuses lone legacy configmap', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const legacy = LEGACY_DIRECT_OBJECTS[0];
  const classified = classifyInventory(
    {
      profileId: 'dev',
      namespace: { absent: false, uid: 'ns' },
      legacy: [{ ...legacy, namespace: 'offscreen-dev-observability' }],
      objects: {},
      helmReleases: [],
      pending: false,
    },
    artifacts,
  );
  assert.equal(classified.state, 'legacy');
});

test('collectInventory forbidden list read throws unreadable', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        run: () => ({
          ok: false,
          status: 1,
          stdout: '',
          stderr: 'Forbidden',
          timedOut: false,
          missing: false,
        }),
        now: () => 0,
        deadline: 60_000,
      }),
    /unreadable:/,
  );
});

test('collectInventory deadline after first read throws unreadable', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  let reads = 0;
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        run(command, args) {
          reads += 1;
          const resource = args[args.indexOf('get') + 1];
          if (reads === 1 && resource === 'namespace') {
            return okJson({
              apiVersion: 'v1',
              kind: 'Namespace',
              metadata: { name: identity.namespace, uid: 'ns-uid' },
            });
          }
          return {
            ok: true,
            status: 0,
            stdout: '{"items":[]}',
            stderr: '',
            timedOut: false,
            missing: false,
          };
        },
        now: () => (reads <= 1 ? 0 : 60_001),
        deadline: 60_000,
      }),
    /unreadable: deadline/,
  );
});

test('pending blocks absence even when namespace is missing', () => {
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const classified = classifyInventory(
    {
      profileId: 'dev',
      namespace: { absent: true },
      legacy: [],
      objects: {},
      helmReleases: [],
      pending: true,
    },
    artifacts,
  );
  assert.equal(classified.reasonCode, 'pending');
  assert.notEqual(classified.state, 'absent');
});

test('failed namespace read with empty streams never proves absence', () => {
  assert.throws(
    () => collectInventory(fakeIdentity(), loadArtifacts('dev', { verifyArchive: false }), {
      run: () => ({
        ok: false, status: 1, stdout: '', stderr: '',
        timedOut: false, missing: false,
      }),
      now: () => 0,
      deadline: 60_000,
    }),
    /unreadable: namespace/,
  );
});
