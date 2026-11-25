import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyWarmAliases,reconcileDevAliases} from './verify-warm-aliases.mjs';
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

test('cold reconciliation batches node inventories and verifies exact targets',()=>{
 const {run:base,calls}=fixture(true);
 const tagged=new Set();
 const run=(cmd,args)=>{
   if(args[0]==='tag'||args.includes('rm')||args.includes('tag')) {
     calls.push([cmd,...args]);
     if(args[0]==='exec'&&args.includes('tag')) tagged.add(args[1]);
     return {status:0,stdout:'',stderr:''};
   }
   const result=base(cmd,args);
   if(args.includes('ls')&&tagged.has(args[1])) result.stdout=result.stdout.replace('sha256:'+'c'.repeat(64),digest);
   return result;
 };
 reconcileDevAliases({slot:'dev-11',role:'all',canonical,digest,run});
 assert.equal(calls.filter(c=>c[0]==='kind').length,1);
 assert.equal(calls.filter(c=>c.includes('ls')).length,6);
 assert.equal(calls.filter(c=>c.includes('rm')).length,2);
 assert.equal(calls.filter(c=>c[1]==='exec'&&c.includes('tag')).length,2);
});
test('cold reconciliation refuses invalid slot before mutation',()=>{
 assert.throws(()=>reconcileDevAliases({slot:'foreign',role:'all',canonical,digest,run:()=>{throw Error('unexpected command')}}),/invalid alias/);
});
test('cold reconciliation fails closed when tag does not actually update target',()=>{
 const {run:base}=fixture(true);
 const run=(cmd,args)=>args[0]==='tag'||args.includes('rm')||args.includes('tag')?{status:0,stdout:'',stderr:''}:base(cmd,args);
 assert.throws(()=>reconcileDevAliases({slot:'dev-11',role:'all',canonical,digest,run}),/post-load-mismatch/);
});
