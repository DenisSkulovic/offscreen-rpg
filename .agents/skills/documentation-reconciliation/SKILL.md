---
name: documentation-reconciliation
description: Resolve stale, contradictory or bloated Offscreen RPG product/technical documentation after a change or focused audit, preserving one authoritative owner per decision.
---

# Documentation reconciliation

Use when a source inspection or completed feature reveals documentation drift, when navigation is confusing, or when text has become expensive to maintain. Follow `.agents/rules/documentation.md` for existing map and evidence conventions.

1. State **which claim or route is wrong**, where its authority should live, and whether the mismatch is spec-vs-code or docs-vs-docs. Do not assume code wins over intended product behavior.
2. Find the owning product/technical document. Preserve consequential decisions, invariants, examples and unresolved questions. Remove duplicate explanations, dated implementation diaries and repeated speculation; keep links/short summaries where they serve different readers.
3. Keep *desired*, *implemented*, *fixture-exercised*, *live-observed* and *human-accepted* distinctions explicit. Do not turn an unverified claim into a fact while compacting.
4. Update incoming links and the relevant navigation map. For changed headings/paths, use a focused link check where useful. Don't rewrite unrelated documentation merely to make prose uniform.
5. Return a small ledger: authoritative owner, redirects/links repaired, contradictions removed, claims still needing verification and next evidence step.

Token minimization is a side effect of **better information architecture**, not a mandate to remove essential nuance. Prefer clear document ownership and good headings to arbitrary byte caps or generating lots of tiny files.
