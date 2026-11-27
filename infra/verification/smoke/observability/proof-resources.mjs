import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, fsyncSync, openSync, closeSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const OPERATION_LABEL = 'offscreen.dev/proof-operation';

function hex(bytes) {
  return randomBytes(bytes).toString('hex');
}

function persistLedger(dir, ledger) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const temp = join(dir, `.ledger-${hex(4)}.tmp`);
  const fd = openSync(temp, 'w', 0o600);
  writeFileSync(fd, `${JSON.stringify(ledger)}\n`);
  fsyncSync(fd);
  closeSync(fd);
  renameSync(temp, join(dir, 'ledger.json'));
}

/**
 * UID-owned proof namespace, ConfigMap and Pod ledger.
 * Namespace deletion is not a method on this object.
 *
 * @param {object} session
 * @param {{ api?: (call: object) => Promise<object>, ledgerDir?: string, now?: () => number }} [deps]
 */
export function createProofResources(session, deps = {}) {
  const api =
    deps.api ??
    (async () => {
      throw new Error('proof-api-required');
    });
  const operationId = hex(16);
  const ledgerDir =
    deps.ledgerDir ??
    join(
      session.evidenceDir,
      `.offscreen`,
      `verification`,
      `observability-${hex(16)}`,
    );
  const ledger = {
    schema: 1,
    operationId,
    namespace: {
      name: `obs-proof-${hex(16)}`,
      uid: null,
      state: 'planned',
    },
    objects: [],
    ambiguousPhase: null,
  };
  persistLedger(ledgerDir, ledger);

  let activePod = null;

  async function createObject(kind, manifest) {
    if (ledger.ambiguousPhase) {
      return { ok: false, reasonCode: 'ambiguous-create' };
    }
    const name = manifest.metadata.name;
    const entry = {
      kind,
      name,
      namespace: ledger.namespace.name,
      uid: null,
      state: 'planned',
    };
    ledger.objects.push(entry);
    persistLedger(ledgerDir, ledger);
    entry.state = 'attempted-unknown';
    persistLedger(ledgerDir, ledger);
    let response;
    try {
      response = await api({
        method: 'POST',
        path:
          kind === 'Namespace'
            ? '/api/v1/namespaces'
            : `/api/v1/namespaces/${ledger.namespace.name}/${kind === 'ConfigMap' ? 'configmaps' : 'pods'}`,
        body: manifest,
        deadline: session.deadline,
      });
    } catch {
      ledger.ambiguousPhase = `${kind}-create`;
      persistLedger(ledgerDir, ledger);
      return { ok: false, reasonCode: 'create-unknown' };
    }
    const uid = response?.metadata?.uid;
    if (
      response?.kind !== kind ||
      response?.metadata?.name !== name ||
      typeof uid !== 'string' ||
      uid.length === 0
    ) {
      ledger.ambiguousPhase = `${kind}-identity`;
      persistLedger(ledgerDir, ledger);
      return { ok: false, reasonCode: 'create-identity' };
    }
    entry.uid = uid;
    entry.state = 'known-present';
    if (kind === 'Pod') activePod = entry;
    persistLedger(ledgerDir, ledger);
    return { ok: true, uid, name };
  }

  return {
    ledger,
    async createNamespace() {
      if (ledger.ambiguousPhase || ledger.namespace.state === 'attempted-unknown') {
        return { ok: false, reasonCode: 'create-unknown' };
      }
      const manifest = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: ledger.namespace.name,
          labels: { [OPERATION_LABEL]: operationId },
        },
      };
      ledger.namespace.state = 'attempted-unknown';
      persistLedger(ledgerDir, ledger);
      let response;
      try {
        response = await api({
          method: 'POST',
          path: '/api/v1/namespaces',
          body: manifest,
        });
      } catch {
        ledger.ambiguousPhase = 'namespace-create';
        persistLedger(ledgerDir, ledger);
        return { ok: false, reasonCode: 'create-unknown' };
      }
      const uid = response?.metadata?.uid ?? null;
      if (!uid || response.metadata.name !== ledger.namespace.name) {
        ledger.ambiguousPhase = 'namespace-identity';
        persistLedger(ledgerDir, ledger);
        return { ok: false, reasonCode: 'create-identity' };
      }
      ledger.namespace.uid = uid;
      ledger.namespace.state = 'known-present';
      persistLedger(ledgerDir, ledger);
      return { ok: true, uid };
    },
    createConfigMap(manifest) {
      return createObject('ConfigMap', manifest);
    },
    createPod(manifest) {
      if (activePod && activePod.state !== 'confirmed-absent') {
        return Promise.resolve({ ok: false, reasonCode: 'pod-slot-held' });
      }
      return createObject('Pod', manifest);
    },
    async finishPod({ deadline } = {}) {
      if (!activePod) {
        return { ok: true, reasonCode: null, ledger };
      }
      const current = await api({
        method: 'GET',
        path: `/api/v1/namespaces/${ledger.namespace.name}/pods/${activePod.name}`,
        deadline,
      });
      if (current?.metadata?.uid !== activePod.uid) {
        ledger.ambiguousPhase = 'pod-replaced';
        persistLedger(ledgerDir, ledger);
        return { ok: false, reasonCode: 'pod-replaced', ledger };
      }
      await api({
        method: 'DELETE',
        path: `/api/v1/namespaces/${ledger.namespace.name}/pods/${activePod.name}`,
        body: {
          apiVersion: 'v1',
          kind: 'DeleteOptions',
          preconditions: { uid: activePod.uid },
        },
        deadline,
      });
      const gone = await api({
        method: 'GET',
        path: `/api/v1/namespaces/${ledger.namespace.name}/pods/${activePod.name}`,
        deadline,
      });
      if (gone?.code !== 404) {
        return { ok: false, reasonCode: 'pod-absence-unconfirmed', ledger };
      }
      activePod.state = 'confirmed-absent';
      persistLedger(ledgerDir, ledger);
      activePod = null;
      return { ok: true, reasonCode: null, ledger };
    },
    async cleanup({ deadline } = {}) {
      const finished = await this.finishPod({ deadline });
      if (!finished.ok) {
        return {
          ok: false,
          namespaceDisposition: 'retained-owner-cleanup',
          namespaceName: ledger.namespace.name,
          namespaceUid: ledger.namespace.uid,
          objects: ledger.objects,
          reasonCode: finished.reasonCode,
        };
      }
      const pods = await api({
        method: 'GET',
        path: `/api/v1/namespaces/${ledger.namespace.name}/pods`,
        deadline,
      });
      const foreign = (pods?.items ?? []).some((pod) =>
        JSON.stringify(pod).includes('obs-proof-cm-'),
      );
      const configMap = ledger.objects.find((entry) => entry.kind === 'ConfigMap');
      if (foreign && configMap) {
        return {
          ok: false,
          namespaceDisposition: 'retained-owner-cleanup',
          namespaceName: ledger.namespace.name,
          namespaceUid: ledger.namespace.uid,
          objects: ledger.objects,
          reasonCode: 'foreign-consumer',
        };
      }
      if (configMap && configMap.state === 'known-present') {
        await api({
          method: 'DELETE',
          path: `/api/v1/namespaces/${ledger.namespace.name}/configmaps/${configMap.name}`,
          body: {
            apiVersion: 'v1',
            kind: 'DeleteOptions',
            preconditions: { uid: configMap.uid },
          },
          deadline,
        });
        configMap.state = 'confirmed-absent';
        persistLedger(ledgerDir, ledger);
      }
      return {
        ok: true,
        namespaceDisposition: 'retained-owner-cleanup',
        namespaceName: ledger.namespace.name,
        namespaceUid: ledger.namespace.uid,
        objects: ledger.objects,
        reasonCode: null,
      };
    },
  };
}
