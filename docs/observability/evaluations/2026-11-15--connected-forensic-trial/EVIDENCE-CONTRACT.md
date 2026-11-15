# Forensic trial evidence contract | What Cursor must actually record

**Authority for S0–S6 evaluation records, 2026-11-15.** This is a **data/documentation template**, not a new runtime format/schema, provider authorization or logging system. Every claim must be based on actual executed commands or inspected source and labelled accordingly. Do not fill sample outcomes before running.

## 1. Each phase gets one compact receipt in RUN-LOG.md

Copy and fill **after execution**, never in advance:

~~~text
### S<phase> — <scenario> — <UTC timestamp>
Status: DONE | PARTIAL | FAILED | BLOCKED
Git HEAD before / after: <sha> / <sha>
Environment: OS, Node, pnpm; DB name + local endpoint; mode (Bench/Sandbox/Connected/Live)
Authorization: provider-free | explicit-live-with-cap
Commands actually run: <exact commands> and exit codes; include count/time if known
Observed game identity: <storyId, passageId, revision, viewVersion, operationId, receiptId, G, attemptId>
Source checks: <table, source row ID, status, hash prefix, event sequence, timestamp, before/after gameSecond>
Result: <precise factual behavior>
Negative case: <action, actual denial/failure, source proof>
Evidence class: recorded-runtime | generated-test-fixture | source-inspection | derived | hypothesis
Coverage: complete-for-scoped-test | partial | not-instrumented | unknown | forbidden | expired
Cost: actual external requests N, recorded settled USD, possible/uncertain USD, cap remaining (never default unknown to 0)
Artifacts: <relative sanitized docs path> ; raw local ignored path only (if relevant)
Duration/queries/bytes: <measured where possible, otherwise unknown>
Discrepancy and cause: <observed symptom, source stage, proposed hypotheses + disproof>
Next exact step: <command/file/check to perform>
~~~

**No invented metrics:** if p95 cannot be computed from one sample, say "one observation, no p95". If only 1 story was created, do not claim 2. One source row with a stage doesn't certify every worker path. A fixture trace is not a real source-stage receipt.

## 2. Minimum forensic causal sample per story

Use a short Markdown table (safe fields only):

| Seq in evidence | What | Actual ID/ref | Game second | SQL wall observedAt | State/result | Proved by | Limit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ... | published passage | passage ID/sequence | ... | ... | recorded | story_passage source | narrative content intentionally not copied |
| ... | accepted command | operation ID | ... | ... | admitted | campaign_command/story_resolution | only if real |
| ... | action event | execution/event ID | ... | ... | settled/interrupted | game_action_execution_event | no fabricated receipt on interrupt |
| ... | receipt | receipt operation ID | ... | ... | actual earned result | game_action_receipt | hidden details omitted |
| ... | capture | G/capture ID | ... | ... | held/ready | storyteller_context_capture | may be absent |
| ... | runtime stage | G/stage/idempotency key | n/a | ... | completed/held/not-run | storyteller_execution_stage | epoch/source stage |
| ... | prompt provenance | G/SHA prefix | n/a | ... | manifest present | storyteller_prompt_provenance | task-side, not full wire |
| ... | provider attempt | G/attempt ID | n/a | ... | prepared/possibly-sent/uncertain | storyteller_attempt + review | charge may be unknown |
| ... | publication | G/passage ID | ... | ... | published/stale/blocked | storyteller_publication | no source stage = unknown |
| ... | public projection | eventSeq/source ID | ... | ... | visible kind | story_public_event | not full game ledger |

**Do not manufacture rows** when a stage wasn't executed. Source IDs need to be exact (or stable pseudonymous IDs with an independent private mapping) and must be tied to the same local synthetic story. For real paid source attempt records, restrict exact account/payer identity and full hashed private prompt to private runtime.

## 3. The truth labels

- **Recorded runtime:** exact SQL/API/CAS record emitted by the real application or worker, with ID/revision/hash and test environment. This is strongest for the stated scope.
- **Fixture/lab:** result from authored synthetic fixture or synthetic SA01 trace. Valid for code behavior *under that fixture*, not production history.
- **Source inspection:** current code contains a path or invariant, not evidence a specific real operation traversed it.
- **Validated derivation:** deterministic result from explicitly named record types and versioned rule, not arbitrary free-text inference.
- **Hypothesis:** root-cause explanation proposed from evidence but not proved. Include alternatives and what observation could disprove it.
- **Missing:** distinguish `not-run` (explicit source-proven), `not-recorded` (no instrumented event), `unknown` (possibly not observed), `expired`, `denied` and `unavailable/corrupt`.

**Examples to reject in reviews:**
- “Model ignored NPC memory” because the included source was uncited.
- “No model call happened” because no attempt row appeared in a partial join.
- “Exactly what provider saw” based solely on `generation.input` or OBS03 compiled request hash.
- “Activity finished” based on projected `dueAt` while committed progress/receipt absent.
- “Historical state exact” because the current campaign row has a value and story passage #12 exists.
- “Admin safe” because a React tab hides raw props after network already sent them.

## 4. Redaction and repo hygiene

**Never commit:** `.env`, `.env.openrouter`, API key, Better Auth cookie/session, full bearer token, private SQL JSONB, full player text/context, raw provider request/output, account/payment secrets, connection URL with password, private diagnostic bundle or production-sourced user content.

**Allowed in Git:** synthetic test metadata source IDs, small story/campaign event type codes, schema names/version, safe bounded error classes, hash prefix (full hash only if it contains no sensitive equality information and policy permits), counts/latency from safe local tests, redacted mock transport event names, synthetic browser screenshots with private/identity data masked.

Store private raw evidence only in `data/` or a clearly disposable local directory ignored by Git, and record a **pointer that explains how to find it on the same workstation** if available. The final ChatGPT review should be possible from sanitized Git evidence without accessing that private directory.

**Before committing:** inspect `git diff --stat` and `git diff`; use `git status --short` to ensure no raw evidence was accidentally tracked. For every output artifact, include source SHA/createdAt/capture mode and truthful provenance, not an unlabelled JSON dump.

## 5. Human task results (important)

At S4, create one short synthetic customer ticket with a verifiable underlying Story source. Have Cursor diagnose using **only the actual Support UI output** (no SQL in the first pass), then independently check its statements against SQL.

Report:
- What question was answered, exact on-screen source types/IDs, **time to first answer if measured**.
- Whether Support confused hold vs model send, action admit vs settle, current vs historical, player-safe vs protected.
- Missing link/click or unclear status; how many source investigations required.
- Accuracy: **true**, **false**, **unsupported**, **unknown**, not generic “looks intuitive”.
- Whether the separate S3 Developer Context Inspector exists (currently **no**): do not praise a UI that hasn't been built.

## 6. Output index

Use `RUN-LOG.md` for short actual phase records and `FINAL-HANDOFF.md` for synthesis. Optional small machine-readable manifest/screenshot under a new `evidence/` folder if source/permission safe. Keep screenshots selective and anonymized.

**Never replace an observed failure with a green fixture.** Preserve the failed case and add a new run if it is genuinely fixed. A partial evaluation containing a documented release blocker is an important success of investigation work.
