import { Connection, Client, WorkflowIdReusePolicy } from '@temporalio/client';

const workflowId = process.env.WORKFLOW_ID ?? 'lab-once';
const connection = await Connection.connect({
  address: process.env.TEMPORAL_ADDRESS,
});
try {
  const client = new Client({ connection, namespace: 'default' });
  const handle = await client.workflow.start('labOnce', {
    taskQueue: 'lab-once',
    workflowId,
    workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
  });
  process.stdout.write(`workflowId=${handle.workflowId}\n`);
  process.stdout.write(`runId=${handle.firstExecutionRunId}\n`);
} finally {
  await connection.close();
}
