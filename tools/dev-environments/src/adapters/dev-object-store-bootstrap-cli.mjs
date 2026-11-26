#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { collectDevObjectStoreProbe } from '../../../../infra/platform/object-storage/dev-host-probe.mjs';
import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  executeAuthorizedDevObjectStore,
  planDevObjectStore,
  statusDevObjectStore,
  waitForDevObjectStoreReadiness,
} from '../../../../infra/platform/object-storage/dev-bootstrap.mjs';
import { proveDevObjectStoreS3 } from './dev-object-store-s3-proof.mjs';

function run(commandName, args, options = {}) {
  const child = spawnSync(commandName, args, {
    encoding: 'utf8',
    input: options.input,
    timeout: options.timeoutMs ?? 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    ok: !child.error && child.status === 0,
    stdout: child.stdout ?? '',
    stderr: `${child.stderr ?? ''}${child.error ? child.error.message : ''}`,
  };
}

function readAdminSecret() {
  const result = run('kubectl', [
    '--context',
    DEV_S3_CONTEXT,
    '-n',
    DEV_S3_NAMESPACE,
    'get',
    'secret',
    'object-store-s3',
    '-o',
    'json',
  ]);
  if (!result.ok) return { accessKeyId: '', secretAccessKey: '' };
  const body = JSON.parse(result.stdout);
  return {
    accessKeyId: Buffer.from(body.data['access-key-id'], 'base64').toString(
      'utf8',
    ),
    secretAccessKey: Buffer.from(
      body.data['secret-access-key'],
      'base64',
    ).toString('utf8'),
  };
}

function startPortForward() {
  return spawn(
    'kubectl',
    [
      '--context',
      DEV_S3_CONTEXT,
      '-n',
      DEV_S3_NAMESPACE,
      'port-forward',
      'svc/object-store',
      '18333:8333',
    ],
    { stdio: 'ignore' },
  );
}

const command = process.argv[2] ?? 'plan';
const injected = process.env.OFFSCREEN_DEV_S3_PROBE;
if ((command === 'ensure' || command === 'prove') && injected) {
  process.stderr.write(
    'refusing live object-store ensure: an injected probe cannot authorize mutation\n',
  );
  process.exitCode = 2;
} else if (
  (command === 'ensure' || command === 'prove') &&
  process.env.OFFSCREEN_DEV_S3_ENSURE !== 'authorized'
) {
  process.stderr.write(
    'refusing live object-store ensure: set OFFSCREEN_DEV_S3_ENSURE=authorized after a passing preflight\n',
  );
  process.exitCode = 2;
} else if (command === 'ensure') {
  const result = await executeAuthorizedDevObjectStore({
    collect: collectDevObjectStoreProbe,
    generateCredentials: () => ({
      accessKeyId: randomBytes(12).toString('hex'),
      secretAccessKey: randomBytes(24).toString('hex'),
    }),
    run,
    sleep(ms) {
      spawnSync('sleep', [String(Math.ceil(ms / 1000))]);
    },
  });
  process.stdout.write(
    `${JSON.stringify({ ...result, manifest: undefined })}\n`,
  );
  process.exitCode = result.ok ? 0 : 1;
} else if (command === 'prove') {
  const ready = waitForDevObjectStoreReadiness({
    run,
    sleep(ms) {
      spawnSync('sleep', [String(Math.ceil(ms / 1000))]);
    },
  });
  if (!ready.ok) {
    process.stdout.write(`${JSON.stringify(ready)}\n`);
    process.exitCode = 1;
  } else {
    let forward = startPortForward();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const host = '127.0.0.1:18333';
    const proof = await proveDevObjectStoreS3({
      host,
      run,
      readSecret: readAdminSecret,
      async restart() {
        forward.kill('SIGTERM');
        const deleted = run('kubectl', [
          '--context',
          DEV_S3_CONTEXT,
          '-n',
          DEV_S3_NAMESPACE,
          'delete',
          'pod',
          '-l',
          'app=object-store',
        ]);
        const again = waitForDevObjectStoreReadiness({
          run,
          sleep(ms) {
            spawnSync('sleep', [String(Math.ceil(ms / 1000))]);
          },
        });
        forward = startPortForward();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { ok: deleted.ok && again.ok };
      },
      async request(input) {
        const response = await fetch(`http://${host}${input.path}`, {
          method: input.method,
          headers: input.headers,
          body: input.body,
        });
        return { status: response.status, body: await response.text() };
      },
    });
    forward.kill('SIGTERM');
    process.stdout.write(`${JSON.stringify({ readiness: ready, proof })}\n`);
    process.exitCode = proof.ok ? 0 : 1;
  }
} else if (command !== 'plan' && command !== 'status') {
  process.stderr.write(
    'usage: dev-object-store-bootstrap-cli.mjs <plan|status|ensure|prove>\n',
  );
  process.exitCode = 2;
} else if (injected) {
  process.stderr.write(
    'refusing object-store plan: an injected probe is not a live observation\n',
  );
  process.exitCode = 2;
} else {
  const probe = collectDevObjectStoreProbe();
  const result =
    command === 'plan'
      ? planDevObjectStore(probe)
      : statusDevObjectStore(probe);
  process.stdout.write(
    `${JSON.stringify({ ...result, manifest: result.manifest ? 'rendered' : undefined })}\n`,
  );
  if ((result.refusals ?? []).length > 0) process.exitCode = 1;
}
