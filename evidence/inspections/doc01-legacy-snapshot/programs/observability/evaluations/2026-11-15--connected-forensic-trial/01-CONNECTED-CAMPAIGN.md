# S1 | Launch the real application and play persisted synthetic campaigns

**Run this, not merely suggest it.** Context: [S0 checkpoint](CHECKPOINT.md), [development Story/Chamber mode](../../../../operations/development.md#local-live-story-mode-without-oauth), [browser test owners](../../../../../tools/api-integration/test/stories-browser.integration.ts). **Provider-free**. Use loopback, real Nest API + Postgres + Temporal worker + Next browser + production application use cases; **not** the in-memory `/demo`.

## 1. Confirm connected rig actually starts

~~~sh
pnpm chamber --smoke
~~~

This existing command builds the Chamber launcher, starts the connected loopback rig, drives a headless Chromium smoke and shuts down. It uses `offscreen_chamber`, **not** the disposable `offscreen_auth_test`. It does **not** read `.env.openrouter` or enable a provider. If the chamber schema is incompatible, **do not automatically reset persistent `offscreen_chamber`**; record exact mismatch and see whether a guarded fresh disposable `offscreen_chamber_run_*` Sandbox/Connected lane can accomplish the same probe, or use the focused integration test database.

**Record:** startup process exit codes, API readiness, Nest/Next/Temporal worker availability, DB name and number of stories created. A successful UI smoke is **not** proof of live paid Storyteller execution or full historical replay.

## 2. Create *two* genuine persisted local stories and play them

Start the launcher in a session Cursor can keep running; do not terminate after one browser interaction:

~~~sh
pnpm chamber
~~~

Open `http://127.0.0.1:3100/chamber` (or the exact URL printed by the launcher) in controlled Playwright/Chromium. Cursor should perform the clicks/observations **itself**, using current role/text selectors from `tools/api-integration/test/stories-browser.integration.ts` rather than guessing a CSS class.

### Story A: recorded letter transfer and published continuation

- Select scenario `chamber.v5` (historically the "Sealed letter — held by courier" scenario; verify against current catalogue).
- Press **Start scripted chamber**. Capture the resulting URL and `storyId` from query parameter. Read the actual current snapshot and passage/revision/offer from the real local API or browser inspector.
- Click **Give the letter to the caretaker** as offered. Record accepted command ID if observable, pre/post passage ID/revision, story item holder before/after, saved `story_passage` source and public `story_event`. Use the application's real choice path, **never manually UPDATE story_item**.
- Reload and reopen from Stories; confirm the same persisted source, not an in-memory echo.
- Perform a **read-only GET twice** and assert no new receipt/generation/provider attempt/gameSecond/outbox rows appeared merely because it was read.
- Test one **invalid or stale** duplicate/foreign response through the existing automated test for the scenario if available; do not manually craft a destructive effect into a non-disposable story.

Expected evidence: actual persisted story, passed item-owner mutation and source-linked passage. **If no Storyteller G is involved, say so**. Do not fabricate OBS02 stages for a pure scripted passage.

### Story B: timed offer continues with browser closed

- Start a second independent story using `chamber.v4`. Current test reference: `stories-browser.integration.ts` selects it, clicks **Approach the gate**, expects a real timed decision window.
- Capture `storyId`, passage ID/revision, `storyPassage.decisionPlan` metadata **without publishing private plan text**, original dueAt and current public offer status.
- Close the browser page while **Temporal worker keeps running**. Wait for the real timed default source to commit (bounded wait from test, not an arbitrary day), then reopen same URL.
- Observe the new `story.revision`/passage, `responseSource='default'` and no duplicated source revision/receipt. Compare fictional `gameSecond` and wall-time due: they are **different time axes**.
- Preserve source IDs for later S2 forensic queries. Any late publication/report should be distinguished from the original default commitment if present.

Expected evidence: actual cross-browser/Temporal story progression from persisted source. If the timer doesn't complete, **that is a result**. Record process/worker/outbox state and error reason, do not click through a fake future.

### Automation fallback if interactive browser control fails

Run the source-backed connected suite in its **disposable test DB**, *sequentially and not while the launcher owns conflicting ports*:

~~~sh
pnpm test:focus -- stories-browser
pnpm test:focus -- story-resolution
~~~

The runner **drops/recreates only `offscreen_auth_test`** per run; each run loses that suite's created stories, so save IDs/observations before running the next suite. The suite can prove a connected browser/worker scenario but cannot substitute for a separate natural scripted story campaign if the user specifically wants it. Report the lower fidelity instead of asserting both happened.

## 3. Storyteller stage/prompt evidence preparation

Run two **provider-free held packet** probes after connected play, using the actual existing CLI:

~~~sh
pnpm chamber:packet
pnpm chamber:memory-comparison-packets
pnpm storyteller:packet-audit
~~~

- `chamber:packet` creates a real draft/opening through authenticated application admission, holds a reviewed packet **before** funding/provider send and prints an output directory. Verify `G`, packet body byte length/hash, review state and **zero** `storyteller_attempt` rows.
- `chamber:memory-comparison-packets` prepares two independently admitted requests over the same pinned 200-passage Greywake corpus: no-read vs bounded exploration recipe. It **does not send** the model or prove recall quality. Record source root, selected/omitted catalogue counts and final packet hashes (no raw body in Git).
- `storyteller:packet-audit` uses fixtures and may emit synthetic SA01 trace; label **fixture-only**, not a real durable worker stage trace.

The held opening may not create a started campaign. Do **not** claim its G is the same as Story A/B. S2 will separately join genuine G from real OBS02/OBS03 integration fixtures.

## 4. Observe actual current state (don't infer it)

For each real Story A and B, collect before/after:
- `storyId`, source passage IDs and narrative revision, `story.viewVersion`, and observedAt;
- allowed player-known event type/source ID/sequence, **not** private prose;
- actual action/decision operation ID, gameSecond, accepted plan/receipt ID where present;
- worker/Temporal delivery status and any pending/held G/source cause, never inferred solely from a future dueAt;
- raw provider attempt count and charge status from authoritative SQL, expected **zero**;
- screenshot of original **synthetic** fixture player UI if safe. Remove identity/cookies/secret prompts before committing an image.

**Don't copy the full story transcript into Git.** The corpus is synthetic but can contain untrusted player strings and large protected context. Store hashes/lengths and a few safe type-coded labels; original raw data stays in the local ignored `data/` or named disposable database.

## 5. Fault response

If `pnpm chamber` fails to launch due to a missing browser binary, install/use the project pinned Playwright Chromium or use the existing browser integration harness. If Mongo/Redis/Temporal prerequisites are missing, repair only the known local service. If a scenario name changed, inspect **actual catalogue**, select the equivalent valid source and record the substitution.

Do **not** activate Story mode live merely because the Chamber scenario didn't create a model call. OBS00-B remains a real entitlement gate, and Story mode `--confirm-live` does not bypass it.

## 6. Exit S1

Append actual results to `RUN-LOG.md`: commands and durations, each real story ID/operation ID/G when present, what browser and DB truly showed, sources/timestamps, normal and negative behaviors, failures. Update `CHECKPOINT.md` and push.

**Next:** [S2 source/SQL forensic capture and join](02-FORENSIC-CAPTURE.md).
