import { Model } from '@strands-agents/sdk';
import { StrandsPlugin } from '@temporalio/strands-agents';
import { decide } from './common.mjs';
class PocModel extends Model {
  updateConfig(){}
  getConfig(){return {modelId:'poc',contextWindowLimit:32000};}
  async *stream(messages,options){
    const reply=decide({messages,options});
    yield {type:'modelMessageStartEvent',role:'assistant'};
    if(reply.tool){
      yield {type:'modelContentBlockStartEvent',start:{type:'toolUseStart',name:reply.tool,toolUseId:'poc-call-1'}};
      yield {type:'modelContentBlockDeltaEvent',delta:{type:'toolUseInputDelta',input:JSON.stringify(reply.args)}};
    }else{
      yield {type:'modelContentBlockStartEvent'};
      yield {type:'modelContentBlockDeltaEvent',delta:{type:'textDelta',text:reply.text}};
    }
    yield {type:'modelContentBlockStopEvent'};
    yield {type:'modelMessageStopEvent',stopReason:reply.tool?'toolUse':'endTurn'};
  }
}
export function plugin(){return new StrandsPlugin({models:{poc:()=>new PocModel()}});}
