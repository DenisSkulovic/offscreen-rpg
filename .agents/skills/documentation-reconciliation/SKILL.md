---
name: documentation-reconciliation
description: Resolve stale, contradictory or bloated Offscreen RPG product/technical documentation after a change or focused audit, preserving one authoritative owner per decision.
---

# Documentation reconciliation

Use when a source inspection or completed feature reveals documentation drift, when navigation is confusing, or when text has become expensive to maintain. Assess against the [independent retrieval standard](../../references/documentation-navigation-standard.md), not only today's repository shape. Follow `.agents/rules/documentation.md` for existing map and evidence conventions—especially **Documentation is the product bible**.

**Hierarchy:** product documentation is the ultimate product truth; technical documentation is the second layer; code is an artifact. Reconciling “code moved, docs silent” is **mandatory repair**, not optional cleanup. Reconciling by rewriting the bible to match bad code is forbidden—escalate.

**Required Change-close trigger:** for every code-bearing Change reaching `Done`, this procedure is **mandatory** for each affected claim whose ratified target changed (or any spec-vs-code drift found). Scope is limited to those listed authorities and triggered maps—not a repository-wide rewrite. The ledger itself is required even when every target is `unchanged`, and the reason has to say why. A tooling change that leaves the selected contract alone records `no product/technical behavior impacted` instead of editing product pages. `not run` cannot be marked Done. **A Done Change with permanent docs more stale than its code is a process crime.** The ledger is a checklist of affected assertions. It does not prove those assertions true. The `planned-impact.v1` table is the prospective disposition written before Ready. It is not this ledger and it is not proof that the plan happened. Close compares that table, the diff, and known contract dependents. A typed dependent omitted from the ledger stops Done. A see-also link does not. An empty result means no known route.

1. State **which claim or route is wrong**, where its authority should live, and whether the mismatch is spec-vs-code or docs-vs-docs. Do not assume code wins over intended product behavior.
2. Find the owning product/technical document. Preserve consequential decisions, invariants, examples and unresolved questions. Remove duplicate explanations, dated implementation diaries and repeated speculation; keep links/short summaries where they serve different readers.
3. Keep _desired_, _implemented_, _fixture-exercised_, _live-observed_ and _human-accepted_ distinctions explicit. Do not turn an unverified claim into a fact while compacting.
4. Update incoming links and the relevant navigation map, including [technical owners](../../../docs/technical/README.md) or [docs map](../../../docs/README.md) when affected. For a long technical page, prefer a small in-page question-to-heading route rather than duplicating its content. For changed headings/paths, use a focused link check where useful. Don't rewrite unrelated documentation merely to make prose uniform.
5. Return a small ledger: authoritative owner, redirects/links repaired, contradictions removed, claims still needing verification and next evidence step.

## Structural migration

When a documentation Change creates, splits, merges, moves, or retires an owner, declare it under `## Document shape | shape-ops.v1` and, once the diff exists, under `## Migration receipt | shape-receipt.v1`. A split or merge is not reconciled while a unique claim or negative constraint is missing from the successor, or while an inbound anchor still points at a heading that moved. Retiring a proposed page does not ratify its text. A reviewed page left untouched is `NO-OP` and stays out of the diff. Checked links do not prove the meaning survived.

Token minimization is a side effect of **better information architecture**, not a mandate to remove essential nuance. Prefer clear document ownership and good headings to arbitrary byte caps or generating lots of tiny files.
