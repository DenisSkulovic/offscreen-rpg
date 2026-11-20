import test from 'node:test';
import assert from 'node:assert/strict';
import {assessDesign,assessArchive} from './retirement-health.mjs';

test('done designs are candidates but cannot be deleted automatically',()=>{
 assert.deepEqual(assessDesign('Done',2,4),{review:true,backlinks:4,autoDelete:false});
});
test('old unselected design is only flagged',()=>{
 assert.deepEqual(assessDesign('Proposed, not selected',8,0),{review:true,backlinks:0,autoDelete:false});
});
test('archived Change needs age, compact ledger and zero backlinks',()=>{
 assert.equal(assessArchive(8,true,0).pruneCandidate,true);
 assert.equal(assessArchive(6,true,0).pruneCandidate,false);
 assert.equal(assessArchive(8,false,0).pruneCandidate,false);
 assert.equal(assessArchive(8,true,1).pruneCandidate,false);
 assert.equal(assessArchive(null,true,0).pruneCandidate,false);
});
