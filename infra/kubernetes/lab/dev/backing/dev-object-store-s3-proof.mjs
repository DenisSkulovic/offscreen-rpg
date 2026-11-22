import { createHash, createHmac } from 'node:crypto';

function hmac(key, value) {
  return createHmac('sha256', key).update(value).digest();
}

function signingKey(secret, dateStamp) {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(dateKey, 'us-east-1');
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

/**
 * Sign one S3 request. The returned headers do not include the secret.
 * @param {{ accessKeyId: string, secretAccessKey: string, method: string, path: string, body?: string, host?: string }} request
 */
export function signS3Request(request) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const body = request.body ?? '';
  const host = request.host ?? '127.0.0.1:18333';
  const payloadHash = createHash('sha256').update(body).digest('hex');
  const canonical = [
    request.method,
    request.path,
    '',
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    '',
    'host;x-amz-content-sha256;x-amz-date',
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/us-east-1/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonical).digest('hex')].join('\n');
  const signature = createHmac('sha256', signingKey(request.secretAccessKey, dateStamp)).update(stringToSign).digest('hex');
  return {
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${request.accessKeyId}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`,
  };
}

/**
 * Bucket create, object put/get/delete, then one object kept across a pod restart.
 * Receipts contain statuses and resource uids only.
 * @param {{
 *   run: Function,
 *   request: (input: { method: string, path: string, body?: string, headers: Record<string, string> }) => Promise<{ status: number, body: string }>,
 *   readSecret: () => { accessKeyId: string, secretAccessKey: string },
 *   restart: () => Promise<{ ok: boolean }>,
 * }} deps
 */
export async function proveDevObjectStoreS3(deps) {
  const credentials = deps.readSecret();
  const host = deps.host ?? '127.0.0.1:18333';
  const call = async (method, path, body) => {
    const headers = signS3Request({ ...credentials, method, path, body, host });
    const response = await deps.request({ method, path, body, headers });
    return response.status;
  };
  const bucket = await call('PUT', '/dev-s3-proof');
  const removed = await call('PUT', '/dev-s3-proof/temporary.txt', 'temporary');
  const removedRead = await call('GET', '/dev-s3-proof/temporary.txt');
  const removedDelete = await call('DELETE', '/dev-s3-proof/temporary.txt');
  const keptWrite = await call('PUT', '/dev-s3-proof/kept.txt', 'kept-across-restart');
  const before = await deps.request({
    method: 'GET',
    path: '/dev-s3-proof/kept.txt',
    headers: signS3Request({ ...credentials, method: 'GET', path: '/dev-s3-proof/kept.txt', host }),
  });
  const secretUid = deps.run('kubectl', ['--context', 'kind-offscreen-dev', '-n', 'offscreen-dev-objects', 'get', 'secret', 'object-store-s3', '-o', 'jsonpath={.metadata.uid}']).stdout?.trim();
  const pvcUid = deps.run('kubectl', ['--context', 'kind-offscreen-dev', '-n', 'offscreen-dev-objects', 'get', 'pvc', 'object-store-data', '-o', 'jsonpath={.metadata.uid}']).stdout?.trim();
  const restarted = await deps.restart();
  const after = await deps.request({
    method: 'GET',
    path: '/dev-s3-proof/kept.txt',
    headers: signS3Request({ ...credentials, method: 'GET', path: '/dev-s3-proof/kept.txt', host }),
  });
  const receipt = {
    bucket,
    temporaryPut: removed,
    temporaryGet: removedRead,
    temporaryDelete: removedDelete,
    keptPut: keptWrite,
    keptBefore: before.body,
    keptAfter: after.body,
    secretUid,
    pvcUid,
    podRestarted: restarted.ok,
  };
  const serialized = JSON.stringify(receipt);
  if (serialized.includes(credentials.accessKeyId) || serialized.includes(credentials.secretAccessKey)) {
    return { ok: false, reason: 'receipt contained credential material' };
  }
  const ok = bucket === 200 && removed === 200 && removedRead === 200 && removedDelete === 204
    && keptWrite === 200 && before.body === 'kept-across-restart' && after.body === 'kept-across-restart' && restarted.ok;
  return { ok, ...receipt };
}
