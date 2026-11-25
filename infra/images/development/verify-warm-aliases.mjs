// Read-only warm path. Never accepts an alias by name alone.
import { readKindProfile } from '../../clusters/kind/manager/config.mjs';
import { defaultRun, discoverKindNodes, parseCtrDigest, normalizeCtrRef, readKindImageIdentity, isValidSha256Digest } from '../distribution/kind-image-loader.mjs';
import { fileURLToPath } from 'node:url';

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
  const [slot,role,canonical,digest]=process.argv.slice(2);
  const ok=verifyWarmAliases({slot,role,canonical,digest});
  if(ok) console.error('phase=warm-alias-proof slot='+slot+' role='+role+' result=hit');
  process.exitCode=ok?0:1;
}
