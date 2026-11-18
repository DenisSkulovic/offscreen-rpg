# Editorial design standard | make canonical text useful at the point of decision

**Status:** Proposed editorial standard for this workstream; not an existing accepted repository rule. **Scope:** human-readable product and technical wiki contents, not code tooling and not a replacement for existing document authority or the Change workflow.

## One paragraph, one job

Each article should tell a reader:
1. **What the article owns** and the reader question it answers;
2. **what is selected/ratified** versus still a proposal or illustrative scenario;
3. **why** the decision exists, using its motivating failure or tradeoff;
4. **how** it behaves at normal and adversarial boundaries;
5. **which exact dependent claim** would need review if it changes;
6. **what is demonstrated today**, only where a concise realization note is necessary, with a source/evidence link.

Not every paragraph needs six labeled subsections. The heading should lead to the governing claim, and detail should follow in a way that supports reading one heading at a time.

## Authority vocabulary (do not silently promote a phrase)

| Concept | Intended editorial use | What it must not imply |
| --- | --- | --- |
| **Selected / ratified product requirement** | Governs intended player/operator behavior even if not built | Not a claim code is complete or that every proposal in the same file was accepted |
| **Selected technical target** | Governs implementation design subordinate to product authority | Not an implementation permission or successful test |
| **Implemented and evidenced** | A factual source-revision/test receipt with coverage and limit | Not proof of sustained quality, production deployment or human usability |
| **Proposed / conditional** | Decision or architecture not yet accepted; identify prerequisite | Not a mandatory Change acceptance test or production grant |
| **Illustrative scenario** | Explores the experience and probes an edge case, with assumed choices | Not a commitment to its particular setting, numbers or unresolved multiplayer rule |
| **Deferred / excluded** | Explicit non-scope for a specified target/slice, with owner route | Not permanent prohibition or a reason to delete durable product ambition |
| **Unknown / contradictory** | Exact unresolved claim, sources and owner needed to settle it | Never silently rewritten into whichever version matches current code |

A page may legitimately contain selected and proposed sections. Put the authority qualifier **beside the exact heading, table or claim**, not just in the first paragraph. One proposed subsection must not contaminate the selected portions, and a selected page title must not ratify its proposed appendix.

**Modal words:** “must” for a chosen binding invariant; “must not” for a prohibition; “may” for permitted choice rather than inferred production permission; “should” only for an explicitly nonbinding recommendation; “target” for accepted future behavior only when its acceptance status is stated. Editing modal words is a **normative change** unless the old/new equivalence is proven.

## Product page writing

Start with the player/staff-facing **promise and causal scenario**, not a class diagram or ticket chronology. State agency, feedback, consequence, unacceptable surprise, and non-goals. Explain why the experience matters. For complex gameplay, pair a normal sequence with a distinguishing negative where another plausible implementation would violate the promise.

A product rule can mention a technical implementation to clarify feasibility, but it **does not delegate authority to code**. Prefer:
- “A player who merely leaves the tab does not authorize a new action; [time and autonomy](../../../../docs/product/gameplay/time-and-autonomy.md#pace) governs the accepted-work boundary.”
- Not “The Temporal worker keeps ticking while the tab closes,” which confuses mechanism and permission.

Separate **what the player gets** from **how the application currently happens to do it**. Project/portfolio/business delivery goals can remain in a concise product/strategy purpose section where relevant, but a dated Wxx/ENGxx implementation ledger belongs in STATUS/Change evidence/source maps.

## Technical page writing

Prefer claim-led sections, not chronology-led paragraphs:
- **Contract:** exact invariant, owner, inputs, outputs, time/revision coordinate;
- **Rationale:** which failure this design prevents, and why rejected alternatives lose;
- **Normal trace:** one concrete state transition with relevant IDs/quantities;
- **Negative trace:** stale/duplicate/unknown/unauthorized/late/error path and what must not happen;
- **Dependency:** linked product or technical governing claim and why changing it forces review;
- **Realization boundary:** selected but not implemented, or actual proof at named source revision, only when critical to use.

Tables are useful for comparing genuinely different semantics, not for hiding all important prose in tiny cells. Keep precise formulas/schemas, transaction fences, serialization, idempotency identity and time units when the contract needs them. Explain any abbreviation at first use and give a direct route to authoritative types rather than inventing a second schema transcription.

## How to handle a long article

Do not split by an arbitrary word quota. Split when at least two of these diverge:
- what owns the truth and who ratifies it;
- how frequently the content changes;
- which reader/task needs it;
- its evidence/test proof;
- its visibility or security class;
- its retrieval and affected-claim graph neighborhood.

A document that is 8,000 words but answers one coherent question with well-structured headings may stay. A 900-word page that mixes product authorization and code release notes may need separation.

Before splitting, inventory **all inbound paths and heading anchors**, choose stable new owners and replacement links, preserve unique decisions, and update hubs and exact inline references in one editorial batch. Historical citations must retain their original meaning. No link-stub pages that repeat the whole new content.

## Cross-references at the claim, not merely at the top

When a sentence depends on another selected claim, link to its **exact heading** in the sentence or an adjacent small “Contract dependencies” section. Add one line explaining the *consequence* of changed upstream behavior. Preserve the dependency's direction (technical constrained by product; not product ruled by technical). Plain “related reading” and example/evidence links must not become blocking impact edges.

Bad: “Related: calendars, engine, Storyteller.”  
Better: “The activity's next eligible boundary uses the [accepted clock and hold rule](../../../../docs/technical/engine/chronology-and-activities.md#permission-to-advance); changing that rule requires rerunning the interrupted-work and deadline trace.”

Do not turn natural prose into blue link soup, add a minimum number of links, or link a proposal as though it were ratified.

## No fake fact expansion

Avoid turning intuitive aims into unsupported numerical thresholds. “Meaningful choice,” “natural rhythm” and “quality of life” need falsifying examples or evaluation conditions; not an invented percentage, response time or production SLO. A page should distinguish **quantitative rule (ratified)**, **illustrative number**, **proposed test target** and **actually measured result**.

The Storyteller-quality contract particularly needs:
- repeated interactions across a long-lived campaign, not one beautiful first scene;
- return after absent days with exact relationship/object evidence;
- normal quiet intervals in which no model output is the right outcome;
- creative direction that adapts when player choice invalidates an old plan;
- no invented canon, mechanics, private knowledge, actor choices or unjustified provider spend;
- multiple stylistic profiles demonstrating *different* commitments rather than all converging to a generic drama curve.

These are evaluation-scenario families, not claims existing live trials already passed.

## Writing craft and anti-slop test

Before retaining a sentence, ask:
- What decision, behavior, exception, evidence or tradeoff does it add?
- Is its main noun a defined game concept or a decorative synonym?
- Does “this,” “it,” “current,” “selected,” or “the model” have one unambiguous referent?
- Is it exactly testable, or intentionally expressive as vision?
- Does it quietly repeat an upstream rule without linking back?
- Is this true at the current source revision, a selected target, or a future concept?
- Can a fresh agent quote *only this section* to implement the right behavior without smuggling in a different authority?

Delete vague slogans, not essential complexity. Avoid overusing “must” to make weak statements sound authoritative. Avoid consultant language, redundant negative disclaimers, version-laden sentence trains and invented certainty. Prefer strong examples with honest limits.

## Mandatory review receipt for each editorial batch

1. Before: exact file#heading and what is wrong (ambiguity, contradiction, hidden boundary, duplicate rule, orphan, misleading status, etc.).
2. Authority: product owner, selected technical target, implementation proof, proposal, or illustrative benchmark.
3. Edit classification: **meaning-preserving copy edit**, **structural relocation with exact semantic preservation**, **factual status reconciliation**, or **normative decision requiring approval**.
4. After: precise changed headings/links and the accepted invariant left intact.
5. Negative: one question/counterexample the rewrite must not get wrong.
6. Closure: link and reverse-impact review, source proof where factual, independent semantic challenge and recorded unresolved questions.

**Stop rule:** if a suggested cleaner sentence changes player permission, mechanic, risk, cost, privacy, shared authority or accepted lifetime semantics, do not merge it as style. Elevate as an explicit owner decision. Likewise, an implementation discrepancy is not repaired by changing product truth to match code.

## Editorial completeness evaluation (separate from graph health)

Held-out task suite covering: factual authority classification, normal/negative outcome, proposal-vs-selected, source realization, cross-page dependent impact and locating exact proof with bounded reads. Compare before/after on the same frozen revision with answers independently keyed by the accepted owners. Report critical omissions, wrong-answer rate, unsupported certainty, number of headings/pages opened, and reviewer-disputed interpretations. Do **not** collapse this into a universal “quality score.”

A passing check means navigation and structural obligations were satisfied. Humans/fresh-agent readers still must confirm semantic equivalence and actual clarity.
