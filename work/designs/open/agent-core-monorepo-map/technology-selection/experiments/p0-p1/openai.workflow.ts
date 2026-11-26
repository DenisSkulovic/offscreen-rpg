import { Agent, tool } from '@openai/agents-core';
import { proxyActivities } from '@temporalio/workflow';
import { TemporalOpenAIRunner } from '@temporalio/openai-agents/workflow';
const { readDocument } = proxyActivities<{ readDocument(input:{path:string}):Promise<string> }>({
  startToCloseTimeout:'10s',retry:{maximumAttempts:1},
});
export async function mission(prompt:string):Promise<string> {
  const agent = new Agent({
    name:'poc',instructions:'Use the supplied document capability when requested.',model:'poc',
    tools:[tool({name:'readDocument',description:'Read a historical source',
      parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false},
      strict:true,execute:async(input)=>readDocument(input as {path:string}),
    })],
  });
  const runner=new TemporalOpenAIRunner({defaultModelParams:{startToCloseTimeout:'10s',retry:{maximumAttempts:1}}});
  const result=await runner.run(agent,prompt,{maxTurns:3,runConfig:{tracingDisabled:true,traceIncludeSensitiveData:false}});
  return String(result.finalOutput ?? '');
}
