# Standard for engineering knowledge packs and role proof obligations

**Why:** Strong coding models often generate a plausible first design because the omitted edge cases are not in their immediate working set. An expert pack should activate *the mechanism and its consequences*, not merely demand "follow best practices."

## A good pack is a working mental model

A mature pack should answer, in this order:

1. **Trigger and boundaries.** Which role and decision will be improved? Which neighboring concern belongs elsewhere? No unnecessary loading.
2. **Authority and state model.** What owns the truth? What is merely a cache, prediction, suggestion, stale version or external observation? What identities and lifetimes matter?
3. **Mechanistic explanation.** Why would a superficially valid solution fail? Show a specific transition or interleaving, including the state before, the competing actors and the incorrect after-state.
4. **Alternatives and trade-offs.** Explain how two or three strategies differ. They need not all be equally good; a framework recommendation has applicability conditions.
5. **Counterexamples.** Cases where a reasonable-looking proposal fails despite compiling or passing happy-path tests. Include at least one that defeats the *obvious fix*.
6. **Proof obligations.** A minimal adversarial fixture, failure injection or browser observation that would actually distinguish correct from wrong. State what the evidence *doesn't* establish.
7. **Project integration.** Link to the relevant Offscreen RPG product/technical owner and actual package entrypoints, without copying that entire authority into a second place.
8. **Primary/deep references.** Link to official installed-version docs and the author's [study corpus](https://github.com/DenisSkulovic/the-modern-software-engineer) for optional depth, with a short description of what to seek.

Each long document should have a small in-page route. Use Markdown headings/tables/case studies over gigantic undifferentiated prose. Do not turn a 100KB lecture into a 100KB always-on skill.

## Design-stage knowledge receipt

When a role finishes consequential **design**, expect a small artifact:

| Question | Required answer |
| --- | --- |
| What must be preserved? | Product outcome and authoritative invariant, named at the owning spec |
| Where is the decision made? | Identity, owner, lifetime, transaction/operation or UI state |
| What can go wrong? | Plausible event timeline with two competing actors/requests or an invalid input |
| What solutions were considered? | At least one credible alternative, with constraints and complexity cost |
| What observable test would reject a bad design? | Precise event ordering, negative assertion, owner/tenant or version distinction |
| What remains unknown? | Gap requiring further source inspection or human approval |

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

| Evidence type | What it can establish | What it cannot establish alone |
| --- | --- | --- |
| Pure unit test | Deterministic rule/function behavior | SQL locking, browser rendering, actual external retry safety |
| DB integration with overlap | Rows, constraints and transaction interleavings under real isolation | External provider finality unless protocol simulated |
| Browser/UI test | Actual user-visible state and interaction against a fixture | Unseen backend authorization or real model narrative quality |
| Fault-injected workflow test | Retry/duplicate/crash boundaries exercised under controlled assumptions | All production timing or an unknown provider's billing |
| Human visual/play acceptance | Perceived hierarchy, feel, pacing, usability in observed cases | Exhaustive behavior or multi-user concurrency |

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

Measure knowledge coverage by **failure classes anticipated and disproven**, not the number of pages or skills. The [scenario lab](scenario-lab.md) contains read-only exercises to evaluate this without touching game code or spending model-provider credit.

Research base: [Anthropic skill best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), [Anthropic context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents), and [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/).
