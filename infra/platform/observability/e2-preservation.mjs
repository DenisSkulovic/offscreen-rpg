import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { SIGNAL_PROBE_PATH } from '../../verification/smoke/observability/signals.mjs';
import { startOwnedChild } from './forward.mjs';
import { GRAFANA_ADMIN_SECRET } from './inventory.mjs';

/**
 * E2 occupied-upgrade preservation and marker primitives (OBS-E2-11 T02).
 *
 * Key names written into the custody `upgrade-e2` details maps (T03 reuses):
 *
 * preservedUids (string uid values):
 *   namespace                      target namespace UID
 *   secret/<GRAFANA_ADMIN_SECRET>  Grafana admin Secret UID
 *   pvc/<claim>                    every PersistentVolumeClaim UID
 *   pv/<claim>                     bound PersistentVolume UID per claim
 *   helm/<Secret name>             every Helm release storage Secret UID
 *   <kind>/<name>                  Service, Deployment, StatefulSet, ConfigMap,
 *                                  ServiceAccount UIDs
 *   pod/<name>                     Pods of the unchanged backends (Loki, Tempo)
 * Existing Prometheus/Grafana families (name prefix obs-prometheus,
 * obs-grafana) may roll: their Pod/ReplicaSet and planned manifests are not
 * in the unchanged comparison (their Service/Deployment/StatefulSet UIDs are
 * still preserved identities, only resourceVersions are exempt).
 *
 * markerIds (string values, nonsecret, nothing from any payload):
 *   run, trace, parent, child, marker, now (exact nanosecond decimal string)
 */

const CHANGING_PREFIXES = ['obs-prometheus', 'obs-grafana'];
const IDENTITY_KINDS = new Set([
  'Service',
  'Deployment',
  'StatefulSet',
  'ConfigMap',
  'ServiceAccount',
]);
const BACKEND_POD_PREFIXES = ['obs-loki', 'obs-tempo'];
const MAP_LIMIT = 64;
const HELM_STORAGE = /^sh\.helm\.release\.v1\./;

/** @param {string} name */
function changing(name) {
  return CHANGING_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Bounded projection of a live snapshot (snapshot.objects keyed Kind/name).
 * Returns null when a required identity is missing or the map is unbounded.
 * @param {any} snapshot
 */
export function projectE2Preservation(snapshot) {
  const namespace = snapshot?.namespace?.uid;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    return null;
  }
  const objects = snapshot.objects ?? {};
  /** @type {Record<string, string>} */
  const uids = { namespace };
  /** @type {Record<string, string>} */
  const versions = {};
  const admin = objects[`Secret/${GRAFANA_ADMIN_SECRET}`]?.metadata?.uid;
  if (typeof admin !== 'string') {
    return null;
  }
  uids[`secret/${GRAFANA_ADMIN_SECRET}`] = admin;
  let claims = 0;
  for (const [key, object] of Object.entries(objects)) {
    const slash = key.indexOf('/');
    const kind = key.slice(0, slash);
    const name = key.slice(slash + 1);
    const uid = object?.metadata?.uid;
    const version = object?.metadata?.resourceVersion;
    if (typeof uid !== 'string') {
      continue;
    }
    if (kind === 'PersistentVolumeClaim') {
      const volume = object?.spec?.volumeName;
      const pv = (snapshot.persistentVolumes ?? []).find(
        (row) => row?.metadata?.name === volume,
      );
      if (typeof pv?.metadata?.uid !== 'string') {
        return null;
      }
      uids[`pvc/${name}`] = uid;
      uids[`pv/${name}`] = pv.metadata.uid;
      claims += 1;
    } else if (kind === 'Secret' && HELM_STORAGE.test(name)) {
      uids[`helm/${name}`] = uid;
    } else if (IDENTITY_KINDS.has(kind)) {
      uids[`${kind}/${name}`] = uid;
      if (!changing(name) && typeof version === 'string') {
        versions[`${kind}/${name}`] = version;
      }
    } else if (
      kind === 'Pod' &&
      BACKEND_POD_PREFIXES.some((prefix) => name.startsWith(prefix))
    ) {
      uids[`pod/${name}`] = uid;
    }
  }
  if (claims === 0 || Object.keys(uids).length > MAP_LIMIT) {
    return null;
  }
  return { preservedUids: uids, versions };
}

/**
 * The original identities and nonchanging resourceVersions must all survive.
 * New objects (new helper/RBAC, Helm revision 2) and rolled P/G Pods are
 * allowed; a missing/changed PVC, PV, Helm storage, admin Secret, backend Pod
 * or nonchanging version refuses.
 * @param {{ preservedUids: Record<string,string>, versions: Record<string,string> }} before
 * @param {{ preservedUids: Record<string,string>, versions: Record<string,string> } | null} after
 */
export function compareE2Preservation(before, after) {
  if (before == null || after == null) {
    return { ok: false, detail: 'projection-missing' };
  }
  for (const [key, uid] of Object.entries(before.preservedUids)) {
    if (after.preservedUids[key] !== uid) {
      return { ok: false, detail: `uid-changed:${key}` };
    }
  }
  for (const [key, version] of Object.entries(before.versions)) {
    if (after.versions[key] !== version) {
      return { ok: false, detail: `version-changed:${key}` };
    }
  }
  return { ok: true, detail: 'preserved' };
}

const SHAPES = {
  run: /^[0-9a-f]{16}$/,
  trace: /^[0-9a-f]{32}$/,
  parent: /^[0-9a-f]{16}$/,
  child: /^[0-9a-f]{16}$/,
};
const IDENTITY_KEYS = ['run', 'trace', 'parent', 'child', 'marker', 'now'];

/**
 * Parse identity.json bytes without a lossy numeric round trip. `now` (ns
 * since epoch, above 2^53) stays a decimal string.
 * @param {string} text
 */
export function parseIdentityBytes(text) {
  if (typeof text !== 'string' || text.length > 4096) {
    throw new Error('refused: marker identity is invalid');
  }
  const matches = [...text.matchAll(/"now"\s*:\s*(\d+)(?=\s*[,}])/g)];
  if (matches.length !== 1) {
    throw new Error('refused: marker identity is invalid');
  }
  const quoted = text.replace(/("now"\s*:\s*)(\d+)/, '$1"$2"');
  const value = JSON.parse(quoted);
  return assertIdentity(value);
}

/** @param {any} value */
function assertIdentity(value) {
  if (
    value == null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== IDENTITY_KEYS.length ||
    IDENTITY_KEYS.some((key) => typeof value[key] !== 'string')
  ) {
    throw new Error('refused: marker identity is invalid');
  }
  for (const [key, pattern] of Object.entries(SHAPES)) {
    if (!pattern.test(value[key])) {
      throw new Error('refused: marker identity is invalid');
    }
  }
  if (
    value.marker !== `obs-e04-${value.run}` ||
    !/^[1-9]\d{0,19}$/.test(value.now) ||
    BigInt(value.now) > 0xffffffffffffffffn
  ) {
    throw new Error('refused: marker identity is invalid');
  }
  return Object.fromEntries(IDENTITY_KEYS.map((key) => [key, value[key]]));
}

/**
 * Replay argv JSON with `now` as a bare exact integer (never a JS number).
 * @param {Record<string,string>} identity
 */
export function replayArgument(identity) {
  const id = assertIdentity(identity);
  const fields = IDENTITY_KEYS.filter((key) => key !== 'now').map(
    (key) => `${JSON.stringify(key)}:${JSON.stringify(id[key])}`,
  );
  return `{${fields.join(',')},"now":${id.now}}`;
}

/**
 * Sanitized evidence for custody `markerIds`: identifiers only.
 * @param {Record<string,string>} identity
 */
export function markerIdsFromIdentity(identity) {
  return assertIdentity(identity);
}

const POSITIVE_WINDOW_MS = 90_000;
const CLEANUP_BUDGET_MS = 30_000;
const POSITIVES = ['trace', 'log', 'metric'];

/**
 * Run the existing signal probe under the inherited exclusive lock fd.
 * pre-intent: normal mode (POSTs once), replay: existing replay mode (never
 * POSTs; the collector argument is an unused unroutable placeholder).
 * Keeps only identifiers and positive booleans; the private 0700 directory is
 * removed before returning.
 *
 * @param {{
 *   custody: { fd: number, mode: string },
 *   stage: 'pre-intent' | 'replay',
 *   ports: { prometheus: number, loki: number, tempo: number, diagnosticHttp?: number },
 *   identity?: Record<string,string>,
 *   startChild?: typeof startOwnedChild,
 *   now?: () => number,
 *   signal?: AbortSignal,
 *   python?: string,
 *   tmpRoot?: string,
 * }} input
 */
export async function runMarkerProbe(input) {
  const { custody, stage, ports } = input;
  if (custody?.mode !== 'exclusive' || !Number.isInteger(custody.fd)) {
    throw new Error('refused: marker probe requires exclusive custody');
  }
  let collector = 'http://127.0.0.1:1';
  /** @type {string[]} */
  let replay = [];
  if (stage === 'pre-intent') {
    if (!Number.isInteger(ports.diagnosticHttp)) {
      throw new Error('refused: marker probe requires the diagnostic forward');
    }
    collector = `http://127.0.0.1:${ports.diagnosticHttp}`;
  } else if (stage === 'replay') {
    if (ports.diagnosticHttp !== undefined || input.identity == null) {
      throw new Error('refused: marker replay is query-only');
    }
    replay = [replayArgument(input.identity)];
  } else {
    throw new Error('refused: marker probe stage is invalid');
  }
  const dir = mkdtempSync(join(input.tmpRoot ?? tmpdir(), 'obs-e2-marker-'));
  try {
    const out = join(dir, 'out');
    const now = input.now ?? (() => performance.now());
    const start = input.startChild ?? startOwnedChild;
    const child = start(
      input.python ?? '/usr/bin/python3',
      [
        SIGNAL_PROBE_PATH,
        out,
        collector,
        `http://127.0.0.1:${ports.prometheus}`,
        `http://127.0.0.1:${ports.loki}`,
        `http://127.0.0.1:${ports.tempo}`,
        ...replay,
      ],
      {
        fds: [custody.fd],
        deadline: now() + POSITIVE_WINDOW_MS + CLEANUP_BUDGET_MS,
        now,
        signal: input.signal,
        stdoutLimit: 65_536,
        stderrLimit: 65_536,
      },
    );
    const outcome = await child.outcome;
    await child.closed;
    if (outcome.closeUnconfirmed === true) {
      return { ok: false, reasonCode: 'close-unconfirmed', fence: true };
    }
    /** @type {Record<string,string> | null} */
    let identity = null;
    try {
      identity = parseIdentityBytes(readFileSync(join(out, 'identity.json'), 'utf8'));
    } catch {
      identity = null;
    }
    if (identity == null) {
      return { ok: false, reasonCode: 'identity-missing', fence: stage === 'pre-intent' };
    }
    if (stage === 'replay' && stableIdentity(identity) !== stableIdentity(input.identity)) {
      return { ok: false, reasonCode: 'identity-changed', fence: false };
    }
    const text = outcome.stdout ?? '';
    const positives = Object.fromEntries(
      POSITIVES.map((name) => [name, new RegExp(`^PASS ${name}$`, 'm').test(text)]),
    );
    const ok = outcome.ok === true && POSITIVES.every((name) => positives[name]);
    return {
      ok,
      reasonCode: ok ? 'ok' : outcome.timedOut ? 'timeout' : 'positive-missing',
      // a pre-intent run may already have POSTed: a failure must fence
      fence: !ok && stage === 'pre-intent',
      receipt: buildMarkerReceipt(stage, identity, positives),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** @param {Record<string,string>} identity */
function stableIdentity(identity) {
  return IDENTITY_KEYS.map((key) => identity[key]).join('|');
}

/**
 * Whitelisted receipt: stage, marker identifiers and positive booleans only.
 * @param {string} stage
 * @param {Record<string,string>} identity
 * @param {Record<string, boolean>} positives
 */
export function buildMarkerReceipt(stage, identity, positives) {
  return {
    stage,
    markerIds: markerIdsFromIdentity(identity),
    positives: Object.fromEntries(POSITIVES.map((name) => [name, positives[name] === true])),
  };
}
