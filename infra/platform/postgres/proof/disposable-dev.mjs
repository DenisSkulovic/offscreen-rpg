/** Owner-operated, disposable runtime proof. No production CLI target overrides. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { ensureBaseline } from '../bootstrap/ensure.mjs';
import { createBaselineCustody } from '../bootstrap/custody.mjs';
import { loadOperatorArtifact } from '../bootstrap/operator.mjs';
import { readKindProfile, renderKindConfig } from '../../../clusters/kind/manager/config.mjs';

const expectedContext = 'kind-offscreen-dev';
const expectedCluster = 'offscreen-dev';
const ns = 'offscreen-dev-postgres';
const name = 'offscreen-pg-proof-' + randomBytes(6).toString('hex');
const actualContext = 'kind-' + name;
const root = mkdtempSync(join(tmpdir(), 'offscreen-pg-proof-'));
chmodSync(root, 0o700);
const kubeconfig = join(root, 'kubeconfig');
const kindConfig = join(root, 'kind.yaml');
const marker = randomBytes(16).toString('hex');
const artifact = loadOperatorArtifact();

function requireOk(result, message) {
  if (!result.ok) throw new Error(message + ': ' + (result.stderr || '').slice(0, 1000));
  return result.stdout;
}
function command(binary, args, {input, timeoutMs=30000} = {}) {
  const result = spawnSync(binary, args, {input, encoding:'utf8', timeout:timeoutMs, killSignal:'SIGKILL', maxBuffer:8*1024*1024});
  return {ok:!result.error && result.status===0, stdout:result.stdout??'', stderr:result.stderr??'', status:result.status};
}
function k(args, options) {
  return command('kubectl', ['--kubeconfig', kubeconfig, '--context', actualContext, ...args], options);
}
function read(resource, resourceName, namespace) {
  return JSON.parse(requireOk(k(['get', resource, resourceName, ...(namespace?['-n',namespace]:[]), '-o','json']), 'proof read failed'));
}
function assertOwned() {
  const object = read('namespace','offscreen-dev-system');
  if (object.metadata?.annotations?.['offscreen.proof/run'] !== marker ||
      object.metadata?.labels?.['offscreen.dev/owner'] !== 'offscreen-dev' ||
      object.metadata?.uid !== ownerUid) throw new Error('Disposable target identity changed');
}
let ownerUid;
const writes = [];
function runWorker(maintenance) {
  const custody = createBaselineCustody();
  const originalRun = custody.run;
  const run = (binary,args,options={}) => {
    if (binary === 'kind') {
      if (args.join(' ') !== 'get clusters') throw new Error('Unexpected Kind operation');
      const result = originalRun('kind',args,options);
      if (!result.ok || !result.stdout.split(/\s+/).includes(name)) throw new Error('Disposable cluster missing');
      return {...result, stdout:expectedCluster+'\n'};
    }
    if (binary === 'helm') return originalRun(binary,args,options);
    if (binary !== 'kubectl' || args[0] !== '--context' || args[1] !== expectedContext)
      throw new Error('Unexpected worker command');
    assertOwned();
    const verb = args[2] === '-n' ? args[4] : args[2];
    if (options.mutation) {
      if (!['apply','create'].includes(verb)) throw new Error('Unexpected persistent mutation');
      writes.push({verb, args:args.slice(2)});
    } else if (!['get','config','exec'].includes(verb) && !(verb==='create' && args.includes('--dry-run=server')))
      throw new Error('Unexpected read-only command');
    // The only adaptation is target routing. Native operations, lock FD, timeout,
    // admission, compatibility and SQL all execute against real Kubernetes.
    const result = originalRun('kubectl', ['--context',actualContext,'--kubeconfig',kubeconfig,...args.slice(2)], options);
    if (verb === 'config' && result.ok) {
      const body = JSON.parse(result.stdout);
      if (body.contexts?.length !== 1 || body.clusters?.length !== 1 ||
          body.contexts[0].name !== actualContext ||
          body.contexts[0].context.cluster !== actualContext ||
          body.clusters[0].name !== actualContext) throw new Error('Unexpected proof kubeconfig identity');
      body.contexts[0].name = expectedContext;
      body.contexts[0].context.cluster = expectedContext;
      body.clusters[0].name = expectedContext;
      body['current-context'] = expectedContext;
      return {...result,stdout:JSON.stringify(body)};
    }
    return result;
  };
  return ensureBaseline('dev',{authorized:true,maintenance,custody:{...custody,run}});
}
function inventoryUids() {
  return Object.fromEntries([...artifact.inventory.map(e=>[e.id,read(e.resource,e.name,e.namespace).metadata.uid]),
    ['namespace',read('namespace',ns).metadata.uid],
    ['cluster',read('cluster.postgresql.cnpg.io','dev-pg',ns).metadata.uid]]);
}
function record(label, data) {
  writeFileSync(join(root,label+'.json'),JSON.stringify(data,null,2)+'\n',{mode:0o600});
  console.log(label,JSON.stringify(data));
}
try {
  if (process.argv.length !== 3 || process.argv[2] !== '--authorize-disposable') throw new Error('Explicit disposable proof authorization required');
  const mem = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(readFileSync('/proc/meminfo','utf8'));
  if (!mem || Number(mem[1]) < 8*1024*1024) throw new Error('At least 8 GiB available required before creating proof cluster');
  if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT || process.env.DOCKER_TLS_VERIFY) throw new Error('Docker endpoint overrides refused');
  const dockerContext = requireOk(command('docker',['context','show']),'Docker context unavailable').trim();
  const endpoint = JSON.parse(requireOk(command('docker',['context','inspect',dockerContext,'--format','{{json .Endpoints.docker.Host}}']),'Docker endpoint unavailable'));
  if (typeof endpoint !== 'string' || !(endpoint.startsWith('unix:///') || endpoint==='npipe:////./pipe/dockerDesktopLinuxEngine')) throw new Error('Nonlocal Docker endpoint');
  const clusters = requireOk(command('kind',['get','clusters']),'Kind inventory unavailable').split(/\s+/);
  if (clusters.includes(name)) throw new Error('Disposable name collision');
  const ports = requireOk(command('ss',['-H','-ltn']),'Listening ports unavailable');
  const port = Array.from({length:101},(_,i)=>24443+i).find(p=>!new RegExp(':'+p+'\\s').test(ports));
  if (!port) throw new Error('No free dev-range proof port');
  writeFileSync(kindConfig,renderKindConfig(readKindProfile('dev'),port),{mode:0o600});
  console.log('Proof directory:',root,'cluster:',name,'port:',port);
  requireOk(command('kind',['create','cluster','--name',name,'--config',kindConfig,'--kubeconfig',kubeconfig,'--wait','180s'],{timeoutMs:300000}),'Disposable Kind creation failed');
  chmodSync(kubeconfig,0o600);
  const config = JSON.parse(requireOk(k(['config','view','--minify','-o','json']),'Proof kubeconfig unavailable'));
  if (config.contexts?.length!==1 || config.contexts[0].name!==actualContext ||
      config.clusters?.length!==1 || config.clusters[0].name!==actualContext ||
      config.clusters[0].cluster?.server!=='https://127.0.0.1:'+port ||
      config.users?.length!==1 || config.users[0].user?.exec || config.users[0].user?.['auth-provider'] ||
      config.clusters[0].cluster?.['proxy-url']) throw new Error('Disposable kubeconfig binding invalid');
  const cp = JSON.parse(requireOk(command('docker',['inspect',name+'-control-plane']),'Proof control plane unavailable'))[0];
  if (cp?.Config?.Labels?.['io.x-k8s.kind.cluster']!==name ||
      !cp?.NetworkSettings?.Ports?.['6443/tcp']?.some(x=>x.HostIp==='127.0.0.1' && x.HostPort===String(port))) throw new Error('Disposable control-plane binding invalid');
  const owner = {apiVersion:'v1',kind:'Namespace',metadata:{name:'offscreen-dev-system',labels:{'offscreen.dev/owner':'offscreen-dev'},annotations:{'offscreen.proof/run':marker}}};
  ownerUid = JSON.parse(requireOk(k(['create','-f','-','-o','json'],{input:JSON.stringify(owner)}),'Proof ownership creation failed')).metadata.uid;
  assertOwned();
  const storage = read('storageclass','standard');
  if (!storage.provisioner) throw new Error('Kind standard StorageClass unavailable');
  const first = runWorker(true);
  record('fresh',first);
  if (!first.ok || first.confirmedMutations.length!==3 || writes.length!==3) throw new Error('Fresh native acceptance failed');
  const before = inventoryUids();
  const count = writes.length;
  const second = runWorker(false);
  record('repeat',second);
  if (!second.ok || second.mutated || second.confirmedMutations.length || writes.length!==count ||
      second.instances!==first.instances || JSON.stringify(inventoryUids())!==JSON.stringify(before))
    throw new Error('Repeat acceptance failed');
  record('uids',before);
  record('result',{ok:true,profile:'dev',freshAndRepeat:true,persistentWrites:writes.length,cluster:name});
} catch(error) {
  console.error(error.message);
  process.exitCode=1;
} finally {
  // No automatic deletion: owner can inspect evidence and explicitly retire the
  // exact disposable cluster. Existing dev/release clusters never targeted.
  console.log('Evidence:',root);
  console.log('Disposable cluster (if created):',name);
  console.log('Inspect: kubectl --kubeconfig '+kubeconfig+' --context '+actualContext+' get pods -A');
}
