import { readPlatformProfile } from '../../../common/profile.mjs';
import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  DEV_S3_OWNER,
} from '../../dev-bootstrap.mjs';

const SLOT_ID = /^dev-([1-9][0-9]*)$/;
const POLICY_VERSION = '2012-10-17';
const OBJECT_ACTIONS = Object.freeze([
  's3:GetObject',
  's3:PutObject',
  's3:DeleteObject',
]);
const LIST_ACTION = 's3:ListBucket';

/**
 * @param {'dev' | 'release'} profileId
 * @param {string | undefined} slotId
 */
export function deriveObjectStorageTenant(profileId, slotId) {
  const profile = readPlatformProfile(profileId);
  if (profileId === 'dev') {
    const match = SLOT_ID.exec(slotId ?? '');
    if (!match) {
      throw new Error(`slot id ${slotId} is not dev-<positive integer>`);
    }
    const digits = match[1];
    const bucket = `offscreen-dev-${digits}`;
    const user = `dev-${digits}`;
    const secret = `dev-${digits}-s3`;
    return {
      profileId,
      slotId: `dev-${digits}`,
      bucket,
      user,
      secret,
      policyName: `${bucket}-${user}-readwrite`,
      context: DEV_S3_CONTEXT,
      namespace: DEV_S3_NAMESPACE,
      owner: DEV_S3_OWNER,
      role: 'readwrite',
    };
  }
  const bucket = 'lab-objects';
  const user = 'release-game';
  return {
    profileId,
    slotId: null,
    bucket,
    user,
    secret: 'game-s3',
    policyName: `${bucket}-${user}-readwrite`,
    context: profile.contextName,
    namespace: profile.namespaces.objectStorage,
    owner: profile.ownerValue,
    role: 'readwrite',
  };
}

/**
 * @param {string} bucket
 */
export function expectedTenantPolicy(bucket) {
  const objectArn = `arn:aws:s3:::${bucket}/*`;
  const bucketArn = `arn:aws:s3:::${bucket}`;
  return {
    Version: POLICY_VERSION,
    Statement: [
      {
        Effect: 'Allow',
        Action: [...OBJECT_ACTIONS],
        Resource: objectArn,
      },
      {
        Effect: 'Allow',
        Action: LIST_ACTION,
        Resource: bucketArn,
      },
    ],
  };
}

const FORBIDDEN_STATEMENT_KEYS = new Set([
  'NotAction',
  'NotResource',
  'Condition',
  'Principal',
]);

/**
 * @param {unknown} value
 * @returns {string[] | null}
 */
function normalizeStringArray(value, fieldName) {
  if (typeof value === 'string' && value.length > 0) return [value];
  if (!Array.isArray(value)) return null;
  const out = [];
  const seen = new Set();
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) return null;
    if (seen.has(item)) return null;
    seen.add(item);
    out.push(item);
  }
  if (out.length === 0) return null;
  return out;
}

/**
 * @param {string} resource
 * @param {string} bucket
 * @param {'object' | 'bucket'} kind
 */
function resourceMatches(resource, bucket, kind) {
  const exactObject = `arn:aws:s3:::${bucket}/*`;
  const exactBucket = `arn:aws:s3:::${bucket}`;
  if (kind === 'object') {
    if (resource !== exactObject) return false;
    if (resource.includes('*') && resource !== exactObject) return false;
    return true;
  }
  if (resource !== exactBucket) return false;
  if (resource.includes('*')) return false;
  return true;
}

/**
 * @param {unknown} statement
 * @param {string} bucket
 * @returns {'object' | 'bucket' | null}
 */
function classifyStatement(statement, bucket) {
  if (!statement || typeof statement !== 'object' || Array.isArray(statement)) {
    return null;
  }
  const keys = Object.keys(statement);
  for (const key of keys) {
    if (FORBIDDEN_STATEMENT_KEYS.has(key)) return null;
    if (key !== 'Effect' && key !== 'Action' && key !== 'Resource') return null;
  }
  if (statement.Effect !== 'Allow') return null;
  const actions = normalizeStringArray(statement.Action, 'Action');
  const resources = normalizeStringArray(statement.Resource, 'Resource');
  if (!actions || !resources || resources.length !== 1) return null;
  const resource = resources[0];
  const actionSet = new Set(actions);
  if (
    actionSet.size === OBJECT_ACTIONS.length &&
    OBJECT_ACTIONS.every((action) => actionSet.has(action)) &&
    resourceMatches(resource, bucket, 'object')
  ) {
    return 'object';
  }
  if (
    actions.length === 1 &&
    actions[0] === LIST_ACTION &&
    resourceMatches(resource, bucket, 'bucket')
  ) {
    return 'bucket';
  }
  return null;
}

/**
 * @param {unknown} actualJson
 * @param {string} bucket
 */
export function policyMatchesExpected(actualJson, bucket) {
  if (
    !actualJson ||
    typeof actualJson !== 'object' ||
    Array.isArray(actualJson)
  ) {
    return false;
  }
  const docKeys = Object.keys(actualJson);
  if (
    docKeys.length !== 2 ||
    !docKeys.includes('Version') ||
    !docKeys.includes('Statement')
  ) {
    return false;
  }
  if (actualJson.Version !== POLICY_VERSION) return false;
  if (!Array.isArray(actualJson.Statement)) return false;
  if (actualJson.Statement.length !== 2) return false;

  const kinds = new Set();
  for (const statement of actualJson.Statement) {
    const kind = classifyStatement(statement, bucket);
    if (!kind || kinds.has(kind)) return false;
    kinds.add(kind);
  }
  return kinds.has('object') && kinds.has('bucket');
}

/**
 * @param {string} text
 */
export function parsePolicyDocumentStrict(text) {
  const source = String(text ?? '');
  assertNoDuplicateJsonKeys(source);
  try {
    return JSON.parse(source);
  } catch {
    const parseError = new Error('policy JSON is malformed');
    parseError.code = 'policy-malformed';
    throw parseError;
  }
}

/**
 * @param {string} text
 */
function assertNoDuplicateJsonKeys(text) {
  const objectKeyStacks = [];
  let index = 0;
  let inString = false;
  let escaped = false;
  const duplicate = () => {
    const error = new Error('duplicate JSON key');
    error.code = 'policy-duplicate-key';
    throw error;
  };

  while (index < text.length) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      index++;
      continue;
    }
    if (char === '"') {
      const keyStart = index + 1;
      index++;
      while (index < text.length) {
        const inner = text[index];
        if (inner === '\\') {
          index += 2;
          continue;
        }
        if (inner === '"') break;
        index++;
      }
      if (index >= text.length) break;
      let key;
      try {
        key = JSON.parse(text.slice(keyStart - 1, index + 1));
      } catch {
        throw new Error('policy JSON is malformed');
      }
      index++;
      let cursor = index;
      while (cursor < text.length && /\s/.test(text[cursor])) cursor++;
      if (text[cursor] === ':' && objectKeyStacks.length > 0) {
        const seen = objectKeyStacks[objectKeyStacks.length - 1];
        if (seen.has(key)) duplicate();
        seen.add(key);
      }
      index = cursor;
      continue;
    }
    if (char === '{') {
      objectKeyStacks.push(new Set());
      index++;
      continue;
    }
    if (char === '}') {
      objectKeyStacks.pop();
      index++;
      continue;
    }
    index++;
  }
}

/**
 * @typedef {object} TenantObservation
 * @property {null | { name: string, owner: string }} bucket
 * @property {null | {
 *   name: string,
 *   enabled: boolean,
 *   source: string,
 *   policies: string[],
 *   actions: string[],
 *   serviceAccounts: unknown[],
 *   credentials: { accessKey: string, status: string }[],
 * }} user
 * @property {string[] | null} policyInventory
 * @property {null | object} policyDocument
 * @property {boolean | null} groupsEmpty
 * @property {null | { name: string, uid: string, accessKeyId: string }} secret
 * @property {{ name: string, state: 'absent' | 'present' | 'unknown' }[]} bucketPolicies
 * @property {'ok' | 'denied' | 'unknown' | null} headBucket
 * @property {boolean} unreadable
 */

/**
 * @param {ReturnType<typeof deriveObjectStorageTenant>} tenant
 * @param {TenantObservation} observation
 */
export function classifyTenantObservation(tenant, observation) {
  if (observation.unreadable) {
    return { state: 'unknown', reason: 'observation-unreadable' };
  }
  if (
    !Array.isArray(observation.policyInventory) ||
    observation.policyInventory.some(name => typeof name !== 'string' || !name) ||
    new Set(observation.policyInventory).size !== observation.policyInventory.length ||
    typeof observation.groupsEmpty !== 'boolean' ||
    !Array.isArray(observation.bucketPolicies)
  ) {
    return { state: 'unknown', reason: 'required-inventory-missing' };
  }
  if (observation.bucketPolicies.some((entry) => !entry || typeof entry.name !== 'string' || !entry.name || !['absent', 'present'].includes(entry.state)) ||
      new Set(observation.bucketPolicies.map(entry => entry.name)).size !== observation.bucketPolicies.length) {
    return { state: 'unknown', reason: 'bucket-policy-unknown' };
  }

  const bucketAbsent = observation.bucket === null;
  const userAbsent = observation.user === null;
  const secretAbsent = observation.secret === null;
  const policyAbsent = !observation.policyInventory.includes(tenant.policyName);

  if (
    bucketAbsent &&
    userAbsent &&
    policyAbsent &&
    secretAbsent &&
    observation.groupsEmpty === true &&
    observation.bucketPolicies.every((entry) => entry.state === 'absent')
  ) {
    return { state: 'absent', reason: 'tuple-absent' };
  }

  if (
    observation.bucket &&
    observation.bucket.owner !== tenant.user &&
    observation.bucket.owner !== 'pending'
  ) {
    return { state: 'refused', reason: 'bucket-owner-mismatch' };
  }

  if (!policyAbsent && bucketAbsent && userAbsent && secretAbsent) {
    return { state: 'refused', reason: 'orphan-policy' };
  }

  const corePresent =
    Number(!bucketAbsent) + Number(!userAbsent) + Number(!secretAbsent);
  if (corePresent > 0 && corePresent < 3) {
    return { state: 'refused', reason: 'partial-tuple' };
  }

  const reuseChecks = () => {
    if (!observation.bucket || observation.bucket.name !== tenant.bucket || observation.bucket.owner !== tenant.user) {
      return 'bucket-owner-mismatch';
    }
    const user = observation.user;
    if (!user || user.name !== tenant.user || user.enabled !== true) return 'user-disabled';
    if (user.source !== 'dynamic') return 'user-source';
    if (
      !Array.isArray(user.policies) ||
      user.policies.length !== 1 ||
      user.policies[0] !== tenant.policyName
    ) {
      return 'user-policies';
    }
    if (!Array.isArray(user.actions) || user.actions.length !== 0) {
      return 'user-actions';
    }
    if (
      !Array.isArray(user.serviceAccounts) ||
      user.serviceAccounts.length !== 0
    ) {
      return 'user-service-accounts';
    }
    if (!observation.secret || observation.secret.name !== tenant.secret ||
        typeof observation.secret.uid !== 'string' || !observation.secret.uid) {
      return 'secret-name';
    }
    const credentials = user.credentials ?? [];
    if (!Array.isArray(credentials) || credentials.length !== 1) return 'credential-count';
    const credential = credentials[0];
    if (
      !credential || typeof credential.accessKey !== 'string' || !credential.accessKey ||
      typeof credential.status !== 'string' ||
      credential.status.toLowerCase() !== 'active'
    ) {
      return 'credential-status';
    }
    if (credential.accessKey !== observation.secret.accessKeyId) {
      return 'credential-access-key';
    }
    if (!observation.policyInventory.includes(tenant.policyName)) {
      return 'policy-inventory';
    }
    if (
      !observation.policyDocument ||
      !policyMatchesExpected(observation.policyDocument, tenant.bucket)
    ) {
      return 'policy-document';
    }
    if (observation.groupsEmpty !== true) return 'groups-present';
    if (
      !observation.bucketPolicies.every((entry) => entry.state === 'absent')
    ) {
      return 'foreign-bucket-policy';
    }
    if (observation.headBucket !== 'ok') return 'head-bucket';
    return null;
  };

  const reuseFailure = reuseChecks();
  if (reuseFailure === null) {
    return { state: 'reuse', reason: 'tuple-exact' };
  }

  return { state: 'refused', reason: reuseFailure };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   authorize?: boolean,
 *   slotId?: string,
 *   readObservation: (tenant: ReturnType<typeof deriveObjectStorageTenant>) => Promise<TenantObservation> | TenantObservation,
 *   writeFresh: (tenant: ReturnType<typeof deriveObjectStorageTenant>) => Promise<{ ok?: boolean, ambiguous?: boolean, mutated?: boolean } | void>,
 *   s3?: unknown,
 * }} deps
 */
export async function ensureObjectStorageTenant(profileId, deps) {
  if (deps.authorize !== true) {
    return { ok: false, mutated: false, reason: 'not-authorized' };
  }
  const tenant = deriveObjectStorageTenant(profileId, deps.slotId);
  const observation = await deps.readObservation(tenant);
  const classified = classifyTenantObservation(tenant, observation);

  if (classified.state === 'unknown' || classified.state === 'refused') {
    return {
      ok: false,
      mutated: false,
      reason: classified.reason,
      state: classified.state,
    };
  }
  if (classified.state === 'reuse') {
    return {
      ok: true,
      mutated: false,
      reason: classified.reason,
      state: 'reuse',
    };
  }

  try {
    const writeResult = await deps.writeFresh(tenant);
    if (writeResult?.ambiguous === true) {
      return {
        ok: false,
        mutated: Boolean(writeResult.mutated),
        reason: 'write-ambiguous',
        state: 'unknown',
      };
    }
    if (writeResult && writeResult.ok === false) {
      return {
        ok: false,
        mutated: Boolean(writeResult.mutated),
        reason: writeResult.reason ?? 'write-refused',
        state: 'refused',
      };
    }
    const after = classifyTenantObservation(tenant, await deps.readObservation(tenant));
    if (after.state !== 'reuse') {
      return { ok: false, mutated: true, reason: after.reason, state: after.state === 'absent' ? 'unknown' : after.state };
    }
    return { ok: true, mutated: true, reason: after.reason, state: 'reuse' };
  } catch (error) {
    return {
      ok: false,
      mutated: true,
      reason: 'write-failed',
      state: 'unknown',
    };
  }
}

/**
 * @param {ReturnType<typeof deriveObjectStorageTenant>} tenant
 * @param {{ accessKeyId: string, secretAccessKey: string }} credentials
 */
export function buildFreshTenantWrites(tenant, credentials) {
  const secretManifest = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: tenant.secret,
      namespace: tenant.namespace,
      labels: {
        ...(tenant.profileId === 'dev'
          ? {
              'offscreen.dev/owner': tenant.owner,
              'offscreen.dev/slot': tenant.slotId,
            }
          : {
              'offscreen.rpg/owner': tenant.owner,
            }),
      },
    },
    type: 'Opaque',
    stringData: {
      'access-key-id': credentials.accessKeyId,
      'secret-access-key': credentials.secretAccessKey,
    },
  };
  return {
    commands: [
      `s3.bucket.create -name ${tenant.bucket}`,
      `s3.user.provision -name ${tenant.user} -bucket ${tenant.bucket} -role readwrite`,
      {
        argv: ['kubectl', 'create', '-f', '-'],
        stdinField: 'secretStdin',
      },
    ],
    secretStdin: JSON.stringify(secretManifest),
  };
}
