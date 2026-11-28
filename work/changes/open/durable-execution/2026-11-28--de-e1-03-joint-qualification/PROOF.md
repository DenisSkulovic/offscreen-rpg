# DE-E1-03 | joint acceptance (all NOT RUN)

## Offline joint gate

Acceptance lead from root on clean exact candidate, record `git rev-parse HEAD`, `git status --porcelain`, post-E2 Design branch base SHA and archived 01/02 source/join SHAs. Confirm collector contract and namespace owner exact source postconditions. Run 02 focused gate commands from its archived PROOF once (subsumes 01); frozen install, runtime then Agent Core build/test/typecheck including test tsconfigs. No test Docker image builds, provider credentials or live app operations.

At post-E2 base and candidate use `pnpm repo:module-graph --json` (retain report and exit status; known historical `forbidden-authority-writer-import` must be separately matched exact baseline, not silently ignore new errors). Compare declaredEdges `{from,to,field}` transitively from each @offscreen/api, @offscreen/game-authority, @offscreen/worker, @offscreen/web; build closure all fields, runtime closure excludes devDependencies. Compare sorted reachable node + edge tuples and unchanged package imports/exports/old lockfile importers; only new runtime and Agent Core dev edge expected outside app closures. Base graph can use separate owned source-only worktree or previously recorded exact baseline report, no primary checkout switching. Preserve source graph mismatches/warnings, no relevant Critical/High introduced; no host in Workflow bundles. Retain deterministic warm-path regression (`node --test infra/images/release/test/warm-path.test.mjs`), never image-closure. Check actual all-four app build and typecheck:

```bash
pnpm exec turbo run build --filter=@offscreen/api --filter=@offscreen/game-authority --filter=@offscreen/worker --filter=@offscreen/web
pnpm exec turbo run typecheck --filter=@offscreen/api --filter=@offscreen/game-authority --filter=@offscreen/worker --filter=@offscreen/web
```

Record actual results; relevant failure blocks, pre-existing unrelated failure requires exact baseline evidence and explicit owner decision on any necessary exclusion. Preserve original Agent Core historical full security/license qualification gap, no production acceptance; review new pinned dependency delta and any known relevant security blocker; no SDK upgrade. No image-closure.test.mjs, Docker build/release deployment. This gate is assigned to acceptance lead, not every task.

## Native gate

Separate owner authorization, verified clean candidate, capacity, no concurrent cluster maintenance or same-name creation, E2 accepted and ready. Read-only owner checks `pnpm infra:status --env dev --services temporal --json` and `pnpm infra:status --env dev --services observability --json`; require actual E2 converged/healthy and Temporal ready; do not ensure/upgrade or bypass. Operator records verified `assertPlatformTarget('dev')` identity, context and owned forward processes, refuses occupied port rather than taking over. Temporal frontend/UI forwards in separate operator-owned foreground terminals:

```bash
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal port-forward svc/temporal-frontend 7233:7233 --address 127.0.0.1
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal port-forward svc/temporal-web 8233:8080 --address 127.0.0.1
pnpm obs:connect --queries
```

Verify actual service identity and forward health, fixed loopback ports (Grafana 13000, developer HTTP 14318, Tempo 13200, Prometheus 19090); read-only route reconciled after E2 merge. Never bind publicly. From root in clean credential-free environment (no arbitrary exporter or provider names, do not print secret env; remove only from owned proof subprocess):

```bash
umask 077
custody_dir="$(mktemp -d)" || exit 1
printf 'Retain custody journal: %s/custody.jsonl\n' "$custody_dir"
if E1_QUALIFY=1 OFFSCREEN_DURABLE_EXECUTION_PROOF=authorized POC_TEMPORAL_ADDRESS=127.0.0.1:7233 E1_TRACE=1 E1_SOURCE_SHA="$(git rev-parse HEAD)" E1_CUSTODY_PATH="$custody_dir/custody.jsonl" timeout --signal=TERM --kill-after=10s 480s node infra/verification/smoke/temporal/qualify.mjs; then
  qualify_status=0
else
  qualify_status=$?
fi
printf 'Qualification exit=%s; retain %s/custody.jsonl\n' "$qualify_status" "$custody_dir"
```

Require the [incremental custody contract](../2026-11-28--de-e1-02-qualification-consumers/EXECUTION.md#incremental-custody-receipt-ir-h01) and offline interruption proof. Keep the local private journal even on timeout, nonzero exit, missing summary or partial line; inspect complete prefix and record unresolved intents/identities as uncertain, never adopt or auto-delete. Before PASS verify sequence, source/attempt binding, namespace acknowledgment before consumption, all start/cleanup intent/result bindings, final record and exit zero. Operator also retains exact owned forward identities and cleanup outcomes separately. Strict admission must record exact verified target, created name/ID, one-day retention, attempt and successful create acknowledgment; actual native endpoint identity matches before starts; dedicated queues/IDs. No retry/adopt uncertain create. If actual absence response not admitted, stop before creation, capture bounded nonsecret evidence and return to planner for narrow parser reconciliation. No deliberate live race. One owned namespace registration remains; one-day retention applies to Workflow history, not automatic namespace deletion (M04). Never delete namespace or history. Stop only own Workers/forwards; record unresolved handles and cleanup; timeout fails. Preserve original scenario result/errors and qualification receipt. Native cases:

| Case | Required actual observations |
| --- | --- |
| Plain normal | exact result, one scheduled/completed Activity and one physical invocation, original run |
| Plain retry | same run, attempts 1/2 physically observed, typed failure then success, one schedule/settled completion |
| Plain duplicates | exact native already-started refusal active and closed, original ID/run unchanged |
| Plain replacement | completed Activity + later WorkflowTaskCompleted before stop; graceful replacement same queue; signal same run; same Run ID, one physical invocation |
| Agent Core | entire maintained runScenarios, all expected native successes, limits, unknown/withheld/malformed tool denial, model/tool failure, cancellation and timeout, duplicates; no weakened proof; actual runRecovery replay zero observations, replacement exact initial/final Run ID, two physical model starts, one completed tool, no second-generation tool and old history checks |
| Trace evidence | Exact five required positive cases per [independent oracle/finalization](../2026-11-28--de-e1-02-qualification-consumers/EXECUTION.md#independent-observation-oracle-and-finalization-ir-h02): plain normal 3, retry 4, replacement incl both duplicates 8, Agent researcher-tool 5, fresh-worker 8 (28 total). Check independent raw observation and native/history predicates after Worker quiescence; compare exact backend span multiset/attributes against one-to-one local mapping. No missing case, incomplete/dropped/failed/duplicate/extra required span. Nonselected Agent Core diagnostic incomplete evidence retained; all native assertions still required. Exporter-negative separate 3 local spans, native success, failed submission, no backend query. |

Use actual `queryTrace` GET `/api/traces/<exact-id>` receipts, open Temporal UI `http://127.0.0.1:8233` select created namespace, inspect normal/retry/held/replaced histories; open Grafana `http://127.0.0.1:13000` Explore Tempo exact fresh trace IDs, inspect same run window E2 Temporal panels and Prometheus actual selected Temporal scrape (query `up` with exact accepted E2 job/labels from provisioned dashboard, verify freshness and correct target; no invented per-workflow series). Record observed namespace, workflow/run/trace IDs locally, actual timestamps, query result counts, dashboard/panel and source of evidence. HTTP admission alone insufficient; no secret/prompt payload. Controlled exporter unavailable: 02's injected bounded failure proof required; additionally run a fresh plain normal case through the same owned admitted session with a test-only injected rejecting fetch in the runner's maintained negative case (no external endpoint, no disruption, actual native result still completes; trace status explicitly expected failed, excluded only from positive retrieval count). No second namespace, no manipulation of Collector/network. 02 runner must include this deterministic native-negative mode in same authorized run. All five mandatory positive receipts must meet the frozen matrix; no empty expected set or producer-defined subset. Record finalized independent observation counts, queried cardinality/attributes and negative receipt; missing evidence not success. If native result or cleanup fails, don't mark passed. Grafana visual inspection by operator if UI inaccessible to acceptance lead.

## Closure

Record exact SHA, actual commands, exit codes, per-case evidence, baseline comparison, timestamps, target/namespace/queue/owned run identities and cleanup/residuals (including retained journal and exact last-known custody state, with nonsecret complete prefix referenced or included in dated evidence) in dated `evidence/runs/2026-11-28-durable-execution-e1.md` (use actual execution date if later). Preserve prior failed/not-run Agent Core evidence, record relevant obligations passed at this exact SHA only, keep unrelated outstanding security/license, production/legacy/release limitations. No claim of hard crash, server failover or exactly-once external effects. Update `docs/technical/platform/execution-and-delivery.md`, `packages/README.md`, runtime/Agent Core READMEs, `infra/platform/temporal/README.md`, `docs/runbooks/kubernetes-temporal.md`, `docs/technical/observability/telemetry-and-diagnostics.md`, `STATUS.md`, Design and catalogs/ledger with actual realization/limitations; no unrelated wiki rewrite. Preserve M03 exact-run result behavior in maintained suite READMEs and M04 history retention versus retained namespace registration in Temporal README/runbook; no namespace deletion authorization. Owner accepts actual evidence before archive, transfer complete constituent and joint receipts to Design, archive Change and join branch, verify open packet absent, retire only owned worktree. Integrate Design into main only after final owner ratification of acceptance and source drift reconciliation; preserve unrelated main changes. If owner approval absent, proof failed/unavailable, or cleanup uncertain keep open with actual evidence. No further architecture iteration unless material contradiction; no next Design commission implied.
