# Local developer platform | permanent capability acceptance catalog

Canonical repeatable scenario catalog for developer infrastructure, 2026-11-24. Selected target: [local developer platform](../../docs/technical/platform/local-developer-platform.md). [Current operator entry](../../docs/runbooks/local-development-platform.md). Baseline 91bc2af40a94cdf9a95ee7db31a846d60f3abd0c; INF01–INF28 and INF30–INF36 source Done; current integrated live suite NOT-RUN. This catalog is durable; dated run receipts belong in evidence, not this document. No live permission is granted by a checklist.

## Automated diagnostic entry (INF51)

Run `pnpm infra:verify --suite diagnostic` from the repository root. It executes the existing source test files individually, selected additional fixture suites (including explicit platform chart, pin, ownership, schema and Redis installer tests) and bounded existing local cluster/service readiness observations sequentially. Each failure is persisted immediately; independent checks continue. It writes a private `.offscreen/verification/run-*/report.json` with revision, dirty status, duration, error excerpts and all catalog IDs. `--json` also emits the complete report to stdout. Source/fixture and LIVE-OBSERVATION outcomes do **not** imply full live acceptance. The latter remains NOT-RUN for every catalog row. Review diagnostic excerpts before sharing; common credential lines are filtered but arbitrary secrets cannot be reliably detected. Optional services are identified in live report rows; an absent optional service is still a failed all-services observation, not a core-platform failure or authorization to install it. Temporal readiness uses owned Helm release/Deployments, pinned images, frontend Service and SERVING RPC; it is not a schema-version query or workflow proof. A missing successful hook Job alone does not fail readiness. No start, stop, repair, delete, provision, migration or provider spend. `smoke`/`full` lifecycle adapters remain unimplemented; INF52 owns reusable selected developer lifecycle checks under VER01. INF51 source archived; diagnostic and provisioning remain distinct.

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
| PL-03 | Temporal alone | native Helm installer/readiness; existing CNPG prerequisite | both dedicated stores prepared, server SERVING; no application SQL schema dependency | dev component live-observed; release/cold cluster NOT-RUN |
| PL-04 | Redis alone in either env | redis chart supports dev and release | PING/SET/GET/TTL on disposable key; no app or other service | dev/release diagnostic observation supported; authenticated acceptance NOT-RUN |
| PL-05 | RabbitMQ alone in either env | `infra/platform/rabbitmq/install.mjs` plan/ensure/status; optional `--rabbitmq` provisioning | structural census + authorized AMQP protocol fixture; no app consumer | individual source (`rabbitmq`, `rabbitmq-render`, `rabbitmq-proof` suites); live install, fresh release runtime, migration, fault proof **NOT-RUN** |
| PL-06 | Observability alone | observability release installer | synthetic OTLP trace received, no app | dev target-only, release live NOT-RUN |
| PL-07 | Gateway selection | gateway release installer | loopback route fixture passes; no app inferred | release live NOT-RUN; dev gateway only if selected use case |
| PL-08 | arbitrary supported combination; none/core/all | platform-plan fixed core today | exact selected dependency plan; omission never removes existing service | target-only |
| PL-09 | warm backing ensure | existing platform installers | existing DB/PVC/credential identities retained, no schema replay | Temporal dev repeat ensure observed (2s); complete backing proof NOT-RUN |
| DATA-01 | local persisted tenant | `infra/verification/dev-environments/tenant-retention-programme.mjs` | own data survives park/resume, no peer changes | live NOT-RUN |
| DATA-02 | sanitized snapshot restore | DB restore/runbook owner | compatible schema, local-only copy, no prod write | target design / explicit data permission |
| DATA-03 | external isolated staging binding | target binding contract | compatible schema; no implicit migration or shared queue; explicit test identity | target-only |
| DATA-04 | production read-only diagnostic | target diagnostic contract | write/migration/app activation refused; no actual prod access in routine suite | target-only |
| DEV-01 | reserve/attach without runtime | pnpm dev:reserve, dev:attach | no Pods/tenant/build effects | source + live host NOT-RUN |
| DEV-02 | cold full dev | pnpm dev | six current roles, host HTTP, own Tilt, timings; no story claim | historical DXK09 proof; current NOT-RUN |
| DEV-03 | warm full dev | pnpm dev:stop then dev | cache reuse, same tenant IDs, no unnecessary builds; timing | live NOT-RUN |
| DEV-04 | api profile | `infra/verification/dev-environments/selective-profile-programme.mjs` | API+authority current; four roles inactive; `/api/health/ready`; BLOCKED until INF38 `--profile` joined | FIXTURE source; live NOT-RUN |
| DEV-05 | web profile | `infra/verification/dev-environments/selective-profile-programme.mjs` | Web/API/authority current, three workers inactive; host HTTP readiness; INF38 gate | FIXTURE source; live NOT-RUN |
| DEV-06 | ui-only | explicit mock/test API | Web current, no local API/authority/workers; UI flow against declared binding | target-only |
| DEV-07 | source edit | `infra/verification/dev-environments/recovery-programme.mjs` | Web edit visible; API edit current without needless artifact rebuild | live NOT-RUN |
| DEV-08 | shared-package edit | `infra/verification/dev-environments/recovery-programme.mjs` | affected artifact rebuilt, loaded bytes correct | live NOT-RUN |
| DEV-09 | invalid TypeScript then fix | `infra/verification/dev-environments/recovery-programme.mjs` | NOT READY then current generation; no duplicate runtime | live NOT-RUN |
| DEV-10 | stop/resume and cancel | dev-lifecycle | zero owned replicas/listeners after stop/cancel, tenants retained, restart works | live NOT-RUN |
| DEV-11 | simultaneous same-slot startup | INF30 lock | one activation, other meaningful busy refusal | source + live NOT-RUN |
| DEV-12 | two independent slots, mixed profiles | `infra/verification/dev-environments/selective-profile-programme.mjs` (optional `dev-selective-mixed-slots` section) | distinct ports/tenant/process identity; explicit profile + measured capacity only; never automatic second slot | NOT-RUN unless explicitly authorized |
| DEV-13 | capacity refusal | existing admission gate | refusal before writes or owned rollback; no retry storm | source + live NOT-RUN |
| DEV-14 | profile change | `infra/verification/dev-environments/selective-profile-programme.mjs` | stop then `--profile` start; inactive replicas zero; tenant identity retained; INF38 gate | FIXTURE source; live NOT-RUN |
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
- `node --test infra/platform/rabbitmq/tests/install.test.mjs infra/platform/rabbitmq/tests/inventory.test.mjs infra/platform/rabbitmq/tests/readiness.test.mjs infra/platform/rabbitmq/tests/lifecycle.test.mjs` (`rabbitmq` source group).
- `node --test infra/platform/rabbitmq/tests/render.test.mjs` (`rabbitmq-render`; Helm required).
- `node --test infra/verification/smoke/rabbitmq/proof.test.mjs` (`rabbitmq-proof`; host trace fixture, not live cluster proof).
- `python3 -m unittest discover -s infra/verification/smoke/rabbitmq -p 'test_*.py'` (AMQP wire unittest; diagnostic suite does not schedule this; run directly for PL-05 wire negatives; live smoke **NOT-RUN**).
- Service-specific live probes under smoke/{postgres,object-storage,redis,observability,gateway}; RabbitMQ live proof via `proof.mjs` only when explicitly authorized; use linked runbooks.
- Dev SQL/S3/Temporal trials under dev-environments/; these may provision fixed slots, so never run blindly on an occupied workstation. Release acceptance under release-acceptance/; fault/chaos scenarios have independent authorization and oracles.

Measure cold/warm wall time and source-edit latency; report actual seconds, not arbitrary SLA. First smoke is one owned full slot cold/start/status/edit/failure/recovery/stop/resume; then selective profiles and multi-replica cases only when implemented. Do not require four full stacks on a limited workstation. Stop polishing when ordinary supported flows are proven; record failures as bounded corrective Changes.


## Workstation observability (INF44–47)

Python `unittest` discovery under `infra/monitoring/tests/test_*.py` and the Node `operation-event` suite are scheduled only by `pnpm infra:verify --suite diagnostic` (`source:monitoring-python` and `source:infra/monitoring/tests/operation-event.test.mjs`). They are not part of the Node TAP `pnpm infra:verify --suite source` groups. A fixture-tier diagnostic PASS records source proof only; every row's live acceptance remains **NOT-RUN** until separately authorized install/activation and measured host observation. Canonical per-row module mapping is frozen in `infra/verification/verify.mjs` as `MON_FIXTURE_EVIDENCE`.

| ID | Capability | Required observation | Source fixture evidence (live NOT-RUN) |
| --- | --- | --- | --- |
| MON-01 | Independent persistent collectors | Service restart preserves retained history; WSL down gap visible; no game/cluster dependency | `source:monitoring-python`; `test_install.py`, `test_collector.py`, `test_storage.py`; live service restart NOT RUN |
| MON-02 | Sub-second memory evidence | 200ms sample offsets; observed min/max/sum/count/coverage, short pulse test, kernel peak scope separate | `source:monitoring-python`; `test_host.py`, `test_report.py`; live host sampling NOT RUN |
| MON-03 | Safe process history | PID/start identity, CPU/RSS/HWM, missing exited process coverage, no argv/env export | `source:monitoring-python`; `test_processes.py`, `test_report.py`; live /proc NOT RUN |
| MON-04 | Nested runtime attribution | Docker/Kind pod UID+container identity, source timestamps, cgroup scope, absent runtime gap, no double-count | `source:monitoring-python`; `test_runtime.py`, `test_kube.py`, `test_cgroup.py`, `test_runtime_collector.py`, `test_report.py`; live Docker/Kind/cgroup visibility NOT RUN |
| MON-05 | Resource failure evidence | OOM/restart/event/counter reset; no inferred OOM from capacity guard | `source:monitoring-python`; `test_host.py`, `test_kube.py`, `test_storage.py`; live OOM NOT RUN |
| MON-06 | Retention and fidelity | Min/max/sum/count rollups, partial coverage, cap/rotation, restart gap, actual oldest retained | `source:monitoring-python`; `test_storage.py`, `test_host.py`, `test_report.py`; live disk span NOT RUN |
| MON-07 | Operation correlation | Unique attempt/phase spans, overlaps, incomplete crash, rollback events, no secret fields | `source:infra/monitoring/tests/operation-event.test.mjs` (MON-07) plus report span readers in `test_report.py`; live host correlation NOT RUN |
| MON-08 | Historical queries/export | Time/slot report with explicit coverage, bounded sanitized export, no raw argv | `source:monitoring-python`; `test_report.py`, `test_export.py`; live Netdata/historical query NOT RUN |
| MON-09 | Observer overhead | Comparable measured idle before/after, private memory/CPU/disk budget; reduced cadence reported | `source:monitoring-python`; `test_collector.py` cadence/scheduling bounds only; measured idle before/after separately authorized, NOT RUN |

## Residual developer assurance (DXK09 / INF29 retirement, 2026-11-26)

No new PASS or live authorization. DEV-02/03/07/08/09/10 and DATA-01 remain individually tracked; DEV-12/13 cover independent slot isolation and capacity refusal. Extended, deferred owner-selected experiments: four concurrent full slots with independent tenants, actual provider-free story flows and source edits under measured capacity (safe refusal is not four-stack PASS); two simultaneous real GitHub browser sign-ins with separate cookie prefixes, origins and sessions; peer slot must not change during failed compile/recovery, stop or restart. Retain negative SQL/S3/Temporal cross-tenant access, worker queue isolation and release coexistence/restart checks under current topology. Historical evidence: [DXK09](../../work/changes/archive/2026-11/infrastructure/2026-11-22--dxk09-isolated-parallel-development-stacks/PROOF.md), [INF29](../../work/changes/archive/2026-11/platform-operations/2026-11-24--inf29-infra-reconciliation/PROOF.md). Revalidate current harness/commands before any run; no blanket acceptance prerequisite for ordinary feature development.

## Real application browser and edge acceptance (K8S11 retirement, 2026-11-26)

Outstanding, owner-selected acceptance; no new PASS or live authorization. Use actual current Next/Nest release with recorded source/image identity and native Gateway, not synthetic backend. Prerequisite: real playable scripted gameplay and owned fixture, with authorized test identity; no paid provider calls. Prove cold authenticated SSR passage HTML, hydration without duplicate state owners, same-origin browser API and cookie forwarding to actual Nest, correct private SSR origin, committed scripted command and SSE hint followed by authoritative GET; lost/out-of-order hints, reconnect/visibility refresh, API pod churn and PostgreSQL LISTEN recovery converge without automatic POST or duplicate effects. Verify 202 is not settlement; older version cannot overwrite newer state. Wrong owner, revoked/expired session, logout and owner switch must fail closed across SSR/API/SSE and clear private cached state; no hidden narrative or secrets in SSE, no public GA route, no cross-owner cache leak. Check real stream duration/no buffering, bounded connection limits, timeout and disconnected Nest refusal; measure capacity before multi-Pod tests, no durable SSE replay or HA claim. Historical T01 5/5 rewrite fixtures and T02 27/27 client tests are not live edge proof. Record actual browser/network/SQL evidence, negatives, cleanup and NOT RUN where unavailable. [Archived K8S11](../../work/changes/archive/2026-11/distributed/2026-11-19--k8s11-next-nest-live-edge-integration/CHANGE.md).

## Coherent publication residual acceptance (WR05 retirement, 2026-11-26)

WR05S/P1/P2 and WR06 own realized source; no blanket live PASS. Preserve general coherent authoritative publication, historical-state fidelity and branch isolation invariants when supported by the redesigned architecture; the legacy TURN03 scenario matrix is retired. Negative cases: unsupported active state must hold/refuse rather than select incomplete boundary; stale owner/root/frontier, missing/corrupt CAS and competing operation fail closed; staged unselected objects inert; retry/lost response or crash around SQL selection cannot duplicate effects, passage or spending. Preserve v1 history without rewriting hashes, no automatic time advance absent admitted activity. Derive appropriate evidence from the redesigned persistence and authority contracts; distinguish fictional state from operational custody. No new live permission. [Historical WR05](../../work/changes/archive/2026-11/storyteller/2026-11-21--wr05-coherent-scene-publication/CHANGE.md).

## Writer provider residual acceptance (WR09 retirement, 2026-11-26)

Preserve exact pinned model/policy/price and attempt-bound wire, private durable response object with atomic accounting settlement; no resend after possible dispatch, known-unsent versus unknown distinction, deterministic replay and no duplicate charge/effect on loss or restart. GA alone owns SQL/CAS/financial authorization and executor owns provider I/O without general SQL/object-store credentials; no credentials or private payloads in workflow history/logs. Restricted research children require bounded context/budget and no publish authority; unsupported delegation holds until separately selected. WR09A/B own custody/replay, WR10 private round, WR11 continuation, WR12 opening. Actual funded run remains separately owner-authorized with exact spend envelope after offline/integrated safety proof; no paid permission or new PASS. [Historical WR09](../../work/changes/archive/2026-11/storyteller/2026-11-21--wr09-provider-ready-writer-runtime/CHANGE.md).

**WR10 source closure (2026-11-26):** Preserve the complete [WR10 security and financial proof matrix](../../work/changes/archive/2026-11/storyteller/2026-11-22--wr10-private-writer-round-protocol/PROOF.md), including authenticated role/actor refusal, attempt/context/ordinal/revision and root binding, exact integer reservation and aggregate caps, canonical decimal wire, body/hash/policy validation, atomic accounting and response pointer with rollback, duplicate prepare/PUT and replay refusal, unknown liability retention, no automatic resend, executor credential isolation and private history/log redaction. WR10B/WR11 own orchestration/continuation evidence. Source presence verified; tests not rerun; no live or paid PASS inferred.

**Publication diagnostic hardening (PUBDIAG closure, 2026-11-26):** Existing diagnostic and regression tests implement the requested structured failure log and preserve public `held / publication_failed`; tests not rerun. Residual concern: token-shaped values are regex-filtered, not semantically allowlisted; `error.name` is not allowlisted. Future telemetry hardening should constrain stage/code/reason/error category to approved values, validate limited source-frame provenance, test token-shaped secret rejection and ensure sink failure does not alter the public outcome. No story text, credential or provider payload may enter telemetry. Retain as a future hardening requirement, not a new implementation commission or a claim of complete redaction. [Archived PUBDIAG](../../work/changes/archive/2026-11/storyteller/2026-11-22--pubdiag-writer-publication-failure-log/CHANGE.md).

## Legacy gameplay proof retirement (2026-11-27)

TURN03 cancelled by owner 2026-11-27 because the monorepo and agent runtime will be fundamentally redesigned. Legacy scripted-path proof and architecture-specific recovery matrix are retired, not transferred as pending requirements. Historical evidence retained; no PASS inferred, existing implementation untouched. Future acceptance must be designed against the new architecture; preserve authorization, private data isolation, authoritative state integrity, idempotency, financial safety and truthful evidence. No dispatch or live authorization. Existing WR05/K8S11 residual scenarios are not a mandate to execute the old scripted path; retain general authorization/session/tenant isolation, truthful committed-state presentation, durable atomic selection where applicable, no duplicate effects or charges, and historical/fork fidelity if supported. New architecture defines its own integrated acceptance. [Historical TURN03](../../work/changes/archive/2026-11/distributed/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md).

**Authority boundary invariants (DIST03 retirement, 2026-11-27):** Superseded by owner 2026-11-27 in preparation for monorepo redesign. Historical narrow scripted resolution/snapshot extraction and Compose compatibility acceptance retired; no live PASS inferred. Existing implementation untouched. Preserve single authoritative mutation ownership, authenticated private boundaries, trusted actor provenance, authorization and tenant isolation, transactional integrity and idempotency. Future service topology and acceptance must derive from new architecture. No dispatch. Prove no duplicate mutation on replay or competing execution, refusal of conflicting payload for reused operation identity, wrong actor/service/owner refusal, no unauthorized route or alternate writer fallback, and atomic authoritative state/receipt custody. Select suitable tests under the redesigned architecture, not the legacy narrow scripted HTTP/Compose matrix. [Historical DIST03](../../work/changes/archive/2026-11/distributed/2026-11-19--dist03-game-authority-private-boundary/CHANGE.md).

**Production/developer isolation (MA12 closure, 2026-11-27):** Developer/experimental tooling may depend on production packages; production runtime must not depend on developer/experimental tooling or implicitly enable its capabilities. Enforce through the redesigned source graph, runtime dependency closure, artifact composition and authorized route/capability exposure. Preserve tenant/actor isolation; test production exclusion and explicitly authorized development composition according to new architecture. Legacy artifact-specific acceptance retired. Current direct manifest direction observed, not transitive closure or artifact certification. [Historical MA12](../../work/changes/archive/2026-11/other/2026-11-22--ma12-production-api-lab-isolation/CHANGE.md).
