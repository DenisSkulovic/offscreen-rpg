# Forensic connected trial | Actual execution log

**Status: EMPTY / NOT EXECUTED when authored 2026-11-15.** Cursor fills this **only after actually running each phase**. Do not prefill PASS/FAIL from prior docs, source guesses or screenshots of synthetic mocks. Use [evidence contract](EVIDENCE-CONTRACT.md).

## Run metadata

- **Owner kickoff:** not received yet
- **Source SHA at evaluation start:** not recorded yet
- **Environment / local DB:** not observed yet
- **Actual provider requests:** no run yet, not measured
- **Actual provider spend:** no run yet, not measured
- **Raw private evidence:** do not commit; local ignored `data/` only

## Executed phases

*No phase entries yet. After S0, create one entry for each real run with exact command, source ID and outcome. Do not delete failed entries after fixing a bug.*

## Investigation questions to answer

- Which story/operation/G actually produced a stage receipt and which did not?
- Did a held or interrupted game preserve correct receipts, time, and source state without fake model work?
- What exact original source version/profile/selected context is reconstructable? What was derived from task vs observed by a selector?
- Does the reviewed request match the actual per-round transport? If not proved, say `not verified`.
- Can a genuinely assigned Support staffer diagnose the incident from an authorized S1 UI, and is foreign case access denied?
- Can the player browse persisted story/choices without triggering new game effects, model attempts or a GM06 ACK?
- How much storage/query/lock time and actual provider cost was observed, and what's still unknown?
- Which one next bounded Change solves the most important *observed* problem?

## Raw output / screenshot policy

Save only sanitized type-coded source IDs/hashes, small synthetic visuals and safe metrics. Original player narrative and prompt text, credentials, SQL JSONB and provider envelopes remain private local evidence outside Git.