import { AiSdkPlugin } from '@temporalio/vercel-ai-sdk';
import { decide } from './common.mjs';
export function plugin() {
  return new AiSdkPlugin({ modelProvider: {
    specificationVersion:'v4',
    languageModel(name) {
      if (name !== 'poc') throw Error('Unknown model');
      return { specificationVersion:'v4',provider:'poc',modelId:name,supportedUrls:{},
        async doGenerate(options) {
          const reply=decide(options);
          return {
            content:reply.tool?[{type:'tool-call',toolCallId:'poc-call-1',toolName:reply.tool,input:JSON.stringify(reply.args)}]:[{type:'text',text:reply.text}],
            finishReason:{unified:reply.tool?'tool-calls':'stop',raw:undefined},
            usage:{inputTokens:{total:10},outputTokens:{total:20}}, warnings:[],
          };
        },
        async doStream(){throw Error('Streaming disabled');},
      };
    },
    embeddingModel(){throw Error('Disabled');},
    imageModel(){throw Error('Disabled');},
  }});
}
