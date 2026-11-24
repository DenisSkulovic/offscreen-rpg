import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEV_S3_CONTEXT,
  DEV_S3_NAMESPACE,
  DEV_S3_OWNER,
  DEV_S3_PVC,
} from '../dev-bootstrap.mjs';
import { observeDevObjectStoreReady } from '../readiness.mjs';

const BASELINE_NAMESPACE = 'offscreen-dev-system';
const DEV_CLUSTER_NAME = 'offscreen-dev';
const DEPLOYMENT_NAME = 'object-store';
const WRITE_PATTERN = /\b(apply|create|delete|patch|replace)\b/i;

/**
 * @param {{
 *   pvcPhase?: string,
 *   availableReplicas?: number,
 *   httpCode?: string,
 *   pvcUnreadable?: boolean,
 *   pvcNonzeroJson?: boolean,
 *   foreignOwner?: boolean,
 * }} [options]
 */
function createMockRun(options = {}) {
  const {
    pvcPhase = 'Bound',
    availableReplicas = 1,
    httpCode = '403',
    pvcUnreadable = false,
    pvcNonzeroJson = false,
    foreignOwner = false,
  } = options;
  const calls = [];
  const owner = foreignOwner ? 'foreign-owner' : DEV_S3_OWNER;

  const pvcBody = {
    metadata: {
      name: DEV_S3_PVC,
      namespace: DEV_S3_NAMESPACE,
      labels: { 'offscreen.dev/owner': owner },
    },
    status: { phase: pvcPhase },
  };
  const deployBody = {
    metadata: {
      name: DEPLOYMENT_NAME,
      namespace: DEV_S3_NAMESPACE,
      labels: { 'offscreen.dev/owner': owner },
    },
    status: { availableReplicas },
  };

  /** @type {import('../../common/commands.mjs').runPlatformCommand} */
  const run = (command, args, runOptions = {}) => {
    calls.push({ command, args, runOptions });

    if (command === 'kind' && args[0] === 'get' && args[1] === 'clusters') {
      return { ok: true, status: 0, stdout: `${DEV_CLUSTER_NAME}\n` };
    }

    if (
      command === 'kubectl' &&
      args.includes('config') &&
      args.includes('view')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          contexts: [
            {
              name: DEV_S3_CONTEXT,
              context: { cluster: DEV_CLUSTER_NAME },
            },
          ],
          clusters: [
            {
              name: DEV_CLUSTER_NAME,
              cluster: { server: 'https://127.0.0.1:24443' },
            },
          ],
        }),
      };
    }

    if (command === 'kubectl' && args.includes('get')) {
      const getIndex = args.indexOf('get');
      const resource = args[getIndex + 1];
      const name =
        args[getIndex + 2] === '-n' ? args[getIndex + 4] : args[getIndex + 2];
      if (resource === 'namespace' && name === BASELINE_NAMESPACE) {
        return {
          ok: true,
          status: 0,
          stdout: JSON.stringify({
            metadata: {
              name: BASELINE_NAMESPACE,
              uid: 'baseline-uid',
              labels: { 'offscreen.dev/owner': DEV_S3_OWNER },
            },
          }),
        };
      }
      if (resource === 'persistentvolumeclaim' && name === DEV_S3_PVC) {
        if (pvcUnreadable) {
          return { ok: false, status: 1, stdout: '', stderr: 'forbidden' };
        }
        if (pvcNonzeroJson) {
          return {
            ok: false,
            status: 1,
            stdout: JSON.stringify(pvcBody),
            stderr: 'nonzero',
          };
        }
        return { ok: true, status: 0, stdout: JSON.stringify(pvcBody) };
      }
      if (resource === 'deployment' && name === DEPLOYMENT_NAME) {
        return { ok: true, status: 0, stdout: JSON.stringify(deployBody) };
      }
      return { ok: true, status: 0, stdout: '' };
    }

    if (command === 'kubectl' && args.includes('exec')) {
      return { ok: true, status: 0, stdout: httpCode, stderr: '' };
    }

    return { ok: false, status: 1, stdout: '', stderr: 'unexpected command' };
  };

  return { run, calls };
}

function assertNoWrites(calls) {
  for (const call of calls) {
    const joined = call.args.join(' ');
    assert.equal(WRITE_PATTERN.test(joined), false, joined);
  }
}

test('healthy object store observation accepts Bound, available, and HTTP 403', () => {
  const { run, calls } = createMockRun();
  const result = observeDevObjectStoreReady({ run });
  assert.equal(result.ok, true);
  assert.equal(result.s3Status, '403');
  assertNoWrites(calls);
});

test('nonzero kubectl exit with stdout still refuses unreadable PVC', () => {
  const { run, calls } = createMockRun({ pvcNonzeroJson: true });
  const result = observeDevObjectStoreReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /unreadable/);
  assert.equal(
    calls.some((call) => call.args.includes('exec')),
    false,
  );
  assertNoWrites(calls);
});

test('malformed PVC absence refuses before HTTP probe', () => {
  const { run, calls } = createMockRun({ pvcPhase: 'Pending' });
  const result = observeDevObjectStoreReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /HTTP-ready|Bound/);
  assertNoWrites(calls);
});

test('foreign PVC owner refuses', () => {
  const { run, calls } = createMockRun({ foreignOwner: true });
  const result = observeDevObjectStoreReady({ run });
  assert.equal(result.ok, false);
  assert.match(result.detail ?? '', /foreign ownership/);
  assertNoWrites(calls);
});
