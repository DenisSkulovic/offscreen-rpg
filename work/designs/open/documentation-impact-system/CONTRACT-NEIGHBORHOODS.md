# High-risk contract neighborhoods | targeted dependency design

**Status:** Proposed audit/navigation plan, 2026-11-18; assessed against the f3e3bfe lean snapshot. **Not ratification or an instruction to edit game rules.** This is the manually reviewed starting set for semantic link coverage, separate from the WIKI10 parser proof. It records candidate **dependent -> governing** relations and important cases where a page is only proposed. Verify each section and current HEAD again before writing real typed edges.

## Principle

A real wiki does not merely say “there exists another article.” At the *claim that borrows a constraint*, link the governing claim and state the consequence of violating it. The technical dependent may point to its product governor; a product page may provide a helpful technical implementation route without yielding its authority. An implementation-status disagreement is distinct from a normative contract mismatch. A proposal cannot become a governing edge by being linked.

## A. Deliberate time and execution permission | first WIKI10 seed

- **Governing product:** [time and autonomy § Pace](../../../../docs/product/gameplay/time-and-autonomy.md#pace) (selected: no unaccepted clock movement, accepted action owns duration).
- **Dependent technical:** [chronology and activities § Permission to advance](../../../../docs/technical/engine/chronology-and-activities.md#permission-to-advance) (execution gate, holds, future work).
- **Co-review:** [authority and transitions § Chain and idle edges](../../../../docs/technical/engine/authority-and-transitions.md#chain-and-idle-edges) and [ticks and tags](../../../../docs/technical/engine/ticks-and-tags.md) where duration or idle semantics are actually shared.
- **Candidate edge:** technical permission is constrained-by product Pace; a change to the accepted-time invariant requires technical acceptance and negative idle-time proof. Inline link belongs beside the acceptance/idle statement, not just in the first paragraph.
- **Recorded drift, later split at `15a997c7`:** the authority intro had called the deliberate-time correction “prepared but not implemented,” while the chronology intro called the gate implemented. The chronology page now separates the source-observed gate, the named offline tests, and the missing gate unit test. The product pace rule was not rewritten to match source.

## B. Mechanical rolls and supported effects | follow-up content coverage

- **Governing product:** [gameplay rules § Authority split](../../../../docs/product/gameplay/rules.md#authority-split).
- **Dependent technical:** [mechanics and capabilities § Content and authority](../../../../docs/technical/engine/mechanics-and-capabilities.md#content-and-authority).
- **Candidate edge:** technical proposal admission, dice/receipt and item authority are constrained-by product role split. When a rule changes who can roll or grant items, technical effect admission and tests require review.
- **Counterexample:** a technical fixture rename does not imply rewriting product D&D promises; record reviewed unchanged with precise reason.

## C. Storyteller agency vs engine authority | follow-up content coverage

- **Governing product:** [Storyteller behavior § What it must not do](../../../../docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do).
- **Dependent technical:** [prompts and tools § What the prompt must not grant](../../../../docs/technical/storyteller/prompts-and-tools.md#what-the-prompt-must-not-grant) and [controller § Two loops](../../../../docs/technical/storyteller/operation-and-controller.md#two-loops).
- **Candidate edge:** prompt/agent tool rights are constrained-by product refusal of invented mechanics, spending, canon facts and unauthorized actor decisions.
- **Critical status:** prompts/controller are selected long-term targets; no general adaptive multi-round loop is evidenced as landed. An edge cannot transform the future target into current runtime proof.

## D. Stable book UI versus storyteller expression | second WIKI10 seed

- **Governing product:** [visual system § Visual hierarchy and ownership](../../../../docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership) (selected architectural requirement, not accepted final art direction).
- **Dependent selected technical:** [semantic design foundation § Ownership and CSS architecture](../../../../docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture).
- **Candidate edge:** visual semantic roles are constrained-by product separation of immutable reader/system UI from scene-driven decoration. A new scene field cannot recolor errors/selection or change commands.
- **Conditional neighbor:** [scene-direction production](../../../../docs/technical/client/scene-direction-production.md) explicitly withholds automatic provider-writing approval. Treat producer/publishing edges as **conditional proposals**, not proven production dependencies.

## E. Funding and provider work budgets | follow-up content coverage

- **Governing selected technical:** [account usage policy § Distinct authorities](../../../../docs/technical/platform/spending-and-entitlements.md#distinct-authorities), including fail-closed effective policy and separate entitlement/funding/task recipe.
- **Dependent technical:** [request context and cost § Budget accounting](../../../../docs/technical/storyteller/request-context-and-cost.md#budget-accounting).
- **Candidate edge:** model context recipe and operation accounting depend-on captured effective usage/funding policy. Changing admission limits demands review of recipe, reservations and negative provider-spend proof.
- **Scope:** both are technical owners; do not move player entitlement truth into a prompt or a generation-size tuning appendix.

## F. Evidence capture, forensic reads and retention | status-gated follow-up

- **Selected target:** [evidence graph § Core identity graph](../../../../docs/technical/observability/identities-and-evidence.md#2-core-identity-graph), explicitly *not fully implemented*.
- **Proposals, not binding retention policies:** [retention and access § Retention classes](../../../../docs/technical/observability/retention-and-access.md#6-retention-classes-with-explicit-trade-offs) and [investigation and reconstruction](../../../../docs/technical/observability/investigation-and-reconstruction.md), explicitly proposed authorization/read contracts.
- **Conditional relation:** an eventual forensic read must respect captured evidence identity and privacy, but no link may silently ratify proposed raw-AI retention windows, production Support grants or disclosures. First classify accepted decision and data-protection approval; only then add mandatory typed edges. Until then prefer contextual links labelled proposal.
- **Negative:** a new archive citation is evidence/history, not permission to expose raw prompts.

## G. Staff authority | deliberate negative ratification test

- [Admin authority and governance](../../../../docs/product/admin/authority-and-governance.md) explicitly says proposed operating policy, package catalog awaiting owner review and production support-investigator grants absent.
- [Admin topology and authorization](../../../../docs/technical/admin/topology-and-authorization.md) is a technical architecture, not a magic product-policy ratifier. Link the two for discovery but do not declare the *illustrative* product packages binding. A future ratified policy can then be made a governing constraint in the dependent technical heading.
- This case must appear in the WIKI10 parser/QA negative suite. A green typed graph with a falsely ratified permission source would be **worse** than a missing link.

## Execution prioritization

**WIKI10** proves the syntax, parser and two bounded selected neighborhoods (A and D) first. Once WIKI11 supports impact closure, use a **separate focused documentation-only content audit** to cover B, C and E, then consider F/G only after appropriate ratification. That content review is not a fake code-bearing Change unless it actually needs tests/tooling changes. Update the owning technical/product pages through the documentation reconciliation process and use exact section anchors/negative cases; keep the dependent table sparse and meaningful.

## Accuracy controls

Each adopted edge needs source snapshot/reviewer, the governing selected claim, the dependent selected claim, the specific “why a change here risks this” explanation and a negative example that should **not** trigger it. Edges can be removed if real independence is demonstrated. Measure required-claim recall and false-positive review burden per neighborhood, not “number of hyperlinks per page.” A graph with only A/D coverage must honestly report blind spots B/C/E/F/G and cannot call the whole wiki impact-complete.
