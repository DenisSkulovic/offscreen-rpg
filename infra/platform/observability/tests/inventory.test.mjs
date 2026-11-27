import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readKindProfile } from '../../../clusters/kind/manager/config.mjs';
import {
  buildHelmHistoryArgv,
  buildHelmListArgv,
  buildHelmManifestArgv,
  collectInventory,
  defaultReadPending,
  EXPECTED_HELM_RELEASES,
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
          '--kubeconfig',
          identity.snapshotPath,
          '--context',
          identity.contextName,
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
    { ...snapshot, profileId: 'dev', pending: false, pendingValid: true },
    artifacts,
  );
  assert.equal(classified.state, 'absent');
});

test('collectInventory throws unreadable on pagination overflow', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const huge = Array.from({ length: 100 }, (_, index) => ({
    kind: 'ConfigMap',
    metadata: {
      name: `cm-${index}`,
      uid: `uid-${index}`,
      namespace: identity.namespace,
    },
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
      if (resource === '--raw') {
        assert.deepEqual(args.slice(0, 4), [
          '--kubeconfig',
          identity.snapshotPath,
          '--context',
          identity.contextName,
        ]);
      }
      if (
        command === 'kubectl' &&
        resource === '--raw' &&
        args.some((arg) => arg.includes('/configmaps?'))
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
    () =>
      collectInventory(
        fakeIdentity(),
        loadArtifacts('dev', { verifyArchive: false }),
        {
          run: () => ({
            ok: false,
            status: 1,
            stdout: '',
            stderr: '',
            timedOut: false,
            missing: false,
          }),
          now: () => 0,
          deadline: 60_000,
        },
      ),
    /unreadable: namespace/,
  );
});

test('collectInventory follows encoded continuation and retains both pages', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const token = 'page+/= &';
  const calls = [];
  const snapshot = collectInventory(identity, artifacts, {
    now: () => 0,
    deadline: 60_000,
    readPending: () => ({ pending: false, valid: true }),
    run(command, args) {
      if (command === 'helm') return okJson([]);
      if (args.includes('namespace')) {
        return okJson({
          kind: 'Namespace',
          metadata: { name: identity.namespace, uid: 'ns' },
        });
      }
      if (args.includes('--raw')) {
        const url = new URL(args.at(-1), 'https://example.invalid');
        assert.equal(url.searchParams.get('limit'), '100');
        if (url.pathname.endsWith('/configmaps')) {
          calls.push(url.searchParams.get('continue'));
          const second = calls.length === 2;
          return okJson({
            items: [
              {
                metadata: {
                  name: second ? 'b' : 'a',
                  namespace: identity.namespace,
                },
              },
            ],
            metadata: { continue: second ? '' : token },
          });
        }
        if (url.pathname.endsWith('/secrets')) {
          return okJson({
            items: [
              {
                metadata: {
                  name: 'obs-grafana-admin',
                  namespace: identity.namespace,
                },
                type: 'Opaque',
                data: { 'admin-user': 'YQ==', 'admin-password': 'Yg==' },
              },
            ],
            metadata: {},
          });
        }
        return okJson({ items: [], metadata: {} });
      }
      if (args.includes('pv')) return okJson({ items: [] });
      if (args.includes('--ignore-not-found'))
        return { ...okJson(null), stdout: '' };
      throw new Error('unexpected command');
    },
  });
  assert.deepEqual(calls, [null, token]);
  assert.ok(snapshot.objects['ConfigMap/a']);
  assert.ok(snapshot.objects['ConfigMap/b']);
  assert.deepEqual(snapshot.objects['Secret/obs-grafana-admin'].dataKeys, [
    'admin-password',
    'admin-user',
  ]);
  assert.equal(snapshot.objects['Secret/obs-grafana-admin'].apiVersion, 'v1');
  assert.equal(snapshot.objects['Secret/obs-grafana-admin'].data, undefined);
});

test('helm argv builders use exact frozen tokens', () => {
  const identity = fakeIdentity();
  assert.deepEqual(buildHelmListArgv(identity), [
    '--kubeconfig',
    identity.snapshotPath,
    '--kube-context',
    identity.contextName,
    'list',
    '-n',
    identity.namespace,
    '--all',
    '--max',
    '6',
    '--output',
    'json',
  ]);
  assert.deepEqual(buildHelmHistoryArgv(identity, 'obs-collector'), [
    '--kubeconfig',
    identity.snapshotPath,
    '--kube-context',
    identity.contextName,
    'history',
    'obs-collector',
    '-n',
    identity.namespace,
    '--max',
    '6',
    '--output',
    'json',
  ]);
  assert.deepEqual(buildHelmManifestArgv(identity, 'obs-collector', 2), [
    '--kubeconfig',
    identity.snapshotPath,
    '--kube-context',
    identity.contextName,
    'get',
    'manifest',
    'obs-collector',
    '-n',
    identity.namespace,
    '--revision',
    '2',
  ]);
});

const MIN_MANIFEST = `apiVersion: v1
kind: ConfigMap
metadata:
  name: probe
`;

function helmRowsFromArtifacts(artifacts, identity, revision = '1') {
  return artifacts.releases.map((release) => ({
    name: release.name,
    namespace: identity.namespace,
    revision,
    status: 'deployed',
    chart: `${release.chartName}-${release.chartVersion}`,
    app_version: release.appVersion,
  }));
}

function helmHistoryRow(release, revision = 1) {
  return {
    revision,
    status: revision === 1 ? 'deployed' : 'superseded',
    chart: `${release.chartName}-${release.chartVersion}`,
    app_version: release.appVersion,
  };
}

function namespacePresentHarness(identity, artifacts, helmHandler) {
  return (command, args) => {
    const resource = args[args.indexOf('get') + 1];
    if (command === 'kubectl' && resource === 'namespace') {
      return okJson({
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: identity.namespace, uid: 'ns-uid' },
      });
    }
    if (command === 'kubectl' && args.includes('--ignore-not-found')) {
      return {
        ok: true,
        status: 0,
        stdout: '\n',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'kubectl' && resource === '--raw') {
      return okJson({ items: [], metadata: {} });
    }
    if (command === 'helm') {
      return helmHandler(command, args);
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
  };
}

test('collectInventory traces list history and manifest argv for known releases', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const helmCalls = [];
  const snapshot = collectInventory(identity, artifacts, {
    now: () => 0,
    deadline: 60_000,
    readPending: () => ({ pending: false, valid: true }),
    run: namespacePresentHarness(identity, artifacts, (_command, args) => {
      helmCalls.push([...args]);
      if (args.includes('list')) {
        return okJson(helmRowsFromArtifacts(artifacts, identity));
      }
      if (args.includes('history')) {
        const releaseName = args[args.indexOf('history') + 1];
        const release = artifacts.releases.find(
          (row) => row.name === releaseName,
        );
        return okJson(release ? [helmHistoryRow(release)] : []);
      }
      return {
        ok: true,
        status: 0,
        stdout: MIN_MANIFEST,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }),
  });
  assert.equal(helmCalls.filter((args) => args.includes('list')).length, 1);
  assert.equal(
    helmCalls.filter((args) => args.includes('history')).length,
    EXPECTED_HELM_RELEASES.length,
  );
  assert.equal(
    helmCalls.filter((args) => args.includes('manifest')).length,
    EXPECTED_HELM_RELEASES.length,
  );
  assert.deepEqual(helmCalls[0], buildHelmListArgv(identity));
  assert.ok(
    helmCalls.some((args) =>
      deepStrictEqual(
        args,
        buildHelmManifestArgv(identity, 'obs-collector', 1),
      ),
    ),
  );
  assert.equal(
    Object.keys(snapshot.helmHistory).length,
    EXPECTED_HELM_RELEASES.length,
  );
  assert.equal(snapshot.helmManifests['obs-collector'].revision, '1');
  assert.ok(Array.isArray(snapshot.helmManifests['obs-collector'].documents));
  assert.equal(snapshot.helmManifests['obs-collector'].manifest, undefined);
});

function deepStrictEqual(left, right) {
  try {
    assert.deepStrictEqual(left, right);
    return true;
  } catch {
    return false;
  }
}

test('collectInventory rejects duplicate helm list rows', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const rows = helmRowsFromArtifacts(artifacts, identity).slice(0, 1);
  rows.push({ ...rows[0] });
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        now: () => 0,
        deadline: 60_000,
        run: namespacePresentHarness(identity, artifacts, (_c, args) =>
          args.includes('list')
            ? okJson(rows)
            : okJson([helmHistoryRow(artifacts.releases[0])]),
        ),
      }),
    /unreadable: helm-list-duplicate/,
  );
});

test('collectInventory rejects helm list wrong namespace', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const rows = helmRowsFromArtifacts(artifacts, identity);
  rows[0] = { ...rows[0], namespace: 'foreign-ns' };
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        now: () => 0,
        deadline: 60_000,
        run: namespacePresentHarness(identity, artifacts, (_c, args) =>
          args.includes('list')
            ? okJson(rows)
            : okJson([helmHistoryRow(artifacts.releases[0])]),
        ),
      }),
    /unreadable: helm-list-namespace/,
  );
});

test('collectInventory rejects helm list overflow and malformed response', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const rows = helmRowsFromArtifacts(artifacts, identity);
  rows.push({
    name: 'extra-release',
    namespace: identity.namespace,
    revision: '1',
    status: 'deployed',
    chart: 'x-0.0.0',
    app_version: '1.0.0',
  });
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        now: () => 0,
        deadline: 60_000,
        run: namespacePresentHarness(identity, artifacts, (_c, args) =>
          args.includes('list')
            ? okJson(rows)
            : okJson([helmHistoryRow(artifacts.releases[0])]),
        ),
      }),
    /unreadable: helm-list-overflow/,
  );
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        now: () => 0,
        deadline: 60_000,
        run: namespacePresentHarness(identity, artifacts, () => ({
          ok: true,
          status: 0,
          stdout: '{}',
          stderr: '',
          timedOut: false,
          missing: false,
        })),
      }),
    /unreadable: helm-list-not-array/,
  );
});

test('collectInventory rejects empty or overflowing helm history', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const listRows = helmRowsFromArtifacts(artifacts, identity).slice(0, 1);
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        now: () => 0,
        deadline: 60_000,
        run: namespacePresentHarness(identity, artifacts, (_c, args) => {
          if (args.includes('list')) return okJson(listRows);
          if (args.includes('history')) return okJson([]);
          return {
            ok: true,
            status: 0,
            stdout: MIN_MANIFEST,
            stderr: '',
            timedOut: false,
            missing: false,
          };
        }),
      }),
    /unreadable: helm-history-empty/,
  );
  const manyHistory = Array.from({ length: 6 }, (_, index) => ({
    revision: index + 1,
    status: 'deployed',
    chart: listRows[0].chart,
    app_version: listRows[0].app_version,
  }));
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        now: () => 0,
        deadline: 60_000,
        run: namespacePresentHarness(identity, artifacts, (_c, args) => {
          if (args.includes('list')) return okJson(listRows);
          if (args.includes('history')) return okJson(manyHistory);
          return {
            ok: true,
            status: 0,
            stdout: MIN_MANIFEST,
            stderr: '',
            timedOut: false,
            missing: false,
          };
        }),
      }),
    /unreadable: helm-history-overflow/,
  );
});

test('collectInventory fetches collector rev1 manifest when latest is rev2 on dev', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  const listRows = helmRowsFromArtifacts(artifacts, identity).map((row) =>
    row.name === 'obs-collector' ? { ...row, revision: '2' } : row,
  );
  const manifestRevisions = [];
  const snapshot = collectInventory(identity, artifacts, {
    now: () => 0,
    deadline: 60_000,
    readPending: () => ({ pending: false, valid: true }),
    run: namespacePresentHarness(identity, artifacts, (_c, args) => {
      if (args.includes('list')) return okJson(listRows);
      if (args.includes('history')) {
        const releaseName = args[args.indexOf('history') + 1];
        const release = artifacts.releases.find(
          (row) => row.name === releaseName,
        );
        if (releaseName === 'obs-collector') {
          return okJson([
            helmHistoryRow(release, 1),
            helmHistoryRow(release, 2),
          ]);
        }
        return okJson([helmHistoryRow(release)]);
      }
      if (args.includes('manifest')) {
        manifestRevisions.push(args[args.indexOf('--revision') + 1]);
        return {
          ok: true,
          status: 0,
          stdout: MIN_MANIFEST,
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: 'x',
        timedOut: false,
        missing: false,
      };
    }),
  });
  assert.deepEqual(
    manifestRevisions.filter(
      (revision, index, all) =>
        all.indexOf(revision) === index && revision === '1',
    ),
    ['1'],
  );
  assert.ok(manifestRevisions.includes('2'));
  assert.ok(
    Array.isArray(snapshot.helmManifests['obs-collector'].previousDocuments),
  );
});

test('collectInventory rejects late deadline after successful helm read', () => {
  const identity = fakeIdentity();
  const artifacts = loadArtifacts('dev', { verifyArchive: false });
  let helmReads = 0;
  assert.throws(
    () =>
      collectInventory(identity, artifacts, {
        run: namespacePresentHarness(identity, artifacts, () => {
          helmReads += 1;
          return okJson(helmRowsFromArtifacts(artifacts, identity));
        }),
        now: () => (helmReads > 0 ? 60_001 : 0),
        deadline: 60_000,
      }),
    /unreadable: deadline/,
  );
});
