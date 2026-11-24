import { spawnSync } from 'node:child_process';
import {
  DEV_S3_CONTEXT,
  DEV_S3_IMAGE,
  DEV_S3_NAMESPACE,
  DEV_S3_OWNER,
  DEV_S3_PVC,
  DEV_S3_SECRET,
} from '../../../../infra/platform/object-storage/dev-bootstrap.mjs';

const TRANSPORT_TIMEOUT_MS = 60_000;
const REQUIRED_SECRET_KEYS = ['access-key-id', 'secret-access-key'];

function run(command, args, input) {
  const result = spawnSync(command, args, {
    input,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    timeout: TRANSPORT_TIMEOUT_MS,
  });
  if (result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM') {
    const error = new Error('s3 transport timed out');
    error.code = 's3-transport-failed';
    throw error;
  }
  if (result.status !== 0) {
    const error = new Error('s3 transport failed');
    error.code = 's3-transport-failed';
    error.stderr = `${result.stderr ?? ''}`;
    throw error;
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function kubectl(args, input, exec) {
  return exec('kubectl', ['--context', DEV_S3_CONTEXT, ...args], input);
}

function weed(script, exec) {
  return kubectl(
    [
      '-n',
      DEV_S3_NAMESPACE,
      'exec',
      '-i',
      'deploy/object-store',
      '-c',
      'seaweedfs',
      '--',
      'weed',
      'shell',
    ],
    script,
    exec,
  );
}

function expectedSlotFromSecretName(secretName) {
  const match = /^dev-([1-9][0-9]*)-s3$/.exec(secretName);
  if (!match) {
    const error = new Error(
      `secret name ${secretName} is not a dev tenant secret`,
    );
    error.code = 'secret-invalid';
    throw error;
  }
  return `dev-${match[1]}`;
}

function readPresentSecret(body, name) {
  if (
    body.metadata?.name !== name ||
    body.metadata?.namespace !== DEV_S3_NAMESPACE
  ) {
    const error = new Error(
      `secret ${name} metadata does not match the request`,
    );
    error.code = 'secret-unreadable';
    throw error;
  }
  const uid = body.metadata?.uid;
  if (!uid) {
    const error = new Error(`secret ${name} is missing a uid`);
    error.code = 'secret-unreadable';
    throw error;
  }
  const owner = body.metadata.labels?.['offscreen.dev/owner'] ?? null;
  if (owner !== DEV_S3_OWNER) {
    return { name, uid, owner };
  }
  const slot = body.metadata.labels?.['offscreen.dev/slot'];
  if (slot !== expectedSlotFromSecretName(name)) {
    const error = new Error(`secret ${name} has an unexpected slot label`);
    error.code = 'secret-invalid';
    throw error;
  }
  const data = body.data ?? {};
  const stringData = body.stringData ?? {};
  for (const key of REQUIRED_SECRET_KEYS) {
    if (data[key] == null && stringData[key] == null) {
      const error = new Error(`secret ${name} is missing required key ${key}`);
      error.code = 'secret-invalid';
      throw error;
    }
  }
  return { name, uid, owner };
}

function readSecretObject(exec, name) {
  const listed = kubectl(
    [
      '-n',
      DEV_S3_NAMESPACE,
      'get',
      'secret',
      name,
      '--ignore-not-found',
      '-o',
      'json',
    ],
    undefined,
    exec,
  );
  const trimmed = listed.trim();
  if (!trimmed) return null;
  let body;
  try {
    body = JSON.parse(trimmed);
  } catch {
    const error = new Error('secret response malformed');
    error.code = 'secret-unreadable';
    throw error;
  }
  if (body?.kind === 'Status' || !body?.metadata) {
    const error = new Error('secret response malformed');
    error.code = 'secret-unreadable';
    throw error;
  }
  return body;
}

export function parseWeedBucketList(text) {
  const entries = [];
  const source = String(text ?? '');
  let rejected = false;
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('>')) continue;
    const match = line.match(/^\s*([^\s\t]+)\tsize:/);
    if (!match) {
      if (/\tsize:/.test(line) || /^\s*\S+\t/.test(line)) rejected = true;
      continue;
    }
    let owner = 'pending';
    const ownerMatch = line.match(/\towner:"([^"]*)"/);
    if (ownerMatch) owner = ownerMatch[1];
    entries.push({ name: match[1], owner });
  }
  if (rejected && entries.length === 0) {
    const error = new Error('weed bucket list format is not recognized');
    error.code = 'weed-list-unreadable';
    throw error;
  }
  return entries;
}

export function parseWeedUserList(text) {
  const source = String(text ?? '').trim();
  if (!source) return [];
  const start = source.indexOf('[');
  if (start < 0) {
    const error = new Error('weed user list format is not recognized');
    error.code = 'weed-list-unreadable';
    throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(source.slice(start));
  } catch {
    const error = new Error('weed user list format is not recognized');
    error.code = 'weed-list-unreadable';
    throw error;
  }
  if (!Array.isArray(parsed)) {
    const error = new Error('weed user list format is not recognized');
    error.code = 'weed-list-unreadable';
    throw error;
  }
  return parsed
    .map((item) => item?.name)
    .filter((name) => typeof name === 'string' && name.length > 0);
}

function parseCredentials(text) {
  const source = String(text ?? '');
  const labeledAccess = source.match(/access key:\s*(\S+)/i);
  const labeledSecret = source.match(/secret key:\s*(\S+)/i);
  if (labeledAccess && labeledSecret) {
    return { accessKeyId: labeledAccess[1], secretAccessKey: labeledSecret[1] };
  }
  const start = source.indexOf('{');
  if (start >= 0) {
    try {
      const parsed = JSON.parse(source.slice(start));
      const identity =
        parsed.identities?.find(
          (item) =>
            item.credentials?.[0]?.accessKey &&
            item.credentials?.[0]?.secretKey,
        ) ?? parsed;
      const credential = identity.credentials?.[0] ?? identity;
      if (credential.accessKey && credential.secretKey) {
        return {
          accessKeyId: credential.accessKey,
          secretAccessKey: credential.secretKey,
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

function storeSecret(exec, names, credentials) {
  const manifest = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: names.secret,
      namespace: DEV_S3_NAMESPACE,
      labels: {
        'offscreen.dev/owner': DEV_S3_OWNER,
        'offscreen.dev/slot': names.slotId,
      },
    },
    type: 'Opaque',
    stringData: {
      'access-key-id': credentials.accessKeyId,
      'secret-access-key': credentials.secretAccessKey,
    },
  };
  try {
    kubectl(['create', '-f', '-'], JSON.stringify(manifest), exec);
  } catch (error) {
    if (String(error.stderr ?? '').match(/AlreadyExists|already exists/i)) {
      const conflict = new Error(
        `secret ${names.secret} already exists; re-run ensure after the conflicting create finishes`,
      );
      conflict.code = 'secret-create-conflict';
      throw conflict;
    }
    throw error;
  }
  const body = readSecretObject(exec, names.secret);
  if (!body) {
    const error = new Error(`secret ${names.secret} unreadable after create`);
    error.code = 'secret-unreadable';
    throw error;
  }
  const retained = readPresentSecret(body, names.secret);
  return { secret: retained.name, uid: retained.uid };
}

export function createDevS3LiveAdapter({ exec = run } = {}) {
  return {
    identity() {
      const deploy = JSON.parse(
        kubectl(
          [
            '-n',
            DEV_S3_NAMESPACE,
            'get',
            'deploy',
            'object-store',
            '-o',
            'json',
          ],
          undefined,
          exec,
        ),
      );
      const pvc = JSON.parse(
        kubectl(
          ['-n', DEV_S3_NAMESPACE, 'get', 'pvc', DEV_S3_PVC, '-o', 'json'],
          undefined,
          exec,
        ),
      );
      const help = weed('help\nexit\n', exec);
      return {
        context: DEV_S3_CONTEXT,
        namespace: DEV_S3_NAMESPACE,
        owner: deploy.metadata?.labels?.['offscreen.dev/owner'],
        image: deploy.spec?.template?.spec?.containers?.[0]?.image,
        pvc: pvc.metadata?.name,
        pvcUid: pvc.metadata?.uid,
        adminSecret: DEV_S3_SECRET,
        commands: ['s3.bucket.create', 's3.user.provision'].filter((name) =>
          help.includes(name),
        ),
        expectedImage: DEV_S3_IMAGE,
        ownerLabel: DEV_S3_OWNER,
      };
    },
    bucket(name) {
      const text = weed('s3.bucket.list\nexit\n', exec);
      const entries = parseWeedBucketList(text);
      const found = entries.find((entry) => entry.name === name);
      return found ? { owner: found.owner, name: found.name } : null;
    },
    user(name) {
      const text = weed('s3.user.list\nexit\n', exec);
      const names = parseWeedUserList(text);
      if (!names.includes(name)) return null;
      return { owner: name, name };
    },
    secret(name) {
      const body = readSecretObject(exec, name);
      if (!body) return null;
      return readPresentSecret(body, name);
    },
    createBucket(names) {
      weed(`s3.bucket.create -name ${names.bucket}\nexit\n`, exec);
    },
    provisionUser(names) {
      const output = weed(
        `s3.user.provision -name ${names.user} -bucket ${names.bucket} -role readwrite\nexit\n`,
        exec,
      );
      const credentials = parseCredentials(output);
      if (!credentials) {
        const error = new Error('credential capture failed');
        error.code = 'credential-capture-failed';
        throw error;
      }
      return storeSecret(exec, names, credentials);
    },
    recoverUser(names) {
      const output = weed('s3.iam.export\nexit\n', exec);
      const start = output.indexOf('{');
      const end = output.lastIndexOf('}');
      const parsed = JSON.parse(output.slice(start, end + 1));
      const identity = parsed.identities?.find(
        (item) => item.name === names.user,
      );
      const policy = `${names.bucket}-${names.user}-readwrite`;
      const shared = (parsed.identities ?? []).filter(
        (item) =>
          item.name !== names.user && item.policyNames?.includes(policy),
      );
      if (
        !identity ||
        identity.credentials?.length !== 1 ||
        identity.policyNames?.join(',') !== policy ||
        shared.length
      ) {
        const error = new Error('existing identity is not recoverable');
        error.code = 'identity-not-recoverable';
        throw error;
      }
      return storeSecret(exec, names, {
        accessKeyId: identity.credentials[0].accessKey,
        secretAccessKey: identity.credentials[0].secretKey,
      });
    },
    access() {
      return { status: 'deferred' };
    },
  };
}

export const WEED_BUCKET_LIST_FIXTURE = ` offscreen-dev-1\tsize:0\tlogical:0\tchunk:0\towner:"dev-1"
 offscreen-dev-10\tsize:0\tlogical:0\tchunk:0\towner:"dev-10"
`;

export const WEED_USER_LIST_FIXTURE = `[{"name":"dev-1","status":"enabled","policies":["offscreen-dev-1-dev-1-readwrite"],"keys":1},{"name":"dev-10","status":"enabled","policies":["offscreen-dev-10-dev-10-readwrite"],"keys":1}]`;

export { parseCredentials };
