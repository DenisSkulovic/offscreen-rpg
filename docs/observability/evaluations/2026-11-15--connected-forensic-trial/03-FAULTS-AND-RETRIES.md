# S3 | Deliberately break the *disposable* workflow and inspect surviving evidence

**Execute fault trials, not merely read their source.** Use [S2 checkpoint](CHECKPOINT.md), this file and the narrow existing test names. **Provider-free, disposable SQL/CAS/Temporal only**. No live key, unknown-billing external call, non-disposable reset or arbitrary data sabotage.

## 1. First verify the real failure harness

Review `scripts/repo-tools/focused-integration.mjs` and `tools/api-integration/test/README.md`. It rebuilds and **drops/recreates `offscreen_auth_test`**, a dedicated disposable DB. Do not run it while another test owns that DB or connected ports.

Start narrow (the test names are source-owned, match actual current name-pattern):

~~~sh
pnpm test:focus -- storyteller "worker restart and activity replay settle one finite action exactly once"
pnpm test:focus -- storyteller
~~~

For dedicated OBS/ENG tests find existing file names in source, not invented ones:

~~~sh
rg --files packages/application/test | rg 'obs02|obs03|eng03|capture|rearm|publication|interrupt'
~~~

Rebuild **affected** package before source tests. Read each selected `.live.test.mjs` header/environment to check its SQL/DB target and side effects; run it only on a named disposable local DB. Known documented commands from Cursor evidence:

~~~sh
pnpm --filter @offscreen/application build
pnpm --filter @offscreen/application exec node --test --test-timeout=180000 test/obs02-h-stage-integrity.live.test.mjs test/obs02-execution-stages.live.test.mjs
pnpm --filter @offscreen/application exec node --test test/obs03-prompt-provenance.test.mjs
~~~

These are **examples to revalidate** against current test requirements. Do not run a live test that quietly uses the persistent owner database. If unsure, use the existing focused integration environment or an isolated `offscreen_auth_test` test run and report what couldn't be safely exercised. Do not test against `offscreen_story_local` or actual user stories.

## 2. Minimum five source-evidence failures to drive

For **each** fault capture (a) initial story/G/source IDs; (b) exact injection; (c) result; (d) SQL stage/receipt/attempt counts; (e) whether same G/operation remained; (f) retry side effects; (g) evidence-gap classification.

| Case | Use existing fixture/guard | Required observation |
| --- | --- | --- |
| **F1: CAS unavailable after SQL capture** | ENG03 C1/C2 materialization provider-disabled integration, fail or delay immutable store | Same provisional G and source hold; no generated scene, provider attempt or fabricated packet; real `stage-held` and failure reason |
| **F2: same-G rearm and lease contention** | OBS02-H epoch0 attempts 1–3, operator-authorized rearm epoch1 1–3, stale worker lease release | Six distinct source stage starts / two separate holds where test configured; stale lease writes no authoritative phantom terminal; one G; source row before/after |
| **F3: duplicate outbox/Temporal delivery** | Existing worker restart replay scenario, actual persisted receipt | Exactly one earned action/roll/receipt, no second fictional time gain; operational retry may be multiple but *game source* remains single |
| **F4: stale publication** | Existing Storyteller publication/source fence fixture | Candidate G may be succeeded; publication refused/stale; no new passage or committed game effect from rejected candidate |
| **F5: uncertain or unsent model attempt** | Fake transport/usage-policy tests, **no live external send** | Correct reserved/dispatched/unsent/uncertain accounting. Never infer a free retry or exact €0 from missing response; no automatic second provider send |

**Optional F6, measured lock:** use existing ENG03 timed-CAS 0/250/2000 ms injection and a same-story SQL contender. Record actual `FOR UPDATE` lock wait and hold durations separately. Do **not** add a 2s sleep inside a real story lock to fake a baseline.

**Optional F7, source selection/long-memory:** `pnpm chamber:memory-comparison-packets` and source traces over the same Greywake root. Observe selected vs loaded vs final-packed vs omitted, with source hashes and no model calls. V2 `packet-included-uncited` is an *observation*, not a cognitive judgment.

## 3. Active worker restart outside tests (only if safe)

If the connected Chamber/API runner provides a **controlled worker restart** that preserves the original `operationId` and does not kill the entire test rig, use it. Otherwise the `storyteller` focused suite's verified restart test is enough to prove the specific integration boundary. Don't kill all Docker containers, `postgres` or random user processes just to create an “incident”.

If a held G needs release, use **only** the existing developer-only Chamber tool with a valid current revision and exact same G, as documented in `docs/development.md`:

~~~text
GET /api/chamber-tools/stories/:id/storyteller-control
PUT ... {action:'arm-hold'|'arm-failure',expectedRevision:...}
PUT ... {action:'release',expectedRevision:...,generationId:<captured>}
~~~

**This is local developer-only control**, not an Admin support power. Don't bypass eligibility by directly updating `generation.state` or `campaign.holds`. A release must preserve the original G and actual source.

## 4. Source correctness is not test-output text

Even when tests pass, inspect **persisted rows** in a disposable DB or committed test evidence:
- one actual `game_action_receipt` for accepted settlement;
- none for interrupted path; matching `game_action_execution_event` source;
- real `storyteller_execution_stage` per G, epoch-qualified keys and source IDs;
- `storyteller_prompt_provenance` only on promoted eligible G, not held provisional;
- `storyteller_attempt` states true to whether provider mock transport was called;
- `storyteller_publication` status independent of `generation.succeeded`;
- outbox/Temporal notice/workflow identity and duplicate treatment;
- no unexpected novel `storyPassage` from stale/failed outcome.

**Do not print raw JSONB private fields** just to make the SQL test seem thorough. Record identifiers, closed codes, hash prefix, counts and validated source joins.

## 5. Fault-test economics and stop rules

Run tests **sequentially**; don't rerun the whole suite after each failure. First classify whether failure is test harness/port/DB environment or real source invariant. If actual source behavior violates an accepted contract, **write a failure packet and reproduction**. Do not silently fix game mechanics/Storyteller core under this evaluation stage. A new code repair needs its own bounded Change; report the exact source/scope in final handoff.

No paid provider, no forced retry on uncertain attempt, no arbitrary SQL repair of stuck game. A producer's `reasonCode` may be a diagnostic label, but `model ignored` is not a recorded fact. A SQL status row and a sampled OTel trace are not interchangeable.

## 6. Exit S3

Update `RUN-LOG.md` with a **five-row fault matrix** including `observed result PASS/FAIL/PARTIAL/BLOCKED` and evidence IDs/hashes, source SHA, commands and DB names. Record genuine inconsistencies with priority and exact likely owner; attach safe sample redacted SQL output if helpful.

Push and update `CHECKPOINT.md`.

**Next:** [S4 OBS06/OBS07 controlled implementation and human Support proof](04-OBS06-OBS07-ADMIN.md).
