#!/usr/bin/env node
import console from 'node:console';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { assertPlatformTarget, runPlatformCommand } from '../../../platform/common/commands.mjs';
import { readPlatformProfile } from '../../../platform/common/profile.mjs';
import { BROKER_NAME } from '../../../platform/rabbitmq/inventory.mjs';

import {
  API_TIMEOUT_MS,
  BROKER_POD_NAME,
  PYTHON_IMAGE,
  createReceiptDirectory,
  defaultReceiptIo,
  parseProofCli,
  refuseProofInvocation,
  runProofSupervisor,
} from './proof-host.mjs';

const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(MODULE_ROOT, '../../../..');
const ASSERT_EXACTLY_ONCE = join(
  REPO_ROOT,
  'infra/verification/faults/assert_exactly_once.py',
);

/**
 * @param {string} context
 * @param {string} ns
 */
export function createKubectlProofRunner(context, ns) {
  /** @type {import('./proof-host.mjs').ProofRunner & { calls: import('./proof-host.mjs').ProofOp[] }} */
  const runner = (request) => {
    runner.calls.push(request);
    switch (request.op) {
      case 'capture-identities': {
        const items = [
          ['namespace', 'ns', ns],
          ['rabbitmqcluster', BROKER_NAME, BROKER_NAME],
          ['service', BROKER_NAME, BROKER_NAME],
          [
            'secret',
            `${BROKER_NAME}-default-user`,
            `${BROKER_NAME}-default-user`,
          ],
        ];
        /** @type {Record<string, string>} */
        const identities = { vhost: '/' };
        for (const [, kind, name] of items) {
          const got = runPlatformCommand(
            'kubectl',
            [
              '--context',
              context,
              '-n',
              ns,
              'get',
              kind,
              name,
              '-o',
              'jsonpath={.metadata.uid}',
            ],
            { timeoutMs: API_TIMEOUT_MS },
          );
          if (!got.ok) {
            return { ok: false, stderr: got.stderr };
          }
          const key = kind === 'ns' ? 'namespaceUid' : kind === 'rabbitmqcluster' ? 'crUid' : `${kind}Uid`;
          identities[key] = got.stdout.trim();
          if (!identities[key]) return { ok: false };
        }
        return { ok: true, identities };
      }
      case 'configmap-create': {
        const created = runPlatformCommand(
          'kubectl',
          [
            '--context',
            context,
            '-n',
            ns,
            'create',
            'configmap',
            String(request.name),
            `--from-file=amqp_smoke.py=${join(MODULE_ROOT, 'amqp_smoke.py')}`,
            `--from-file=worker_loss.py=${join(MODULE_ROOT, 'worker_loss.py')}`,
            '-o', 'json',
          ],
          { timeoutMs: API_TIMEOUT_MS },
        );
        if (!created.ok) return { ok: false, lostResponse: true };
        try {
          const object = JSON.parse(created.stdout);
          const uid = object.metadata?.uid;
          if (object.kind !== 'ConfigMap' || object.metadata?.name !== request.name ||
              object.metadata?.namespace !== ns || typeof uid !== 'string' || !uid)
            return { ok: false, lostResponse: true };
          return { ok: true, uid };
        } catch { return { ok: false, lostResponse: true }; }
      }
      case 'pod-create': {
        const manifest = buildPodManifest(ns, request);
        const created = runPlatformCommand(
          'kubectl',
          ['--context', context, '-n', ns, 'create', '-f', '-', '-o', 'json'],
          { input: manifest, timeoutMs: API_TIMEOUT_MS },
        );
        if (!created.ok) return { ok: false, lostResponse: true };
        try {
          const object = JSON.parse(created.stdout);
          const uid = object.metadata?.uid;
          if (object.kind !== 'Pod' || object.metadata?.name !== request.name ||
              object.metadata?.namespace !== ns || typeof uid !== 'string' || !uid)
            return { ok: false, lostResponse: true };
          return { ok: true, uid };
        } catch { return { ok: false, lostResponse: true }; }
      }
      case 'pod-wait': {
        const deadline = performance.now() + Number(request.timeoutMs ?? 120_000);
        if (!request.uid) return { ok: false, reason: 'pod-uid-missing' };
        while (performance.now() < deadline) {
          const result = runPlatformCommand('kubectl', [
            '--context', context, '-n', ns, 'get', 'pod', String(request.name), '-o', 'json',
          ], { timeoutMs: Math.min(API_TIMEOUT_MS, Math.max(1, Math.floor(deadline - performance.now()))) });
          if (!result.ok) return { ok: false, reason: 'pod-read-failed' };
          let pod;
          try { pod = JSON.parse(result.stdout); } catch { return { ok: false, reason: 'pod-json-invalid' }; }
          if (pod.metadata?.uid !== request.uid || pod.metadata?.deletionTimestamp) return { ok: false, reason: 'pod-identity-changed' };
          if (pod.status?.phase === 'Failed') return { ok: false, reason: 'pod-terminal-failed' };
          if (pod.status?.phase === (request.phase ?? 'Succeeded')) return { ok: true };
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(500, Math.max(0, deadline - performance.now())));
        }
        return { ok: false, reason: 'pod-wait-timeout' };
      }
      case 'pod-wait-ready':
        return runPlatformCommand(
          'kubectl',
          [
            '--context',
            context,
            '-n',
            ns,
            'wait',
            '--for=condition=Ready',
            `pod/${request.name}`,
            `--timeout=${Math.floor(Number(request.timeoutMs ?? 420_000) / 1000)}s`,
          ],
          { timeoutMs: Number(request.timeoutMs ?? 420_000) },
        );
      case 'pod-logs':
        return runPlatformCommand(
          'kubectl',
          ['--context', context, '-n', ns, 'logs', `pod/${request.name}`],
          { timeoutMs: API_TIMEOUT_MS },
        );
      case 'smoke-fixture-delete': {
        const kind = request.kind;
        const name = String(request.name);
        const uid = String(request.uid);
        if (context !== 'kind-offscreen-dev' || ns !== 'offscreen-dev-rabbitmq' ||
            !/^[0-9a-f-]{36}$/.test(uid) ||
            !(kind === 'pods' && /^rabbitmq-proof-[0-9a-f]{16}-(smoke|wrong-password)$/.test(name) ||
              kind === 'configmaps' && /^rabbitmq-proof-[0-9a-f]{16}$/.test(name)))
          return { ok: false };
        const uri = `/api/v1/namespaces/${ns}/${kind}/${name}`;
        const deleted = runPlatformCommand('kubectl', ['--context', context, 'delete', '--raw', uri, '-f', '-'], {
          input: JSON.stringify({ apiVersion: 'v1', kind: 'DeleteOptions', preconditions: { uid }, gracePeriodSeconds: 0 }),
          timeoutMs: API_TIMEOUT_MS,
        });
        if (!deleted.ok) return { ok: false };
        const absent = runPlatformCommand('kubectl', ['--context', context, '-n', ns, 'get', kind, name, '--ignore-not-found', '-o', 'json'], { timeoutMs: API_TIMEOUT_MS });
        return { ok: absent.ok && absent.stdout.trim() === '' };
      }
      case 'pod-delete': {
        const grace = Number(request.gracePeriod ?? 5);
        const args = [
          '--context',
          context,
          '-n',
          ns,
          'delete',
          'pod',
          String(request.name),
          `--grace-period=${grace}`,
        ];
        if (request.uid) {
          args.push(`--field-selector=metadata.uid=${request.uid}`);
        }
        if (request.force) {
          args.push('--force');
        }
        return runPlatformCommand('kubectl', args, {
          timeoutMs: API_TIMEOUT_MS,
        });
      }
      case 'pod-absent':
        return runPlatformCommand(
          'kubectl',
          [
            '--context',
            context,
            '-n',
            ns,
            'wait',
            '--for=delete',
            `pod/${request.name ?? 'missing'}`,
            '--field-selector',
            `metadata.uid=${request.uid}`,
            `--timeout=${Math.floor(Number(request.timeoutMs ?? 30_000) / 1000)}s`,
          ],
          { timeoutMs: Number(request.timeoutMs ?? 30_000) },
        );
      case 'broker-pod-uid':
      case 'broker-state': {
        const got = runPlatformCommand(
          'kubectl',
          [
            '--context',
            context,
            '-n',
            ns,
            'get',
            'pod',
            BROKER_POD_NAME,
            '-o',
            'jsonpath={.metadata.uid} {.status.containerStatuses[0].restartCount}',
          ],
          { timeoutMs: API_TIMEOUT_MS },
        );
        if (!got.ok) {
          return { ok: false };
        }
        const [uid, restartCount] = got.stdout.trim().split(/\s+/);
        return {
          ok: true,
          brokerPodUid: uid,
          brokerRestartCount: Number(restartCount ?? 0),
        };
      }
      case 'ensure-repeat':
        return runPlatformCommand(
          process.execPath,
          [
            join(REPO_ROOT, 'infra/platform/rabbitmq/install.mjs'),
            'ensure',
            String(request.profile),
            String(request.context),
          ],
          { timeoutMs: 900_000 },
        );
      case 'queue-delete':
        return { ok: true, stdout: 'queue-delete-ok' };
      case 'configmap-delete':
        return runPlatformCommand(
          'kubectl',
          [
            '--context',
            context,
            '-n',
            ns,
            'delete',
            'configmap',
            String(request.name),
          ],
          { timeoutMs: API_TIMEOUT_MS },
        );
      case 'assert-exactly-once': {
        const dir = mkdtempSync(join(tmpdir(), 'rabbitmq-applies-'));
        const logPath = join(dir, 'applies.log');
        writeFileSync(logPath, String(request.text));
        const result = spawnSync('python3', [ASSERT_EXACTLY_ONCE, logPath], {
          encoding: 'utf8',
          timeout: 10_000,
        });
        return {
          ok: true,
          exitCode: result.status ?? 1,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      }
      case 'hold-observe':
        return {
          ok: true,
          stdout: '',
          status: { phase: 'Running', restartCount: 0 },
        };
      default:
        return { ok: false, stderr: `unknown-op:${request.op}` };
    }
  };
  runner.calls = [];
  return runner;
}

/**
 * @param {string} ns
 * @param {import('./proof-host.mjs').ProofOp} request
 */
function buildPodManifest(ns, request) {
  const role = String(request.role ?? 'client');
  const deadline = role === 'hold' ? 240 : 150;
  return `apiVersion: v1
kind: Pod
metadata:
  name: ${request.name}
  namespace: ${ns}
  labels:
    offscreen.rpg/proof: rabbitmq
    offscreen.rpg/proof-run: ${request.runId}
spec:
  restartPolicy: Never
  automountServiceAccountToken: false
  activeDeadlineSeconds: ${deadline}
  containers:
    - name: client
      image: ${PYTHON_IMAGE}
      imagePullPolicy: IfNotPresent
      command: ${JSON.stringify(request.command)}
      env:
        - name: AMQP_HOST
          value: ${BROKER_NAME}
        - name: OFFSCREEN_RUN_ID
          value: ${request.runId}
        - name: AMQP_USER
          valueFrom:
            secretKeyRef:
              name: ${BROKER_NAME}-default-user
              key: username
        - name: AMQP_PASS
          valueFrom:
            secretKeyRef:
              name: ${BROKER_NAME}-default-user
              key: password
      volumeMounts:
        - name: script
          mountPath: /opt
          readOnly: true
  volumes:
    - name: script
      configMap:
        name: rabbitmq-proof-${request.runId}
`;
}

async function runLiveProof({ mode, profile, context }) {
  if (mode !== 'smoke' || profile !== 'dev' || context !== 'kind-offscreen-dev') return { ok: false, phase: 'refused', reason: 'live-proof-mode-or-context-not-accepted' };
  assertPlatformTarget('dev');
  const platform = readPlatformProfile(profile);
  const ns = platform.namespaces.rabbitmq;
  const { dir, receiptPath } = createReceiptDirectory(REPO_ROOT);
  const io = defaultReceiptIo(dir);
  io.ensureDir(dir);
  const runner = createKubectlProofRunner(context, ns);
  return runProofSupervisor({
    mode,
    profile,
    context,
    env: process.env,
    runner,
    io,
    receiptDir: dir,
    receiptPath,
    runLive: true,
    repoRoot: REPO_ROOT,
  });
}

async function main(argv, env = process.env) {
  const parsed = parseProofCli(argv);
  if (!parsed.ok) {
    console.error(
      'usage: node proof.mjs <smoke|durability|worker-loss> dev kind-offscreen-dev',
    );
    return 2;
  }
  const refusal = refuseProofInvocation({
    mode: parsed.mode,
    profile: parsed.profile,
    env,
  });
  if (refusal.refused) {
    console.error(`REFUSED ${refusal.reason}`);
    return 1;
  }
  if (env.OFFSCREEN_RABBITMQ_PROOF_DRY === '1') {
    const plan = await runProofSupervisor({
      ...parsed,
      env,
      runLive: false,
    });
    console.log(JSON.stringify(plan));
    return plan.ok ? 0 : 1;
  }
  if (parsed.mode !== 'smoke' || parsed.context !== 'kind-offscreen-dev') {
    console.error('REFUSED live-proof-mode-or-context-not-accepted');
    return 1;
  }
  const result = await runLiveProof(parsed);
  console.log(JSON.stringify({ schema: 1, ...result }));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv).then((code) => process.exit(code));
}

export { main, runLiveProof };
