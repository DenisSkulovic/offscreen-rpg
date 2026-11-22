import { spawnSync } from 'node:child_process';
import { DEV_S3_CONTEXT, DEV_S3_IMAGE, DEV_S3_NAMESPACE, DEV_S3_OWNER, DEV_S3_PVC, DEV_S3_SECRET } from './dev-object-store-bootstrap.mjs';

function run(command, args, input) {
  const result = spawnSync(command, args, { input, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) {
    const error = new Error('s3 transport failed');
    error.code = 's3-transport-failed';
    throw error;
  }
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function kubectl(args, input, exec) {
  return exec('kubectl', ['--context', DEV_S3_CONTEXT, ...args], input);
}

function weed(script, exec) {
  return kubectl(['-n', DEV_S3_NAMESPACE, 'exec', '-i', 'deploy/object-store', '-c', 'seaweedfs', '--', 'weed', 'shell'], script, exec);
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
      const identity = parsed.identities?.find((item) => item.credentials?.[0]?.accessKey && item.credentials?.[0]?.secretKey) ?? parsed;
      const credential = identity.credentials?.[0] ?? identity;
      if (credential.accessKey && credential.secretKey) {
        return { accessKeyId: credential.accessKey, secretAccessKey: credential.secretKey };
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
      labels: { 'offscreen.dev/owner': DEV_S3_OWNER, 'offscreen.dev/slot': names.slotId },
    },
    type: 'Opaque',
    stringData: {
      'access-key-id': credentials.accessKeyId,
      'secret-access-key': credentials.secretAccessKey,
    },
  };
  kubectl(['apply', '-f', '-'], JSON.stringify(manifest), exec);
  const uid = kubectl(['-n', DEV_S3_NAMESPACE, 'get', 'secret', names.secret, '-o', 'jsonpath={.metadata.uid}'], undefined, exec).trim();
  return { secret: names.secret, uid };
}

export function createDevS3LiveAdapter({ exec = run } = {}) {
  return {
    identity() {
      const deploy = JSON.parse(kubectl(['-n', DEV_S3_NAMESPACE, 'get', 'deploy', 'object-store', '-o', 'json'], undefined, exec));
      const pvc = JSON.parse(kubectl(['-n', DEV_S3_NAMESPACE, 'get', 'pvc', DEV_S3_PVC, '-o', 'json'], undefined, exec));
      const help = weed('help\nexit\n', exec);
      return {
        context: DEV_S3_CONTEXT,
        namespace: DEV_S3_NAMESPACE,
        owner: deploy.metadata?.labels?.['offscreen.dev/owner'],
        image: deploy.spec?.template?.spec?.containers?.[0]?.image,
        pvc: pvc.metadata?.name,
        pvcUid: pvc.metadata?.uid,
        adminSecret: DEV_S3_SECRET,
        commands: ['s3.bucket.create', 's3.user.provision'].filter((name) => help.includes(name)),
        expectedImage: DEV_S3_IMAGE,
        ownerLabel: DEV_S3_OWNER,
      };
    },
    bucket(name) {
      const text = weed('s3.bucket.list\nexit\n', exec);
      if (!text.includes(name)) return null;
      return { owner: 'pending', name };
    },
    user(name) {
      const text = weed('s3.user.list\nexit\n', exec);
      if (!new RegExp(`\\b${name}\\b`).test(text)) return null;
      return { owner: name, name };
    },
    secret(name) {
      try {
        const listed = kubectl(['-n', DEV_S3_NAMESPACE, 'get', 'secret', name, '-o', 'json'], undefined, exec);
        const body = JSON.parse(listed);
        return { name, uid: body.metadata.uid, owner: body.metadata.labels?.['offscreen.dev/owner'] };
      } catch {
        return null;
      }
    },
    createBucket(names) {
      weed(`s3.bucket.create -name ${names.bucket}\nexit\n`, exec);
    },
    provisionUser(names) {
      const output = weed(`s3.user.provision -name ${names.user} -bucket ${names.bucket} -role readwrite\nexit\n`, exec);
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
      const identity = parsed.identities?.find((item) => item.name === names.user);
      const policy = `${names.bucket}-${names.user}-readwrite`;
      const shared = (parsed.identities ?? []).filter((item) => item.name !== names.user && item.policyNames?.includes(policy));
      if (!identity || identity.credentials?.length !== 1 || identity.policyNames?.join(',') !== policy || shared.length) {
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
      return { ownWrite: true, otherWrite: false, adminDistributed: false, deferred: true };
    },
  };
}

export { parseCredentials };
