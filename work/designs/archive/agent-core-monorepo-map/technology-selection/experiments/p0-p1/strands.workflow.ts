import { TemporalAgent, workflow as strandsWorkflow } from '@temporalio/strands-agents';
export async function mission(prompt:string):Promise<string> {
  const agent=new TemporalAgent({model:'poc',printer:false,systemPrompt:'Use the supplied document capability when requested.',
    activityOptions:{startToCloseTimeout:'10s',retry:{maximumAttempts:1}},
    tools:[strandsWorkflow.activityAsTool('readDocument',{
      description:'Read a historical source',
      inputSchema:{type:'object',properties:{path:{type:'string'}},required:['path']},
      activityOptions:{startToCloseTimeout:'10s',retry:{maximumAttempts:1}},
    })],
  });
  return (await agent.invoke(prompt)).toString();
}
