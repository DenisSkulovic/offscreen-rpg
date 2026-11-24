# Local developer platform | permanent capability acceptance catalog

Canonical repeatable scenario catalog for developer infrastructure, 2026-11-24. Selected target: [local developer platform](../../docs/technical/platform/local-developer-platform.md). [Current operator entry](../../docs/runbooks/local-development-platform.md). Baseline 91bc2af40a94cdf9a95ee7db31a846d60f3abd0c; INF01–INF28 and INF30–INF36 source Done; current integrated live suite NOT-RUN. This catalog is durable; dated run receipts belong in evidence, not this document. No live permission is granted by a checklist.

## Automated diagnostic entry (INF51)

Run `pnpm infra:verify --suite diagnostic` from the repository root. It executes the existing source test files individually, selected additional fixture suites (including explicit platform chart, pin, ownership, schema and Redis installer tests) and bounded existing local cluster/service readiness observations sequentially. Each failure is persisted immediately; independent checks continue. It writes a private `.offscreen/verification/run-*/report.json` with revision, dirty status, duration, error excerpts and all catalog IDs. `--json` also emits the complete report to stdout. Source/fixture and LIVE-OBSERVATION outcomes do **not** imply full live acceptance. The latter remains NOT-RUN for every catalog row. Review diagnostic excerpts before sharing; common credential lines are filtered but arbitrary secrets cannot be reliably detected. Optional services are identified in live report rows; an absent optional service is still a failed all-services observation, not a core-platform failure or authorization to install it. Release Temporal readiness uses both persisted schema tables and a SERVING health probe; a missing historical schema Job alone does not fail readiness. No start, stop, repair, delete, provision, migration or provider spend. `smoke`/`full` lifecycle adapters remain unimplemented.

## How to run

Agent reads this catalog and current operator entry, verifies HEAD, checkout, host and tools; runs source checks first. Cases marked target-only cannot pass until implementation exists. Select source, smoke (one owned disposable dev slot + explicitly allowed platform probes), or full (all applicable rows, serialized scarce-resource experiments). Reuse existing test/proof scripts. No speculative cluster recreation, destructive reset, paid providers, prod connection, foreign slot or test credentials. Run only explicitly authorized live rows; preserve existing data. Use actual host commands, not invented target CLI. Stop on capacity/refusal or incomplete park; continue independent read-only cases if safe. Report each ID PASS/FAIL/BLOCKED/NOT-RUN, tier SOURCE/FIXTURE/LIVE, HEAD, host, command, duration, observed result and cleanup state. PASS must satisfy observable oracle, not merely exit zero. Historical proof is not current proof.

## Capability matrix

| ID | Scenario | Current entry / implementation seam | Acceptance oracle | Tier / baseline |
| --- | --- | --- | --- | --- |
| HOST-01 | Linux/WSL prerequisites | stack-preflight, cluster manager host-probe | tool versions, Docker reachable, context/memory status clear | source + live; current live NOT-RUN |
| HOST-02 | macOS/ARM64 developer | /proc, flock, image pins and host adapters | same supported commands on documented host, no Linux-only unexplained refusal | target-only |
| CL-01 | dev cluster only | infra/clusters/kind/manager/dev-cli.mjs | two intended nodes Ready; no app/platform implicitly created | live NOT-RUN |
| CL-02 | release cluster only | infra/clusters/kind/release/up.sh | intended nodes Ready; storage ready; no app | live NOT-RUN |
| CL-03 | repeat ensure and independent contexts | cluster manager/profile | existing cluster reused, other context unchanged | source + live NOT-RUN |
| PL-01 | PostgreSQL alone (both envs) | postgres service installers | SQL SELECT 1; other services absent on clean target | individual source; live NOT-RUN |
| PL-02 | object storage alone | object-storage installers/readiness | endpoint ready; disposable authenticated PUT/GET optional | source; live NOT-RUN |
| PL-03 | Temporal alone | temporal installers/readiness | server and its own schema ready; no app SQL dependency | source; live NOT-RUN |
| PL-04 | Redis alone in either env | redis chart currently release-only | PING/SET/GET/TTL on disposable key; no app or other service | dev target-only, release live NOT-RUN |
| PL-05 | RabbitMQ alone in either env | rabbitmq release installer | publish/consume disposable queue; no app | dev target-only, release live NOT-RUN |
| PL-06 | Observability alone | observability release installer | synthetic OTLP trace received, no app | dev target-only, release live NOT-RUN |
| PL-07 | Gateway selection | gateway release installer | loopback route fixture passes; no app inferred | release live NOT-RUN; dev gateway only if selected use case |
| PL-08 | arbitrary supported combination; none/core/all | platform-plan fixed core today | exact selected dependency plan; omission never removes existing service | target-only |
| PL-09 | warm backing ensure | existing platform installers | existing DB/PVC/credential identities retained, no schema replay | live NOT-RUN |
| DATA-01 | local persisted tenant | existing SQL/S3/Temporal tenant adapters | own data survives park/resume, no peer changes | live NOT-RUN |
| DATA-02 | sanitized snapshot restore | DB restore/runbook owner | compatible schema, local-only copy, no prod write | target design / explicit data permission |
| DATA-03 | external isolated staging binding | target binding contract | compatible schema; no implicit migration or shared queue; explicit test identity | target-only |
| DATA-04 | production read-only diagnostic | target diagnostic contract | write/migration/app activation refused; no actual prod access in routine suite | target-only |
| DEV-01 | reserve/attach without runtime | pnpm dev:reserve, dev:attach | no Pods/tenant/build effects | source + live host NOT-RUN |
| DEV-02 | cold full dev | pnpm dev | six current roles, host HTTP, own Tilt, timings; no story claim | historical DXK09 proof; current NOT-RUN |
| DEV-03 | warm full dev | pnpm dev:stop then dev | cache reuse, same tenant IDs, no unnecessary builds; timing | live NOT-RUN |
| DEV-04 | api profile | target profile | API+authority current; four roles inactive; SQL/S3 only if boot proof permits | target-only |
| DEV-05 | web profile | target profile | Web/API/authority current, three workers inactive; authenticated read flow | target-only |
| DEV-06 | ui-only | explicit mock/test API | Web current, no local API/authority/workers; UI flow against declared binding | target-only |
| DEV-07 | source edit | Tilt sync + compile supervisor | Web edit visible; API edit current without needless artifact rebuild | live NOT-RUN |
| DEV-08 | shared-package edit | image sync-plan | affected artifact rebuilt, loaded bytes correct | live NOT-RUN |
| DEV-09 | invalid TypeScript then fix | runtime compile-watch | NOT READY then current generation; no duplicate runtime | live NOT-RUN |
| DEV-10 | stop/resume and cancel | dev-lifecycle | zero owned replicas/listeners after stop/cancel, tenants retained, restart works | live NOT-RUN |
| DEV-11 | simultaneous same-slot startup | INF30 lock | one activation, other meaningful busy refusal | source + live NOT-RUN |
| DEV-12 | two independent slots, mixed profiles | registry and target profiles | distinct ports/tenant/process identity; stopping A leaves B healthy | full/full historical only; mixed target-only |
| DEV-13 | capacity refusal | existing admission gate | refusal before writes or owned rollback; no retry storm | source + live NOT-RUN |
| DEV-14 | profile change | stop then selected start | no old active roles, tenant data retained | target-only |
| DEV-15 | explicit idle reservation retirement | future dev:release contract | owned idle reservation/ports released, active or foreign refusal, retained tenant IDs/data unchanged, no ID reuse | target-only; not commissioned |
| RES-01 | small/default resource preset | workload/platform Helm values | observed requests/limits match chosen preset; useful flow within measured budget | target-only |
| RES-02 | per-role custom override | workload chart render overlay | only specified resource/replica keys differ, invalid config refuses | target-only |
| REL-01 | cold release full | explicit build, stack:up | migration proof, intended rollout, actual images, host route | live NOT-RUN |
| REL-02 | warm release config-only change | INF32 rollout | same image + changed spec applies, correct replicas | source + live NOT-RUN |
| REL-03 | partial release application | target profile, existing image-family installer | selected roles current, unselected parked, no unrelated build/tenant changes | target-only |
| REL-04 | multiple replicas per selected role | target values overlay | every expected Pod ready and current, service distributes requests | target-only; release rollout fixture-tested |
| REL-05 | queue/workflow duplicate handling | infra/verification/faults and chaos | repeat delivery/worker loss, authoritative effect exactly once per existing oracle | live NOT-RUN; product proof independent |
| REL-06 | application park/down | pnpm stack:down | owned application removed, platform and fixture/tenant state retained | live NOT-RUN |
| UX-01 | weak-agent command discoverability | quick reference | agent can select valid command with no source archaeology, clear errors and next step | target docs; human/agent exercise |
| UX-02 | unified verification | target infra:verify | per-ID result/evidence, skips never green, bounded suite, cleanup receipt | target-only |

## Existing verification owners and current source suite

Current unified source entry (no cluster mutation):

```bash
pnpm infra:verify --suite source
pnpm infra:verify --suite source --json
```

`smoke` and `full` are not implemented yet (exit 2). The source suite invokes only `node --test` groups listed below.

- `node --test infra/environments/platform-plan.test.mjs infra/images/distribution/kind-image-loader.test.mjs infra/images/development/sync-plan.test.mjs`.
- `node --test tools/dev-environments/test/*.test.mjs` (inspect actual test prerequisites; do not invoke standalone trial CLIs).
- `node --test infra/workloads/tests/*.test.mjs` (Helm required for render tests).
- `node --test infra/environments/release/test/*.test.mjs`.
- Service-specific probes under smoke/{postgres,object-storage,temporal,redis,rabbitmq,observability,gateway}; use linked current runbooks and explicit scope.
- Dev SQL/S3/Temporal trials under dev-environments/; these may provision fixed slots, so never run blindly on an occupied workstation. Release acceptance under release-acceptance/; fault/chaos scenarios have independent authorization and oracles.

Measure cold/warm wall time and source-edit latency; report actual seconds, not arbitrary SLA. First smoke is one owned full slot cold/start/status/edit/failure/recovery/stop/resume; then selective profiles and multi-replica cases only when implemented. Do not require four full stacks on a limited workstation. Stop polishing when ordinary supported flows are proven; record failures as bounded corrective Changes.


## Workstation observability (target, INF44–47)

| ID | Capability | Required observation | Evidence |
| --- | --- | --- | --- |
| MON-01 | Independent persistent collectors | Service restart preserves retained history; WSL down gap visible; no game/cluster dependency | source fixtures for install plan and collector stop; live service restart NOT RUN |
| MON-02 | Sub-second memory evidence | 200ms sample offsets; observed min/max/sum/count/coverage, short pulse test, kernel peak scope separate | source fixtures PASS; live host sampling NOT RUN |
| MON-03 | Safe process history | PID/start identity, CPU/RSS/HWM, missing exited process coverage, no argv/env export | source fixtures PASS; live /proc NOT RUN |
| MON-04 | Nested runtime attribution | Docker/Kind pod UID+container identity, source timestamps, cgroup scope, absent runtime gap, no double-count | source fixtures PASS (runtime/kube/cgroup); live Docker/Kind/cgroup visibility NOT RUN |
| MON-05 | Resource failure evidence | OOM/restart/event/counter reset; no inferred OOM from capacity guard | source counter-reset and coverage fixtures PASS; live OOM NOT RUN |
| MON-06 | Retention and fidelity | Min/max/sum/count rollups, partial coverage, cap/rotation, restart gap, actual oldest retained | source retention and rollup fixtures PASS; live disk span NOT RUN |
| MON-07 | Operation correlation | Unique attempt/phase spans, overlaps, incomplete crash, rollback events, no secret fields | source fixtures PASS (operation writer, startup timing, infra/stack/verify entrypoints); live host correlation NOT RUN |
| MON-08 | Historical queries/export | Time/slot report with explicit coverage, bounded sanitized export, no raw argv | target-only |
| MON-09 | Observer overhead | Comparable measured idle before/after, private memory/CPU/disk budget; reduced cadence reported | target-only |
