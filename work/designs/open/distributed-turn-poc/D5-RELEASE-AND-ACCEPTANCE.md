# D5 | Distributed playable-turn release and acceptance program

**Status:** planned acceptance specification, 2026-11-19; no deployment or live-provider authorization implied. [DISTURN](README.md) is the target, [GAPS](GAPS.md) is the source-aware gap inventory, [D1](D1-EXECUTION-CONTRACT.md) is the candidate delivery handshake, [D2](D2-SCENE-DATA-CONTRACT.md) the candidate historical-state contract, [D3](D3-CAMPAIGN-BOOTSTRAP.md) candidate bootstrap, and [D4](D4-STORYTELLER-HANDOFF.md) candidate model-custody contract. These contracts are **not** automatically ratified by this document.

## Why a fifth pass exists

DIST06, BOOT04 and STORY04 are **component integration proofs**, not proof of the entire player promise. DATA04 supplies historical read/fork capability but itself does not prove it runs on the same Kubernetes installation as the distributed Storyteller. We must require an explicit **join gate** and avoid four separate fixture harnesses, duplicated credentials, parallel migration runners, and contradictory status claims.

The final POC consists of a repeatable, user-controlled **provider-free** end-to-end run on kind, followed only if separately approved by a narrowly capped **real-LLM turn** through the identical pipeline. POC completion never requires Stripe, illustrations, Cognee, production availability, full D&D coverage, or a background agent.

## Gate A | Reproducible application release

**Artifact:** one lab deployment profile and one reproducible release command/runbook. Reuse `infra/kubernetes/lab/` and current K8S01–K8S11 plans; do not invent a second cluster installer. It must support rebuilding after disposable teardown.

Expected live processes, subject to D1/DIST01 ratification:
- Local Gateway API controller and Gateway/HTTPRoutes.
- Independently deployed Next Web and Nest player API; one same-origin browser entry.
- Game Authority runtime as one permitted story/campaign/scene writer, including private authenticated methods.
- Outbox relay and Rabbit→Temporal bridge, with **only one** dispatch route per selected topic.
- Temporal server with persistence, control Activity worker, separate Storyteller execution Activity worker.
- CloudNativePG and S3-compatible immutable object storage, with bound PVs; Redis optional as nonauthoritative cache. RabbitMQ is the delivery substrate, not a second scheduler.
- Minimum logs/metrics/trace correlation sufficient to diagnose a failed scene operation; no full HA or paid telemetry requirement.

The release must define: immutable image tags or digests, build/load commands, dependency startup order, env/Secrets/ServiceAccounts, isolated DB migration Job with single-run ownership, namespace-scoped auth, resource requests/limits, readiness and startup probes, app DNS, API/Next SSR proxy routing, EventSource no-buffer streaming, explicit fake-provider default, known rollout/rollback for existing Compose/local mode and a safe teardown that **does not delete unrelated Compose volumes**.

A Resource/compatibility ledger is mandatory. A cluster Pod in Ready state is not evidence that a scene succeeded, nor is every component's isolated smoke test evidence that all can fit in memory simultaneously. If the local 12GB-ish WSL memory budget is exceeded, reduce replicas/nonessential collectors and report measured footprint, not fabricate HA.

## Gate B | Single deterministic golden fixture

Fixture assets from controlled source origins, no raw “fake succeeded” DB insertions. Reuse REAL01/REAL02 authored fixture shapes, source-verified current scripted opening candidate and `content/starts`/world/rule importer where valid. A fixture may use a small proprietary/original neutral setting rather than blindly assuming the example's external licenses or full D&D adapter coverage. Keep one simple D&D-like supported game consequence (e.g. item transfer/HP change only if source supports it) and one descriptive canon change. The same fixture supplies:
- identity A can create or start story S using a permitted successful **opening candidate** and an immutable package root; identity B cannot;
- scene1 with frozen authoritative state (e.g. sword with player), source passage, and canon root (e.g. king alive);
- accepted choice action in scene1 with frozen operation ID and expected revision;
- exactly one admitted consequence and one captured Storyteller continuation task in GA, dispatched via SQL outbox→Rabbit→Temporal;
- bounded Storyteller execution under script fixture, with at least one version-pinned canon read from shared S3 and a validated descriptive proposal;
- Game Authority guarded publish of scene2, exact post-effect game state and canon root, one source passage, view version and committed receipt;
- same-origin SSE hint triggers a browser GET and live scene2 without a user page reload;
- *historic* scene1 GET still shows earlier state/canon (not latest mutable tables), and fork from scene1 **after** scene2 exists creates independent branch that retains earlier possessions and descriptive fact;
- parent can continue separately and fork's next scene can differ; fork/parent IDs and document-root ancestries do not leak into each other's Storyteller context;
- refresh and safe Pod restart preserve hashes, versions, ownership and journal history.

A second **no-inventory/microbe** fixture should run at least contract-level and ideally same code path, to guard against making inventory/economy mandatory.

## Gate C | Causality and negative proof

Record a deterministic evidence ledger for each controlled failure. Required minimum:
1. **Identity and authorization:** wrong owner/cookie rejected for SSR, command, historical read, fork and source document; internal GA not exposed through Gateway.
2. **Retry and duplication:** lost PUT response, repeat frozen command, duplicate Rabbit notice, repeated Temporal workflow start/result, repeated publication and repeated fork ID. One effect, one passage, one checkpoint, one billable attempt if ever enabled.
3. **Source/data split:** S3 down before staging, hash mismatch or missing historical object, SQL transaction rolled back after staging, stale canon root, incomplete legacy checkpoint. No half-scene, no “latest root” substitution.
4. **Branch isolation:** scene1 as-of after parent scene2; no later king death or item change in old journal/fork; no sibling visibility in memory tool candidate **or returned snippet**.
5. **Network and worker recovery:** API/Next/Storyteller restart, dropped SSE notification, broker/Temporal temporary outage. Browser GET convergence, durable pending/held state, no unbounded retry storm.
6. **Attempt custody:** fake provider automatically safe; real-provider timeout after possible send enters `uncertain` and is never automatically retried as a second charge.

Test scripts must classify `PASS`, `FAIL`, `BLOCKED`, `NOT-RUN`, with exact runtime/build/seed/cluster/versions and evidence. No screenshot-only, Pod-Ready-only or cherry-picked happy path closure.

## Gate D | Explicit full-turn acceptance

The final scorecard must link **one and the same run** through: browser identity → candidate/story bootstrap → scene1 state/root → HTTP command/receipt → GA writer → SQL outbox → Rabbit notice → Temporal workflow → separate Storyteller worker → pinned canonical read → bounded proposal and attempt ledger → GA scene2 publication → S3 immutable content + SQL checkpoint/root → SSE/GET client update → historical scene1 as-of GET → independent fork + branch-safe continuation.

For each hop, record operation ID, story ID, generation ID, passage ID, checkpoint hash, root hash, relevant workflow/message ID and causal trace link, with secrets and user narrative redacted from operational logs. Store a dated evidence bundle in the existing observability/evaluations or integration report location, not a duplicate dashboard. Include a machine-readable result ledger and short human decision summary.

**Done** means all gates pass against an actual fresh reconstructed kind profile, using the same source commit/build images and branch-safe data. Success in local/Compose alone is NOT a pass. Distinguish a successfully committed *fake* scene from a genuine live-model generation.

## Gate E | Real-model proof, separate user-controlled decision

After A–D pass, a **separate approved** optional run may select a real provider/model, hard per-attempt spending ceiling, no blind retries and pre-recorded request/usage policy. It sends a **single continuation request** over the exact same task/proposal/publication path. The existing `storytellerAttempt`, usage and funding/dispatch-review ledger records are mandatory; no Stripe needed. Provider timeout or lost acknowledgment is an uncertain charge, requiring reconciliation before any new attempt. Capture response validity, actual costs, relevant logs and source-linked publication. No provider keys in evidence. Passing fake proof does not auto-trigger E; E does not grant ongoing model usage.

## Execution packets and ownership of evidence

- [TURN01](../../../changes/open/2026-11-19--turn01-ratify-unified-poc-acceptance/CHANGE.md): documentation-only exact pass/fail fixture and acceptance mapping. Ensure existing DIST06/BOOT04/STORY04 remain separate bounded proofs.
- [TURN02](../../../changes/open/2026-11-19--turn02-compose-real-kubernetes-application-release/CHANGE.md): one consolidated local Kubernetes **application release** and operational/evidence substrate. Avoid duplicating existing K8S08, K8S11, DATA05, BOOT02 manifests: reconcile those first; adopt existing source manifests rather than implement competing overlays. May defer actual full-run proof until TURN03.
- [TURN03](../../../changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md): execute the full provider-free, same-commit acceptance after underlying BOOT/DATA/DIST/STORY functionality lands, including the historical fork. This is the **sole** final DISTURN POC completion gate.
- [TURN04](../../../changes/open/2026-11-19--turn04-opt-in-real-provider-confirmation/CHANGE.md): optional, explicitly authorized live-provider test with a hard cap, not part of fake POC Done.

**Parallelism:** TURN01 fixture/scorecard design and TURN02 packaging research can proceed while the infrastructure and app implementation agents work. TURN02's owned packaging/config paths conflict with K8S08/09/11, so one coordinator assigns ownership or serializes merges. TURN03 can develop read-only test scaffolding concurrently, but cannot be run/marked passing until services, historical state and Storyteller custody are genuinely integrated. TURN04 stays unselected. Integrate one release profile, one database migration owner, one cluster operator, one evidence ledger.

## Beyond POC: preserved parking lot

Illustration generation and assets linked to historical scenes; full customer usage accounting/Stripe subscriptions and webhooks; external notifications; deeper 30/90-scene memory-quality evaluation and semantic search/Cognee if justified; optional bounded Code Mode; real-time multiplayer; advanced D&D mechanics; cloud operation, HA, full K8S10 chaos/load/scale experiments; richer visual book. These are intentionally deferred, **not** silently cancelled.
