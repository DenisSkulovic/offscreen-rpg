import { generateText, isStepCount, tool } from 'ai';
import { z } from 'zod';
import { proxyActivities } from '@temporalio/workflow';
import { TemporalLanguageModel } from '@temporalio/vercel-ai-sdk/workflow';
const { readDocument } = proxyActivities<{ readDocument(input: {path:string}):Promise<string> }>({
  startToCloseTimeout: '10s', retry: { maximumAttempts: 1 },
});
export async function mission(prompt: string): Promise<string> {
  const result = await generateText({
    model: new TemporalLanguageModel('poc', { startToCloseTimeout:'10s', retry:{ maximumAttempts:1 } }),
    prompt, instructions: 'Use the supplied document capability when requested.',
    tools: { readDocument: tool({ description:'Read a historical source', inputSchema:z.object({path:z.string()}), execute:readDocument }) },
    stopWhen:isStepCount(3), maxRetries:0,
  });
  return result.text;
}
