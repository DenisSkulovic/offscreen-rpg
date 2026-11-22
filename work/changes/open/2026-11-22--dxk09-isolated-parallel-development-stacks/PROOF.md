# DXK09 | Falsifiable operational acceptance, not paper architecture

**Planning source:** `undertaking/storyteller-workshop@f6abb22b68cb`. No live Docker, Kind, WSL or browser test performed by planner. All statuses below are **NOT RUN**. Completion requires evidence across real worktrees, not merely generated YAML/green `kubectl get deploy`.

| Gate | Required positive result | Failure that must be detected |
| --- | --- | --- |
| B01 clean Docker context | source is reproducible from clean/dirty pnpm worktrees; actual BuildKit transfer excludes host `node_modules`; report bytes/time | invalid file request `@better-auth/drizzle-adapter`, >GB accidental context or missing manifest |
| B02 cache/dependency graph | correct affected-only build, safe shared cache hit, correct `TURBO_FILTER`; measure impact | speculative cache disable/global serialization, wrong image build, omitted dependency |
| B03 source-to-running-code | edit API and shared dependency; compile, reload process, fingerprint and health match desired source | deliberate TS compile failure and old process cannot report desired revision READY |
| L01 single-stack lifecycle | one command start/status/stop works and reports actual failure phase, existing data persists | bad Tilt arg count, namespace comma syntax, repeated manual trigger requirement, endless readiness polling |
| L02 worker readiness | actual worker boots, registers intended Temporal namespace/queues, bounded ready report and diagnostic | worker OOM, crashloop, incorrect namespace, stale dist, timeout |
| I01 elastic owner identity | allocate 1/4/5/10/100 distinct paths without changing code; reattach stable ID | fixed `s01..s04`, duplicate lease, race, reused PID, forced cross-owner stop |
| I02 resource fencing | scoped cluster/namespace/UID, unique image refs and ports, wrong-context read-only rejection | A stop/build mutates B or release; occupied port hijacked |
| I03 SQL tenancy | A/B independent schemas/migrations/sessions/outbox; 4 full stacks supported with budgeted active DB connections | A credential accesses B; dev `max_connections` exhaustion ignored |
| I04 S3 tenancy | per-slot bucket and *enforced* scoped credentials; A/B object mutations isolated | shared admin S3 credential allows A delete B |
| I05 Temporal tenancy | unique workflow namespaces/queues, real outbox→Temporal→writer side effects per tenant | A worker polls/executes B's workflow |
| I06 auth | two simultaneous real GitHub sign-ins on different loopback ports, correct session origin and secret | wrong cookie/origin, missing callback, fake dev auth ready |
| I07 concurrent work | four distinct worktrees run full-stack authenticated provider-free stories and live source updates concurrently | one slot's build/restart/stop/SQL migration changes B/C/D; services silently route across slots |
| I08 elastic growth | 5th/10th identity and tenant config succeed without config edits; live extra slot when measured capacity available | hardcoded slot ceiling or silent overcommit |
| I09 capacity | report peak RAM/CPU/disk per profile, Postgres connections, image imports, build/context, 4-stack real throughput | no-resource partial provision, OOM without diagnostic, serial work reducing throughput without reason |
| R01 release separation | release cold app image deployment and smoke can run while dev slots active, without dev stop or post-test restoration | same Pod/port/DB/Temporal or dev Tilt accidentally changed |
| R02 release runner honesty | recorded immutable release image/source, authenticated provider-free action, GA/Temporal/DB/S3 stage diagnostics | game writer HTTP503 falsely reported green, scene1 incorrectly counted as scene2 |
| R03 TURN03 compatibility | existing TURN03 golden scorecard reused; N5/N7/N8/N10 remain available for authorized real fault tests | missing/untested gates silently passed; dev namespace used for faults |
| C01 clean stop/restart | stop only slot A, retain A data, B/C/D healthy; restart A does not adopt other data | resource deletion on failure, stale PID kills foreign Tilt, losing bucket or DB |
| C02 performance regression | compare same clean-build, TS edit-to-ready, and four-slot test throughput against measured DXK08 baseline; present actual distributions | green deployment without useful latency or profiler data |

**Discriminating live scenarios:** (a) start four full stacks, each with an independent story and two successive scene publications; (b) modify shared package only in slot A while B/C/D run; (c) stop/restart A without destroying tenant; (d) induce compile failure/OOM/build failure only in A; (e) execute a cold release smoke concurrently in release lab; (f) attempt wrong SQL/S3/Temporal contexts and cross-slot operation; (g) allocate synthetic IDs 5/10/100 and verify port/bucket/name/manifest generation, plus fifth live only when resources admit.

**Turn03 boundary:** DXK09 PASS does not imply TURN03 PASS. A release story remaining scene1 with writer 503 is a failing real application/release test. N5/N7/N8/N10 remain NOT RUN until independently executed. DXK09 must make the runner repeatable and diagnostic, not suppress failures.

**Evidence receipt:** source SHA + dirty state, branch/worktree path, image IDs, Pods UID, namespace, own SQL/S3/Temporal identifiers, timing/context bytes/CPU/RAM/connections, application runtime fingerprint, before/after snapshots, failure logs and test run IDs. No secret values or provider spend. Every gate must be marked PASS/FAIL/BLOCKED/NOT RUN with actual evidence. *No live run occurred in the planning revision.*

**Closure rule:** all B/L/I/R/C gates pass on real target host, including four full concurrent stacks. If the machine genuinely cannot fit four, do not quietly reduce the target; return resource profile and selected optimization, keep Change open. No arbitrary hardcoded count ceiling.
