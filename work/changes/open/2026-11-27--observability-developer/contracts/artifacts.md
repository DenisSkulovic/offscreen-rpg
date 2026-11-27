# T01–T02 | Helm artifacts

[Execution cards](../TASKS.md) · [Contract index](../INTERFACES.md) · [Proof and deadlines](../PROOF.md)

## T01/T02 executable artifact migration
Keep loadArtifacts(profileId,deps={}) return bundle shape except the selected descriptor changes below. Internal deps.variant is 'desired' (default) or 'predecessor' (dev only); never expose through CLI. No new runtime dependency.

R5-GEOGRAPHY named census is the baseline authority, not a new global terminology rule. Before dispatch planner needs current tracked grep (owner local command `git grep -nI -i -E 'specimen(sRoot)?|specFile|image-lock-candidate\.tsv|observability/(chart|install\.sh)|obs:connect|obs:upgrade' -- .`); historical references and unrelated matches unchanged. The scoped reference census in SOURCE-MAP.md records exact untruncated tree delta from completed R5 baseline census and changed operational docs review: no operational source change, no new path owner. Current scoped operational census reconciled remotely; repeat only if relevant source changes. T01 post-move negative grep still required. Exact path edits: artifacts.mjs root constants valuesRoot/locksRoot; OBSERVABILITY_RELEASE_ORDER specFile -> valuesFile; loadPins locks/charts.yaml; loadArtifacts locks/images.tsv and root expected-inventory.json; release plans and returned descriptor valuesPaths array, chartName, chartVersion, appVersion. Validate all five pin fields including appVersion, all archives and all required YAML inputs before first template. Preserve existing expectedImage/imageArgs and storage substitution args ordering, release order, inventory and chart bytes. Export helmValuesArgv(release) exactly valuesPaths.flatMap(path=>['-f',path]).concat(helmValueArgs); use same helper for template and install.mjs::helmInstallArgv (partial-install already consumes builder), lint path if uses descriptor. No old valuesPath alias. Update render.test.mjs path constants at 19–21, pins reads 167/197/218, malformed values 553; readiness.test.mjs lock path 29–34; proof.test.mjs values descriptor mocks; vendor README, infra README, check-lab-manifests.mjs five paths 72–76, check-lab-manifests.test.mjs lock assertion, infra-layout.test.mjs 932–964 expected paths and eight old input negatives. T01 owns the exact current native canonical geography edits enumerated in R5-GEOGRAPHY; planner has frozen their disposition and write allowance, not a competing precommission edit. Historical evidence untouched. No archive repack, new chart, chart version or image change.

T01 parity evidence from repo root on clean task worktree before first edit and after edits, same Helm version, private temp directory retained until receipt:
```bash
PROOF=$(mktemp -d)
chmod 700 "$PROOF"
export PROOF
# Run once before edits with STAGE=before, once after edits with STAGE=after.
STAGE=before node --input-type=module <<'JS'
import {loadArtifacts} from './infra/platform/observability/artifacts.mjs';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
for(const profile of ['dev','release']){
 const b=loadArtifacts(profile);
 const docs=b.documents.map(d=>[JSON.stringify([d.apiVersion,d.kind,d.metadata.namespace??b.profile.namespaces.observability,d.metadata.name]),d]).sort((a,b)=>a[0].localeCompare(b[0]));
 if(new Set(docs.map(x=>x[0])).size!==docs.length)throw Error('duplicate document');
 writeFileSync(join(process.env.PROOF,process.env.STAGE+'-'+profile+'.json'),JSON.stringify({docs,inventory:b.expectedInventory,locks:b.imageLocks,pins:b.releases.map(x=>[x.name,x.chartVersion,x.sha256,x.expectedImage])}),{mode:0o600});
}
JS
# After edits repeat identical node heredoc with STAGE=after, then:
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
for(const p of ['dev','release'])assert.deepStrictEqual(...['before','after'].map(s=>JSON.parse(readFileSync(join(process.env.PROOF,s+'-'+p+'.json'),'utf8'))));
JS
```
No comparison by loose hashes or ignored fields. Record git diff --name-status, helm version --short, parity exit status, same pins/archive hashes. Wrong final archive hash, malformed last YAML, missing last YAML all assert zero template calls. Tests that temporarily modify values/lock files restore in finally; run serially on dedicated worktree, verify no unexpected changed files.

T02 uses its own private temporary directory: PROOF=$(mktemp -d); chmod 700 "$PROOF"; export PROOF; mkdir -p infra/platform/observability/values/profiles/dev. Do not depend on T01's shell environment or private temporary files. T02 generator exact immutable source: git show 06306ace3717841f36ad0952cf7664afbd6fcd4a:work/designs/open/observability-developer/experiments/build-developer-values.py > "$PROOF/build-developer-values.py"; python3 "$PROOF/build-developer-values.py" infra/platform/observability/values/collector.yaml "$PROOF/collector-overlay.yaml"; install -m 0644 "$PROOF/collector-overlay.yaml" infra/platform/observability/values/profiles/dev/collector.yaml. PyYAML is existing design-time dependency; no runtime invocation or dependency addition. If unavailable report blocker, no hand-rewritten overlay. Default desired dev Collector ordered base then overlay, predecessor dev base singleton, release base singleton; reject unknown variant and release predecessor before any template. Keep five chart plans and hash validation before any render. For dual desired/predecessor observation avoid repeated four backend renders by adding internal loadObservabilityVariants(profileId,deps={}) returning {desired,predecessor:null|bundle}; use same validated plans, render five desired documents sets and one base Collector set, derive predecessor bundle by replacing only Collector descriptor/docs; both run same inventory and image validation. No public CLI variant or archive override. This internal optimization does not solve deadline feasibility by itself. Existing loadArtifacts(profileId,{variant}) remains single bundle API for tests; T05 consumers use variants helper. T02 expected render compare actual desired vs predecessor: only Collector ConfigMap/Deployment/Service changes (SA unchanged), exactly same four Collector identity keys, all non-Collector documents deep equal, pinned image identical, three existing diagnostic ports plus dev-otlp 4327 and dev-otlp-http 4328 (TCP, grpc appProtocol on dev-otlp), receiver endpoints 0.0.0.0:4327/4328, existing strict pipelines and processors unchanged. New traces/logs/metrics developer pipelines use otlp/developer and ordered memory_limiter/filter/developer/transform/developer/batch, existing exporters, generated YAML exact equality to accepted generator output. Parse relay YAML from rendered Collector ConfigMap, compare existing sections as deep objects (not string substring), verify no developer receiver/pipeline/port in release or predecessor. Save release parity baseline before overlay and verify exact after; predecessor dev equals T01 base. No live Collector run by Cursor.
