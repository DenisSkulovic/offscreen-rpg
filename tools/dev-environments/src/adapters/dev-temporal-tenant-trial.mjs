import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ensureDevTemporalTenant } from './dev-temporal-tenant.mjs';
import { DEV_TEMPORAL_CONTEXT, DEV_TEMPORAL_NAMESPACE, DEV_TEMPORAL_OWNER, DEV_TEMPORAL_SERVER_IMAGE } from './dev-temporal-bootstrap.mjs';

const require = createRequire(new URL('../../../../apps/worker/package.json', import.meta.url));
const { Connection, Client } = require('@temporalio/client');
const { Worker, NativeConnection } = require('@temporalio/worker');
const TOKEN = 'kind-offscreen-dev-temporal-tenant-live';
const workflowPath = new URL('../../../../packages/workflows/src/dev-slot-ping.ts', import.meta.url).pathname;

function kubectl(args) {
  const result = spawnSync('kubectl', ['--context', DEV_TEMPORAL_CONTEXT, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('kubectl failed');
  return result.stdout ?? '';
}

function temporal(args) {
  const result = spawnSync('kubectl', [
    '--context', DEV_TEMPORAL_CONTEXT, '-n', DEV_TEMPORAL_NAMESPACE, 'run', `temporal-admin-${Date.now()}`,
    '--rm', '-i', '--restart=Never', '--image', 'docker.io/temporalio/admin-tools:1.32.2',
    '--command', '--', 'temporal', ...args, '--address', 'temporal-server:7233',
  ], { encoding: 'utf8', timeout: 60000 });
  return { ok: result.status === 0, text: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function createAdapter() {
  const deploy = JSON.parse(kubectl(['-n', DEV_TEMPORAL_NAMESPACE, 'get', 'deploy', 'temporal-server', '-o', 'json']));
  return {
    identity: () => ({
      context: DEV_TEMPORAL_CONTEXT,
      namespace: DEV_TEMPORAL_NAMESPACE,
      owner: deploy.metadata.labels?.['offscreen.dev/owner'] ?? DEV_TEMPORAL_OWNER,
      image: deploy.spec.template.spec.containers[0].image,
    }),
    async describe(name) {
      const described = temporal(['operator', 'namespace', 'describe', '--namespace', name]);
      if (!described.ok) return null;
      const id = described.text.match(/Id\s+([0-9a-f-]{36})/i)?.[1] ?? null;
      const retention = /24h0m0s|1d|86400/.test(described.text) ? 86400 : 0;
      return { id, retentionSeconds: retention };
    },
    async create(names) {
      const created = temporal(['operator', 'namespace', 'create', '--namespace', names.temporalNamespace, '--retention', '1d']);
      if (!created.ok && !created.text.includes('already exists')) throw new Error('namespace create failed');
    },
  };
}

async function runWorker(namespace, slot) {
  const connection = await NativeConnection.connect({ address: '127.0.0.1:7244' });
  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: 'storyteller-execute-v1',
    workflowsPath: workflowPath,
    activities: { mark: () => slot },
  });
  const running = worker.run();
  return { worker, running, connection };
}

const adapter = createAdapter();
if (adapter.identity().image !== DEV_TEMPORAL_SERVER_IMAGE) throw new Error('unexpected temporal image');
const beforeDefault = await adapter.describe('default');
const first = await ensureDevTemporalTenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter });
const second = await ensureDevTemporalTenant({ slotId: 'dev-2', authorizeLive: TOKEN, adapter });
const forward = spawn('kubectl', ['--context', DEV_TEMPORAL_CONTEXT, '-n', DEV_TEMPORAL_NAMESPACE, 'port-forward', 'svc/temporal-server', '7244:7233'], { stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 800));
const connection = await Connection.connect({ address: '127.0.0.1:7244' });
const clientA = new Client({ connection, namespace: 'offscreen-dev-1' });
const clientB = new Client({ connection, namespace: 'offscreen-dev-2' });
const onlyB = await runWorker('offscreen-dev-2', 'dev-2');
let isolated = 'running';
try {
  await clientA.workflow.execute('slotPing', { taskQueue: 'storyteller-execute-v1', workflowId: `dxk09-a-${Date.now()}`, workflowExecutionTimeout: '3 seconds', args: [] });
  isolated = 'consumed';
} catch {
  isolated = 'not-consumed';
}
await onlyB.worker.shutdown();
const workerA = await runWorker('offscreen-dev-1', 'dev-1');
const workerB = await runWorker('offscreen-dev-2', 'dev-2');
const completedA = await clientA.workflow.execute('slotPing', { taskQueue: 'storyteller-execute-v1', workflowId: `dxk09-a-done-${Date.now()}`, args: [] });
const completedB = await clientB.workflow.execute('slotPing', { taskQueue: 'storyteller-execute-v1', workflowId: `dxk09-b-done-${Date.now()}`, args: [] });
await workerA.worker.shutdown();
const afterStopB = await clientB.workflow.execute('slotPing', { taskQueue: 'storyteller-execute-v1', workflowId: `dxk09-b-alive-${Date.now()}`, args: [] });
await workerB.worker.shutdown();
const again = await ensureDevTemporalTenant({ slotId: 'dev-1', authorizeLive: TOKEN, adapter });
const afterDefault = await adapter.describe('default');
const receipt = {
  firstOk: first.ok,
  secondOk: second.ok,
  firstId: first.id,
  secondId: second.id,
  againId: again.id,
  isolated,
  completedA,
  completedB,
  afterStopB,
  defaultBefore: beforeDefault?.id ?? null,
  defaultAfter: afterDefault?.id ?? null,
};
console.log(JSON.stringify(receipt));
forward.kill();
process.exit(0);
