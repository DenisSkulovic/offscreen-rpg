import { Context } from '@temporalio/activity';
export const sourcePath = 'history/promise.md';
export const sourceMarker = 'POC_SOURCE_OLD_BRIDGE_DAWN';
export const finalText = 'The promise was to meet at the old bridge at dawn.';
export const singleText = 'POC_SINGLE_OK';
const rows = new Map();
function row() {
  const info = Context.current().info;
  const id = info.workflowExecution.workflowId;
  if (!id.startsWith('agent-poc-')) throw Error('Unexpected Workflow identity');
  if (!rows.has(id)) rows.set(id, { modelCalls: 0, toolCalls: 0, requestBytes: [] });
  return rows.get(id);
}
export function decide(input) {
  const record = row();
  const payload = JSON.stringify(input);
  record.modelCalls++;
  record.requestBytes.push(Buffer.byteLength(payload));
  if (record.modelCalls === 1 && payload.includes('POC_MODE_SINGLE')) return { text: singleText };
  if (record.modelCalls === 1 && payload.includes('POC_MODE_TOOL') && payload.includes('readDocument')) {
    return { tool: 'readDocument', args: { path: sourcePath } };
  }
  if (record.modelCalls === 2 && record.toolCalls === 1 && payload.includes(sourceMarker)) {
    return { text: finalText };
  }
  throw Error('Unexpected model request or missing actual tool observation');
}
export async function readDocument(input) {
  const record = row();
  if (input?.path !== sourcePath || record.toolCalls !== 0) throw Error('Unexpected tool operation');
  record.toolCalls++;
  return sourceMarker + ': A promise was made to meet at the old bridge at dawn.';
}
export function receipt(id) { return rows.get(id); }
