import { Buffer } from 'node:buffer';
import { createHash, X509Certificate } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import {
  PREFLIGHT_BUDGET_MS,
  PREFLIGHT_COMMAND_TIMEOUT_MS,
  recheckIdentity,
  runObservabilityReadCommand,
} from './identity.mjs';

/**
 * Read-only, cluster-bound public kubelet trust capture for the dev Kind
 * cluster (G2 construction freeze, "Trust capture and immutable binding").
 * Only public certificate material is read. No bearer token, no remote trust,
 * no writes to the cluster, node or Docker. Nothing is cached across calls.
 */

export const KUBELET_TRUST_UNAVAILABLE = 'kubelet-trust-unavailable';

const MAX_PEM_BYTES = 16 * 1024;
const KUBELET_PORT = 10250;
const KUBELET_DISK_LEAF = '/var/lib/kubelet/pki/kubelet.crt';
const KIND_NETWORK = 'kind';
const NODE_ROLES = [
  { suffix: 'control-plane', role: 'control-plane' },
  { suffix: 'worker', role: 'worker' },
];
const REFUSED_ENV = [
  'KUBECONFIG',
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
  'DOCKER_TLS',
];
const CERT_BLOCK =
  /-----BEGIN CERTIFICATE-----\r?\n([A-Za-z0-9+/=\r\n]+?)-----END CERTIFICATE-----/g;

class TrustUnavailable extends Error {
  /** @param {string} reason fixed token, never command output */
  constructor(reason) {
    super(KUBELET_TRUST_UNAVAILABLE);
    this.name = 'KubeletTrustUnavailable';
    this.code = KUBELET_TRUST_UNAVAILABLE;
    this.reason = reason;
  }
}

/** @param {string} reason */
function fail(reason) {
  throw new TrustUnavailable(reason);
}

/** @param {boolean} cond @param {string} reason */
function need(cond, reason) {
  if (!cond) {
    fail(reason);
  }
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Same deadline semantics as identity.mjs's bounded runner.
 * @param {number} deadline
 * @param {() => number} now
 * @param {typeof runObservabilityReadCommand} underlying
 */
function boundedRunner(deadline, now, underlying) {
  return (command, args, options = {}) => {
    const before = now();
    const remaining = Math.floor(deadline - before);
    if (before >= deadline || remaining <= 0) {
      fail('timeout');
    }
    const timeoutMs = Math.min(PREFLIGHT_COMMAND_TIMEOUT_MS, remaining);
    const result = underlying(command, args, { ...options, timeoutMs });
    if (now() > deadline && result.ok) {
      return { ...result, ok: false, timedOut: true };
    }
    return result;
  };
}

/** @param {string} pem canonical single-certificate PEM from DER */
function canonicalPem(der) {
  const b64 = der.toString('base64');
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
}

/**
 * @param {string} text
 * @param {number} expected
 * @returns {X509Certificate[]}
 */
function extractCertificates(text, expected) {
  need(typeof text === 'string' && !/PRIVATE KEY/.test(text), 'private-material');
  const certs = [];
  for (const match of text.matchAll(CERT_BLOCK)) {
    const der = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
    need(der.length > 0, 'pem-malformed');
    try {
      certs.push(new X509Certificate(der));
    } catch {
      fail('pem-malformed');
    }
  }
  need(certs.length === expected, 'cert-count');
  return certs;
}

function assertLocalEnvironment() {
  for (const key of REFUSED_ENV) {
    const value = process.env[key];
    need(value == null || String(value).length === 0, 'env-override');
  }
}

/**
 * @param {unknown} value
 */
function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Read the two Nodes plus their Kind containers; returns comparable identity
 * facts only (no IPs, no raw inspect output).
 * @param {ReturnType<typeof boundedRunner>} run
 * @param {any} identity
 */
function readNodeBindings(run, identity) {
  const cluster = identity.clusterName;
  need(nonEmptyString(cluster), 'identity');
  const names = NODE_ROLES.map((n) => `${cluster}-${n.suffix}`).sort();

  const nodesResult = run('kubectl', [
    '--kubeconfig',
    identity.snapshotPath,
    '--context',
    identity.contextName,
    'get',
    'nodes',
    '-o',
    'json',
  ]);
  need(nodesResult.ok && !nodesResult.timedOut, 'nodes-unreadable');
  let nodeList;
  try {
    nodeList = JSON.parse(nodesResult.stdout);
  } catch {
    fail('nodes-malformed');
  }
  const items = nodeList?.items;
  need(Array.isArray(items) && items.length === names.length, 'node-count');
  const byName = new Map();
  for (const item of items) {
    const name = item?.metadata?.name;
    need(nonEmptyString(name) && !byName.has(name), 'node-duplicate');
    byName.set(name, item);
  }
  need(names.every((n) => byName.has(n)), 'node-names');

  const nodes = [];
  const seenUid = new Set();
  const seenDocker = new Set();
  for (const name of names) {
    const role = NODE_ROLES.find((n) => `${cluster}-${n.suffix}` === name).role;
    const node = byName.get(name);
    const nodeUid = node.metadata.uid;
    need(nonEmptyString(nodeUid) && !seenUid.has(nodeUid), 'node-uid');
    seenUid.add(nodeUid);
    const internal = (node.status?.addresses ?? []).filter(
      (a) => a?.type === 'InternalIP',
    );
    need(
      internal.length >= 1 && internal.every((a) => nonEmptyString(a.address)),
      'node-address',
    );

    const inspect = run('docker', ['inspect', name]);
    need(inspect.ok && !inspect.timedOut, 'docker-unreadable');
    let containers;
    try {
      containers = JSON.parse(inspect.stdout);
    } catch {
      fail('docker-malformed');
    }
    need(Array.isArray(containers) && containers.length === 1, 'docker-count');
    const c = containers[0];
    const dockerId = c?.Id;
    const labels = c?.Config?.Labels ?? {};
    need(
      typeof dockerId === 'string' &&
        /^[0-9a-f]{64}$/.test(dockerId) &&
        !seenDocker.has(dockerId),
      'docker-id',
    );
    seenDocker.add(dockerId);
    need(c?.State?.Running === true, 'docker-not-running');
    need(
      labels['io.x-k8s.kind.cluster'] === cluster &&
        labels['io.x-k8s.kind.role'] === role &&
        c?.Name === `/${name}`,
      'docker-identity',
    );
    const kindIp = c?.NetworkSettings?.Networks?.[KIND_NETWORK]?.IPAddress;
    need(
      typeof kindIp === 'string' &&
        /^\d{1,3}(\.\d{1,3}){3}$/.test(kindIp) &&
        internal.some((a) => a.address === kindIp),
      'node-network',
    );
    if (role === 'control-plane') {
      need(dockerId === identity.tuple.dockerControlPlaneId, 'control-plane-id');
    }
    nodes.push({ name, nodeUid, dockerId });
  }
  return nodes;
}

/**
 * @param {ReturnType<typeof boundedRunner>} run
 * @param {string} dockerId
 * @param {string[]} args
 */
function dockerExec(run, dockerId, args) {
  const r = run('docker', ['exec', dockerId, ...args]);
  need(r.ok && !r.timedOut && !r.missing, 'exec-failed');
  need(
    typeof r.stdout === 'string' && Buffer.byteLength(r.stdout) < 64 * 1024,
    'exec-output',
  );
  return r.stdout;
}

/**
 * @param {ReturnType<typeof boundedRunner>} run
 * @param {{ name: string, dockerId: string }} node
 * @param {number} nowMs
 * @param {string} dir private temp dir
 */
function captureNodeRoot(run, node, nowMs, dir) {
  const presented = extractCertificates(
    dockerExec(run, node.dockerId, [
      'openssl',
      's_client',
      '-connect',
      `127.0.0.1:${KUBELET_PORT}`,
      '-servername',
      node.name,
      '-showcerts',
    ]),
    2,
  );
  const [leaf, root] = presented;
  const disk = extractCertificates(
    dockerExec(run, node.dockerId, [
      'openssl',
      'x509',
      '-in',
      KUBELET_DISK_LEAF,
      '-outform',
      'PEM',
    ]),
    1,
  )[0];
  need(leaf.fingerprint256 === disk.fingerprint256, 'leaf-disk-mismatch');

  const inWindow = (c) =>
    c.validFromDate.getTime() <= nowMs && nowMs <= c.validToDate.getTime();
  need(inWindow(root) && inWindow(leaf), 'expired');
  need(root.ca === true && root.subject === root.issuer, 'root-not-ca');
  need(root.verify(root.publicKey), 'root-signature');
  need(leaf.ca !== true, 'leaf-is-ca');
  need(leaf.checkIssued(root) && leaf.verify(root.publicKey), 'chain');
  const sans = (leaf.subjectAltName ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('DNS:'))
    .map((s) => s.slice(4));
  need(sans.includes(node.name), 'san');

  const rootPem = canonicalPem(root.raw);
  const leafPem = canonicalPem(leaf.raw);
  need(Buffer.byteLength(rootPem) <= MAX_PEM_BYTES, 'pem-size');
  const rootPath = join(dir, `${node.name}-root.pem`);
  const leafPath = join(dir, `${node.name}-leaf.pem`);
  writeFileSync(rootPath, rootPem, { mode: 0o600 });
  writeFileSync(leafPath, leafPem, { mode: 0o600 });
  const ssl = [
    'verify',
    '-no-CApath',
    '-no-CAstore',
  ];
  const self = run('openssl', [
    ...ssl,
    '-check_ss_sig',
    '-CAfile',
    rootPath,
    rootPath,
  ]);
  need(self.ok && /: OK\s*$/m.test(self.stdout), 'openssl-root');
  const chain = run('openssl', [
    ...ssl,
    '-purpose',
    'sslserver',
    '-verify_hostname',
    node.name,
    '-CAfile',
    rootPath,
    leafPath,
  ]);
  need(chain.ok && /: OK\s*$/m.test(chain.stdout), 'openssl-chain');
  return { caSha256: sha256Hex(root.raw), caPem: rootPem };
}

/**
 * @param {any} identity frozen identity from identity.mjs::captureIdentity
 * @param {{
 *   run?: typeof runObservabilityReadCommand,
 *   now?: () => number,
 *   deadline?: number,
 *   recheck?: typeof recheckIdentity,
 * }} [deps]
 */
export function readDevKubeletTrust(identity, deps = {}) {
  try {
    return capture(identity, deps);
  } catch (error) {
    if (error instanceof TrustUnavailable) {
      throw error;
    }
    // Any unexpected failure is reduced to the fixed sanitized error.
    throw new TrustUnavailable('unexpected');
  }
}

function capture(identity, deps) {
  assertLocalEnvironment();
  need(
    identity?.profileId === 'dev' &&
      identity.tuple?.profileId === 'dev' &&
      nonEmptyString(identity.contextName) &&
      nonEmptyString(identity.snapshotPath) &&
      nonEmptyString(identity.tuple.kubeSystemUid) &&
      nonEmptyString(identity.tuple.baselineUid) &&
      nonEmptyString(identity.tuple.dockerControlPlaneId) &&
      (String(identity.tuple.dockerEndpointHost).startsWith('unix:///') ||
        identity.tuple.dockerEndpointHost ===
          'npipe:////./pipe/dockerDesktopLinuxEngine'),
    'identity',
  );
  const now = deps.now ?? (() => Date.now());
  const started = now();
  const deadline = deps.deadline ?? started + PREFLIGHT_BUDGET_MS;
  need(deadline > started, 'deadline');
  const baseRun = deps.run ?? runObservabilityReadCommand;
  const run = boundedRunner(deadline, now, baseRun);
  const recheck = deps.recheck ?? recheckIdentity;
  const recheckOk = () => {
    let outcome;
    try {
      outcome = recheck(identity, { run: baseRun, now, deadline });
    } catch {
      fail('identity-recheck');
    }
    need(outcome?.ok === true, 'identity-recheck');
  };

  recheckOk();
  const first = readNodeBindings(run, identity);

  const dir = mkdtempSync(join(tmpdir(), 'kubelet-trust-'));
  let captured;
  try {
    captured = first.map((node) => ({
      ...node,
      ...captureNodeRoot(run, node, now(), dir),
    }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  const second = readNodeBindings(run, identity);
  need(JSON.stringify(first) === JSON.stringify(second), 'identity-drift');
  recheckOk();

  const body = {
    schema: 1,
    contextName: identity.contextName,
    kubeSystemUid: identity.tuple.kubeSystemUid,
    baselineUid: identity.tuple.baselineUid,
    nodes: captured.map((n) => ({
      name: n.name,
      nodeUid: n.nodeUid,
      dockerId: n.dockerId,
      caSha256: n.caSha256,
      caPem: n.caPem,
    })),
  };
  return {
    ...body,
    bindingSha256: sha256Hex(Buffer.from(JSON.stringify(body), 'utf8')),
  };
}
