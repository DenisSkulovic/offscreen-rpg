import { Usage } from '@openai/agents-core';
import { OpenAIAgentsPlugin } from '@temporalio/openai-agents';
import { decide } from './common.mjs';
export function plugin() {
  return new OpenAIAgentsPlugin({modelProvider:{getModel(name){
    if(name!=='poc')throw Error('Unknown model');
    return {
      async getResponse(request){
        const reply=decide(request);
        const output=reply.tool?[{type:'function_call',name:reply.tool,arguments:JSON.stringify(reply.args),callId:'poc-call-1',status:'completed'}]:[{type:'message',id:'poc-message',role:'assistant',content:[{type:'output_text',text:reply.text}],status:'completed'}];
        return {output,usage:new Usage({requests:1,inputTokens:10,outputTokens:20,totalTokens:30})};
      },
      async *getStreamedResponse(){throw Error('Streaming disabled');},
    };
  }},modelParams:{startToCloseTimeout:'10s',retry:{maximumAttempts:1}}});
}
