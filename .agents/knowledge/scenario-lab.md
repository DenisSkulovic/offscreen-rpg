# Engineering decision laboratory: expose omitted considerations

**Use:** read-only design/review/testing practice for coding agents. These are **fictional exercises**, not approved Offscreen RPG features, and not automatic benchmark proof. Each scenario deliberately provides a deceptively easy brief. The goal is to recognize *which missing factors can reverse the proposed design* before writing code.

## How to run one exercise

The coordinator selects one scenario and gives the agent only the **brief** and role. The agent should describe 2–3 plausible approaches, crucial missing facts, a conditional recommendation and a compact verification strategy. An independent reviewer then opens the **challenge** and evaluates whether the initial decision survives. Record actual relevant knowledge loaded, changes in judgment and unnecessary assumptions.

Do not require an agent to guess all hidden requirements; it should identify *which questions are worth asking* and make a reasoned provisional choice, not respond with endless disclaimers.

### Scenario A: "Make the live story page update immediately"

**Brief:** The player selects an option; the UI should feel responsive and show the next scene quickly.

**Challenge to reveal afterward:** Two browser tabs can submit; a selected timed action is accepted but narratively settled later; a delayed old snapshot may arrive after a newer one; a session change can occur; a model timeout can mean uncertain billing. Initial UI may have long narrative paragraphs and keyboard users.

**Design reversals:** naive optimistic "reward earned" becomes invalid; event-only button disable cannot enforce server idempotency; a global store with no story/session/version key leaks state. A correct plan differentiates pending acceptance from committed story, uses source identity and a valid server-side command fence. Consult [frontend manual](frontend-state-and-async.md).

### Scenario B: "Add Redis for performance"

**Brief:** Story pages sometimes load slowly; introduce caching.

**Challenge:** Latency is mostly a poorly indexed join in an application query; cache needs tenant isolation and revision-based invalidation; a slow in-flight old DB read can repopulate a cache *after* the writer invalidated it; Redis may be offline.

**Design reversals:** first measure SQL/queries; optional Redis may help only selected read projections; TTL is a staleness *duration*, not a complete invalidation guarantee; account/tenant identity is part of key policy. Consult [durable systems](durable-operations.md).

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

## Scoring that resists theater

Evaluate **decision quality**, not the number of bullets or risk names:

- Did it identify the *actual decision axis*, not only a fashionable library?
- Did it compare a credible no-new-infrastructure option?
- Did it locate authority and identity at the correct layer?
- Did it state which facts would change its recommendation?
- Did it notice at least one relevant cross-discipline interaction?
- Did it propose evidence capable of disproving the wrong design?
- Did it keep the role/task bounded and avoid unauthorized code changes?

A strong answer may be short. A long generic list that doesn't change the architecture gets no credit.

**Status:** test inputs for future agent evaluation only; no baseline or observed pass rate is claimed. See [coding-agent evaluation](../../docs/engineering/coding-agent-evaluation.md).
