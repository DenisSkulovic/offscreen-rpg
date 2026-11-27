# Verification and acceptance

**Status:** all successor gates NOT RUN. The accepted architecture and outstanding A1–A12 obligations remain binding; no live or implementation authorization.

## 1. Acceptance routes

The [design acceptance matrix](../../../designs/open/observability-developer/ACCEPTANCE.md) defines V01–V12. The [certification mapping](../../../designs/open/observability-developer/R5-CERTIFICATION.md) transfers every original A1–A12 predicate to this single successor. The archived native [proof](../../archive/2026-11/observability/2026-11-26--observability-native/PROOF.md) and [owner route](../../archive/2026-11/observability/2026-11-26--observability-native/OWNER-ACCEPTANCE.md) retain the original predicates, not active commission. Prior evidence is valid only for its actual tested SHA and scope.

| Route | Executor | Required proof |
| --- | --- | --- |
| Precommission evidence | ChatGPT + owner | Local worktree census, offline render, pinned D3/D4 experiment, amendment ratification, isolated target availability |
| Implementation | Cursor | A1–A5, A11 source, A12 and focused V01–V12 cases in TASKS.md; actual offline Helm parity and local subprocess tests |
| Existing dev qualification | ChatGPT + owner | V06–V10; A7/A10 may reuse the same receipts when all original criteria hold |
| Isolated infrastructure certification | ChatGPT + owner | A6 fresh install, A8 persistence/outage, A9 real quota failure |
| Conditional release preview | ChatGPT + owner | A11 read-only if available; never mutate release |

Cursor commits exact tested SHA, owned paths, commands/results and remaining heavy proofs, then stops at IMPLEMENTED — ACCEPTANCE PENDING. The integration custodian joins only after all mandatory gates pass on the successor candidate and affected main drift is reconciled. No separate predecessor certification.

## 2. Precommission evidence

[READINESS.md](READINESS.md) is the single current blocker ledger. F08 deadlines and D4/D4.1 query freshness remain candidates requiring independent ratification.

Run the following from a clean main worktree:

```bash
bash work/changes/open/2026-11-27--observability-developer/preflight-evidence.sh
```

This read-only route verifies source baseline, worktree/branch census, references, pinned Grafana Service port 80 → container port 3000, Prometheus OTLP config and Collector render. Operational reference census is already reconciled remotely in SOURCE-MAP.md; no need to repeat research at unchanged source.

For the separately approved pinned D3/D4 experiment only:

```bash
OFFSCREEN_OBSERVABILITY_EVIDENCE=authorized bash work/changes/open/2026-11-27--observability-developer/preflight-evidence.sh
```

Preconditions: verified local Docker daemon, sufficient capacity, pinned images already present; no Kubernetes requests, host mounts, published ports, image pulls, external network or application stores. The script verifies immutable experiment source blobs before modifying private copies. It labels owned containers, checks they are absent after completion, and refuses unsafe prerequisites. Never automatically remove retained containers.

Prior experiment stdout, if available, can supply exact application metric rows and TARGET_INFO from /tmp/offscreen-obs-data-plane.ruUJDGpb. It cannot establish the D4 full-domain query behavior. The new experiment checks exact labels, actual producer timestamps and bounded raw query windows on newly retained synthetic data; it does not establish production retention scale, future-boundary ingestion or successor acceptance.

Return compact census/render receipts, D3_D4_RECEIPT, exit status, cleanup observation and SHA. Keep raw logs private; on failure return sanitized error and exact blocker. Separately confirm isolated A6/A8/A9 target availability, no unrelated data and authorization boundaries. No boot/reset/delete in preflight.

## 3. Existing development qualification (owner)

After implementation and explicit authorization, use the dedicated clean implementation worktree. Record exact HEAD/status, source guard, independent Kind/Docker/cluster UID, memory/admission, current configuration and identity projection. No other platform writer or connection.

For the occupied known predecessor:
1. `pnpm infra:status --env dev --services observability --json`: require upgrade-required and clear pending.
2. `OFFSCREEN_OBSERVABILITY_UPGRADE=authorized pnpm obs:upgrade`: exactly one Collector revision transition, preservation and clear pending. Repeat: mutation none, no selected UID/RV change. Failure stops; no automatic retry or rollback.
3. `pnpm obs:connect --queries`: fixed loopback ports, authenticated Grafana health, Ctrl+C and owned listener cleanup. Do not leave connection running during proof/upgrade.
4. Execute the following sequentially and stop on first failure:

```bash
export OFFSCREEN_OBSERVABILITY_PROOF=authorized
node infra/verification/smoke/observability/proof.mjs health dev kind-offscreen-dev
node infra/verification/smoke/observability/proof.mjs developer dev kind-offscreen-dev
node infra/verification/smoke/observability/proof.mjs developer dev kind-offscreen-dev
node infra/verification/smoke/observability/proof.mjs signals dev kind-offscreen-dev
node infra/verification/smoke/observability/proof.mjs resources dev kind-offscreen-dev
```

Retain stores between the two developer runs. Require exact fresh sample timestamps and trace/log IDs, valid controls, prohibited canary exclusion, exact metric labels and complete negative query windows. No stale credit, no actual application enrollment. Preserve stable identities, authenticated datasource health and scoped resource evidence. Existing retained obs-proof-90039b35 namespace is separate cleanup debt; no routine namespace deletion.

## 4. Isolated infrastructure certification (owner)

- A6: separately approved fresh normal dev target. Public plan, public ensure (`pnpm infra:up --env dev --services observability --json`), status, health, repeat ensure. Desired rev1, five pinned ready workloads, three bound claims, exact Grafana auth, repeat no mutation/identity change. Not equivalent to occupied V06 upgrade.
- A8: approved isolated target after A6, with `OFFSCREEN_OBSERVABILITY_PROOF=authorized` and `OFFSCREEN_OBSERVABILITY_DISRUPTION=authorized`. Run persistence then outage via proof.mjs with exact dev profile/context. Require query-only replay, preserved identities and fresh recovery. No automatic retry or destructive cleanup.
- A9: separate fresh isolated target or separately approved fresh bootstrap. Add `OFFSCREEN_OBSERVABILITY_ISOLATED_PROOF=authorized` and `OFFSCREEN_OBSERVABILITY_EXPECTED_CLUSTER_UID` from independent target evidence. Run partial-install via proof.mjs; require real quota rejection, retained data/pending and typed repeat refusal. Never clear pending or delete failed platform as part of proof.
- A11: conditional approved read-only release preview, no release ensure.

All commands depend on exact target identity, available capacity, verified implementation candidate and applicable authority. Collect sanitized receipts under .offscreen/verification. No raw credentials or broad node output.

## 5. Shared deadline contract (F08 candidate)

Pending independent ratification. These are hard upper bounds, not expected runtime. Accepted R5 remains authoritative until ratification; no alternate timeout mode or hidden proof bypass.

All values below are seconds; export shared runtime constants in milliseconds in identity.mjs (T03), wire external callers in T05, and consume the same constants in T07–T11. No copied divergent totals. Exact recognition and process containment remain specified in the [external supervisor](contracts/observation-callers.md) and [external process cancellation](contracts/partial-install.md) contracts. No hidden proof mode. A phase may start only if its full allocation fits its work deadline; clamp nested operations and termination grace to remaining monotonic time, check before and after, never convert exhausted time into a 1ms command. Work deadline = absolute deadline minus emergency reserve, once only. Emergency reserve is exclusively for failure/interruption restoration and cleanup, not further acceptance work. A cancelled run cannot pass. No sleep-to-budget. Unused allocation is not an obligation to wait. All mutation timeoutMs values inclusive: 30s patch/create, 240s upgrade, 510s Helm; default5s termination/close inside each (TERM at D-5, KILL at D-1, outcome at D). No further write or cleanup on close-unconfirmed; retain fence, actual inherited lock and snapshot. Direct trusted synchronous reads use SIGKILL timeout as specified in T03; no hard real-time claim for uninterruptible OS I/O.

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

Preserve existing sequential inventory, complete 19-kind raw endpoint census, bounded pagination (100/page, 500 aggregate items as existing), Helm list/history/manifests, PV and legacy-name reads. Refuse extra/unexpected releases before arbitrary history/manifest reads. No partial classified result, no fallback ambient listing, no concurrency redesign. The 120s aggregate is fail-closed, not a reservation of each call's maximum. Empirical complete-inventory viability remains unverified. Preload verified artifacts once per operation; don't re-render between observations. Inventory includes no implicit full identity recheck. T03 implements the full identity budget; T05 enforces the aggregate inventory deadline.

### Installer, observation, upgrade and connect

- Fresh ensure: preflight640 + admission inventory120 + namespace720 + Secret495 + five Helm phases975 each + final inventory120 + full identity210 + normal clear/close/receipt60 = **7240**. Worker ceiling7380, reserve60, work7320, slack80. Namespace720 = preinventory120 + identity210 + ledger15 + write30 + durable binding/full recheck225 + postinventory120. Secret495 = 120+210+15+30+120. Helm975 =120+210+15+510+120. Both before/after prefix observations remain mandatory. Bind actual namespace create response UID durably before next read. Exact public ensure supervisor7500; retain exact runner exemption, not a blanket timeout extension.
- Universal Helm outer cap510 inclusive, Helm internal wait180 unchanged. A9 wrapper 500 subphase seconds +5 local overhead +5 enclosing termination/close; no extra grace. No alternate normal-only6000 worker or isolated proof switch. The 510 cap accommodates the A9 wrapper's additional checks; actual subprocess chain feasibility still requires review/evidence.
- Read-only observation: 640+120+210+30=1000 worker, external supervisor1060. Plan via exact public platform runner; status direct. Reconcile diagnostic/provisioning callers, pending-readable result is not readiness.
- Upgrade: 640+120+210+15+240+120+90+15+210+60=1720; ceiling1800 reserve60 work1740. One Collector mutation only; no rollback. No-op observation also fits.
- Connect: preflight970=640+120+210; startup90 then indefinite foreground; periodic full checks <=210 each. No overall foreground deadline.

### Proof gate allocations

Components follow the operation contracts in [INTERFACES.md](INTERFACES.md); total includes emergency reserve; slack is unallocated.
| Gate | Work component arithmetic | Work sum | Reserve | Total | Slack |
|---|---|---:|---:|---:|---:|
| health | 640+120+90+15+120+210+30 | 1225 | 120 | 1380 | 35 |
| developer | 640+120+90+600+60+15+210+30 | 1765 | 120 | 1920 | 35 |
| resources | 640+120+90+300+15+120+210+30 | 1525 | 120 | 1680 | 35 |
| signals | 640+120+90+270+285+1155+1335+360+210+15+30 | 4510 | 1020 | 5580 | 50 |
| persistence | 640+120+90+270+285+1155+5655+735 | 8950 | 1020 | 10020 | 50 |
| outage | 640+120+90+270+285+3465+490+820+735 | 6915 | 2040 | 9000 | 45 |
| partial-install | 640+120+210+60+7500+210+120+1100+120+210+30 | 10320 | 300 | 10680 | 60 |

Health order start, inventory, Grafana query, close, repeat inventory, final identity, receipt. Developer start, inventory, forward, Python600 positive/negative/positive with durable D4.1 allocations (483 work +112 slack +5 termination), evidence60, close, identity, receipt. Resources start, inventory, forward, sampling/report300, close, repeat inventory, identity, receipt. Signals start, inventory, proxy, namespace, CM, separate normal and privacy Pod cycles, CM delete, identity, close, receipt. No Pod reuse between modes.

Resources: use per-cycle concurrent reads of exactly the two nodes with 8s request cap, schedule next cycle no earlier than 10s from prior cycle start (if overrun, fail, no burst catch-up); all 12 cycles fit 120s plus setup/final/Prom queries within 300s. Fixed production interval 10; fake clock only in tests. Use actual allocated Prom port (never 0), no env override to zero, no fallback ambient node listing, exact observed roles. Preserve original memoryTime/workingSetBytes keys internally; map to the [health/resource contract](contracts/health-resources.md) at the boundary. No raw node summaries on disk.

Persistence: start640, inventory120, proxy90, namespace270, CM285, baseline normal cycle1155, three rounds of restart730 + replay cycle1155, finish735. Restart730 = preinventory120+identity210+patch30+pending10+rollout240+postinventory120. Pending must be durable before patch. Finish735 = inventory120+CM delete360+identity210+proxy close15+compare-clear/receipt30. Clear before releasing custody.

Exact order Prometheus Deployment, Loki StatefulSet, Tempo StatefulSet. Capture initial stable identities and exact baseline synthetic identity/timestamp. Each round must fetch fresh inventory and actual current workload UID/RV; never reuse initial RV or fallback initial claims. Before first mutation begin durable pending; advance compare-owned record before each later mutation. JSON Patch tests metadata.uid, metadata.resourceVersion and expected generation/replicas where relevant, then writes only restart annotation; use frozen explicit target flags. Verify new ready Pod UID, old UID absent, current observed generation, unchanged workload UID and exact three PVC UID/volumeName/PV UID and claimRef tuples. Replay mode queries all original signals and recorded timestamp; **zero OTLP POST**. No success with stale/missing claim reads. Compare-clear pending after final preservation and fresh identity, before release of custody (charge clear in final 30s ledger/receipt; perform before closing proxy/snapshot). No rollback or second restart on unknown write.

Outage: start640, inventory120, proxy90, namespace270, CM285; baseline cycle, down490, fresh outage cycle, restore820, fresh recovery cycle, finish735. Down490=inventory120+identity210+patch30+pending10+down verification120. Restore820=identity210+fresh inventory/claim/RV120+durable restore intent10+write30+rollout240+postinventory120+recovery evidence90. Fresh inventory precedes intent; final identity and clear remain in finish735. No hidden second full recheck inside fixed restore operation. Pending before each write; final identity charged in finish. No new proof after work expiry. The down cycle must prove fresh logs/metrics and confirmed Tempo unavailability while down, not a failed query treated as proof. Restoration uses freshly read same Tempo UID and current resourceVersion, replicas exactly zero, recorded original replicas one, recorded operation ownership, frozen identity. Never use the pre-scale-down RV. If observed replicas already one, only verify convergence/preservation; no second write. If any foreign UID, unexpected replicas, unreadable identity or unowned state, retain pending and stop writes. No success until same Collector Pod UID, stable claims/PVs, restored Tempo ready and new all-signal proof. Normal restoration only one mutation attempt; ambiguous result may be observed read-only, not blindly retried. Unknown down can permit single exact compensating restore only if fresh owned down projection matches recorded generation+1; retain pending even if restored. Unknown restore, unclosed child, or unsafe identity refuses later writes. If already one with uncertain down retain fence; no later proof.

Signals/persistence emergency reserve1020 covers known Pod cleanup360+CM cleanup360+identity210+proxy15+receipt30=975. Outage emergency reserve2040 covers restore820+same cleanup975=1795; restoration first, no new proof. If exact identity, ownership or available time is insufficient, retain pending/known ledger, refuse unsafe cleanup. Namespace deletion is not authorized.

Partial-install: start640, absent inventory120, identity210, wrapper setup60, first public ensure7500, bound identity210, retained inventory120, repeat public refusal1100, retained inventory120, final identity210, receipt30. Outer supervisor owns no platform lock; real inner ensure owns custody. Read actual created namespace UID from the wrapper's private durable ensure-intent binding ledger, corroborated by exact retained pending tuple and frozen namespace GET; public ensure receipt deliberately has no UID. Require successful worker/outer receipt parsing for failure/refusal predicates independently; never invent a public UID field. A timeout never counts as refusal. Use the [partial-install contract](contracts/partial-install.md) for exact wrapper argv, inherited-lock inspection and owned process-group cancellation; never infer API write cancellation from process death. Preserve failed platform and pending. No cleanup of failed platform. Emergency300 does not authorize restoration or deletion.

Proof source tests: fake monotonic clock at each phase boundary (exact fit, one ms insufficient, command timeout despite exit0, cleanup failure after green operation, restoration reserve available after work expiry); assert no subsequent phase/child or successful receipt after failure. Existing proof-host early return/finally cannot make returned ok reflect cleanup failure: refactor to single terminal result after cleanup. Test actual public main return code and persisted receipt agree. Do not claim these budgets proven by arithmetic alone.

D4/D4.1 details live in [signal-queries.md](contracts/signal-queries.md). The developer Python phase is 483s work (15 session-start preflight +128 POST +180 positive query +120 negative query +5 initial watermark read +35 allocations), 112s slack, 5s termination/close = 600s. Proof-local watermark persists across cleanup. Actual pinned query and timing evidence remain outstanding.

All gates remain NOT RUN. Prior planning alternatives and exact original preflight block are in [Git history](https://github.com/DenisSkulovic/offscreen-rpg/blob/9c78b4b78e5acd6957a3f7f57a7f4c0bb4ae9c05/work/changes/open/2026-11-27--observability-developer/PROOF.md).
