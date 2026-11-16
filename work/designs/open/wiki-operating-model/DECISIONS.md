# Proposed wiki governance decisions | owner review

**State:** RECOMMENDED, NOT YET RATIFIED. Do not copy these into `docs/decisions/` as accepted ADRs until the owner approves the operating policy or selects WIKI06 to ratify/implement it. WIKI06 can create a compact `D-0003`-style adopted decision if expressly authorized; do not backfill fake historical dates.

## D1. What is the canonical wiki actually for?

**Recommendation: a wiki of *currently ratified intent*, not a mirror of current source and not a backlog of possible futures.**

Alternatives:
- **Only implemented features:** simple to explain but destroys design-first method and makes vibecoded artifacts dictate product.
- **Every future proposal in wiki:** comprehensive but turns all speculation into apparent authority. This is the present Observability trap.
- **Ratified product + selected technical guarantees; reality in STATUS/source:** preserves both vision and factual honesty with small explicit handoffs. **Choose this.**

Acceptance example: selected long-term Storyteller loop stays in technical wiki even if today's task is one-shot. Unapproved default action when absent remains outside product canon.

## D2. How do proposed ideas interact with the wiki?

**Recommendation:** open-topic proposals are nonnormative. On explicit owner ratification, promote specific clauses into product then selected technical owner at once, **even before any code work**. The original proposal can remain only as a focused unresolved gate, or be retired to Git when fully decided.

A proposal-only file under `docs/technical` is not acceptable merely because the directory structure once named it. Reclassify after reading selected clauses. No wholesale deletion without no-loss reconciliation. An active Change packet is execution planning, never independent product permission.

Open owner decisions: which Observability source-capture invariants have actually been selected, and whether the Grafana/OTel stack is an accepted engineering target or only a recommendation. Default if no decision: **remain proposed**, and an agent must not implement.

## D3. When does an implementation Change update wiki?

**Recommendation: product/technical selected contracts are updated when the *decision* changes; STATUS/source/test evidence when *implementation* changes. Both are part of one done-checked Change.** This is more precise than “docs and code always change together” because touching a product page merely to report a passing test can create drift.

Before Change: references ratified owners and planned diff. During Change: implement approved scope and exact tests. Before Done: ledger proves selected target unchanged/changed, source actuality updated, evidence tier correct, link/owner route and negative case valid. If coding reveals contract error, block/escalate, never silently amend product law to match implementation.

Open owner decision: how strict should automated enforcement be? **Recommend** hard gate for missing/empty reconciliation fields in a **selected code-bearing Change**, advisory warnings for absent uncertain indirect owners, no forced docs edits on inert refactors. Avoid a repo-global AI “docs accuracy confirmed” checkbox.

## D4. What should an agent read?

**Recommendation:** work-selected Change → exact product/technical heading(s) → nearest source README and named symbols → required proof. For unknown task, one short index/locator and a bounded excerpt first. Stop after the relevant question is resolved.

Do not always load whole `AGENTS.md`+`HARNESS.md`+all skills+all product docs. Big-context Claude agents and cheap Cursor agents follow the same safety/routing discipline; optional larger context serves *necessary cross-domain reasoning*. Tokens saved are a consequence of avoiding wrong investigations, not trimming hard guarantees.

## D5. What page structure is required?

**Recommendation:** one question/authority owner per coherent document. High-traffic or long pages offer “owns / does not own / current status link / question→heading map” within the first screen. Body contains precise selected principles, one useful example and discriminating negative case where appropriate. Avoid serialized implementation histories, DOC01 archaeological intros, arbitrary 3-KB fragment sprawl, duplicate passages, generated full-file summaries and global boilerplate headers.

One technical page may be 60 KB if coherent. A 17-KB H2 with no narrower route should generate **retrieval friction warnings**; split into H3 if helpful, not into new documents merely to make the file size look green.

## D6. What benchmark constitutes trustworthy documentation?

**Recommendation:** four separate reports: structure, findability, sampled content truth and fresh-agent correct outcomes. No single “wiki health = 94%”. Critical permission/financial/authority false claim fails its audited slice irrespective of aggregate link metrics.

Start with cheap deterministic checks and 30 claim-level source/decision tests. Real agent trials are separately owner approved, in isolated contexts, with independent grading and observed event traces. No model-driven auto rewriting on the basis of a quality score.

## D7. What to do with past features and historical text?

**Recommendation:** preserve currently binding compatibility and rejection constraints in wiki; move obsolete rollout/status diaries to `STATUS` (for current evidence), dated evidence or full completed Change archive (for history). Superseded selected decisions remain recoverable in Git and optionally ADR with explicit supersession status.

Wikipedia's notion of a “current article” is useful, but software is versioned. Historical state may remain operationally *binding* (e.g. recovery of old tasks) and thus cannot be erased merely because it happened earlier. The test is **present obligation**, not age.

## D8. Should the wiki create execution instructions automatically?

**Recommendation: no.** Automatic route/index tools may return exact excerpts and links. They must not infer that a proposal is approved, that a file is deployed, or that model usage is permitted. An agent proposes a Change only after reading real authority and user scope, and execution requires selected Change + independent spending/production permissions.

## What the user needs to approve

Adopt D1–D8 as the preferred wiki operating model, with the two specific Observability selection questions left unratified pending a content-level decision. That authorizes **design/governance direction**, not gameplay feature implementation. Selecting WIKI06 authorizes agent-rule/checker improvements; selecting WIKI07 authorizes retrieval tooling; selecting WIKI08 authorizes bounded content repair and quality checks. No live model experiment, AWS/DB reset or provider spend is hidden in these decisions.

**If the user disagrees specifically with D1 (“wiki only implemented truth”), the design requires a deliberate redecision**, because that would overturn the project's product-bible principle and invalidate the present long-term selected technical documentation. Do not let an implementer make that philosophy change from a vague prompt.
