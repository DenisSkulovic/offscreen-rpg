# WIKI18 | Composer tasks: measure total cost per accepted patch

**Baseline:** 584b594 plus newer Composer-first policy and task families committed after it. **State:** Implementing; trace parser/route card already landed, no actual paired paid trace. **Default model:** Composer Standard. Source: `.agents/references/{cursor-model-budget-policy,composer-first-execution,change-packet-profiles}.md`, `.cursor/hooks/{model-budget-guard.cjs,model-budget-guard.test.cjs}`, `scripts/repo-tools/` trace parser, task receipts. Keep one true cost owner.

## T01 | Enforce default Composer and test guard | PLANNER-READY, VERIFY
Read actual `.cursor/agents/{implementer,model-budget-guard}.md` if present, `.cursor/agents/implementer.md`, `.cursor/hooks/model-budget-guard.cjs` and tests. Run `node --test .cursor/hooks/model-budget-guard.test.cjs` on approved checkout. **Positive:** default explicit Composer Standard allowed; Grok Low/Medium rejected without explicit local opt-in; high/fast/auto/unknown variants fail closed. **Negative:** owner_approved payload cannot bypass local opt-in. **Limit:** hook cannot select parent model, enforce actual billing or context-window size.

## T02 | Small real receipt without buying a new benchmark | PLANNER-READY ONLY WITH OWNER-SELECTED TASK
Use a natural upcoming bounded task (e.g. one BOOT03 Composer T-ID), record planned/actual model, context/read count, tool invocations, test cases, billed tokens/charge from Cursor usage if available, rework and correct outcome. No fresh expensive Grok run merely to create control data; compare with already-available historical Grok traces by comparable scope and label non-equivalence. **Negative:** absent usage stays null, not 0; failed task/rework counted.

## T03 | Update routing policy only from evidence | GATED
If Composer repeatedly fails a fully specified microtask, show exact missing contract or model limitation. Fix planner material first; only then consider one explicitly approved Low/Medium exception. Collect cost per **correct accepted** result, not cost per first response. Update WIKI18 ledger and canonical agent policy; no blanket “we saved 80%” from token-price arithmetic. **No Grok default.**
