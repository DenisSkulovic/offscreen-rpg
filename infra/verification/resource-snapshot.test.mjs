import test from 'node:test';
import assert from 'node:assert/strict';
import {quantity,podInventory,summarizeKubelet} from './resource-snapshot.mjs';
test('Kubernetes quantities normalize to cores and bytes',()=>{assert.equal(quantity('50m'),.05);assert.equal(quantity('384Mi'),384*1024**2);assert.equal(quantity('2Gi'),2*1024**3);assert.throws(()=>quantity('bad'));});
test('terminal pods excluded, missing limits remain null',()=>{const p={metadata:{namespace:'dev',name:'api'},spec:{containers:[{name:'api',resources:{requests:{memory:'384Mi'}}}]},status:{phase:'Running'}};const result=podInventory([p,{...p,status:{phase:'Succeeded'}}]);assert.equal(result.length,1);assert.equal(result[0].containers[0].limitMemory,null);assert.equal(result[0].containers[0].requestMemory,384*1024**2);});

test('kubelet summary groups measured working sets, never converts missing usage to zero',()=>{const r=summarizeKubelet({pods:[{podRef:{namespace:'offscreen-dev-11',name:'a'},containers:[{name:'api',memory:{workingSetBytes:100}},{name:'other'}]},{podRef:{namespace:'offscreen-dev-11',name:'b'},containers:[{name:'worker',memory:{workingSetBytes:200}}]}]});assert.deepEqual(r.namespaces,[{namespace:'offscreen-dev-11',workingSetBytes:300,unknownContainers:1,containers:3}]);assert.equal(r.pods[0].containers[1].workingSetBytes,null);});
