import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities.mjs';

const connection = await NativeConnection.connect({
  address: process.env.TEMPORAL_ADDRESS,
});
const worker = await Worker.create({
  connection,
  namespace: 'default',
  taskQueue: 'lab-once',
  workflowsPath: path.join(path.dirname(fileURLToPath(import.meta.url)), 'workflows.mjs'),
  activities,
});
await worker.run();
