import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyWarmAliases} from './verify-warm-aliases.mjs';
const digest='sha256:'+'a'.repeat(64), canonical='offscreen-dev-workspace:union-'+'b'.repeat(16);
const aliases=['web','api','authority','worker'].map(r=>'offscreen-dev-workspace:dev-11-'+r);
function fixture(stale=false){
 const calls=[];
 const run=(cmd,args)=>{
  calls.push([cmd,...args]);
  let stdout='';
  if(cmd==='kind') stdout='offscreen-dev-control-plane\noffscreen-dev-worker\n';
  else if(args[0]==='image') stdout=args.slice(4).map(()=>digest).join('\n');
  else if(args[0]==='inspect') stdout='offscreen-dev';
  else if(args.includes('ls')) stdout=[canonical,...aliases].map((r,i)=>'docker.io/library/'+r+' application/vnd.oci.image.manifest.v1+json '+(stale&&i===4?'sha256:'+'c'.repeat(64):digest)).join('\n');
  else if(args.includes('get')) stdout=JSON.stringify({mediaType:'application/vnd.oci.image.manifest.v1+json',config:{digest}});
  else throw Error('unexpected mutation');
  return {status:0,stdout,stderr:''};
 };
 return {run,calls};
}
test('warm proof validates all four role tags on both nodes without mutations',()=>{
 const {run,calls}=fixture();
 assert.equal(verifyWarmAliases({slot:'dev-11',role:'all',canonical,digest,run}),true);
 assert.equal(calls.filter(c=>c.includes('ls')).length,4);
});
test('stale alias refuses fast path',()=>{
 assert.equal(verifyWarmAliases({slot:'dev-11',role:'all',canonical,digest,run:fixture(true).run}),false);
});
