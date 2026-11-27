#!/usr/bin/env bash
# Owner-run, precommission evidence only. Run from clean main repository root.
(
set -euo pipefail
umask 077
test "$(git branch --show-current)" = main
STATUS=$(git status --porcelain)
test -z "$STATUS" || { echo "REFUSE dirty checkout; preserve existing work"; exit 2; }
SOURCE_BASE=edb0a12af7d9c389b36ccbe341bc473c4a9e6e68
git diff --quiet "$SOURCE_BASE" HEAD -- infra scripts package.json work/designs/open/observability-developer/experiments || { echo "REFUSE changed evidence source; planner recheck"; exit 2; }
W=$(mktemp -d /tmp/offscreen-obs-evidence.XXXXXXXX)
export W
echo "PRIVATE EVIDENCE: $W"
echo "EVIDENCE_HEAD=$(git rev-parse HEAD)"
echo "SOURCE_BASE=$SOURCE_BASE"
echo "=== WORKTREE / BRANCH CENSUS ==="
git worktree list --porcelain > "$W/worktrees.txt"
git branch --list 'change/observability-developer' 'change/observability-native*'
git branch --remotes --list 'origin/change/observability-developer' 'origin/change/observability-native*'
grep -E '^(worktree |branch |HEAD )' "$W/worktrees.txt"
echo "=== TRACKED REFERENCE CENSUS ==="
RX='specimen(sRoot)?|specFile|image-lock-candidate\.tsv|observability/(chart|install\.sh)|obs:connect|obs:upgrade'
git --no-pager grep -nI -i -E "$RX" -- . > "$W/references.txt"
git --no-pager grep -lI -i -E "$RX" -- . > "$W/reference-files.txt"
echo "MATCHED_FILES=$(wc -l < "$W/reference-files.txt") MATCHED_LINES=$(wc -l < "$W/references.txt")"
cat "$W/reference-files.txt"
echo "=== OPERATIONAL MATCHES ==="
grep -E '^(infra/|scripts/|docs/technical/platform/observability-native-infrastructure.md:|docs/runbooks/kubernetes-observability.md:|package.json:)' "$W/references.txt" || test "$?" = 1
echo "=== TRACKED OBSERVABILITY FILES ==="
git ls-files infra/platform/observability infra/verification/smoke/observability
echo "=== OFFLINE RENDER ==="
helm version --short
node --version
python3 --version
D=work/designs/open/observability-developer/experiments
BASE=06306ace3717841f36ad0952cf7664afbd6fcd4a
for f in build-developer-values.py data-plane.py run-data-plane.sh; do
  git show "$BASE:$D/$f" > "$W/$f"
done
test "$(git hash-object "$W/build-developer-values.py")" = 9a9a6a724891caba1146a82dc6434f3f9460e0eb
test "$(git hash-object "$W/data-plane.py")" = d003d533c1a8e170730a25fb4fb3a9a9ded75266
test "$(git hash-object "$W/run-data-plane.sh")" = b834b169052d3121f267d774807b6358964071d1
python3 "$W/build-developer-values.py" infra/platform/observability/specimens/collector.yaml "$W/overlay.yaml"
timeout --signal=KILL 390s node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {parse,parseAllDocuments} from 'yaml';
import {loadArtifacts} from './infra/platform/observability/artifacts.mjs';
const b=loadArtifacts('dev');
const g=b.releases.find(x=>x.role==='grafana');
assert(g);
const svc=g.documents.filter(x=>x.kind==='Service'&&x.metadata.name==='obs-grafana');
assert.equal(svc.length,1);
assert.equal(svc[0].spec.type??'ClusterIP','ClusterIP');
const ports=svc[0].spec.ports;
assert.equal(ports.length,1);
const port=ports[0];
const workload=g.documents.filter(x=>x.kind==='Deployment'&&x.metadata.name==='obs-grafana');
assert.equal(workload.length,1);
const containerPorts=workload[0].spec.template.spec.containers.flatMap(x=>x.ports??[]);
const resolved=typeof port.targetPort==='string'?containerPorts.filter(x=>x.name===port.targetPort).map(x=>x.containerPort):[port.targetPort??port.port];
console.log('GRAFANA_PORT_RECEIPT',JSON.stringify({service:svc[0].metadata.name,port:port.port,targetPort:port.targetPort??port.port,resolved,containerPorts}));
assert.equal(port.port,80);assert.deepEqual(resolved,[3000]);
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
const rr=spawnSync('helm',['template',c.name,c.chartPath,'--namespace',b.profile.namespaces.observability,'-f',c.valuesPath,'-f',process.env.W+'/overlay.yaml',...c.helmValueArgs],{encoding:'utf8',timeout:60000,killSignal:'SIGKILL',maxBuffer:8*1024*1024});
assert.equal(rr.status,0);
const docs=parseAllDocuments(rr.stdout).map(x=>{assert.equal(x.errors.length,0);return x.toJSON()});
const cm=docs.filter(x=>x?.kind==='ConfigMap'&&x.metadata.name==='obs-collector');
assert.equal(cm.length,1);
assert.equal(typeof cm[0].data.relay,'string');
writeFileSync(process.env.W+'/relay.yaml',cm[0].data.relay,{mode:0o600});
console.log('PINNED RENDER AND OTLP CONFIG CHECK PASS');
JS
echo "READ_ONLY_EVIDENCE_COMPLETE"
if [[ "${OFFSCREEN_OBSERVABILITY_EVIDENCE:-}" != authorized ]]; then
  echo "D3_D4_NOT_RUN: explicit isolated experiment opt-in required"
  exit 0
fi
test -z "${DOCKER_HOST:-}${DOCKER_CONTEXT:-}${DOCKER_TLS:-}${DOCKER_TLS_VERIFY:-}${DOCKER_CERT_PATH:-}"
CTX=$(timeout -s KILL 10s docker context show)
HOST=$(timeout -s KILL 10s docker context inspect "$CTX" --format '{{.Endpoints.docker.Host}}')
case "$HOST" in unix://*) ;; *) echo "REFUSE nonlocal Docker endpoint"; exit 2;; esac
timeout -s KILL 10s docker info --format '{{.Name}} {{.MemTotal}}'
awk '/^MemAvailable:/ { found=1; if ($2 < 4194304) exit 1 } END { if (!found) exit 1 }' /proc/meminfo
# Modify only verified private copies. Record exact producer timestamp from its own clock.
python3 - "$W/data-plane.py" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text();marker='now = time.time_ns()'
assert s.count(marker)==1
p.write_text(s.replace(marker,marker+'\nprint("EVIDENCE_METRIC_MS",now//1000000,flush=True)'))
PY
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
import time,os
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
assert set(seen.values())=={Decimal(os.environ['EVIDENCE_METRIC_MS'])}
print("D3_D4_RECEIPT",json.dumps({"application":[{"metric":dict(k),"value":str(expected[k]),"rawTimestampMs":int(seen[k])} for k in sorted(seen)],"targetInfo":meta[0],"windows":results,"sampleCount":count},sort_keys=True))
'''
s=s.replace(marker,injection+'\n'+marker)
query_run='timeout 45s docker run --rm -i '
assert s.count(query_run)==1
s=s.replace(query_run,'''EVIDENCE_METRIC_MS=$(awk '$1=="EVIDENCE_METRIC_MS" && NF==2 && $2 ~ /^[0-9]+$/ { print $2; n++ } END { if(n!=1) exit 1 }' "$OUT/submissions.txt")
'''+query_run+'-e "EVIDENCE_METRIC_MS=$EVIDENCE_METRIC_MS" ')
# Tag all created containers so cleanup can be independently checked without touching other containers.
needle='COMMON=(--pull=never --cap-drop ALL --security-opt no-new-privileges)'
assert s.count(needle)==1
s=s.replace(needle,'COMMON=(--label "offscreen.evidence=${EVIDENCE_ID:?}" --pull=never --cap-drop ALL --security-opt no-new-privileges)')
p.write_text(s)
PY
export EVIDENCE_ID="$(basename "$W")"
PRE=$(timeout -s KILL 10s docker ps -aq --filter "label=offscreen.evidence=$EVIDENCE_ID")
test -z "$PRE"
rc=0
timeout --signal=TERM --kill-after=30s 300s bash "$W/run-data-plane.sh" "$W/relay.yaml" > "$W/full-private.log" 2>&1 || rc=$?
echo "EXPERIMENT_EXIT=$rc"
POST=$(timeout -s KILL 10s docker ps -aq --filter "label=offscreen.evidence=$EVIDENCE_ID") || { echo "FAIL Docker cleanup observation unavailable; retain private evidence"; exit 1; }
test -z "$POST" || { echo "FAIL retained owned experiment containers; preserve evidence, report IDs"; printf '%s\n' "$POST"; exit 1; }
test "$rc" = 0
test "$(grep -c '^D3_D4_RECEIPT ' "$W/full-private.log")" = 1
grep '^D3_D4_RECEIPT ' "$W/full-private.log"
echo "OWNED CONTAINERS ABSENT"
git rev-parse HEAD
)
