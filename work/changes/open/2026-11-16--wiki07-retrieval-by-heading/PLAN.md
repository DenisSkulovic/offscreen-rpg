# WIKI07 | Execution checkpoints

**State:** Implementing. WIKI06 is Done. No provider calls.

## Current checkpoint

- P1–P4 are in progress on this dirty worktree. `pnpm wiki:find` and `pnpm wiki:read` exist. Self-test passed.
- P5 is not accepted. An independent reader judged the original ten questions on clean `8aa952ac`. The ranker was then repaired and the same ten were run again. That second run is a repair check, not a new held-out review. The chamber question still opens the page title.
- Do not mark Done from the self-test or from re-running these ten questions.

## Remaining steps

1. **P0**: Read current WIKI01 AST, WIKI05 row-aware context, lexical scorer, package scripts; pin clean SHA and context economics.
2. **P1**: Build section-level index and precise range/anchor semantics with unit fixtures.
3. **P2**: Add deterministic route scorer and role-aware result previews. No gold dataset leakage or vector/AI calls.
4. **P3**: Implement bounded `wiki:read`, outlines/continuation, exact citations, Windows-safe CLI and JSON schema.
5. **P4**: Add a 2–3 sentence conditional rule to the existing agent routing standard, not another mandatory document.
6. **P5**: Run 10 actual questions + negative controls, report bytes emitted, missed sources, wall times and honest limits.
7. **P6**: Reconcile rules/change packet, confirm no gameplay source or archived terminal packet touched, archive only on proven completion.
