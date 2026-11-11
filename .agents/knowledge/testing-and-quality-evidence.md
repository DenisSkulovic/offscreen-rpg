# Testing and quality evidence: choose proofs that distinguish real correctness

**Audience:** test strategist, frontend/backend engineer, E2E designer, independent reviewer, QA investigator and workflow coordinator. **Trigger:** new feature acceptance, changing critical behavior, uncertainty about coverage, designing a test suite, assessing AI-written tests, failure reproduction or release evidence. This is **coding-agent methodology**, not a mandate to add tests indiscriminately.

**Route:** [what to prove](#1-the-test-must-match-the-claim) · [test architecture](#2-choose-the-cheapest-truthful-test-boundary) · [test design](#3-design-cases-before-reading-the-implementation) · [isolation and doubles](#4-test-doubles-contracts-and-real-dependencies) · [concurrency/faults](#5-concurrency-fault-injection-and-sequence-coverage) · [browser/E2E](#6-browser-e2e-accessibility-and-flaky-tests) · [coverage and evaluation](#7-coverage-statistics-and-nondeterministic-components) · [strategy handoff](#8-risk-weighted-proof-plan-and-evidence-receipt).

## Central model

A test is an **experiment against a stated behavioral claim**. The test's setup, observed output and system boundaries determine what it actually establishes. Green checks don't automatically prove user acceptance, external provider behavior, cross-process concurrency, UI accessibility or architectural fitness.

Agent-generated tests often pass because they share the implementation's assumption, mock out the very boundary that fails, or assert only that a component rendered. Good testing is about **discriminating hypotheses**: would this test fail for a plausible wrong implementation?

### 1. The test must match the claim

Start with an approved product outcome and the technical invariant that protects it.

| Claim | Likely relevant evidence | Misleading weaker test |
| --- | --- | --- |
| D20 result is deterministic under a supplied draw | Pure rule unit, boundary inputs | A browser screenshot showing success text |
| Two concurrent action submissions settle once | Real DB/operation integration with overlapping attempts | Unit test calling resolve once |
| Browser never displays story A under story B | Component/browser controlled response ordering | Only render B with a fixture |
| Accepted action does not imply published narration | State-transition test and public projection | HTTP route responds 200 |
| A worker survives crash-before-ack | Fault-injected durable integration | Fake queue callback returns success |
| An accessible form supports keyboard recovery | Browser keyboard/focus/semantic check | TypeScript compiles |
| A model recalled an old memory correctly | Captured source → selected evidence → packed packet → accepted output → later observed continuation | Retrieval returned a relevant document |

**Distinguish:** specification, source inspection, unit fixture, real dependency exercise, browser scenario, live provider run and human acceptance. A local pass can be a meaningful result without proving every tier.

## 2. Choose the cheapest truthful test boundary

There is no universal ideal ratio of unit/integration/E2E tests. Different behavior lives at different boundaries.

| Approach | Strength | Cost and what it misses |
| --- | --- | --- |
| Static/type/lint checking | Cheap structural guarantees and common error detection | Runtime sequencing, business correctness and visual behavior |
| Pure unit tests | Fast exhaustive decisions, edge inputs, deterministic models | Real DB isolation, browser, network, lifecycle |
| Component interaction tests | UI states, accessible controls, conditional rendering | Full session/auth/backend contract unless integrated |
| Narrow DB integration | Constraints, SQL semantics, transaction/lock behavior | External provider finality and complete user flow |
| Consumer/provider contract tests | Wire/schema/consumer expectations during evolution | Permission and business semantics not captured in contract |
| Browser E2E | User-observable flow, navigation, rendering, interaction | Exhaustive interleavings, failure injection, unseen provider behavior |
| Fault-injected workflow | Crash, retry, duplicate delivery, unknown external result under controlled assumptions | Every possible provider/deployment failure |
| Property-based/model-based tests | State invariants over many inputs/sequences | Coverage of properties that weren't specified |
| Mutation testing | Whether tests notice selected wrong-code transformations | Entirely missing feature guarantees |
| Live/human acceptance | Real integration or aesthetic/experiential judgment | Exhaustive deterministic correctness |

**Heuristic:** prove pure rules low in the stack; prove SQL claims with SQL; prove visible states in a browser; prove durable recovery under controlled restarts; do a bounded live check only when the domain needs real external evidence. The cost-optimal suite is a portfolio, not a pyramid quota.

A fragile E2E that exercises five services may be less useful than a deterministic targeted integration proving the exact invariant, unless the thing you need to prove is actually the five-service journey.

## 3. Design cases before reading the implementation

The test strategist should not simply turn an existing branch structure into its own assertions. Start from the *contract*, then use source inspection to choose the seam.

Five helpful case families:

1. **Representative success:** visible intended outcome under normal input.
2. **Rejection:** invalid owner, stale version, missing prerequisite, wrong type, forbidden action.
3. **Boundary:** first/last, zero/maximum, empty collection, overflow, identity/clock tie.
4. **Interleaving/transition:** reordered replies, duplicate submission, concurrent actors, crash at a named step, late webhook.
5. **Evolution/compatibility:** old client, changed payload, migration backfill, locale/timezone, new enum value.

Don't generate every Cartesian combination. Choose the combinations that threaten the *same invariant* and can expose different wrong mechanisms.

### Example: assertion derived from a real invariant

Claim: **two concurrent responses to one saved story cannot regress the authoritative displayed version.**

A weak test sets the current version once and checks that the title rendered. A stronger test resolves **v13 before delayed v12** and checks v13 remains visible. An even stronger test changes story ID while a previous response is in flight and checks no A data appears under B, *including the transition before B resolves*. These tests target different failure mechanisms.

### Property-based and model-based approaches

Use property-based generation when an invariant should hold for many inputs (monotonic fictional time, nonnegative balances, parse/serialize symmetry, idempotent no-op). A simple state machine model can generate sequences such as admit → interrupt → retry → settle → duplicate signal.

**When they earn their cost:** inputs/state space large and rules pure or easily simulated. Avoid building an entire generative testing framework for a stable function with three meaningful cases. Seed runs, shrink failing cases and retain a small regression fixture.

## 4. Test doubles, contracts and real dependencies

A test double is valuable when it replaces an **external system** while preserving the relevant observed contract. It is dangerous when it fakes the exact behavior that must be proved.

| Substitute | Suitable use | Trap |
| --- | --- | --- |
| Pure injected clock/ID/random draw | Deterministic time, IDs and outcomes | Accidentally bypasses real commit/order logic |
| Fake provider transport | Billing/timeout/admission logic without paying | Fake always responds synchronously or with perfect metadata |
| Mock API response in component | Rendering controlled loading/error/race cases | Doesn't prove API authorization or migration correctness |
| In-memory repository | Pure application branching and simple commands | Cannot prove SQL locking, constraints or transaction isolation |
| Real disposable DB | Transaction and query behavior | Must be isolated, reset safely, and never point to user data |
| Recorded browser fixture | Regression in stable visible behavior | Can become a test of stale expected HTML rather than UX |
| Consumer contract double | Verify interactions and shape across independent clients | Shared wrong assumptions in contract producer and consumer |

**Mocking paradox:** suppose API and client tests both use a mock claiming a reservation is confirmed immediately, while the real API only enqueues it. Both suites pass and the product lies. At least one test must cross the real producer boundary or explicitly assert the pending semantics from the technical contract.

**Contract testing:** schema validation detects a class of breaking wire changes. Consumer-driven expectations and server-side checks detect semantics consumers actually depend upon. Pair them with privacy/ownership tests for what the schema permits but shouldn't reveal.

## 5. Concurrency, fault injection and sequence coverage

A race test needs control of the critical ordering; sleeping a random duration is not a reliable strategy.

### Deliberate event schedule

§T0§: two operations hold the same expected version.
§T1§: A commits.
§T2§: B attempts stale commit.
§T3§: assert only one accepted effect and B observes conflict/original result.

Test the **persisted receipt and public projection**, not merely the number of calls to a fake function.

### Durability timeline for external effects

| Cut point | What can be true? | Discriminating check |
| --- | --- | --- |
| Before durable intent | No accepted operation exists | Must not call provider |
| Intent committed, before dispatch | Retry may safely resume under same identity | No duplicated intent/reservation |
| After dispatch, before response | External effect might have happened | Preserve uncertain state; don't blindly resend |
| Response persisted, before publication | Provider work needn't repeat | Reuse saved result under new authority check |
| Publication committed, before ack | Delivery/worker can repeat | No duplicate passage/time/reward |
| Cancellation while work is in flight | Old worker may complete late | Revision/fence prevents stale publication |

**Important distinction:** deterministic fault injection is a design skill, not a request for global chaos testing. Inject failure at the *actual point of no return*. Use temporary/dedicated DB and fake provider; no live spend by default.

### Test execution economics

Run focused tests for the changed seam first. Broader integration may be justified after cross-package changes; a test that resets the disposable database is a side-effecting operation, not a free compile. Record exact environment, scripts, commands and output, including failures. A failing pre-existing test shouldn't be “fixed” by weakening its assertion without identifying whether it encodes a real contract.

## 6. Browser E2E, accessibility and flaky tests

[Playwright's official guidance](https://playwright.dev/docs/best-practices) emphasizes **user-visible behavior** and **isolated tests**. Test through accessible roles/labels and observable outcomes rather than CSS class names or DOM internals where possible.

### Useful browser coverage

- Navigation and authenticated session lifecycle.
- User input and error handling, including keyboard/focus.
- Loading → accepted → pending → settled, with correct copy and affordances.
- Out-of-order responses, slow server and refresh/re-entry.
- Narrow/mobile layout and long/empty content.
- Accessibility basics, not only screenshots.
- A small number of essential cross-service journeys.

### What causes flakiness?

| Symptom | Candidate mechanism | Evidence to collect |
| --- | --- | --- |
| Element sometimes absent | App not ready, conditional state, wrong URL/session, stale selector | Trace, screenshot, network and route context |
| Passes locally, fails in CI | Timing, resource contention, timezone, browser install, DB state | Environment and deterministic repro |
| Only fails after other tests | Shared cookies/storage/DB, order dependence | Run isolated/reversed order |
| Repeated retries make it pass | Real race, missing wait on observable condition | Controlled response ordering, trace |
| Fixed sleep “solves” it | Wait masking missing condition | Wait for expected UI/network state, not seconds |

Do not rewrite a real bug as a flaky test. Rerunning may gather evidence but doesn't prove correct behavior. Distinguish a **test infrastructure defect** from a **product defect** and route to the right owner.

**Visual evidence is separate:** a screenshot confirms pixels for a viewport; it doesn't prove keyboard, state authority or screen-reader announcements. Human design acceptance may still be required.

## 7. Coverage, statistics and nondeterministic components

**Coverage % measures exercised code, not meaningful assertions.** High line coverage can coexist with missing permissions, concurrency, invalid states and incorrect domain semantics.

Useful techniques:
- **Branch/condition coverage** to locate untested decisions.
- **Mutation testing** to ask whether tests reject a deliberately wrong implementation.
- **Pairwise/risk-based selection** to reduce combination explosion.
- **Regression seeds** for a once-observed tricky ordering.
- **Holdout scenarios** for AI systems to avoid overfitting prompts/judges to the development examples.

### Evaluating nondeterministic AI without pretending certainty

Split **hard constraints** (schema, authorized tool use, cost ceilings, source provenance, no wrong owner, one reward) from **graded qualities** (narrative taste, relevance, usefulness, fluency). Deterministic graders should enforce hard facts when possible; model-judge results require calibration and awareness of position/style bias.

A single successful generated turn is not an overall success rate. A few trials cannot certify rare failure probability. Track observed sample sizes, source/campaign identities, current vs historical packet and whether a later step actually consumed accepted evidence.

A result can be coherent but rejected by semantic admission; a retrieved document can be relevant but omitted from the final packed model context. **Test the pipeline stage you claim.**

Deep: [study: evaluating nondeterministic software](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/AI/AI410-agentic-ai-systems/AI410-L06-evaluating-nondeterministic-software.md).

## 8. Risk-weighted proof plan and evidence receipt

The test strategist should return a small matrix:

| Claim | Failure mechanism | Minimum useful test | Required owner/dependency | Side effect / cost |
| --- | --- | --- | --- | --- |
| One action effect per intent | Duplicate worker delivery | Same operation twice, assert one durable receipt | Application/DB | Disposable DB |
| UI never regresses | Stale response ordering | Resolve v13 then v12 | Frontend transport/state | Provider-free |
| No private plan leak | Public projection mismatch | Authenticated public API response excludes private fields | Contracts/API | Local composition |
| Long-term recall actually happens | Packed evidence omitted | Capture final model-visible source and accepted later reference | Memory admission | Provider-free probe first, separately authorized live proof |

**Reviewer's job:** ask *which plausible wrong implementation still passes this plan?* If there's an obvious answer, strengthen one or two tests instead of adding 40 redundant cases.

**Local evidence routes:** [engineering QA](../../docs/engineering/qa-journeys.md), [code-navigation](../../docs/engineering/code-navigation.md), [integration workspace](../../tools/api-integration/README.md), [verification rule](../rules/verification.md), [connected proof](../../docs/engineering/connected-poc-proof.md).

**Primary references:** [Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html), [Playwright best practices](https://playwright.dev/docs/best-practices). **Deeper study:** [frontend testing and reliability](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE240-frontend-engineering/SE240-L06-testing-and-reliability-in-the-frontend.md), [evaluation of AI software](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/AI/AI410-agentic-ai-systems/AI410-L06-evaluating-nondeterministic-software.md), [business workflow design](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS430-distributed-systems/CS430-L05-designing-reliable-business-workflows.md).

**Boundary:** This is methodology for choosing evidence, not permission to write tests, start servers, reset DB, browse production or call external models. The selected role and approved task govern those actions.
