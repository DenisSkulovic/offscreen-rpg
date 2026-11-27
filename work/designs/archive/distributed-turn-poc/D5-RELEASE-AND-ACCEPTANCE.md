# D5 | Distributed playable-turn release and acceptance program

**Status:** planned acceptance specification, 2026-11-19; no deployment or live-provider authorization implied. [DISTURN](README.md) is the target, [GAPS](GAPS.md) is the source-aware gap inventory, [D1](D1-EXECUTION-CONTRACT.md) is the candidate delivery handshake, [D2](D2-SCENE-DATA-CONTRACT.md) the candidate historical-state contract, [D3](D3-CAMPAIGN-BOOTSTRAP.md) candidate bootstrap, and [D4](D4-STORYTELLER-HANDOFF.md) candidate model-custody contract. These contracts are **not** automatically ratified by this document.

The working model is the merged rule in [Commands, business events, and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows). A workflow start or wake is the PostgreSQL outbox delivered by a direct Temporal RPC. RabbitMQ is for a post-commit business event and an independent idempotent consumer, and only if that consumer is separately selected. The two paths are not one chain. The story SSE hint stays off the broker. The engine keeps the scene checkpoint. There is no Game Economy service. See [execution reconciliation](EXECUTION-RECONCILIATION-2026-11-19.md).

Superseded: Gate A, the fixture, and the scorecard below used to require a Rabbit→Temporal bridge on the story command. That hop is not part of any gate on this page.

K8S03, K8S06, and K8S09 are merged laboratory proofs. Each deleted its cluster. K8S06 proved a disposable Temporal 1.32.2 server. That laboratory is not the Compose development server and not the game workflow. This page does not mark a Kubernetes application release, a checkpoint schema, or DATA02 Done.

## Why a fifth pass exists

DIST06, BOOT04 and STORY04 are **component integration proofs**, not proof of the entire player promise. DATA04 supplies historical read/fork capability but itself does not prove it runs on the same Kubernetes installation as the distributed Storyteller. We must require an explicit **join gate** and avoid four separate fixture harnesses, duplicated credentials, parallel migration runners, and contradictory status claims.

The final POC consists of a repeatable, user-controlled **provider-free** end-to-end run on kind, followed only if separately approved by a narrowly capped **real-LLM turn** through the identical pipeline. POC completion never requires Stripe, illustrations, Cognee, production availability, full D&D coverage, a background agent, or a broker on the Storyteller wake.

## Gate A | Reproducible application release

**Artifact:** one lab deployment profile and one reproducible release command/runbook. Reuse `infra/kubernetes/lab/` and the existing Kubernetes plans; do not invent a second cluster installer. It must support rebuilding after disposable teardown. Isolated component smokes that already passed, including the deleted Temporal 1.32.2 laboratory, are not this profile.

Expected live processes, once a later release Change is actually selected:

- Local Gateway API controller and Gateway/HTTPRoutes for the real Next and Nest processes. K8S09's synthetic loopback routes are not that deployment.
- Independently deployed Next Web and Nest player API; one same-origin browser entry.
- One permitted story, campaign, and scene writer. The engine remains the checkpoint boundary.
- An outbox relay that starts or signals Temporal by a direct RPC. One wake route. RabbitMQ is not on that route.
- Temporal server with its own persistence, a control Activity worker, and a separate Storyteller execution Activity worker when that split exists. Until then, do not pretend `storytellerV1` is already two stages.
- CloudNativePG and S3-compatible immutable object storage, with bound persistent volumes. Redis is an optional nonauthoritative cache.
- RabbitMQ only if a post-commit consumer has been separately selected. It is not the delivery substrate for the story command and not the SSE stream. If no consumer is selected, the release does not add a broker requirement.
- Minimum logs, metrics, and trace correlation sufficient to diagnose a failed scene operation. No full high-availability or paid telemetry requirement.

The release must define: immutable image tags or digests, build and load commands, dependency startup order, environment and Secrets and ServiceAccounts, one isolated database migration Job, namespace-scoped auth, resource requests and limits, readiness and startup probes, app DNS, API and Next routing, EventSource streaming without buffering, an explicit fake-provider default, rollback to the existing Compose mode, and a teardown that does not delete unrelated Compose volumes.

A resource ledger is mandatory. A Pod in Ready state is not evidence that a scene succeeded. Isolated smoke tests are not evidence that every component fits in memory together. If the local memory budget is exceeded, reduce replicas and nonessential collectors and report the measured footprint.

## Gate B | Single deterministic golden fixture

Fixture assets come from controlled source origins. Do not insert a raw "fake succeeded" database row. Reuse the authored fixture shapes, the source-verified scripted opening candidate, and the world and rule importer where they are valid. A fixture may use a small original neutral setting. Keep one simple supported game consequence and one descriptive canon change. The same fixture supplies:

- Identity A can create or start story S from a permitted opening candidate and an immutable package root. Identity B cannot.
- Scene 1 has frozen authoritative state, a source passage, and a canon root.
- An accepted choice in scene 1 carries a frozen operation id and expected revision.
- Exactly one admitted consequence and one captured Storyteller continuation. The wake is the SQL outbox delivered by a direct Temporal RPC.
- Bounded Storyteller execution under the script fixture, with at least one version-pinned canon read from shared object storage and a validated descriptive proposal.
- The writer publishes scene 2: post-effect game state, canon root, one source passage, view version, and committed receipt. The engine still owns the checkpoint.
- A same-origin SSE hint triggers a browser GET and shows scene 2 without a reload. The hint is PostgreSQL LISTEN/NOTIFY, not a broker message.
- A historic scene 1 GET still shows the earlier state and canon, and a fork from scene 1 after scene 2 exists keeps the earlier possessions and descriptive fact on the new branch.
- The parent can continue separately. The fork's next scene can differ. Fork and parent document roots do not leak into each other's Storyteller context.
- Refresh and a safe Pod restart preserve hashes, versions, ownership, and journal history.

A second fixture with no inventory should run at least at contract level, on the same code path when that is practical, so inventory and economy do not become mandatory. There is no Game Economy service.

An optional post-commit consumer may be observed in the same run only after it has been separately selected. Its lag or absence does not fail this gate. Superseded fixture clause: dispatching the continuation through SQL outbox to RabbitMQ to Temporal.

## Gate C | Causality and negative proof

Record a deterministic evidence ledger for each controlled failure. Required minimum:

1. **Identity and authorization:** a wrong owner or cookie is rejected for SSR, the command, the historical read, the fork, and the source document. The internal writer is not exposed through the Gateway.
2. **Retry and duplication:** a lost response, a repeated frozen command, a repeated Temporal start, a repeated publication, and a repeated fork id leave one effect, one passage, one checkpoint, and one billable attempt if a paid attempt is ever enabled. A duplicate broker delivery, if a consumer exists, does not add another effect.
3. **Source and data split:** object storage down before staging, a hash mismatch, a missing historical object, a SQL rollback after staging, a stale canon root, or an incomplete checkpoint. No half-scene and no substitution of the latest root.
4. **Branch isolation:** scene 1 as-of after the parent's scene 2 shows no later change. A sibling is not visible in a memory-tool candidate or in a returned snippet.
5. **Recovery:** API, Next, or Storyteller restart; a dropped SSE notification; Temporal temporarily down. The browser converges by GET. Pending and held state stay durable. There is no unbounded retry storm. A broker outage does not block the wake, the commit, or GET.
6. **Attempt custody:** the fake provider is safe by default. A real-provider timeout after a possible send is `uncertain` and is never automatically retried as a second charge. No paid call is claimed by this specification.

Test scripts classify `PASS`, `FAIL`, `BLOCKED`, and `NOT-RUN`, with the runtime, build, seed, cluster, and versions. No screenshot-only, Pod-Ready-only, or happy-path closure. A broker hop is not required in order to avoid `NOT-RUN`.

## Gate D | Explicit full-turn acceptance

The final scorecard links **one and the same run** through: browser identity, candidate and story bootstrap, scene 1 state and root, HTTP command and receipt, the engine writer, the SQL outbox, a direct Temporal RPC, the Storyteller worker, a pinned canonical read, a bounded proposal and attempt ledger, scene 2 publication, immutable content plus the SQL checkpoint and root, the SSE hint and GET, a historical scene 1 read, and an independent fork.

For each hop, record the operation id, story id, generation id, passage id, checkpoint hash, root hash, workflow id, and causal trace. Redact secrets and player narrative from operational logs. Store one dated evidence bundle in the existing report location. Include a machine-readable ledger and a short human summary.

Superseded scorecard hop: SQL outbox, then a Rabbit notice, then Temporal. That chain is not this gate.

**Done** for this program means the gates pass against a fresh kind profile, using the same source commit and images, with branch-safe data. Success on Compose alone is not a pass. A committed fake scene is not a live-model generation. This document does not itself mark that run Done.

## Gate E | Real-model proof, separate user-controlled decision

After A–D pass, a separate approved optional run may select a real provider and model, with a hard per-attempt spending ceiling, no blind retries, and a pre-recorded request and usage policy. It sends a single continuation over the same task, proposal, and publication path. The direct Temporal wake stays in place. The existing attempt, usage, and dispatch-review ledgers are mandatory. Provider timeout or a lost acknowledgement is an uncertain charge. Capture validity, cost, and source-linked publication. No provider keys in evidence. Passing the fake proof does not start this gate, and this gate does not grant ongoing model usage. Nothing in the current record is a passed paid run.

## Execution packets and ownership of evidence

- [TURN01](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--turn01-ratify-unified-poc-acceptance/CHANGE.md) is cancelled into TURN03, along with the DIST06, BOOT04, and STORY04 cases. The cold-cluster proof is not implemented.
- [TURN02](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--turn02-compose-real-kubernetes-application-release/CHANGE.md): one consolidated local Kubernetes application release. Reconcile K8S08, K8S11, DATA05, and BOOT02 before adding manifests. Do not treat merged laboratory smokes as this release.
- [TURN03](../../../changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md): the provider-free, same-commit acceptance, including the historical fork, after the underlying work lands. This is the final POC completion gate. It is not Done.
- [TURN04](../../../changes/open/2026-11-19--turn04-opt-in-real-provider-confirmation/CHANGE.md): an optional live-provider test with a hard cap. It is not part of fake POC Done.

**Parallelism:** TURN01 and TURN02 research can proceed while other agents work, under the queue's ownership rules. TURN03 cannot be marked passing until the writer, historical state, and Storyteller custody are actually integrated. TURN04 stays unselected. One release profile, one migration owner, one cluster operator, and one evidence ledger.

## Beyond POC: preserved parking lot

Illustration generation tied to historical scenes; customer usage accounting and payment subscriptions; external notifications; a longer memory-quality evaluation and semantic search if justified; optional bounded code execution by the model; real-time multiplayer; advanced rules; cloud operation and load experiments; a richer visual book. These stay deferred. A mandatory broker wake is not parked here as future permission. It is superseded.
