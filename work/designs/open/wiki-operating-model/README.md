# Wiki operating model | authoritative meaning, cheap retrieval and verified content

**State:** proposed decision/design packet for owner selection. Written after WIKI04/WIKI05. **Not an accepted product policy or a selected executable Change.** No gameplay source, current documentation or agent rules are changed by this proposal.

**Inspected GitHub baseline:** `main@91c28452070c98627656fa633bde74cce24a6241`, 2026-11-16. The user reported WIKI04/WIKI05 locally completed; the same implementation and archive receipts are now visible on GitHub. Our review is source/document inspection, not a local run of benchmarks or a fresh agent experiment.

## The central decision

**Treat `docs/` as the current *ratified knowledge* about the desired product and selected technical constraints, not a chronological implementation diary or a speculative feature backlog.** The wiki's goal is to let a new contributor safely answer an engineering question and navigate to deeper proof *without* preloading hundreds of thousands of tokens.

*Accepted future design is current ratified knowledge, even if the code does not implement it yet.* Keep it in the wiki and link to source status separately. *Unaccepted design* belongs in a named open proposal, not the normative wiki merely because a folder was created. *Actual implementation proof* belongs in source, `STATUS.md` and dated evidence, not in the aspirational product constitution. *Historical Changes* remain permanently archived and cannot authorize new work.

This prevents the two symmetric failures:
- If code is the wiki, experimental/vibecoded behavior rewrites the product vision and long-term direction vanishes.
- If every possible future plan is the wiki, weak models mistake a speculative proposal for a binding architecture.

## Read this design by problem

| Question | Owner |
| --- | --- |
| What belongs in `docs/` today, what gets promoted, and how does a Change interact with it? | [Truth, admission and Change lifecycle](TRUTH-AND-LIFECYCLE.md) |
| How does a cheap Cursor agent locate the right heading and stop reading? | [Retrieval protocol and agent interfaces](AGENT-RETRIEVAL.md) |
| Which specific pages contain demonstrated stale, bloated or authority-confusing content? | [Evidence-based content audit](CONTENT-AUDIT.md) |
| How do we benchmark *correctness*, answerability and source agreement rather than just links? | [Quality benchmarks and independent experiments](QUALITY-AND-EXPERIMENTS.md) |
| Which alternatives did we consider, what do we recommend, and what needs owner ratification? | [Proposed decision register](DECISIONS.md) |

## Implementation sequence after owner adoption

1. [WIKI06: authority and Change lifecycle](../../../changes/open/2026-11-16--wiki06-knowledge-lifecycle/CHANGE.md). Tightens existing agent rules/Change template, adds a small mechanical reconciliation guard and makes ratification and status independent. **Code-bearing Change; no automatic product ratification.**
2. [WIKI07: context-efficient retrieval](../../../changes/open/2026-11-16--wiki07-retrieval-by-heading/CHANGE.md). Adds deterministic question→page/heading discovery and section-range reading with explicit cost/stop metadata. Changes existing rules minimally; no LLM providers.
3. [WIKI08: content-quality instrumentation and repair](../../../changes/open/2026-11-16--wiki08-content-quality-gates/CHANGE.md). Adds content lint and reviewed falsification cases; repairs a **named, limited** set of stale pages, then outputs an honest broader remediation inventory. Not another taxonomy rewrite.

Each packet is **Proposed, not selected**. Execute sequentially after the owner asks. Do not mark WIKI08 Done until high-risk factual discrepancies are repaired or explicitly blocked with an owner gate. WIKI06–08 do not authorize a live agent pilot or provider spend.

## Existing good work we retain

- WIKI01 graph/anchors/BFS/role classification, WIKI02 retrieval/Hopper, WIKI03 fake agent harness and WIKI04/05 fixes remain the foundation, not things to rewrite.
- 74/74 current canonical pages are reachable per Cursor's WIKI04 measurement; WIKI05 correctly separates complete-answer score, owner recall and first-hit MRR. **None proves content is correct.**
- Existing `AGENTS.md` is short. `.agents/rules/documentation.md`, `.agents/references/documentation-navigation-standard.md` and `.agents/skills/documentation-reconciliation/SKILL.md` already contain valid layering and change-close principles. Refine their **triggered clauses**, do not replicate them in a new mandatory 15-KB startup file.
- Full terminal `work/changes/archive/` is sacrosanct; preserve each existing packet unchanged. Previous specs and handoffs removed from HEAD stay in Git history, not a new “retained design” collection.
- User controls product decisions and paid/provider actions. No benchmark green score or agent confidence silently substitutes for acceptance.

## What success looks like

A weak implementation agent handed one small Change should: find the correct product and technical *section*, distinguish selected target from real source, read only relevant source symbols/tests, implement, record actual results and reconcile wiki/status without inventing product policy. A stronger architect may read deeper where there is a genuine design dispute. Both should reject a tempting archived plan as current authority.

We measure first correct owner/section, actual content consumed (if observable), task correctness, time/calls, contradictory claims and unreviewed permissions. **The principal outcome is fewer wrong implementations and less wasted context, not prettier Markdown.**

This is an operating model proposal, not a product implementation. Nothing here authorizes deleting selected future architecture because code is incomplete.
