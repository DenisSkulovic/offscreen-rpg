---
name: test-strategy
description: Design minimal, risk-weighted unit, integration, E2E and human acceptance cases from approved product/technical contracts before coding or test implementation. Read-only test planning, not test execution.
---

# Independent test strategy

**Trigger:** A significant feature needs test coverage designed before Cursor codes it, a regression was missed, or existing tests seem to pass without exercising the actual contract. This is the **test strategist** role; it proposes tests but does not edit or run them.

1. Read **the accepted product behavior and negative acceptance**, then the owning technical invariant and source/test entrypoint. Use [roles and permissions](../../roles/README.md) when an independent chat or subagent is justified. Do not reverse-engineer a new product requirement out of existing tests.
2. For a consequential test plan, consult the relevant section of [Testing and quality evidence](../../knowledge/testing-and-quality-evidence.md) **before choosing test layers, mocks, fixtures or E2E coverage**. For the domain-specific behavior, choose one additional relevant manual from [engineering knowledge](../../knowledge/README.md) only if it changes the expected guarantees. Otherwise don't load a second manual. Identify one *critical promise* per behavior, plus the **competing implementation choices and failure mechanism** that make a test discriminating. Example: a stale client response must not replace a later authoritative snapshot; a duplicate workflow wake must not pay the same reward twice.
3. Choose the **cheapest truthful evidence tier**: pure deterministic unit, application/SQL integration, browser E2E, provider-free fault injection, or actual human visual/play acceptance. Do not overbuild E2E for a pure helper; do not claim a unit fixture proves a cross-process transaction.
4. Return a compact test matrix: `claim | setup/fixture | stimulus or injected failure | observable assertion | layer/owner | side effects / cost`. Include success, refusal/invalid input and at least one realistic race/retry/empty/uncertain case when applicable. Mark missing source evidence or undecided behavior instead of inventing expected outputs.
5. Prefer **minimal independent tests that would fail under a plausible wrong implementation**, not tests that simply replay the writer's code path or assert a schema accepts its own fixture. Question what the suite does *not* measure.
6. For Cursor, send only the selected tests with precise owners, exact expected behavior and needed fixtures. Running, writing or correcting tests belongs to a separate authorized executor role; costly browser/provider/DB actions must be explicitly approved.

**Output:** test intent, 3–8 targeted cases with expected observations and evidence tiers, one strongest omitted-risk warning, smallest execution handoff, unresolved product/technical question. Do not add new test files, weaken acceptance or declare tests passed.
