---
name: diff-review
description: Independently inspect an Offscreen RPG code or documentation diff for contract violations, regressions and missed acceptance; report actionable findings without implementing them.
---

# Independent bounded diff review

Read the task's acceptance and the **affected** product/technical contract before reading the diff. Do not relitigate the approved product vision unless the implementation exposes a real contradiction.

Review the actual changed lines plus enough surrounding code to trace ownership. Prioritize:

1. **Authority and safety:** model proposal vs committed game state, data/permission boundaries, billing, secret handling, document publication.
2. **Lifecycle correctness:** races, duplicate work, state revision fences, failed/partial provider work, retries, time and transactional atomicity.
3. **Contract fidelity:** missing acceptance, implicit behavior changes, silent relaxations of intended constraints, doc/code drift.
4. **Maintainability:** misplaced responsibility, unclear names, unnecessary shared abstractions, hidden side effects, bad interfaces or accidental coupling.
5. **Evidence:** test actually exercises relevant path; fixtures do not impersonate live behavior; UI flows need human/visual acceptance where necessary.

For each important finding: `Severity | file:symbol/line | concrete scenario | why it violates contract | smallest repair or discriminating test`. If no high-confidence issues emerge, say what you inspected and what remains untested; don't fabricate findings to seem thorough.

**Reviewer defaults:** read-only, no generic formatting critique, no new feature suggestions, no re-running expensive full suites. A reviewer is not an automatic implementation agent. Parallel reviewers are worthwhile only for independent high-risk domains; each receives a different specific lens, not the entire repo.
