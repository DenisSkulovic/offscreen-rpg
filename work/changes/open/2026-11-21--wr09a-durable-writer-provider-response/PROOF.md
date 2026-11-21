# WR09A independent readiness and tests

**G0** source/head `6dd12761`, target `undertaking/storyteller-workshop`, branch guard and independent scope known. **G1** exact P3B hash behavior, Writer custody reserve/dispatched/settle, Drizzle step and Documents private CAS inspected. **G2** chosen separate response-object hash and shared custody state machine, no model-worker wiring, no live spend. **G3** SQL column/migration, private response envelope and strict API selected. **G4** T01 legal first edit, 2–5 anchors, schema first. **G5** no MA10 test mover or MA11 graph source overlap. **G6** fake-delivery, crash, charge, corruption, secret and replay negatives. **G7** material no-double-send safety stage, not facade polish. **Planner verdict: READY WITH HARD MONEY-TRANSACTION STOP**, not a claim of runtime proof.

Required deterministic evidence, default no external network:
- Attempt reserved → dispatched → delivered: one injected fake fetch, exact bound wire SHA, response CAS returned, nullable new SQL pointer populated, original result SHA unchanged, exactly one provider charge.
- Atomic fault injection inside SQL transaction *after* accounting settlement calculation but *before* Writer step update rolls back attempt charge, funding/run counters and step pointer together; a later restart marks possibly-dispatched uncertain and refuses resend. No separate settled attempt without a response pointer.
- Replay after simulated process death/reader reconstruction: identical exact bytes from CAS, zero additional transport calls/charges.
- Wrong mission/context/ordinal/attempt/response hash, invalid CAS envelope, missing document, unauthorized identity: fail closed and do not leak contents.
- CAS fail before SQL pointer and crash after possible send: held/uncertain, no resend, reserved liability not marked free; same attempt can't be recharged.
- Secret blank: no fetch; test key appears in fake fetch Authorization only, never in logs, persisted wire/body, SQL or telemetry.
- Scripted P3B old raw SHA and WR04 child caps remain unchanged, run joined regression only after MA10 migrates old test.
- Migration on disposable SQL, verify nullable schema compatibility; do not mutate protected DB; no actual provider transport calls; PASS/FAIL/SKIP/NOT RUN recorded.

**Not accepted by WR09A:** full Writer loop real mode, credential production wiring, scene quality, 200-scene longform, opening/continuation admission. WR09B later owns those after custody is safely integrated.

## Targeted independent negative tests added by source-repair review

1. **Credential-preflight boundary:** for missing/whitespace key, `preflight()={kind:'rejected',reason:'credential_missing'}`, strict custody must return held **before reservation**, no `storyteller_attempt` inserted, zero invocation/fetch, zero funding reserved; malformed wire likewise no attempt.
2. **Strict dispatch SQL lock order:** instrument/stub transaction `tx.execute` to show `pg_advisory_xact_lock(714092631)` first *before* Writer mission/step `FOR UPDATE`; test two competing strict attempts on shared allowance complete without deadlock, with only allowed one step/round dispatched.
3. **Atomic delivered:** inject throw after `settleStorytellerAttemptInTransaction` updates attempt and windows but before `casWriterStep`; whole SQL TX rolls back charge, reserved/settled counters, response pointer, mission revision and windows; on restart **dispatched→uncertain**, no second fetch; CAS orphan does not grant replay.
4. **Atomic sent failure:** delivered error with `sent:true` and nonzero reported usage settles once and marks Writer step failed *in same SQL transaction*, not charged-then-dispatched partial. Crash/fault between writes rolls back both, no resend.
5. **Happy/replay:** exactly one transport, persisted `responseObjectHash` nonnull and private CAS returned, legacy raw `resultCasHash=SHA256(serializedResponse)` unchanged, same key/capture/attempt rehydrated after fresh store construction with 0 extra transport/charge; replay may succeed without current API key because it does not dispatch.
6. **Corrupt/tampered/oversized:** missing/private CAS, mismatched request/attempt/context, broken SHA, >1MiB, invalid schema all refuse without new dispatch, no raw body in error/log/outbox.
7. **Old behavior:** P3B `hashWriterMissionSerializedResponse(RESPONSE_BODY)` equality and WR04 child shared-budget tests unchanged and present; MA10 physically moves that P3B test, so this lane does not edit it.

**No SQL/provider proofs have run in planning.** A failing critical financial fault test is NOT permission to mark WR09A done. No actual OpenRouter request is authorized.
