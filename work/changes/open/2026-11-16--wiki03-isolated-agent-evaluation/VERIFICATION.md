# WIKI03 | Verification, fake events and controlled pilot gate

**No actual model test was run by this design.** This verification is for Cursor's provider-free implementation and future owner-authorized live experiment.

## Must pass with only fake adapters and local fixtures

- Same frozen SHA, question ID, seed and adapter fixture produces identical event-normalized output excluding the host's real timestamps.
- Twenty event packets containing start/complete for ten tools count as **10 invocations**, not 20; failed call counts separately.
- A `rg` command scanning a subtree is recorded as a search with scope, **not** one verified file open.
- Repeated read of same file counts two calls and one distinct file, but only when actual file-open event is visible.
- Missing token count / cache count / monetary usage is JSON `null`, never zero. Model pricing unknown does not become a guessed USD amount.
- Time to first owner is measured from monotonic host event; if the adapter cannot expose file reads, field is `null` with explanation. Negative duration is rejected.
- Fake model final answer citing only an obsolete archived Change fails authority check; product source with proper proposal boundary passes where validated.
- A candidate citing valid source file but incorrectly asserting production-ready status fails the proof-tier rubric.
- Incomplete/malformed JSONL, cancelled session, timeout, refusal, unsupported CLI, missing sandbox, unknown oracle version and dirty source are explicit terminal states with no invisible retry.
- Runner refuses real model launch if there is no approved model, cap, max attempts, resource restrictions, sandbox canary result or fresh-process guarantee.
- Agent-visible source snapshot excludes oracle/benchmark gold, design answer hints, Change packets and prior traces, with a **public safe stub** where an active router would otherwise point to a missing wiki-health folder. Report both excluded paths and manifest fingerprint.
- Canary outside source snapshot is unreadable under the *real proposed sandbox mechanism* before any future model trial; a fake adapter alone is not claimed to prove real CLI isolation.
- Read-only source snapshot is unchanged after fake run; any attempted mutation is a test failure.
- No provider/network call, runtime test, non-disposable DB, deployment or secret read occurs in self-test or dry-run.

## Fake sample status output

```json
{
  "schema":"wiki.agent-trial.v1",
  "repoSha":"fake-fixture-not-real",
  "status":"completed",
  "elapsedMs":123,
  "toolCalls":{"total":2,"read":1,"search":1},
  "firstGoldPageOpenMs":null,
  "tokens":{"input":null,"cachedInput":null,"output":null,"reported":false},
  "usageCostUsd":null,
  "criticalViolation":false,
  "evidenceClass":"fake-harness-only"
}
```

**This example is fabricated on purpose as a test fixture.** Reports must identify fake versus real so nobody mistakes this for successful agent navigation.

## Completion commands

```bash
git status --short
git rev-parse HEAD
pnpm wiki:bench:agent --self-test
pnpm wiki:bench:agent --dry-run
pnpm wiki:bench:static --self-test
pnpm wiki:health --self-test
python scripts/check_docs.py
pnpm repo:docs-health
git diff --check
```

Capture actual outputs, versions and exit codes. A WIKI03 Done receipt must say **agent harness built and fake-tested; no live agent benchmark executed** unless real owner authorization exists. Verify all existing terminal Change packets stay byte-for-byte intact. A future live pilot should record 12 real cases × two arms only if separately approved; 24 actual invocations are not implied by this packet.

## Future pilot validation (requires new owner permission)

Use paired wiki-first versus minimized-wiki, same Git source SHA and model/config, fresh sessions, randomized case order, recorded trial ids. Preserve verbatim final answers for blinded independent review. Per case: correct owner and mandatory negative rule, source/evidence class, critical false permissions, actual time/tool events, token use if reported, and honest observed/unknown paths. Report medians and per-category failures. Never count low latency for an incorrect answer as an improvement. No same-conversation carryover.