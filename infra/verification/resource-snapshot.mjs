// Read-only local resource inventory. Never creates workloads or installs metrics agents.
import { runPlatformCommand } from '../platform/common/commands.mjs';
import { readFileSync } from 'node:fs';
import { cpus, totalmem, freemem } from 'node:os';
import { assertPlatformTarget } from '../platform/common/commands.mjs';
import { readKindProfile } from '../clusters/kind/manager/config.mjs';
import { fileURLToPath } from 'node:url';

export function quantity(value) {
  const match = /^([0-9]+(?:\.[0-9]+)?)(n|u|m|Ki|Mi|Gi|Ti|k|M|G|T)?$/.exec(String(value ?? '0'));
  if (!match) throw new Error('unsupported resource quantity');
  return Number(match[1]) * ({n:1e-9,u:1e-6,m:1e-3,Ki:1024,Mi:1024**2,Gi:1024**3,Ti:1024**4,k:1e3,M:1e6,G:1e9,T:1e12}[match[2]] ?? 1);
}
export function podInventory(items) {
  return items.filter(p => !['Succeeded','Failed'].includes(p.status?.phase)).map(p => ({
    namespace:p.metadata.namespace, name:p.metadata.name, node:p.spec.nodeName ?? null, phase:p.status?.phase ?? null,
    containers:(p.spec.containers ?? []).map(c=>({
      name:c.name, requestCpu:quantity(c.resources?.requests?.cpu), requestMemory:quantity(c.resources?.requests?.memory),
      limitCpu:c.resources?.limits?.cpu === undefined ? null : quantity(c.resources.limits.cpu),
      limitMemory:c.resources?.limits?.memory === undefined ? null : quantity(c.resources.limits.memory),
      restarts:p.status?.containerStatuses?.find(s=>s.name===c.name)?.restartCount ?? null
    })),
    // Keep init resources distinct: do not falsely sum them into steady-state requests.
    initContainers:(p.spec.initContainers ?? []).map(c=>({name:c.name,requestCpu:quantity(c.resources?.requests?.cpu),requestMemory:quantity(c.resources?.requests?.memory),restartPolicy:c.restartPolicy ?? null})),
    overhead:p.spec.overhead ? {cpu:quantity(p.spec.overhead.cpu),memory:quantity(p.spec.overhead.memory)} : null
  }));
}
function json(run, command, args) {
  const r=run(command,args,{timeoutMs:15000});
  if(!r.ok) throw new Error(command+' observation unavailable');
  return JSON.parse(r.stdout);
}
function host() {
  let meminfo=null, pressure=null;
  try { meminfo=Object.fromEntries(readFileSync('/proc/meminfo','utf8').split('\n').filter(l=>/^(MemTotal|MemAvailable|SwapTotal|SwapFree):/.test(l)).map(l=>{const [k,v]=l.split(':');return [k,parseInt(v,10)*1024]})); } catch {}
  try { pressure=Object.fromEntries(['cpu','memory','io'].map(k=>[k,readFileSync('/proc/pressure/'+k,'utf8').trim()])); } catch {}
  return {logicalCpu:cpus().length,totalMemory:totalmem(),freeMemory:freemem(),meminfo,pressure};
}
export function summarizeKubelet(summary) {
  const bytes = value => Number.isFinite(value) && value >= 0 ? value : null;
  if (!Array.isArray(summary.pods)) throw new Error('missing kubelet pods');
  const pods = summary.pods.map(p => ({
    namespace:p.podRef.namespace,name:p.podRef.name,uid:p.podRef.uid,
    containers:(p.containers ?? []).map(c=>({
      name:c.name,workingSetBytes:bytes(c.memory?.workingSetBytes),
      rssBytes:bytes(c.memory?.rssBytes),memoryTime:c.memory?.time ?? null,
      cpuNanoCores:bytes(c.cpu?.usageNanoCores)
    }))
  }));
  const groups = new Map();
  for (const pod of pods) {
    const row = groups.get(pod.namespace) ?? {namespace:pod.namespace,workingSetBytes:0,unknownContainers:0,containers:0};
    for (const c of pod.containers) {
      row.containers++;
      if (c.workingSetBytes === null) row.unknownContainers++;
      else row.workingSetBytes += c.workingSetBytes;
    }
    groups.set(pod.namespace,row);
  }
  return {nodeWorkingSetBytes:bytes(summary.node?.memory?.workingSetBytes),pods,namespaces:[...groups.values()]};
}

export function observeResources(run=runPlatformCommand) {
  const out={schemaVersion:1,observedAt:new Date().toISOString(),host:host(),clusters:[]};
  if(process.env.DOCKER_HOST || process.env.DOCKER_TLS_VERIFY || process.env.DOCKER_CONTEXT) throw new Error('Docker endpoint override refused');
  const active=run('docker',['context','show']);
  const name=active.stdout.trim();
  if(!active.ok || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) throw new Error('Docker context unavailable');
  const endpoint=json(run,'docker',['context','inspect',name,'--format','{{json .Endpoints.docker.Host}}']);
  if(typeof endpoint!=='string'||! /^(unix:\/\/\/|npipe:\/\/\/\/\.\/pipe\/)/.test(endpoint)) throw new Error('Docker context is not local');
  for(const profile of ['dev','release']) {
    const entry={profile,status:'unavailable'};out.clusters.push(entry);
    try {
      const kind=readKindProfile(profile);
      const ctx=kind.contextName;
      const config=json(run,'kubectl',['--context',ctx,'config','view','--minify','-o','json']);
      if(config.users?.some(u=>u.user?.exec||u.user?.['auth-provider'])||config.clusters?.some(c=>c.cluster?.['proxy-url'])) throw new Error('external auth or proxy refused');
      assertPlatformTarget(profile,{run});
      const k=args=>json(run,'kubectl',['--context',ctx,...args]);
      entry.nodes=k(['get','nodes','-o','json']).items.map(n=>({name:n.metadata.name,allocatableCpu:quantity(n.status.allocatable.cpu),allocatableMemory:quantity(n.status.allocatable.memory)}));
      entry.pods=podInventory(k(['get','pods','-A','-o','json']).items);
      try {
        entry.metrics=k(['get','--raw','/apis/metrics.k8s.io/v1beta1/pods']).items.map(p=>({namespace:p.metadata.namespace,name:p.metadata.name,timestamp:p.timestamp,window:p.window,containers:p.containers.map(c=>({name:c.name,cpu:quantity(c.usage.cpu),memory:quantity(c.usage.memory)}))}));
      } catch { entry.metrics=null; }
      // Metrics Server is optional. Kubelet summary is already available on Kind.
      entry.kubelet = [];
      for (const node of entry.nodes) {
        const name = node.name;
        if (!kind.roles.some(role => name === kind.clusterName + '-' + role)) continue;
        try {
          const summary = k(['get','--raw','/api/v1/nodes/'+name+'/proxy/stats/summary']);
          entry.kubelet.push({node:name,status:'observed',...summarizeKubelet(summary)});
        } catch { entry.kubelet.push({node:name,status:'unavailable'}); }
      }
      entry.status='observed';
    } catch { entry.reason='local cluster or resource inventory unavailable'; }
  }
  return out;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {console.log(JSON.stringify(observeResources(),null,2));}
  catch(e){console.error(e.message);process.exitCode=1;}
}
