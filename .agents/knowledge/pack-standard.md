# Standard for engineering knowledge packs and role proof obligations

**Why:** Strong coding models often deliver an 80%-good _first reasonable answer_ without retrieving the full professional design landscape. A knowledge pack must activate the concepts, alternatives, selection criteria, interacting factors, methods and trade-offs that experienced engineers bring to the problem **before proposing the design**. Edge cases and failures are an essential part, not the whole purpose. The goal is a conditional, well-defended recommendation, not maximal pessimism or checklist compliance.

## A professional manual must activate design judgment

Every consequential domain should teach **more than how things fail**:

| Dimension                   | Material to include                                                           | Why it changes what an agent recommends                                   |
| --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Mental model                | What the technology really does, which state/authority it owns                | Prevents using the tool as a magical abstraction                          |
| Design space                | The realistic families of approaches, including doing less                    | Stops defaulting to whichever pattern appears most often in training data |
| Selection criteria          | Workload, scale, latency, consistency, cost, team, framework, reversibility   | Explains **when** each approach is justified, not just what it is         |
| Mechanics                   | Lifecycles, APIs, ordering, data flow, examples and interactions              | Makes a chosen design actionable instead of architectural poetry          |
| Cross-disciplinary effects  | Caching vs privacy, async vs UX, storage vs migrations, networking vs retries | Exposes constraints that a single-role specialist might overlook          |
| Evolution                   | Maintenance, upgrades, observability, operational burden and migration        | Prevents optimizing only for the first code generation                    |
| Failure and counterexamples | Non-obvious race, security, correctness and performance mechanisms            | Distinguishes a viable proposal from a superficially good one             |
| Evidence                    | Experiments/tests and observations that would change confidence               | Avoids model consensus masquerading as truth                              |

**Do not demand all eight as a form on every task.** The manual contains the reasoning; the role uses only what can materially change the current decision.

An especially useful structure is **options → decision axes → provisional recommendation → changed-constraint counterexample**. The agent should ask only the important missing questions. Under uncertainty, rank alternatives conditionally instead of returning an endless questionnaire or a single universal pattern.

## A good pack is a working mental model

A mature pack should answer, in this order:

1. **Trigger and boundaries.** Which role and decision will be improved? Which neighboring concern belongs elsewhere? No unnecessary loading.
2. **Design space and purpose.** Which approaches exist, why were they created, and which workloads/organizations/quality goals favor them? Include the credible minimal/no-new-infrastructure option.
3. **Authority, mechanics and interaction.** What actually owns state and lifetimes? How do the components work and connect? Which distinctions change the design? Explain a representative flow.
4. **Selection criteria and trade-offs.** Explain why alternatives win under different constraints, plus performance, maintainability, security, operations and evolution costs.
5. **Counterexamples and second-order effects.** Cases where a reasonable choice loses after a factor changes, including the hidden failure, operating cost or architecture interaction. Include one that defeats the _obvious fix_.
6. **Proof obligations.** A minimal adversarial fixture, failure injection or browser observation that would actually distinguish correct from wrong. State what the evidence _doesn't_ establish.
7. **Project integration.** Link to the relevant Offscreen RPG product/technical owner and actual package entrypoints, without copying that entire authority into a second place.
8. **Primary/deep references.** Link to official installed-version docs and the author's [study corpus](https://github.com/DenisSkulovic/the-modern-software-engineer) for optional depth, with a short description of what to seek.

Each long document should have a small in-page route. Use Markdown headings/tables/case studies over gigantic undifferentiated prose. Do not turn a 100KB lecture into a 100KB always-on skill.

## Design-stage knowledge receipt

When a role finishes consequential **design**, expect a small artifact:

| Question                                        | Required answer                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| What must be preserved?                         | Product outcome and authoritative invariant, named at the owning spec           |
| Where is the decision made?                     | Identity, owner, lifetime, transaction/operation or UI state                    |
| What can go wrong?                              | Plausible event timeline with two competing actors/requests or an invalid input |
| What solutions were considered?                 | At least one credible alternative, with constraints and complexity cost         |
| What observable test would reject a bad design? | Precise event ordering, negative assertion, owner/tenant or version distinction |
| What remains unknown?                           | Gap requiring further source inspection or human approval                       |

This is a **quality gate on thinking**, not a full form to append to every agent response. The final Cursor handoff carries just the approved conclusions and necessary verification.

## Independent reviewer obligations

The reviewer should not accept `the author already checked races` as evidence. Instead:

1. Identify the risk surface; choose one domain manual.
2. Construct a **different** failure scenario from the author's happy path.
3. Determine whether the design's protection acts at the **correct boundary** (UI render vs server write, SQL row vs absent predicate, delivery vs business effect, provider timeout vs committed external state).
4. Compare the design's guarantees with the authorized product/technical contract and actual implementation.
5. Report a specific finding or reasoned no-finding with a source anchor and discriminating test.

An independent review is useful when it could change a decision; five identical agent opinions with no novel counterexample are not independent evidence.

## Test strategist obligations

Start from the product/technical contract, not tests that already pass. For each material risk, design a test that **would fail** if a likely faulty implementation were used. Include event order and authority expectations.

| Evidence type                | What it can establish                                                   | What it cannot establish alone                               |
| ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| Pure unit test               | Deterministic rule/function behavior                                    | SQL locking, browser rendering, actual external retry safety |
| DB integration with overlap  | Rows, constraints and transaction interleavings under real isolation    | External provider finality unless protocol simulated         |
| Browser/UI test              | Actual user-visible state and interaction against a fixture             | Unseen backend authorization or real model narrative quality |
| Fault-injected workflow test | Retry/duplicate/crash boundaries exercised under controlled assumptions | All production timing or an unknown provider's billing       |
| Human visual/play acceptance | Perceived hierarchy, feel, pacing, usability in observed cases          | Exhaustive behavior or multi-user concurrency                |

## Anti-patterns in skill/knowledge authoring

- **Checklist theater:** "ensure idempotency, concurrency, security" without specifying identities, conflicting events and proof cases.
- **Unconditional context tax:** require every agent to ingest React, SQL, networking and security manuals before changing CSS.
- **Lore duplication:** copy technical design decisions into the skill, then let the two conflict.
- **Stale version certainty:** quote API conventions from a different framework version and declare them universally correct.
- **False guarantees:** "AbortController cancels every server side-effect"; "transaction means no race"; "two agent reviews mean correct."
- **Scaffolding sprawl:** one file for every buzzword, or five deep references behind a chain of index files. Put selected references one hop from the triggered skill.
- **High-level QA without falsification:** assert the component rendered rather than test a stale A response arriving after B or a duplicate request after a commit.

## Maintenance and evaluation

For each documented failure case, ask: did agents using the pack **notice it before implementation**? Did the pack cause an irrelevant design detour? Were file reads, token usage and human corrections lower at comparable task scope? If unknown, report unknown.

Measure knowledge coverage by **important alternatives considered correctly, constraints recognized, justified selections and failure classes anticipated**, not the number of pages or skills. The [scenario lab](scenario-lab.md) contains read-only exercises to evaluate this without touching game code or spending model-provider credit.

Research base: [Anthropic skill best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), [Anthropic context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents), and [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/).
