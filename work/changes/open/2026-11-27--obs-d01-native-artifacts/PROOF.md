# Proof

All commands from repository root in dedicated worktree, offline Helm already installed and dependencies present. NOT RUN. No kubectl, helm install, network, image pulls or paid operations.

## Render parity

Parent captures baseline before T01 and reuses same private directory and Helm version after T02. Export STAGE=before then run snapshot block. After edits export STAGE=after and rerun the same block, keeping PROOF exported in parent shell. Use set -euo pipefail; do not overwrite snapshots. On failure retain private directory for diagnosis; remove only this owned directory after receipt.

```bash
PROOF=$(mktemp -d)
chmod 700 "$PROOF"
export PROOF
helm version --short
export STAGE=before
```

```bash
node --input-type=module <<'JS'
import {loadArtifacts} from './infra/platform/observability/artifacts.mjs';
import {writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import assert from 'node:assert/strict';
import {helmInstallArgv} from './infra/platform/observability/install.mjs';
for(const profile of ['dev','release']){
 if (!['before','after'].includes(process.env.STAGE)) throw Error('bad STAGE');
 const b=loadArtifacts(profile);
 const docs=b.documents.map(d=>[JSON.stringify([d.apiVersion,d.kind,d.metadata.namespace??b.profile.namespaces.observability,d.metadata.name]),d]).sort((a,b)=>a[0].localeCompare(b[0]));
 if(new Set(docs.map(x=>x[0])).size!==docs.length)throw Error('duplicate document');
 assert.equal(b.releases.length,5);
 assert.deepEqual(b.releases.map(x=>x.role),['prometheus','loki','tempo','collector','grafana']);
 const identity={snapshotPath:'/offline-proof/kubeconfig',contextName:'offline-proof-'+profile,namespace:b.profile.namespaces.observability};
 const installArgv=b.releases.map(x=>{
   const argv=helmInstallArgv(identity,x);
   const indices=argv.flatMap((arg,i)=>arg==='-f'?[i]:[]);
   assert.equal(indices.length,1);
   const i=indices[0]+1;
   const root=dirname(dirname(x.chartPath));
   const expected=join(root,process.env.STAGE==='before'?'specimens':'values',x.role+'.yaml');
   assert.equal(argv[i],expected);
   // Normalize only the verified relocated value argument; preserve every other token/order.
   argv[i]=join(root,'values',x.role+'.yaml');
   return [x.name,argv];
 });
 writeFileSync(join(process.env.PROOF,process.env.STAGE+'-'+profile+'.json'),JSON.stringify({docs,inventory:b.expectedInventory,locks:b.imageLocks,pins:b.releases.map(x=>[x.name,x.chartVersion,x.sha256,x.expectedImage]),installArgv}),{mode:0o600,flag:'wx'});
}
JS
```

```bash
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
for(const p of ['dev','release'])assert.deepStrictEqual(...['before','after'].map(s=>JSON.parse(readFileSync(join(process.env.PROOF,s+'-'+p+'.json'),'utf8'))));
JS
```

After T02 export STAGE=after and rerun snapshot before comparison. Require parsed exact equality (no ignored fields), five unchanged archive hashes/images and inventory, and full installer argv equality for all ten release/profile pairs after normalizing only the exact verified -f pathname. The installer builder is called as a pure function with a synthetic identity; no Helm install or cluster call. No overlay, port or policy change. Record Helm version and parity exit. Snapshot baseline is private, not committed.

## Focused source checks

- Existing final corrupt archive hash must refuse before any template. Add missing and malformed final Grafana values cases: save bytes, use countingRun, delete/replace one file, assert artifact-invalid and zero template calls, restore in finally. Run serially in dedicated worktree. Add missing appVersion pin case (zero templates). Existing all-profile inventory, image/lock negatives unchanged.
- Assert each returned descriptor has one valuesPaths entry and exact chartName/version/appVersion; template argv contains helper slice, install same exact slice for all five releases in both profiles; baseline/after full argv parity independently verifies the shared helper has not changed both call sites in the same wrong way; no valuesPath alias, no --atomic/cleanup-on-fail. Existing install failure sequence tests remain.
- Raw scan excludes five maintained Helm values but still scans locks/charts.yaml. Layout verifies each new path and all eight old paths absent. Proof wrapper mocks exercise same shared install builder.
- T01/T02 combined after edits:
```bash
node --test --test-concurrency=1 infra/platform/observability/tests/{render,readiness,install}.test.mjs infra/verification/smoke/observability/tests/proof.test.mjs scripts/repo-tools/{check-lab-manifests,infra-layout}.test.mjs
node --test --test-concurrency=1 infra/platform/observability/tests/{diagnostic-worker,receipt}.test.mjs
git diff --check
git status --short
git diff --name-status
```
- Before commission planner/owner confirms tracked operational census from current worktree; after edits verify no old operational references (review only matching lines, historical docs untouched):
```bash
git grep -nI -E 'observability/specimens|specimensRoot|specFile|image-lock-candidate\.tsv|valuesPath\b|helmInstallArgv|loadArtifacts|NATIVE_OBSERVABILITY_VALUES_PATHS' -- . ':!work/**' ':!research/**' ':!evidence/**'
```
  Unrelated matches do not justify edits; unexpected live caller stops for planner. Inspect actual staged and unstaged diff, including moves. Record exact focused results and any unrelated baseline failure separately. Run changed-file format/lint per repository policy, no full monorepo suite. Heavy live A/V proof remains outstanding, no live certification from this Change. Parent cleans owned temp only after evidence; stop if parity or safety test fails.
