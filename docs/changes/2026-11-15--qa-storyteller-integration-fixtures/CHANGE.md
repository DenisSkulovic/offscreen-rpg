# QA-SF01 | Restore honest focused Storyteller/story-resolution integration checks

**State: Proposed, NOT Ready.** One test-harness reliability outcome: **the existing connected Storyteller and story-resolution suites run against current validated contracts and can distinguish real engine regressions from invalid old fixtures or teardown order**. Test source/cleanup only unless a *separate* accepted runtime defect is actually proven. Provider-free, disposable `offscreen_auth_test` only.

**Source evidence:** [Cursor forensic run log S0/S1](../../observability/evaluations/2026-11-15--connected-forensic-trial/RUN-LOG.md), [independent review](../../observability/evidence/independent-connected-trial-review-2026-11-15.md), [test runner safety](../../../tools/api-integration/test/README.md).

## Source-specific problems

1. `pnpm test:focus -- storyteller`: **6/33 pass, 27 fail** in Cursor report. `tools/api-integration/test/storyteller.integration.ts` contains `time.id='simulation-gameSeconds'` in multiple `CampaignStart` fixtures. The active `time.id` schema uses `/^[a-z0-9][a-z0-9.-]{0,99}$/`: capital `S` makes the fixture invalid. Other failing cases (notably custom-calendar `0 != 55`) need their own test assertion/engine diagnosis **after** the ID type issue is fixed.
2. `pnpm test:focus -- story-resolution`: **7/8 pass**; `tools/api-integration/test/helpers/app-integration.ts` cleanup/fixture teardown hits `storyteller_execution_stage_generation_id_fk` after OBS02 introduced stage rows. The test suite is still valuable; cleanup needs to respect new FK ownership (or proper cascade with an explicitly reviewed test-only meaning).

**These are not evidence all actual Storyteller gameplay is broken.** Equally, it is unacceptable to call the full integration boundary healthy while the suite is red.

## Narrow implementation

- Inspect the owning time schema, *then* change invalid **test fixture ID** from camelCase `simulation-gameSeconds` to a valid lowercase slug, preserving its intended fictional-second semantics; do **not** relax production input schema merely for old tests.
- Run the **entire focused storyteller suite**, capture the new failure set. Investigate the 55-day calendar case with actual `worldTime`/`gameSecond` source; preserve expected 55 and any meaningful world-obligation contract. If the expected result is wrong under accepted semantics, document source and review rather than simply adjusting assertion to 0.
- Fix only the **disposable integration teardown**: stage rows reference `generation` via restrict FK, so deleting generation may require deleting dependent `storyteller_execution_stage` in test cleanup/related fixture service **in the correct order**. Do not change production FK to cascade or delete user narrative evidence for testing convenience.
- Check other newly added OBS03 provenance/dispatch review FKs for the same teardown; the selected source fix must not leave the next test with a different blocked deletion.
- Run in a disposable `offscreen_auth_test` database only. `pnpm test:focus` **destroys/recreates this database** each invocation; read safety script and do not overlap suites.

## Actual tests and evidence required

~~~sh
pnpm test:focus -- storyteller
pnpm test:focus -- story-resolution
pnpm test:focus -- admin-situation
~~~

Record initial vs final test counts, exact commands/time and remaining failing test names (if any); a new state-machine failure is a legitimate issue requiring separate source review, not an invitation to loosen expectations. Check original timetick/55-calendar assertion, stage/capture idempotency and original cleanup. Confirm no provider outbound network or account use.

**Done** requires the two previously red named suites pass without relaxing production validation/foreign keys or skipping the problematic cases. If a genuine gameplay bug is exposed, leave `Verifying/Blocked` with an exact failure/repro and ask owner for a new bounded runtime Change. Do not mark green by removing tests.

**Out of scope:** paid model, OBS00-B/C/L, new agent framework, production data, state migration or full repo formatting. **Ready only on explicit selection** and verified safe disposable environment.
