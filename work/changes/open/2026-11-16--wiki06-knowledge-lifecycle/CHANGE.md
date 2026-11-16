# WIKI06 | Enforce wiki authority and Change reconciliation

**State: Proposed, not selected.** Code-bearing developer-tooling Change (a small local guard script and deterministic test fixtures, plus focused agent-rule/template updates). **No game runtime, provider/model calls, production actions or new gameplay permissions.**
**Design and proposed owner decisions:** [Wiki operating model](../../../designs/open/wiki-operating-model/README.md), [ratification/lifecycle](../../../designs/open/wiki-operating-model/TRUTH-AND-LIFECYCLE.md), [decision register](../../../designs/open/wiki-operating-model/DECISIONS.md).
**Inspected baseline:** `main@91c28452070c98627656fa633bde74cce24a6241`; recheck actual clean HEAD, Change state and local edits before running.

## Outcome

Make the distinction **selected product/technical truth vs implementation evidence** operational and enforceable. Avoid two opposite errors: (1) Cursor leaves selected wiki silent when code/STATUS changed; (2) Cursor rewrites the selected product goal merely because a vibecoded implementation differs from it.

**Owner choosing WIKI06 constitutes adoption of D1–D8 as this repo's wiki workflow guidance**, but does NOT approve GM07, Support grants, Observability proposal-only topology, or any code outside this packet. If the owner rejects the two-axis model, stop before changing rules and return the decision.

## Current gaps to correct, not new philosophy to invent

Existing `AGENTS.md`, `.agents/rules/documentation.md`, `.agents/references/documentation-navigation-standard.md`, `.agents/skills/change-workflow/SKILL.md` and `.agents/skills/documentation-reconciliation/SKILL.md` already say product beats code, use layered reading and reconcile Docs at Change Done. **Retain these contracts.**

What is missing: a precise **admission gate** distinguishing owner-ratified future target from merely proposed implementation, a consistent impact ledger with evidence-tier classification, and an automated check that detects a shallow “docs updated” checkbox without demanding edits to every page. Update only the existing owners; **no new always-on mega AGENTS document**.

## A. Selected truth admission rule

Agent instructions must describe separate processes:
- **Idea or unaccepted future** → `work/designs/open/<topic>/`. Planning alone does not mutate normative wiki or grant code permission.
- **Explicitly ratified product decision** → owning `docs/product` heading **now**, even before implementation.
- **Selected technical decision** → owning `docs/technical` heading after product meaning; ADR in `docs/decisions` if material; no false implementation claim.
- **Source/test/realization changed** → `STATUS.md`, current source README and evidence. If selected contract itself remains unchanged, record `unchanged with reason` instead of copying an implementation diary into the canon.
- **Unaccepted feature in canonical docs** → named authorisation conflict/owner gate; location does not ratify a proposal. Move/reclassify only after no-loss content review, not by heuristic regex.
- **Prior code differs from owner-approved intent** → report mismatch and negative case, stop unauthorized step; never silently rewrite product specification.

Keep canonical documentation current as a **ratified design**, not as a version-by-version list of landed work. Terminal Change archive remains intact.

## B. Change packet reconciliation protocol

Update the code-bearing Change template and skill to use a compact affected-claim table:

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |

Each executed code-bearing Change must have:
1. At least one selected contract owner or explicit `no product/technical behavior impacted` rationale for pure internal tooling.
2. At least one inspected source boundary; exact scope/tests and changed source paths.
3. Actual `STATUS`/source map update if source behavior, symbol ownership or evidence tier changed; not mandatory for a harmless formatting/build tooling edit when no claim changes.
4. Falsifiable negative/rollback behavior and actual check result or honest not-run.
5. A concrete reason for `unchanged` wiki heading, rather than “not needed.”
6. A blocker when the attempted code conflicts with an accepted product constraint.

The ledger does not need every unrelated wiki page or repeated paragraphs; its purpose is to make **affected assertions** reviewable and cheap.

## C. Small deterministic guard (new executable code)

Add `scripts/repo-tools/wiki-change-guard.mjs` and tests, expose `pnpm wiki:change-guard`. Suggested modes:

```bash
pnpm wiki:change-guard --mode plan --change work/changes/open/<leaf>
pnpm wiki:change-guard --mode close --change work/changes/open/<leaf> --base <git-sha>
pnpm wiki:change-guard --self-test
```

- **Plan mode:** check correct Change path, title/state, owner references, negative proof, planned code/test delta, product-decision gate. This is advisory for a Proposed packet, does not select a Change.
- **Close mode:** parse declared affected-claim ledger with required columns/status, validate linked paths and heading fragments using WIKI01 parser/graph, ensure affected code delta exists for a code-bearing Change, compare actual diff vs declared source owner paths, check that tests/source-status claims are not blank and distinguish `not run`. Be lenient for scope exceptions with substantive reason; never infer all runtime facts from code text.
- **Do not mechanically decide** whether a selected product rule was violated; report `needs independent owner review`, not false success. Do not demand a changed product wiki file just because code changed while selected target remains identical.
- No change selection? `Current change: none` is valid; the checker should report `no selected Change` rather than inventing one.
- Safe default read-only; no file content mutation, shell arbitrary execution, model calls or paid providers. All failures print file, line, field and why. 
- Actual template path must be discovered from `.agents/skills/change-workflow/assets/CHANGE.md` (or current equivalent) before editing; do not invent a parallel Change schema unrelated to the repo.

## D. Source-of-truth and anti-history tests

Fix the stale “until G3 move” and `` pseudo-code delimiter advice in the **relevant** existing agent standard while editing it; preserve the source-specific expertise. Add one concise root `AGENTS.md` line that states `docs = ratified target, STATUS/source = realization, proposals remain open`, linking the triggered documentation rule; do not duplicate full policy.

Test fixtures:
- A Proposed GM07 spec referenced in a code Change **without ratification** is flagged; not promoted to product automatically.
- Selected Storyteller target remains unchanged while source moves from one-shot to tested bounded loop; status/README changed and ledger `unchanged` reason passes.
- A code Change that updates source but says “docs done” with no heading/evidence fails close.
- A pure internal tooling Change with explicitly scoped no-product-impact reason passes without rewriting product wiki.
- A valid Change that has `not run` and real remaining blocker cannot silently be Done.
- An archived Done packet remains historical, even if linked; guard must not delete or change any archive content.

## E. Scope and hard boundaries

**Allowed:** focused .agents/root rules and skill/template, new change guard script/tests, package script, minimal STATUS/maintenance pointers **about this tooling only**, zero-provider fixtures and concise real close receipts. **Forbidden:** editing core gameplay/Storyteller/Admin/React code, rewriting canonical product/technical contracts to declare new gameplay, changing provider costs, deleting completed Change archives, or creating a new 30-page governance wiki.

Recheck `git status`; owner has local Cursor changes. Do not overwrite them. No claim of proof from a test not actually executed. Use [PLAN](PLAN.md) and [VERIFICATION](VERIFICATION.md) to implement.

**Success:** an implementation agent can distinguish *ratifying a requirement*, *implementing it* and *reporting reality*; a code Change cannot claim Done by writing a vague docs checkbox, but it also does not modify five product files simply to announce that a unit test passed.
