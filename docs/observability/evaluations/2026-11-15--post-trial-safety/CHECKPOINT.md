# Cursor resumption checkpoint | Local live safety

**PREPARED, NOT STARTED (2026-11-15).** The next phase is the owner's explicitly authorized **one Change**, not an automatic free-for-all. Previous S0–S6 had 0 provider calls but its earlier budget permission **does not carry over**.

- Source baseline: `main@b88356feebebd47fbe2094189851af553a43a335` (recheck at kickoff)
- Active Change: none
- Latest finished: old connected trial; this new sequence not started
- Next recommended Change: [OBS00-L](../../../changes/2026-11-15--obs00-l-local-story-trial-guards/CHANGE.md)
- After OBS00-L: [OBS00-C](../../../changes/2026-11-15--obs00-c-provider-wire-equality/CHANGE.md)
- After OBS00-C: [QA-SF01](../../../changes/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md)
- Paid local Story trial: **NOT AUTHORIZED for this new sequence** until owner approves a new explicit cap and guard evidence
- Total actual provider attempts this new wave: 0 (no tests started)
- Spend: $0 (no tests started)
- Expected safety tests: stopped account remains stopped after restart; ≤4 total attempts and ≤$0.25 source-funded trial; exact SQL review SHA vs actual mock HTTP body; mismatch pre-send denial
- Last result: none
- Next exact action once authorized: `git status --short; git rev-parse HEAD; pnpm repo:brief`, open OBS00-L only
- Next evidence commit: none

### End each Cursor session with

~~~text
Current UTC:
Selected Change / status:
Git source SHA and current branch:
Command actually executed, exit, elapsed:
Normal source/SQL proof (ID, hash/amount):
Negative source/SQL proof:
External requests / settled / uncertain and remaining cap:
New files and committed Git SHA:
Next one selected Change or safe evaluation:
NEXT EXACT COMMAND:
~~~

**Do not confuse "future intended tests" with actual results.** If owner declines paid provider, stop at provider-free proof and report that honestly.