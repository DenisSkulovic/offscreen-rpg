// Read-only warm path. Never accepts an alias by name alone.
import { readKindProfile } from '../../clusters/kind/manager/config.mjs';
import { defaultRun, discoverKindNodes, parseCtrDigest, normalizeCtrRef, readKindImageIdentity, isValidSha256Digest } from '../distribution/kind-image-loader.mjs';
import { fileURLToPath } from 'node:url';

// The cold path uses the same strict target equality as the warm path.
export function reconcileDevAliases({slot,role,canonical,digest,run=defaultRun}) {
  if (!/^dev-[1-9][0-9]*$/.test(slot) || !['all','web','api','authority','worker'].includes(role) ||
      !/^offscreen-dev-workspace:union-[a-f0-9]{16}$/.test(canonical) || !isValidSha256Digest(digest)) throw Error('invalid alias reconciliation input');
  const aliases=(role==='all'?['web','api','authority','worker']:[role]).map(r=>'offscreen-dev-workspace:'+slot+'-'+r);
  const checked=(command,args)=>{
    const result=run(command,args);
    if(result.status!==0) throw Error('alias reconciliation command failed: '+command+' '+args[0]);
    return result.stdout;
  };
  const host=refs=>{
    const ids=checked('docker',['image','inspect','--format','{{.Id}}',...refs]).trim().split(/\s+/);
    if(ids.length!==refs.length || ids.some(id=>id!==digest)) throw Error('host alias digest mismatch');
  };
  host([canonical]);
  const nodes=discoverKindNodes(readKindProfile('dev'),run);
  const inventory=node=>checked('docker',['exec',node,'ctr','-n','k8s.io','images','ls']);
  // Prove both nodes before making any changes.
  const snapshots=nodes.map(node=>{
    if(readKindImageIdentity({node,ref:canonical,run})?.targetDigest!==digest) throw Error('canonical node digest mismatch: '+node);
    const rows=inventory(node);
    if(parseCtrDigest(rows,normalizeCtrRef(canonical))!==digest) throw Error('canonical inventory mismatch: '+node);
    return {node,rows};
  });
  for(const alias of aliases) checked('docker',['tag',canonical,alias]);
  for(const {node,rows} of snapshots) {
    for(const alias of aliases) {
      const target=parseCtrDigest(rows,normalizeCtrRef(alias));
      if(target===digest) continue;
      if(target!==null) checked('docker',['exec',node,'ctr','-n','k8s.io','images','rm',normalizeCtrRef(alias)]);
      checked('docker',['exec',node,'ctr','-n','k8s.io','images','tag',normalizeCtrRef(canonical),normalizeCtrRef(alias)]);
    }
  }
  for(const node of nodes) {
    const rows=inventory(node);
    for(const ref of [canonical,...aliases]) {
      if(parseCtrDigest(rows,normalizeCtrRef(ref))!==digest) throw Error('post-load-mismatch node='+node);
    }
  }
  host([canonical,...aliases]);
}

export function verifyWarmAliases({slot,role,canonical,digest,run=defaultRun}) {
  if (!/^dev-[1-9][0-9]*$/.test(slot) || !['all','web','api','authority','worker'].includes(role) ||
      !/^offscreen-dev-workspace:union-[a-f0-9]{16}$/.test(canonical) || !isValidSha256Digest(digest)) return false;
  const roles=role==='all'?['web','api','authority','worker']:[role];
  const refs=[canonical,...roles.map(r=>'offscreen-dev-workspace:'+slot+'-'+r)];
  try {
    const host=run('docker',['image','inspect','--format','{{.Id}}',...refs]);
    const ids=host.stdout.trim().split(/\s+/);
    if(host.status!==0 || ids.length!==refs.length || ids.some(id=>id!==digest)) return false;
    const nodes=discoverKindNodes(readKindProfile('dev'),run);
    for(const node of nodes) {
      const result=run('docker',['exec',node,'ctr','-n','k8s.io','images','ls']);
      if(result.status!==0 || refs.some(r=>parseCtrDigest(result.stdout,normalizeCtrRef(r))!==digest)) return false;
      // Retain the existing canonical manifest/platform proof once per node.
      if(readKindImageIdentity({node,ref:canonical,run})?.targetDigest!==digest) return false;
    }
    const final=run('docker',['image','inspect','--format','{{.Id}}',...refs]);
    const finalIds=final.stdout.trim().split(/\s+/);
    return final.status===0 && finalIds.length===refs.length && finalIds.every(id=>id===digest);
  } catch { return false; }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const reconcile=process.argv[2]==='--reconcile';
  const [slot,role,canonical,digest]=process.argv.slice(reconcile?3:2);
  if(reconcile) {
    try { reconcileDevAliases({slot,role,canonical,digest}); }
    catch(error) { console.error(error.message); process.exitCode=1; }
  } else {
  const ok=verifyWarmAliases({slot,role,canonical,digest});
  if(ok) console.error('phase=warm-alias-proof slot='+slot+' role='+role+' result=hit');
  process.exitCode=ok?0:1;
  }
}
