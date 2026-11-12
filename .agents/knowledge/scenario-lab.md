# Engineering decision laboratory: expose omitted considerations

**Use:** read-only design/review/testing practice for coding agents. These are **fictional exercises**, not approved Offscreen RPG features, and not automatic benchmark proof. Each scenario deliberately provides a deceptively easy brief. The goal is to recognize _which missing factors can reverse the proposed design_ before writing code.

## How to run one exercise

The coordinator selects one scenario and gives the agent only the **brief** and role. The agent should describe 2–3 plausible approaches, crucial missing facts, a conditional recommendation and a compact verification strategy. An independent reviewer then opens the **challenge** and evaluates whether the initial decision survives. Record actual relevant knowledge loaded, changes in judgment and unnecessary assumptions.

Do not require an agent to guess all hidden requirements; it should identify _which questions are worth asking_ and make a reasoned provisional choice, not respond with endless disclaimers.

### Scenario A: "Make the live story page update immediately"

**Brief:** The player selects an option; the UI should feel responsive and show the next scene quickly.

**Challenge to reveal afterward:** Two browser tabs can submit; a selected timed action is accepted but narratively settled later; a delayed old snapshot may arrive after a newer one; a session change can occur; a model timeout can mean uncertain billing. Initial UI may have long narrative paragraphs and keyboard users.

**Design reversals:** naive optimistic "reward earned" becomes invalid; event-only button disable cannot enforce server idempotency; a global store with no story/session/version key leaks state. A correct plan differentiates pending acceptance from committed story, uses source identity and a valid server-side command fence. Consult [frontend manual](frontend-state-and-async.md).

### Scenario B: "Add Redis for performance"

**Brief:** Story pages sometimes load slowly; introduce caching.

**Challenge:** Latency is mostly a poorly indexed join in an application query; cache needs tenant isolation and revision-based invalidation; a slow in-flight old DB read can repopulate a cache _after_ the writer invalidated it; Redis may be offline.

**Design reversals:** first measure SQL/queries; optional Redis may help only selected read projections; TTL is a staleness _duration_, not a complete invalidation guarantee; account/tenant identity is part of key policy. Consult [durable systems](durable-operations.md).

### Scenario C: "Make the action processor reliable"

**Brief:** A worker occasionally restarts and the action must eventually finish.

**Challenge:** The worker can receive the same notice after commit-before-ack; a provider request may be in flight during crash; stale lease holder may complete after replacement; the player's story has advanced meanwhile.

**Design reversals:** an automatic retry loop is unsafe without durable operation/attempt identity and current story revision checks. A queue helps delivery, not exactly-once effect; a workflow may help waiting but cannot bypass authority. Consult [durable systems](durable-operations.md).

### Scenario D: "Extract the Storyteller into a microservice"

**Brief:** The Storyteller module is growing and developers want clearer boundaries.

**Challenge:** There is one developer, local pre-POC, and core authority relies on one SQL transaction with generation/publication fences. Deployment overhead and interservice idempotency now become costs. Perhaps a local module extraction or on-demand source map is enough.

**Design reversals:** “microservices improve modularity” is too vague. Compare retain+navigation, pure policy extraction, module boundary, remote service, with measured reasons and failure domains. Consult [architecture decision space](architecture-decision-space.md).

### Scenario E: "Add a document database for flexible memories"

**Brief:** The product needs evolving descriptive facts without dozens of SQL tables.

**Challenge:** Some facts are immutable evidence, some are current versioned projections, some are private proposals, and SQL retains mechanical command authority. Multiple writers can fork the “current” identity.

**Design reversals:** relational vs document is not a global all-or-nothing choice; one immutable source + selected manifest and typed SQL control can make more sense. The decision depends on query patterns, revisions, atomic root selection and restore. Consult [architecture](architecture-decision-space.md) and [durable systems](durable-operations.md).

### Scenario F: "Write tests for the new feature"

**Brief:** A dev has built a component and asks for tests.

**Challenge:** The component can render correctly while a stale response overwrites newer state; a unit mock bypasses server authorization; e2e can pass while acceptance merely acknowledges a queued job rather than its settlement.

**Design reversals:** start from product/technical **guarantees**, not implementation branches. Choose a falsifying test appropriate to the boundary: pure unit, real DB overlap, browser user journey or fault injection. A test proving “renders spinner” may be useful but is not evidence of settlement correctness. Consult [pack standard](pack-standard.md).

### Scenario G: "Expose a convenient debug endpoint"

**Brief:** Support needs an endpoint to inspect a blocked story and restart a failed action.

**Challenge:** The inspection includes private Storyteller plans, tenant identity and raw provider metadata. The restart may repeat a paid external attempt. An authenticated user may know another story ID; CORS settings cannot protect object authorization.

**Decision reversals:** distinguish identity, object/property/function authorization and environment gating; propose a scoped operator capability and privacy-safe projection; restart cannot replace reconciliation of uncertain dispatch. Compare dev-only local tool, gated admin operation and safer status-only view. See [security/trust](security-and-trust.md).

### Scenario H: "Add a fast endpoint for story history"

**Brief:** Return history to a web client with a simple GET returning an array.

**Challenge:** History can become huge, writes continue during pagination, private versus public entries differ, an upstream CDN/proxy might cache by URL alone, and old web clients remain open after a deploy.

**Decision reversals:** choose pagination consistency and stable order; explicit scope and caching; resource/command semantics and serialized version compatibility. A 200 and valid JSON do not prove correct completeness or privacy. See [API/network](api-and-network-contracts.md).

### Scenario I: "All tests are green, ship it"

**Brief:** A React test suite covers every component and reports high line coverage.

**Challenge:** Tests mock the server as always accepting a command, ignore an ambiguous provider outcome, never reverse asynchronous reply ordering, and use fixed sleeps on a shared browser session.

**Decision reversals:** derive quality evidence from accepted business constraints; choose targeted unit, real DB overlap, controlled browser race, and fault-injected workflow checks. Coverage and passing mocks alone cannot certify accepted effects. See [testing/evidence](testing-and-quality-evidence.md).

### Scenario J: "We need better monitoring"

**Brief:** Users report occasional 10-second waits. Add logging and an observability platform.

**Challenge:** The API handler is fast; delay occurs in DB pool queueing or worker backlog; traces lose correlation after a Temporal wake; one tenant's debug logs include private prose; requests receive 202 before publication.

**Decision reversals:** define the user-visible completion SLI first; compare logs, RED/USE metrics, spans and durable operation ledger; trace stage-specific IDs, privacy and cardinality. Don't install a giant monitoring stack before finding the missing evidence. See [observability/diagnostics](observability-and-production-diagnostics.md).

### Scenario K: "Add a required field to every saved story"

**Brief:** A new story setting is mandatory, so add a NOT NULL column with a default and update the API.

**Challenge:** Real databases may contain millions of rows; an old worker is still writing old payloads; a long transaction holds a lock; a background backfill may overwrite a newer user change; an older deployed app may be rolled back after new data is written.

**Decision reversals:** distinguish empty prototype DB versus live multi-version migration; choose additive schema, compatible writer/reader, idempotent bounded backfill, validation and delayed contraction where needed. Verify lock/runner semantics, don't assume Drizzle or PostgreSQL automatically makes this safe. See [data/migration](data-modeling-and-migrations.md).

### Scenario L: "Redis will fix slow story pages"

**Brief:** A team wants Redis because p95 page-load latency is uncomfortable.

**Challenge:** DB SQL spends most of its time on one missing index; browser performs sequential fetch waterfall; the same Redis key expires for all users simultaneously; stale read repopulates after invalidation; a user session switch crosses cache scope.

**Decision reversals:** profile critical path, compare SQL query/index and browser restructuring with local/Redis caches; specify data identity, stale tolerance, Redis-outage fallback and real load measurement. A cache isn't always the highest-value option. See [caching/performance](caching-and-performance.md).

### Scenario M: "Roll back the worker if deployment fails"

**Brief:** A release replaces a Temporal worker and API in rolling fashion. If anything fails, restore the previous container image.

**Challenge:** Old and new worker versions overlap, one workflow has already been dispatched to a paid provider, a new migration changed a durable field and new browser tabs send a newer command shape. A probe reports healthy while accepted actions never publish.

**Decision reversals:** code rollback is not data rollback, durable workflow replay is not a normal stateless restart, and provider dispatch is not undone by container replacement. Compare simple all-at-once release, rolling compatibility, feature flag, staged schema changes and recovery. See [release engineering](release-and-delivery-engineering.md).

## Scoring that resists theater

Evaluate **decision quality**, not the number of bullets or risk names:

- Did it identify the _actual decision axis_, not only a fashionable library?
- Did it compare a credible no-new-infrastructure option?
- Did it locate authority and identity at the correct layer?
- Did it state which facts would change its recommendation?
- Did it notice at least one relevant cross-discipline interaction?
- Did it propose evidence capable of disproving the wrong design?
- Did it keep the role/task bounded and avoid unauthorized code changes?

A strong answer may be short. A long generic list that doesn't change the architecture gets no credit.

**Status:** test inputs for future agent evaluation only; no baseline or observed pass rate is claimed. See [coding-agent evaluation](../../docs/engineering/coding-agent-evaluation.md).
