#!/usr/bin/env node
import console from 'node:console';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { runPlatformCommand } from '../../../platform/common/commands.mjs';
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
          const key = kind === 'ns' ? 'namespaceUid' : `${kind}Uid`;
          identities[key] = got.stdout.trim();
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
          ],
          { timeoutMs: API_TIMEOUT_MS },
        );
        if (!created.ok) {
          return { ok: false, stderr: created.stderr };
        }
        const uid = runPlatformCommand(
          'kubectl',
          [
            '--context',
            context,
            '-n',
            ns,
            'get',
            'configmap',
            String(request.name),
            '-o',
            'jsonpath={.metadata.uid}',
          ],
          { timeoutMs: API_TIMEOUT_MS },
        );
        return { ok: true, uid: uid.stdout.trim(), stdout: created.stdout };
      }
      case 'pod-create': {
        const manifest = buildPodManifest(ns, request);
        const created = runPlatformCommand(
          'kubectl',
          ['--context', context, '-n', ns, 'create', '-f', '-'],
          { input: manifest, timeoutMs: API_TIMEOUT_MS },
        );
        if (!created.ok) {
          return { ok: false, stderr: created.stderr };
        }
        const uid = runPlatformCommand(
          'kubectl',
          [
            '--context',
            context,
            '-n',
            ns,
            'get',
            'pod',
            String(request.name),
            '-o',
            'jsonpath={.metadata.uid}',
          ],
          { timeoutMs: API_TIMEOUT_MS },
        );
        return { ok: true, uid: uid.stdout.trim(), stdout: created.stdout };
      }
      case 'pod-wait':
        return runPlatformCommand(
          'kubectl',
          [
            '--context',
            context,
            '-n',
            ns,
            'wait',
            `--for=jsonpath={.status.phase}=${request.phase ?? 'Succeeded'}`,
            `pod/${request.name}`,
            `--timeout=${Math.floor(Number(request.timeoutMs ?? 120_000) / 1000)}s`,
          ],
          { timeoutMs: Number(request.timeoutMs ?? 120_000) },
        );
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
  const result = await runLiveProof(parsed);
  console.log(JSON.stringify({ schema: 1, ...result }));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv).then((code) => process.exit(code));
}

export { main, runLiveProof };
