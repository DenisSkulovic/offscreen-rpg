# Working on Offscreen RPG

The project is currently moving from product baseline v0.01 to technical design. Start with [the next-work queue](docs/TASKS.md); existing specifications contain both confirmed direction and explicitly labeled proposals.

1. Keep a change focused on one product contract or implementation outcome.
2. Read its owning document and necessary dependencies; preserve stable document/requirement IDs.
3. Apply corrections directly, update affected links and record consequential selected decisions.
4. Run `python scripts/check_docs.py`. Game checks will be added with implementation.
5. Commit with a concise description of the resulting change. Use a branch and pull request for substantial work.

Avoid adding dependencies, services or new documentation solely to populate a plan. Do not commit secrets, personal context or user campaign data. Model evaluations must report actual cost and results; illustrative arithmetic is not a benchmark.

The repository is the active source of truth. The earlier Drive documents are a migration snapshot and must not receive parallel edits. No software license or third-party rules/content license has been selected yet.
