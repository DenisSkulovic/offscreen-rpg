import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Worker, NativeConnection } from '@temporalio/worker';
import { Client, Connection } from '@temporalio/client';
import { readDocument, receipt, finalText, singleText } from './common.mjs';
const candidate=process.env.POC_CANDIDATE;
const address=process.env.POC_TEMPORAL_ADDRESS;
const namespace=process.env.POC_NAMESPACE;
if(!['vercel','openai','strands'].includes(candidate)||!/^127\.0\.0\.1:[0-9]{1,5}$/.test(address??'')||!/^offscreen-agent-poc-[a-z0-9-]{8,35}$/.test(namespace??''))throw Error('Explicit isolated candidate, loopback endpoint, namespace required');
for(const key of Object.keys(process.env)){
  if(/(?:API_KEY|ACCESS_KEY|SECRET_KEY|TOKEN|PASSWORD|OTEL_EXPORTER)/i.test(key))throw Error('Credential/exporter environment refused: '+key);
}
const runId=randomUUID();
const taskQueue='agent-poc-'+candidate+'-'+runId;
let peakRss=process.memoryUsage().rss;
const sample=setInterval(()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);},100);
sample.unref();
const cpu=process.cpuUsage();
const begin=performance.now();
let native,connection;
try{
  const {plugin}=await import('./'+candidate+'.model.mjs');
  native=await NativeConnection.connect({address});
  connection=await Connection.connect({address});
  const client=new Client({connection,namespace,plugins:candidate==='openai'?[plugin()]:[]});
  const worker=await Worker.create({connection:native,namespace,taskQueue,
    workflowsPath:fileURLToPath(new URL('./'+candidate+'.workflow.ts',import.meta.url)),
    activities:{readDocument},plugins:[plugin()],maxConcurrentActivityTaskExecutions:1,
  });
  const startupMs=performance.now()-begin;
  const results=await worker.runUntil(async()=>{
    const result=[];
    for(const [i,mode] of ['SINGLE','TOOL','TOOL','TOOL'].entries()){
      const workflowId='agent-poc-'+candidate+'-'+runId+'-'+i;
      const started=performance.now();
      const handle=await client.workflow.start('mission',{workflowId,taskQueue,args:['POC_MODE_'+mode],
        workflowExecutionTimeout:'30s'});
      const output=await handle.result();
      const wallMs=performance.now()-started;
      const record=receipt(workflowId);
      const expected=mode==='SINGLE'?singleText:finalText;
      if(output!==expected||record?.modelCalls!==(mode==='SINGLE'?1:2)||record?.toolCalls!==(mode==='SINGLE'?0:1))throw Error('P0/P1 assertion failed: '+JSON.stringify({mode,output,record}));
      const history=await handle.fetchHistory();
      const events=history.events??[];
      result.push({mode,workflowId,wallMs,...record,output,eventCount:events.length,
        historyJsonBytes:Buffer.byteLength(JSON.stringify(history,(_,v)=>typeof v==='bigint'?String(v):v)),
        activities:events.flatMap(e=>e.activityTaskScheduledEventAttributes?.activityType?.name??[]),
      });
    }
    return result;
  });
  console.log(JSON.stringify({candidate,namespace,runId,startupMs,peakRssBytes:peakRss,cpuMicros:process.cpuUsage(cpu),results},null,2));
}finally{
  clearInterval(sample);
  await connection?.close();
  await native?.close();
}
