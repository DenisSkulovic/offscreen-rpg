import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DEV_CNPG_NAMESPACE } from '../../../../infra/platform/postgres/config.mjs';
import { DEV_S3_NAMESPACE } from '../../../../infra/platform/object-storage/dev-bootstrap.mjs';
import { deriveDevS3Tenant } from '../adapters/dev-s3-tenant.mjs';
import { deriveDevSqlTenant } from './dev-sql-tenant-contract.mjs';
import { buildRuntimeDatabaseUrl } from './dev-slot-runtime-url.mjs';
import { renderDevSlotAppGraph } from './dev-slot-app-graph.mjs';
import { readPlatformObject } from '../../../../infra/platform/common/commands.mjs';
import { readPlatformProfile } from '../../../../infra/platform/common/profile.mjs';

const PROFILE_ID = 'dev';
const HOST = 'dev-pg-rw.offscreen-dev-postgres.svc.cluster.local:5432';
const OWNER = 'offscreen-dev';
const TOKEN_KEYS = Object.freeze([
  'game-authority-service-token',
  'game-authority-control-token',
  'game-authority-executor-token',
]);
const TOKEN_PATTERN = /^[0-9a-f]{48}$/;

/**
 * Successful schema proof from the in-process migration stage only; no pod SQL count.
 *
 * @param {{ slotId: string }} record
 * @param {{ ok?: boolean, slotId?: string, appliedMigrations?: unknown, expectedMigrations?: unknown }} proof
 */
export function assertDevSchemaProjectionProof(record, proof) {
  if (!proof || proof.ok !== true) {
    throw new Error('schema proof missing');
  }
  if (proof.slotId !== record.slotId) {
    throw new Error(`schema proof slot ${proof.slotId ?? 'missing'}`);
  }
  const applied = proof.appliedMigrations;
  const expected = proof.expectedMigrations;
  if (!Number.isInteger(applied) || !Number.isInteger(expected)) {
    throw new Error('schema proof count');
  }
  if (applied !== expected) {
    throw new Error(`schema gate ${applied}`);
  }
}

/**
 * Projection identities and rendered documents must never surface secret values.
 *
 * @param {{
 *   record: { slotId?: string, namespace?: string },
 *   dbUid: string,
 *   s3Uid: string,
 *   appUid: string,
 *   images?: object,
 *   documents?: unknown[],
 * }} report
 */
export function assertDevSlotProjectionRedacted(report) {
  const identity = {
    slotId: report.record?.slotId,
    namespace: report.record?.namespace,
    dbUid: report.dbUid,
    s3Uid: report.s3Uid,
    appUid: report.appUid,
    images: report.images,
  };
  const serialized = JSON.stringify(identity);
  if (/password|secret-access-key|github-client-secret/i.test(serialized)) {
    throw new Error('projection report included a credential');
  }
  const docText = JSON.stringify(report.documents ?? []);
  if (/postgres(?:ql)?:\/\/[^/\s]+:[^@\s]+@/i.test(docText)) {
    throw new Error('projection report included a credential');
  }
  return report;
}

function kubectl(args, input) {
  const profile = readPlatformProfile(PROFILE_ID);
  return execFileSync('kubectl', ['--context', profile.contextName, ...args], {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

/**
 * @param {(args: string[], input?: string) => string} kubectlFn
 */
export function makeRunFromKubectl(kubectlFn) {
  return (command, args, options = {}) => {
    if (command !== 'kubectl') {
      return {
        ok: false,
        status: null,
        stdout: '',
        stderr: 'unsupported command',
        timedOut: false,
        missing: false,
      };
    }
    try {
      const stdout = kubectlFn(args, options.input);
      return {
        ok: true,
        status: 0,
        stdout: stdout ?? '',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    } catch (error) {
      const err =
        /** @type {NodeJS.ErrnoException & { status?: number, stdout?: string | Buffer, stderr?: string | Buffer }} */ (
          error
        );
      if (err.code === 'ENOENT') {
        return {
          ok: false,
          status: null,
          stdout: '',
          stderr: '',
          timedOut: false,
          missing: true,
        };
      }
      const status = err.status ?? 1;
      const stdout =
        typeof err.stdout === 'string'
          ? err.stdout
          : err.stdout != null
            ? String(err.stdout)
            : '';
      const stderr =
        typeof err.stderr === 'string'
          ? err.stderr
          : err.stderr != null
            ? String(err.stderr)
            : String(error);
      return {
        ok: false,
        status,
        stdout,
        stderr,
        timedOut: false,
        missing: false,
      };
    }
  };
}

/**
 * @param {object} object
 * @returns {Record<string, string>}
 */
export function decodeSecretStringData(object) {
  /** @type {Record<string, string>} */
  const out = {};
  const data = object?.data ?? {};
  for (const [key, encoded] of Object.entries(data)) {
    if (typeof encoded !== 'string') continue;
    out[key] = Buffer.from(encoded, 'base64').toString('utf8');
  }
  const stringData = object?.stringData ?? {};
  for (const [key, value] of Object.entries(stringData)) {
    if (typeof value !== 'string') continue;
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/**
 * @param {Record<string, string>} fields
 * @param {Record<string, string>} expected
 * @param {readonly string[]} keys
 * @returns {string[]}
 */
export function mismatchedFieldNames(fields, expected, keys) {
  /** @type {string[]} */
  const names = [];
  for (const key of keys) {
    if (!(key in fields) || fields[key] !== expected[key]) names.push(key);
  }
  return names;
}

/**
 * @param {object | undefined} metadata
 * @param {string} name
 * @param {string} slotId
 */
function assertOwnedDevSecretMetadata(metadata, name, slotId) {
  if (metadata?.name !== name) {
    throw new Error(`backing secret name mismatch for ${name}`);
  }
  if (typeof metadata?.uid !== 'string' || metadata.uid.length === 0) {
    throw new Error(`secret ${name} missing uid`);
  }
  const observedSlot = metadata?.labels?.['offscreen.dev/slot'];
  const observedOwner = metadata?.labels?.['offscreen.dev/owner'];
  if (observedSlot !== slotId || observedOwner !== OWNER) {
    throw new Error(`backing secret ${name} belongs to another slot`);
  }
}

/**
 * @param {(spec: import('../../../../infra/platform/common/commands.mjs').readPlatformObject extends (...args: never) => infer R ? Parameters<typeof readPlatformObject>[0] : never) => ReturnType<typeof readPlatformObject>} readObject
 * @param {string} namespace
 * @param {string} slotId
 */
function assertDevSlotNamespace(readObject, namespace, slotId) {
  const observed = readObject({
    profileId: PROFILE_ID,
    resource: 'namespace',
    name: namespace,
  });
  if (observed.state === 'unreadable') {
    throw new Error(`namespace ${namespace} unreadable`);
  }
  if (observed.state === 'absent') {
    return;
  }
  const label = observed.object?.metadata?.labels?.['offscreen.dev/slot'];
  if (label != null && label !== slotId) {
    throw new Error(`namespace ${namespace} belongs to another slot`);
  }
}

/**
 * @param {(args: string[], input?: string) => string} kubectlFn
 * @param {string} namespace
 * @param {string} name
 * @param {string} slotId
 * @param {{ readObject?: (spec: { profileId: 'dev', resource: string, name: string, namespace?: string }) => ReturnType<typeof readPlatformObject> }} [deps]
 */
export function readOwnedBackingSecret(
  kubectlFn,
  namespace,
  name,
  slotId,
  deps = {},
) {
  const run = deps.run ?? makeRunFromKubectl(kubectlFn);
  const readObject =
    deps.readObject ?? ((spec) => readPlatformObject(spec, { run }));
  const result = readObject({
    profileId: PROFILE_ID,
    resource: 'secret',
    name,
    namespace,
  });
  if (result.state === 'unreadable') {
    throw new Error(`backing secret ${name} unreadable`);
  }
  if (result.state === 'absent') {
    throw new Error(`backing secret ${name} missing`);
  }
  assertOwnedDevSecretMetadata(result.object?.metadata, name, slotId);
  return { uid: result.object.metadata.uid, data: result.object.data ?? {} };
}

function decode(data, key) {
  const value = data[key];
  if (!value) throw new Error(`missing ${key}`);
  return Buffer.from(value, 'base64').toString();
}

function approvedOauthFromText(text) {
  const found = {};
  for (const line of text.split('\n')) {
    const match =
      /^(GITHUB_CLIENT_ID|GITHUB_CLIENT_SECRET|BETTER_AUTH_SECRET)=(.*)$/.exec(
        line,
      );
    if (match) found[match[1]] = match[2];
  }
  if (
    !found.GITHUB_CLIENT_ID ||
    !found.GITHUB_CLIENT_SECRET ||
    (found.BETTER_AUTH_SECRET ?? '').length < 32
  ) {
    throw new Error('approved local OAuth configuration is missing');
  }
  return found;
}

/**
 * Same key and length contract as projectDevSlot. Unreadable files and
 * parser failures stay redacted: the thrown message never includes file text.
 * @param {string} path
 */
export function assertApprovedOauthFile(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new Error('approved local OAuth configuration is unreadable');
  }
  try {
    return approvedOauthFromText(text);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'approved local OAuth configuration is missing'
    )
      throw error;
    throw new Error('approved local OAuth configuration is missing', {
      cause: error,
    });
  }
}

/**
 * @param {Record<string, string> | null} existingFields
 * @param {{ GITHUB_CLIENT_ID: string, GITHUB_CLIENT_SECRET: string, BETTER_AUTH_SECRET: string }} oauth
 * @param {string} slotId
 * @param {(size: number) => Buffer} rand
 */
function buildAppStringData(existingFields, oauth, slotId, rand) {
  const authSecret = createHash('sha256')
    .update(`${oauth.BETTER_AUTH_SECRET}:${slotId}`)
    .digest('hex');
  /** @type {Record<string, string>} */
  const stringData = {
    'better-auth-secret': authSecret,
    'github-client-id': oauth.GITHUB_CLIENT_ID,
    'github-client-secret': oauth.GITHUB_CLIENT_SECRET,
  };
  for (const key of TOKEN_KEYS) {
    if (existingFields) {
      const value = existingFields[key];
      if (
        !(key in existingFields) ||
        typeof value !== 'string' ||
        !TOKEN_PATTERN.test(value)
      ) {
        throw new Error(`secret field mismatch: ${key}`);
      }
      stringData[key] = value;
    } else {
      stringData[key] = rand(24).toString('hex');
    }
  }
  return stringData;
}

/**
 * @param {ReturnType<typeof readPlatformObject>} observed
 * @param {string} name
 * @param {{ 'offscreen.dev/slot': string, 'offscreen.dev/owner': string }} labels
 * @param {Record<string, string>} stringData
 */
function adoptOwnedSecret(observed, name, labels, stringData) {
  const meta = observed.object?.metadata;
  if (meta?.name !== name) {
    throw new Error(`secret ${name} name mismatch`);
  }
  if (typeof meta?.uid !== 'string' || meta.uid.length === 0) {
    throw new Error(`secret ${name} missing uid`);
  }
  const observedSlot = meta.labels?.['offscreen.dev/slot'];
  const observedOwner = meta.labels?.['offscreen.dev/owner'];
  if (
    observedSlot !== labels['offscreen.dev/slot'] ||
    observedOwner !== labels['offscreen.dev/owner']
  ) {
    throw new Error(`secret ${name} belongs to another slot`);
  }
  const existing = decodeSecretStringData(observed.object);
  const mismatch = mismatchedFieldNames(
    existing,
    stringData,
    Object.keys(stringData),
  );
  if (mismatch.length > 0) {
    throw new Error(`secret field mismatch: ${mismatch.join(', ')}`);
  }
  return meta.uid;
}

/**
 * @param {(args: string[], input?: string) => string} kubectlFn
 * @param {string} namespace
 * @param {string} name
 * @param {Record<string, string>} stringData
 * @param {{ 'offscreen.dev/slot': string, 'offscreen.dev/owner': string }} labels
 * @param {{ run?: ReturnType<typeof makeRunFromKubectl>, readObject?: (spec: { profileId: 'dev', resource: string, name: string, namespace?: string }) => ReturnType<typeof readPlatformObject> }} [deps]
 */
export function applyDevSlotSecret(
  kubectlFn,
  namespace,
  name,
  stringData,
  labels,
  deps = {},
) {
  const profile = readPlatformProfile(PROFILE_ID);
  const run = deps.run ?? makeRunFromKubectl(kubectlFn);
  const readObject =
    deps.readObject ?? ((spec) => readPlatformObject(spec, { run }));

  const observed = readObject({
    profileId: PROFILE_ID,
    resource: 'secret',
    name,
    namespace,
  });
  if (observed.state === 'unreadable') {
    throw new Error(`secret ${name} unreadable`);
  }
  if (observed.state === 'present') {
    return adoptOwnedSecret(observed, name, labels, stringData);
  }

  const body = {
    apiVersion: 'v1',
    kind: 'Secret',
    type: 'Opaque',
    metadata: { name, namespace, labels },
    stringData,
  };
  const created = run(
    'kubectl',
    ['--context', profile.contextName, '-n', namespace, 'create', '-f', '-'],
    { input: `${JSON.stringify(body)}\n` },
  );
  if (!created.ok) {
    const again = readObject({
      profileId: PROFILE_ID,
      resource: 'secret',
      name,
      namespace,
    });
    if (again.state !== 'present') {
      throw new Error(`secret ${name} unreadable after create`);
    }
    return adoptOwnedSecret(again, name, labels, stringData);
  }

  const readBack = readObject({
    profileId: PROFILE_ID,
    resource: 'secret',
    name,
    namespace,
  });
  if (readBack.state !== 'present') {
    throw new Error(`secret ${name} unreadable after create`);
  }
  return adoptOwnedSecret(readBack, name, labels, stringData);
}

/**
 * @param {{
 *   oauthFile?: string,
 *   record: import('../domain/dev-worktree-registry.mjs').DevWorktreeOwnerRecord,
 *   oauth?: { GITHUB_CLIENT_ID: string, GITHUB_CLIENT_SECRET: string, BETTER_AUTH_SECRET: string },
 *   schemaProof: { ok: true, slotId: string, appliedMigrations: number, expectedMigrations: number },
 *   deps?: {
 *     kubectl?: (args: string[], input?: string) => string,
 *     randomBytes?: (size: number) => Buffer,
 *     readObject?: (spec: { profileId: 'dev', resource: string, name: string, namespace?: string }) => ReturnType<typeof readPlatformObject>,
 *   },
 * }} options
 */
export function projectDevSlot(options) {
  if (!options?.record) {
    throw new Error('selected owner is missing');
  }
  const record = options.record;
  assertDevSchemaProjectionProof(record, options.schemaProof);

  const kubectlFn = options.deps?.kubectl ?? kubectl;
  const run = makeRunFromKubectl(kubectlFn);
  const readObject =
    options.deps?.readObject ?? ((spec) => readPlatformObject(spec, { run }));
  const sql = deriveDevSqlTenant(record.slotId);
  const s3 = deriveDevS3Tenant(record.slotId);
  if (record.namespace !== sql.appNamespace) {
    throw new Error(
      `allocator namespace ${record.namespace} does not match slot ${record.slotId}`,
    );
  }

  assertDevSlotNamespace(readObject, record.namespace, record.slotId);

  const runBacking = readOwnedBackingSecret(
    kubectlFn,
    DEV_CNPG_NAMESPACE,
    sql.runtimeSecret,
    record.slotId,
    { run, readObject },
  );
  const username = decode(runBacking.data, 'username');
  if (username !== sql.runtimeRole) throw new Error('runtime secret username');

  const backingS3 = readOwnedBackingSecret(
    kubectlFn,
    DEV_S3_NAMESPACE,
    s3.secret,
    record.slotId,
    { run, readObject },
  );
  for (const key of ['access-key-id', 'secret-access-key']) {
    if (!backingS3.data[key]) throw new Error(`s3 key ${key}`);
  }

  const oauth = options.oauth ?? assertApprovedOauthFile(options.oauthFile);
  const rand = options.deps?.randomBytes ?? randomBytes;
  const labels = {
    'offscreen.dev/slot': record.slotId,
    'offscreen.dev/owner': OWNER,
  };
  const runSecret = `${record.slotId}-run-auth`;
  const s3Secret = `${record.slotId}-s3`;
  const appSecret = `${record.slotId}-app`;

  const uri = buildRuntimeDatabaseUrl({
    username,
    password: decode(runBacking.data, 'password'),
    database: sql.database,
    host: HOST,
  });
  const dbStringData = { uri };
  const s3StringData = {
    'access-key-id': decode(backingS3.data, 'access-key-id'),
    'secret-access-key': decode(backingS3.data, 'secret-access-key'),
  };

  /** @type {Record<string, { fields: Record<string, string> } | null>} */
  const preRead = {};
  for (const [name, intended] of [
    [runSecret, dbStringData],
    [s3Secret, s3StringData],
    [appSecret, null],
  ]) {
    const observed = readObject({
      profileId: PROFILE_ID,
      resource: 'secret',
      name,
      namespace: record.namespace,
    });
    if (observed.state === 'unreadable') {
      throw new Error(`secret ${name} unreadable`);
    }
    if (observed.state === 'absent') {
      preRead[name] = null;
      continue;
    }
    const meta = observed.object?.metadata;
    if (typeof meta?.uid !== 'string' || meta.uid.length === 0) {
      throw new Error(`secret ${name} missing uid`);
    }
    const observedSlot = meta.labels?.['offscreen.dev/slot'];
    const observedOwner = meta.labels?.['offscreen.dev/owner'];
    if (
      observedSlot !== labels['offscreen.dev/slot'] ||
      observedOwner !== labels['offscreen.dev/owner']
    ) {
      throw new Error(`secret ${name} belongs to another slot`);
    }
    const fields = decodeSecretStringData(observed.object);
    if (intended) {
      const mismatch = mismatchedFieldNames(
        fields,
        intended,
        Object.keys(intended),
      );
      if (mismatch.length > 0) {
        throw new Error(`secret field mismatch: ${mismatch.join(', ')}`);
      }
    }
    preRead[name] = { fields };
  }

  const appStringData = buildAppStringData(
    preRead[appSecret]?.fields ?? null,
    oauth,
    record.slotId,
    rand,
  );
  if (preRead[appSecret]) {
    const mismatch = mismatchedFieldNames(
      preRead[appSecret].fields,
      appStringData,
      Object.keys(appStringData),
    );
    if (mismatch.length > 0) {
      throw new Error(`secret field mismatch: ${mismatch.join(', ')}`);
    }
  }

  const graph = renderDevSlotAppGraph(record.slotId, {
    schemaReady: true,
    ports: record.ports,
  });
  kubectlFn(['apply', '-f', '-'], JSON.stringify(graph.documents[0]));

  const deps = { run, readObject };
  const dbUid = applyDevSlotSecret(
    kubectlFn,
    record.namespace,
    runSecret,
    dbStringData,
    labels,
    deps,
  );
  const s3Uid = applyDevSlotSecret(
    kubectlFn,
    record.namespace,
    s3Secret,
    s3StringData,
    labels,
    deps,
  );
  const appUid = applyDevSlotSecret(
    kubectlFn,
    record.namespace,
    appSecret,
    appStringData,
    labels,
    deps,
  );

  return assertDevSlotProjectionRedacted({
    record,
    dbUid,
    s3Uid,
    appUid,
    images: graph.images,
    documents: graph.documents,
  });
}
