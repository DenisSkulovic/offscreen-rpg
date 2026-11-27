# Acceptance ownership
Single successor owns all V01–V12 and transferred A1–A12. Original predicates frozen at 5f5750eca2f31d92fac6bfa478d1cae7203e1815:work/changes/open/2026-11-26--observability-native/{PROOF,OWNER-ACCEPTANCE}.md. R5-CERTIFICATION.md and ACCEPTANCE.md in design dossier map each original obligation. No old proof upgraded to PASS. Cursor source only; owner/ChatGPT heavy acceptance. A6/A8/A9 isolated environment availability still to confirm before full commission; no live authorization. T01 source-only first slice does not require live target. T01 actual Helm offline render and focused tests per TASKS. Remaining gates NOT RUN on successor. No merge until required successor proof; no separate predecessor certification or joint closure.

## Unified successor ledger
A1–A5, A11 source, A12: source proof NOT RUN on successor. A6 fresh install, A7 strict signal/privacy, A8 isolated persistence/outage, A9 isolated quota failure, A10 resources: owner proof NOT RUN on successor. A11 live conditional read-only. V01–V12 remain mandatory per accepted matrix, historical feasibility not implementation acceptance. Archived native [PROOF](../../archive/2026-11/observability/2026-11-26--observability-native/PROOF.md) and [owner route](../../archive/2026-11/observability/2026-11-26--observability-native/OWNER-ACCEPTANCE.md) are predicate history, not active commissions; R5 overrides conflicting mechanisms. No separate native closure.

## F08 | single selected deadline candidate (independent ratification pending)

Owner approved this candidate for independent review in repair15. Defended R5 remains architecture authority until the amendment passes review. No runtime authorization or dispatch. Earlier repair10/11 alternatives and original infeasible phase schedules are historical only: [pre-consolidation PROOF.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/6b6d909c8c91464c027a530d6837479d78002923/work/changes/open/2026-11-27--observability-developer/PROOF.md). Do not implement those alternatives.

All values below are seconds; export shared runtime constants in milliseconds in identity.mjs (T03), wire external callers in T05, and consume the same constants in T07–T11. No copied divergent totals. Exact recognition and process containment remain specified in INTERFACES repair17/18. No hidden proof mode. A phase may start only if its full allocation fits its work deadline; clamp nested operations and termination grace to remaining monotonic time, check before and after, never convert exhausted time into a 1ms command. Work deadline = absolute deadline minus emergency reserve, once only. Emergency reserve is exclusively for failure/interruption restoration and cleanup, not further acceptance work. A cancelled run cannot pass. No sleep-to-budget. Unused allocation is not an obligation to wait.

### Primitive allocations

| Phase | Ceiling | Accounting |
|---|---:|---|
| Artifact preflight | 390 | six Helm templates at 60 each plus 30 local validation/hash; release five |
| Identity capture / full recheck | 210 each | full frozen tuple, individual commands <=15 |
| Custody / host-source admission | 10 / 30 | bounded, no hidden render |
| Combined start | 640 | 390+210+10+30 |
| Inventory | 120 | complete sequential scan, individual calls <=10 |
| Normal receipt/lock/snapshot closure | 30 | terminal result only after cleanup |
| Proxy/forward startup / close | 90 / 15 | owned process only |
| Namespace create | 270 | identity210 + typed absence15 + create30 + durable UID evidence15 |
| CM or Pod create | 285 | identity210 + namespace UID15 + typed absence15 + create30 + ledger15 |
| Pod ready | 300 | namespace/Pod checks30 + readiness270 incl image pull |
| Exec normal / privacy | 150 / 330 | UID checks30 + exec120/300 |
| Read evidence | 60 | UID checks30 + bounded JSON extraction30 |
| Delete Pod / CM | 360 each | UID preconditions, consumer census for CM, bounded typed absence, ledger |
| Normal / privacy Pod cycle | 1155 / 1335 | 285+300+150/330+60+360 |

Preserve existing sequential inventory, complete 19-kind raw endpoint census, bounded pagination (100/page, 500 aggregate items as existing), Helm list/history/manifests, PV and legacy-name reads. Refuse extra/unexpected releases before arbitrary history/manifest reads. No partial classified result, no fallback ambient listing, no concurrency redesign. The 120s aggregate is fail-closed, not a reservation of each call's maximum. Empirical complete-inventory viability remains unverified. Preload verified artifacts once per operation; don't re-render between observations. Inventory includes no implicit full identity recheck. Actual source at baseline: inventory.mjs::collectInventory/remainingMs currently permits minimum 1ms and adds cleanup to default budget; T05 must enforce exact bounded semantics. identity.mjs::recheckIdentity currently defaults to per-command cap; T03 must implement full selected tuple/budget, not merely rename constants.

### Installer, observation, upgrade and connect

- Fresh ensure: preflight640 + admission inventory120 + namespace720 + Secret495 + five Helm phases975 each + final inventory120 + full identity210 + normal clear/close/receipt60 = **7240**. Worker ceiling7380, reserve60, work7320, slack80. Namespace720 = preinventory120 + identity210 + ledger15 + write30 + durable binding/full recheck225 + postinventory120. Secret495 = 120+210+15+30+120. Helm975 =120+210+15+510+120. Both before/after prefix observations remain mandatory. Bind actual namespace create response UID durably before next read. Exact public ensure supervisor7500; retain exact runner exemption, not a blanket timeout extension.
- Universal Helm outer cap510, Helm internal wait180 unchanged. No alternate normal-only6000 worker or isolated proof switch. The 510 cap accommodates the A9 wrapper's additional checks; actual subprocess chain feasibility still requires review/evidence.
- Read-only observation: 640+120+210+30=1000 worker, external supervisor1060. Plan via exact public platform runner; status direct. Reconcile diagnostic/provisioning callers, pending-readable result is not readiness.
- Upgrade: 640+120+210+15+240+120+90+15+210+60=1720; ceiling1800 reserve60 work1740. One Collector mutation only; no rollback. No-op observation also fits.
- Connect: preflight970=640+120+210; startup90 then indefinite foreground; periodic full checks <=210 each. No overall foreground deadline.

### Proof gate allocations

Components are ordered as described below and in INTERFACES; total includes emergency reserve; slack is unallocated.
| Gate | Work component arithmetic | Work sum | Reserve | Total | Slack |
|---|---|---:|---:|---:|---:|
| health | 640+120+90+15+120+210+30 | 1225 | 120 | 1380 | 35 |
| developer | 640+120+90+600+60+15+210+30 | 1765 | 120 | 1920 | 35 |
| resources | 640+120+90+300+15+120+210+30 | 1525 | 120 | 1680 | 35 |
| signals | 640+120+90+270+285+1155+1335+360+210+15+30 | 4510 | 1020 | 5580 | 50 |
| persistence | 640+120+90+270+285+1155+5655+735 | 8950 | 1020 | 10020 | 50 |
| outage | 640+120+90+270+285+3465+490+820+735 | 6915 | 2040 | 9000 | 45 |
| partial-install | 640+120+210+60+7500+210+120+1100+120+210+30 | 10320 | 300 | 10680 | 60 |

Health order start, inventory, Grafana query, close, repeat inventory, final identity, receipt. Developer start, inventory, forward, Python600 positive/negative/positive, evidence60, close, identity, receipt. Resources start, inventory, forward, sampling/report300, close, repeat inventory, identity, receipt. Signals start, inventory, proxy, namespace, CM, separate normal and privacy Pod cycles, CM delete, identity, close, receipt. No Pod reuse between modes.

Resources: Python currently writes broad node summaries, loops node reads sequentially with 25s timeout, sleeps after each cycle; use per-cycle concurrent reads of exactly the two nodes with 8s request cap, schedule next cycle no earlier than 10s from prior cycle start (if overrun, fail, no burst catch-up); all 12 cycles fit 120s plus setup/final/Prom queries within 300s. Fixed production interval 10; fake clock only in tests. Use actual allocated Prom port (never 0), no env override to zero, no fallback ambient node listing, exact observed roles. Preserve original memoryTime/workingSetBytes keys internally; map to INTERFACES report schema at boundary. No raw node summaries on disk.

Persistence: start640, inventory120, proxy90, namespace270, CM285, baseline normal cycle1155, three rounds of restart730 + replay cycle1155, finish735. Restart730 = preinventory120+identity210+patch30+pending10+rollout240+postinventory120. Pending must be durable before patch. Finish735 = inventory120+CM delete360+identity210+proxy close15+compare-clear/receipt30. Clear before releasing custody.

Exact order Prometheus Deployment, Loki StatefulSet, Tempo StatefulSet. Capture initial stable identities and exact baseline synthetic identity/timestamp. Each round must fetch fresh inventory and actual current workload UID/RV; never reuse initial RV or fallback initial claims. Before first mutation begin durable pending; advance compare-owned record before each later mutation. JSON Patch tests metadata.uid, metadata.resourceVersion and expected generation/replicas where relevant, then writes only restart annotation; use frozen explicit target flags. Verify new ready Pod UID, old UID absent, current observed generation, unchanged workload UID and exact three PVC UID/volumeName/PV UID and claimRef tuples. Replay mode queries all original signals and recorded timestamp; **zero OTLP POST**. No success with stale/missing claim reads. Compare-clear pending after final preservation and fresh identity, before release of custody (charge clear in final 30s ledger/receipt; perform before closing proxy/snapshot). No rollback or second restart on unknown write.

Outage: start640, inventory120, proxy90, namespace270, CM285; baseline cycle, down490, fresh outage cycle, restore820, fresh recovery cycle, finish735. Down490=inventory120+identity210+patch30+pending10+down verification120. Restore820=identity210+fresh inventory/claim/RV120+write30+rollout240+postinventory120+recovery evidence100. Pending before each write; final identity charged in finish. No new proof after work expiry. The down cycle must prove fresh logs/metrics and confirmed Tempo unavailability while down, not a failed query treated as proof. Restoration uses freshly read same Tempo UID and current resourceVersion, replicas exactly zero, recorded original replicas one, recorded operation ownership, frozen identity. Never use the pre-scale-down RV. If observed replicas already one, only verify convergence/preservation; no second write. If any foreign UID, unexpected replicas, unreadable identity or unowned state, retain pending and stop writes. No success until same Collector Pod UID, stable claims/PVs, restored Tempo ready and new all-signal proof. Normal restoration only one mutation attempt; ambiguous result may be observed read-only, not blindly retried.

Signals/persistence emergency reserve1020 covers known Pod cleanup360+CM cleanup360+identity210+proxy15+receipt30=975. Outage emergency reserve2040 covers restore820+same cleanup975=1795; restoration first, no new proof. If exact identity, ownership or available time is insufficient, retain pending/known ledger, refuse unsafe cleanup. Namespace deletion is not authorized.

Partial-install: start640, absent inventory120, identity210, wrapper setup60, first public ensure7500, bound identity210, retained inventory120, repeat public refusal1100, retained inventory120, final identity210, receipt30. Outer supervisor owns no platform lock; real inner ensure owns custody. Read actual created namespace UID from the wrapper's private durable ensure-intent binding ledger, corroborated by exact retained pending tuple and frozen namespace GET; public ensure receipt deliberately has no UID. Require successful worker/outer receipt parsing for failure/refusal predicates independently; never invent a public UID field. A timeout never counts as refusal. Use exact wrapper argv and narrow read-only inherited-lock adapter in INTERFACES repair12/13 and owned process group cancellation in repair18; never infer API write cancellation from process death. Preserve failed platform and pending. No cleanup of failed platform. Emergency300 does not authorize restoration or deletion.

Proof source tests: fake monotonic clock at each phase boundary (exact fit, one ms insufficient, command timeout despite exit0, cleanup failure after green operation, restoration reserve available after work expiry); assert no subsequent phase/child or successful receipt after failure. Existing proof-host early return/finally cannot make returned ok reflect cleanup failure: refactor to single terminal result after cleanup. Test actual public main return code and persisted receipt agree. Do not claim these budgets proven by arithmetic alone.

## Open evidence and ratification gates

D1 (owner approved candidate for independent review): approve the selected numerical amendment for independent review (not live authorization). Alternative: retain defended bounds and return to design for substantially different custody/inventory/proof composition. Do not commission packet with mutually contradictory budgets. Recommend approval of amended bounds, subject to actual timing evidence and independent review; maxima not operational target times.

D2 (planning approved; availability unverified): confirm availability of two owner-assigned fresh isolated normal-profile dev targets (or sequential separately approved fresh bootstrap), with exact cluster identity and no unrelated data/workloads, for A6/A8 and A9. No automatic cluster creation, destruction or recovery. Source implementation itself need not use these targets; original precommission availability requirement remains.

D3 (planning approved; evidence unverified): recover original data-plane output (only application rows and TARGET_INFO, source SHA/pins) or explicitly authorize a separately reviewed isolated disposable experiment to establish exact labels. Do not run experiment against current application stores or assume existing local Docker authority. No secrets, raw logs or user telemetry requested. Source-derived candidate includes three promoted resource attributes; actual fixture remains unverified.

D4 timestamp bound: selected full signed OTLP application timestamp domain, three bounded raw matrix queries before every metric-bearing submission, specified in INTERFACES.md D4. Verified pinned converter, duration parser and raw query source; practical pinned query evidence and exact labels remain open. Candidate Python phase subtotal533s <=600s (105 preflight +128 POST +180 positive query +120 negative query), 67s remaining. No new proof authority.

Cross-task corrections: T08/09 uses separate normal and privacy Pods (repair11 arithmetic), not both modes in one 900s Pod. T08 resource creation CM/Pod includes typed absence in285s, not270. T06 internal diagnosticHttp4318 proof-only binding; public bindings unchanged. T06 requires exact expectedSecretUid from classified inventory and resolved artifact Service targetPort (not identity tuple); pass both as explicit arguments, no ambient secret discovery. T10 uses actual five scoped roles and two normal nodes; fixed interval, no production env override. T11 wrapper exact builders repair13 override argv[0] classifier; no arbitrary read-only Helm commands. T11 restore adapter narrow, no generic cancellation bypass. These selections supersede contradictory earlier prose but do not constitute effective deadline authorization.

Owner evidence route (exact executable batch below): first recover captured stdout of the previously accepted immutable data-plane experiment, specifically the JSON after "=== PROMETHEUS SERIES AND VALUES ===" and line "TARGET_INFO". No Collector debug log needed. If unavailable, reproduce using accepted design experiment only on verified isolated local Docker host, pinned already-present images, private directory, no host mounts/ports and no Kubernetes writes. Before execution planner must provide exact rendered relay source and preflight/cleanup instructions. Do not run against application stores. For A6/A8/A9 isolated VM reuse, require actual VM/cluster identity, target occupancy and separately authorized fresh reset before any destructive action. Approval of planning is not evidence those prerequisites are met.

No source or live tests run by this consolidation. Independent ratification of candidate deadlines, exact caller/subprocess feasibility, D4 pinned query execution evidence, pinned developer metric label evidence and isolated target availability remain open. All tasks held. No acceptance predicates retired.

## D3/D4 | owner-operated isolated pinned evidence batch (not executed)

Prior R3.2 stdout was not recovered in tracked files or accessible prior terminal context. The recorded successful private evidence directory was /tmp/offscreen-obs-data-plane.ruUJDGpb; if exact full row stdout is available, return only the application rows and TARGET_INFO line. The old experiment did not exercise D4 full-domain queries, so a new isolated run remains required for that evidence.

Run the following from the current main worktree with no implementation changes, only after owner explicitly approves this local Docker-only experiment and verifies local Docker context/daemon, available memory and preexisting pinned images. No Kubernetes requests, host mounts, published ports, image pulls, external network or application stores. This reuses the accepted experiment bytes, injecting a bounded query receipt into a private temporary copy, not editing tracked design scripts. Stop on any failed prerequisite, query, label or cleanup. No broad Docker removal. Existing script cleans only the containers it creates; label-based postcheck detects retained experiment containers (do not automatically remove them). Do not run on an unverified remote daemon.

```bash
(
set -euo pipefail
umask 077
test "${OFFSCREEN_OBSERVABILITY_EVIDENCE:-}" = authorized
test -z "${DOCKER_HOST:-}${DOCKER_CONTEXT:-}${DOCKER_TLS:-}${DOCKER_TLS_VERIFY:-}${DOCKER_CERT_PATH:-}"
test -z "$(git status --porcelain)"
CTX=$(docker context show)
HOST=$(docker context inspect "$CTX" --format '{{.Endpoints.docker.Host}}')
case "$HOST" in unix://*) ;; *) echo "REFUSE nonlocal Docker endpoint"; exit 2;; esac
docker info --format '{{.Name}} {{.MemTotal}}'
W=$(mktemp -d /tmp/offscreen-obs-evidence.XXXXXXXX)
export W
echo "PRIVATE EVIDENCE: $W"
D=work/designs/open/observability-developer/experiments
BASE=06306ace3717841f36ad0952cf7664afbd6fcd4a
for f in build-developer-values.py data-plane.py run-data-plane.sh; do
  git show "$BASE:$D/$f" > "$W/$f"
done
test "$(git hash-object "$W/build-developer-values.py")" = 9a9a6a724891caba1146a82dc6434f3f9460e0eb
test "$(git hash-object "$W/data-plane.py")" = d003d533c1a8e170730a25fb4fb3a9a9ded75266
test "$(git hash-object "$W/run-data-plane.sh")" = b834b169052d3121f267d774807b6358964071d1
python3 "$W/build-developer-values.py" infra/platform/observability/specimens/collector.yaml "$W/overlay.yaml"
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {parse,parseAllDocuments} from 'yaml';
import {loadArtifacts} from './infra/platform/observability/artifacts.mjs';
const b=loadArtifacts('dev');
const c=b.releases.find(x=>x.role==='collector');
const prom=b.releases.find(x=>x.role==='prometheus');
assert(c && prom);
const cfgs=prom.documents.filter(x=>x.kind==='ConfigMap' && typeof x.data?.['prometheus.yml']==='string');
assert.equal(cfgs.length,1);
const config=parse(cfgs[0].data['prometheus.yml']);
assert.deepEqual(config.otlp?.promote_resource_attributes,['deployment.environment.name','service.namespace','service.name']);
assert.equal(config.otlp?.keep_identifying_resource_attributes??false,false);
assert.equal(config.otlp?.promote_scope_metadata??false,false);
assert.equal(config.otlp?.translation_strategy??'UnderscoreEscapingWithSuffixes','UnderscoreEscapingWithSuffixes');
assert.equal(config.otlp?.convert_histograms_to_nhcb??false,false);
assert.equal(config.otlp?.promote_all_resource_attributes??false,false);
assert.equal((config.remote_read??[]).length,0);
assert.equal((config.remote_write??[]).length,0);
const rr=spawnSync('helm',['template',c.name,c.chartPath,'--namespace',b.profile.namespaces.observability,'-f',c.valuesPath,'-f',process.env.W+'/overlay.yaml',...c.helmValueArgs],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
assert.equal(rr.status,0);
const docs=parseAllDocuments(rr.stdout).map(x=>{assert.equal(x.errors.length,0);return x.toJSON()});
const cm=docs.filter(x=>x?.kind==='ConfigMap'&&x.metadata.name==='obs-collector');
assert.equal(cm.length,1);
assert.equal(typeof cm[0].data.relay,'string');
writeFileSync(process.env.W+'/relay.yaml',cm[0].data.relay,{mode:0o600});
console.log('PINNED RENDER AND OTLP CONFIG CHECK PASS');
JS
# The following modifies only the private copy, after verifying the original blob.
python3 - "$W/run-data-plane.sh" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
marker='print("PROMETHEUS SERIES CHECK PASS")'
assert s.count(marker)==1
injection=r'''
from datetime import datetime,timezone,timedelta
from decimal import Decimal
from urllib.parse import urlencode
import time
job="offscreen/offscreen-developer-proof"
base={"job":job,"deployment_environment_name":"development","service_namespace":"offscreen","service_name":"offscreen-developer-proof","offscreen_candidate":"probe"}
expected={}
def add(name,value,**extra):
    expected[tuple(sorted(dict(base,__name__=name,**extra).items()))]=Decimal(str(value))
add("offscreen_agent_runs_total",17)
add("offscreen_agent_active_ratio",3)
add("offscreen_agent_duration_seconds_sum","0.2")
add("offscreen_agent_duration_seconds_count",1)
for le,v in zip(("0.01","0.1","1","10","60","+Inf"),(0,0,1,1,1,1)):
    add("offscreen_agent_duration_seconds_bucket",v,le=le)
assert len(rows)==len(expected)
assert {tuple(sorted(r["metric"].items())):Decimal(r["value"][1]) for r in rows}==expected
meta=query('target_info{job="'+job+'"}')
assert len(meta)==1 and meta[0]["metric"]=={"__name__":"target_info","job":job,"deployment_environment_name":"development"} and Decimal(meta[0]["value"][1])==1
windows=((-9223372036854,-3000000000001),(-3000000000000,2999999999999),(3000000000000,9223372036854))
seen={};results=[];count=0
epoch=datetime(1970,1,1,tzinfo=timezone.utc)
for lo,hi in windows:
    params={"query":'{job="'+job+'"}['+str(hi-lo+1)+'ms]',"time":(epoch+timedelta(milliseconds=hi)).isoformat(timespec="milliseconds"),"timeout":"5s"}
    start=time.monotonic()
    with urllib.request.urlopen("http://127.0.0.1:9090/api/v1/query?"+urlencode(params),timeout=5) as response:
        raw=response.read(1048577)
    elapsed=time.monotonic()-start
    assert len(raw)<=1048576 and elapsed<=5
    body=json.loads(raw,parse_float=Decimal)
    assert body["status"]=="success" and body["data"]["resultType"]=="matrix" and not body.get("warnings") and not body.get("infos")
    window_series=set()
    for row in body["data"]["result"]:
        key=tuple(sorted(row["metric"].items()))
        assert key not in window_series and row["metric"]["job"]==job and "histograms" not in row
        window_series.add(key)
        previous=None
        for t,v in row["values"]:
            ms=Decimal(t)*1000
            assert ms==ms.to_integral_value() and lo<=ms<=hi and (previous is None or ms>previous)
            previous=ms
            count+=1
            if row["metric"]["__name__"]!="target_info":
                assert key in expected and Decimal(v)==expected[key]
                seen[key]=max(seen.get(key,ms),ms)
        assert previous is not None
    assert count<=16384
    results.append({"lo":lo,"hi":hi,"elapsedMs":round(elapsed*1000),"bytes":len(raw),"series":len(window_series)})
assert set(seen)==set(expected) and len(set(seen.values()))==1
print("D3_D4_RECEIPT",json.dumps({"application":[{"metric":dict(k),"value":str(expected[k]),"rawTimestampMs":int(seen[k])} for k in sorted(seen)],"targetInfo":meta[0],"windows":results,"sampleCount":count},sort_keys=True))
'''
s=s.replace(marker,injection+'\n'+marker)
# Tag all created containers so cleanup can be independently checked without touching other containers.
needle='COMMON=(--pull=never --cap-drop ALL --security-opt no-new-privileges)'
assert s.count(needle)==1
s=s.replace(needle,'COMMON=(--label "offscreen.evidence=${EVIDENCE_ID:?}" --pull=never --cap-drop ALL --security-opt no-new-privileges)')
p.write_text(s)
PY
export EVIDENCE_ID="$(basename "$W")"
test -z "$(docker ps -aq --filter "label=offscreen.evidence=$EVIDENCE_ID")"
rc=0
timeout --signal=TERM --kill-after=30s 300s bash "$W/run-data-plane.sh" "$W/relay.yaml" > "$W/full-private.log" 2>&1 || rc=$?
echo "EXPERIMENT_EXIT=$rc"
test -z "$(docker ps -aq --filter "label=offscreen.evidence=$EVIDENCE_ID")" || { echo "FAIL retained owned experiment containers; preserve evidence, report IDs"; docker ps -aq --filter "label=offscreen.evidence=$EVIDENCE_ID"; exit 1; }
test "$rc" = 0
test "$(grep -c '^D3_D4_RECEIPT ' "$W/full-private.log")" = 1
grep '^D3_D4_RECEIPT ' "$W/full-private.log"
echo "OWNED CONTAINERS ABSENT"
git rev-parse HEAD
)
```

Set the authorization variable only for this named experiment (not proof/upgrade/disruption flags). Return the receipt line, render check, exit status, cleanup result and SHA only. On failure return exit status and sanitized error lines from the private log, not full Collector debug output. The batch validates exact labels and three queries on newly retained synthetic data; it does not demonstrate production retained-store scale or future-boundary sample ingestion, and does not replace two live developer runs. No test was executed by the planner in preparing this command.

## Owner execution route (after implementation and separately authorized)
From dedicated implementation worktree root, clean tracked tree, exact tested SHA, current source guard; capture git rev-parse HEAD and git status --porcelain; no other platform writer/connection. Owner confirms target by independent Kind/Docker/cluster UID evidence, normal profile and available isolated target(s); no cluster creation or deletion implied.
Existing dev predecessor: pnpm infra:status --env dev --services observability --json; require upgrade-required and pending false. OFFSCREEN_OBSERVABILITY_UPGRADE=authorized pnpm obs:upgrade; require exactly one Collector revision transition, preserved identities and no pending. Repeat same command require mutation none and no selected UID/RV change. pnpm obs:connect --queries in owner foreground; verify fixed loopback ports, Grafana authenticated health, Ctrl+C and no owned listeners; do not leave running during upgrade/proof. Then run sequentially, stop at any failure:
```bash
export OFFSCREEN_OBSERVABILITY_PROOF=authorized
node infra/verification/smoke/observability/proof.mjs health dev kind-offscreen-dev
node infra/verification/smoke/observability/proof.mjs developer dev kind-offscreen-dev
node infra/verification/smoke/observability/proof.mjs developer dev kind-offscreen-dev
node infra/verification/smoke/observability/proof.mjs signals dev kind-offscreen-dev
node infra/verification/smoke/observability/proof.mjs resources dev kind-offscreen-dev
```
Retain stores between developer runs; each receipt must prove fresh sample timestamps/IDs, no stale credit. A7/A10 may reuse these receipts only if original predicates fully met. A6 separate approved fresh normal-profile target: public plan then pnpm infra:up --env dev --services observability --json, public status, health, repeat ensure; revision1 desired, all five pinned ready, three bound claims, exact Grafana auth, repeat no mutation/identity change. A8 on approved isolated target only after A6, add OFFSCREEN_OBSERVABILITY_DISRUPTION=authorized and run persistence then outage (candidate deadlines must first pass independent review). A9 separately fresh isolated target, add OFFSCREEN_OBSERVABILITY_ISOLATED_PROOF=authorized and OFFSCREEN_OBSERVABILITY_EXPECTED_CLUSTER_UID from independent verified isolated target; run partial-install gate, expect deliberate real quota failure and retained pending, repeat public refusal; do not clear. A11 conditional approved read-only release preview; never ensure release. Collect sanitized receipts under .offscreen/verification, preserve exact source SHA and identity, no raw credentials. A/V status remains NOT RUN.
