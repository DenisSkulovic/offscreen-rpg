# Editorial migration policy | keep the dream, disarm false certainty

## What is wrong with the current "source of truth" model?

`docs/README.md` calls product behavior "the bible" and says technical contracts express what the system must guarantee. This is valuable for deterministic invariants. But the product domain currently mixes owner-approved *aspiration*, narrowed POC targets, speculative mechanisms and precise release constraints, often under "selected". A coding agent can find the right page and still make the wrong product decision. Simply adding "not yet implemented" does not solve it: **a non-implemented feature can be neither viable nor desirable**.

## Two independent axes, not one overloaded status

1. **Authority/disposition:** invariant / selected experience target / conditional target / research hypothesis / illustrative scenario / parked aspiration / rejected. This says what someone is allowed to treat as normative.
2. **Evidence maturity:** owner discussion / design analysis / prototype/source-observed / offline integration tested / paid provider observed / multi-turn human play observed / operationally proved. This says what we know, separately from who wants it.

Keep existing implementation `STATUS.md` tiers. Do not invent a second competing implementation ledger. This additional classification is for **high-impact product claims** only and lives in one table or sections already owned by product docs. A separate `VALIDATED` badge cannot magically turn an idea into reality; it needs test links, dates, quantities and negative observations.

## Five editorial operations, not blanket rewrite

1. **Protect** highly credible invariants in their current product/technical owners. Do not move exact mechanic authority out of code/contract just to soften the vision.
2. **Narrow** grand statements to one proof that can fail. Example: "supports arbitrary worlds" becomes "core data pathways do not assume a humanoid body; a small content pack is the current playable target; rich nonhuman gameplay is unproven."
3. **Rehome** unratified ideas into `work/designs/open/...` or existing domain proposals, with owner and revisit trigger. Do not reproduce competing essays across files.
4. **Retain** scenarios as benchmark *test hypotheses*, with explicit dependency/precondition and a cheap negative test; no story vignette creates a new engine requirement on its own.
5. **Decline** redundant speculation with a durable rationale. Archived decisions belong in `research/` or design records, not executable product and technical owners. No broad physical deletion without preserving rationale and inbound links.

## Front-door warning for agents

Add a short, direct routing statement near the beginning of `docs/README.md` and `docs/product/README.md`, not every product file:

> **Product truth has two questions:** (1) What behavior has the owner selected as a product preference or obligation? (2) Has that behavior been demonstrated as coherent, reliable and affordable? Selection answers only (1). A speculative example, an unimplemented selected target, a proposed policy and a demonstrated playable capability must not be conflated. When a request depends on an ambitious or cross-system mechanic, check `STATUS.md`, the relevant feasibility decision/claim and observed play/cost evidence before creating a Change. If there is no such evidence, propose a bounded test or design decision instead of implementation.

Adjust wording to the repository's style and existing authority rules; preserve `wiki:find` classification (selected is still selected **for its declared type**). Avoid duplicating the entire claim register into front doors.

## First-playable correction, proposed

Have `foundations/vision.md` distinguish:

- **North star:** a character with a lasting life, shared possibilities, rich worlds, creative agency, earned consequences.
- **Solo playability proof:** one bounded actor/story/setting, finite actions and one accepted long activity, no unauthorized choices, one remembered relationship/object, return after restart, priced AI narration and a credible Book reader.
- **Research frontier:** generalizable world materialization, spatial topology, autonomous decisions, long-horizon recall, free-intent breadth, nuanced narrative planning, cross-player consistency, commercially supported inference. Each is conditional rather than silently stacked onto the solo proof.

Do not erase the existing "small-party first-playable ambition" without an explicit owner decision. The recommended correction is to **rename/re-scope it as a later party milestone** while retaining a durable link to its design record. The old shared acceptance is already Proposed/Blocked, so this is editorial alignment rather than an argument that shared code exists.

## Minimum gate for promoting a new complex product promise

The responsible product author answers: What concrete failure is solved? Which invariant conflicts with the proposal? Which state is deterministic versus proposed by the Storyteller? What exact data would the model see? What is the cheapest acceptable operating path? What goes wrong when model budget or recall fails? What short human playthrough would convince the owner this is worth having? If unanswered, label it a hypothesis; *do not write universal MUST language*.

## Mechanical regression prevention without pretending static checks judge dreams

- Extend the existing Change-impact/knowledge-coverage procedure so edited high-impact headings require referencing their corresponding claim/disposition and affected proof. Do not create a global machine-enforced row for every Markdown sentence.
- `wiki:content-health` may flag **review candidates** for new selected claims with no evidence/maturity marker, but should not auto-fail on English words like "dream," "must," or "could." A script cannot validate vision.
- A change that promotes a hypothesis to selected implementation scope must name a vertical-slice acceptance and real resource envelope. The change guard can check required structured fields, not truth itself.
- A change that rejects an idea must preserve the reason and point inbound links to the new disposition.
- A few deliberately adversarial negative documents are essential: illustrative map, archived idea, unimplemented selected contract, source-observed code, negative Cognee research. The index should classify each correctly.

## Suggested quality-of-decision checklist for all major docs

When an agent edits the product or technical bible, its closing summary must say **which claim type changed**, **what evidence was new**, **which source/implementation/status claims stayed unchanged**, **what became unratified or explicitly out of scope**, and **whether this creates a new cost/consent obligation**. The existing WIKI09–17 and HK automation cover change dependency/freshness; this policy adds *meaningful content review*, rather than another link graph.
